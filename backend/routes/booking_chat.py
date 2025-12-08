from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
import secrets
from extensions import db
from models import BookingSession, Itinerary, User
from services.perplexity_booking import perplexity_booking_service
import json
import re

booking_chat_bp = Blueprint('booking_chat', __name__, url_prefix='/api/booking')


def extract_cities_from_itinerary(itinerary):
    """Extract list of cities from itinerary for multi-city trip planning"""
    cities = []

    # Primary destination
    if itinerary.destination:
        cities.append(itinerary.destination)

    # Check regions array
    if itinerary.regions and len(itinerary.regions) > 1:
        # Regions contain multiple cities
        for region in itinerary.regions:
            if region and region not in cities:
                cities.append(region)

    # Parse day_by_day_plan for city names (simple regex approach)
    if itinerary.day_by_day_plan and len(cities) <= 1:
        # Look for patterns like "Day X - City Name" or "in CityName"
        day_plan_text = itinerary.day_by_day_plan.lower()

        # Common city detection patterns
        city_patterns = [
            r'day \d+[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',  # Day 1: Paris
            r'in ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',  # in Paris
            r'to ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',  # to Paris
        ]

        for pattern in city_patterns:
            matches = re.findall(pattern, itinerary.day_by_day_plan)
            for match in matches:
                if match and match not in cities and len(match) > 2:
                    cities.append(match)
                    if len(cities) >= 5:  # Limit to 5 cities max
                        break
            if len(cities) >= 5:
                break

    # Return unique cities (limited to 5 for practical booking)
    return cities[:5] if len(cities) > 1 else [itinerary.destination]

@booking_chat_bp.route('/start', methods=['POST'])
@jwt_required()
def start_booking():
    """Start a new booking session"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        itinerary_id = data.get('itinerary_id')

        print(f"[Booking] Starting booking session for user: {current_user_id}, itinerary: {itinerary_id}")

        if not itinerary_id:
            return jsonify({'error': 'Itinerary ID required'}), 400

        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary:
            print(f"[Booking] ERROR: Itinerary not found: {itinerary_id}")
            return jsonify({'error': 'Itinerary not found'}), 404

        print(f"[Booking] Found itinerary: {itinerary.title} - {itinerary.destination}")

        # Detect cities for multi-city support
        cities = extract_cities_from_itinerary(itinerary)
        is_multi_city = len(cities) > 1

        print(f"[Booking] Detected cities: {cities} (multi-city: {is_multi_city})")

        # Create new booking session
        session_token = secrets.token_urlsafe(32)
        booking_session = BookingSession(
            user_id=current_user_id,
            itinerary_id=itinerary_id,
            session_token=session_token,
            current_step='initial',
            cities=cities,
            current_destination_index=0
        )

        db.session.add(booking_session)
        db.session.commit()

        # Return initial message
        destination_text = itinerary.destination
        if is_multi_city:
            destination_text = f"{', '.join(cities[:-1])}, and {cities[-1]}"

        message = {
            'type': 'question',
            'step': 'departure',
            'message': f"🎯 Let's book your {'multi-city ' if is_multi_city else ''}trip to {destination_text}!\n\nWhere will you be traveling from?",
            'input_type': 'text',
            'placeholder': 'Enter your departure city (e.g., New York, NY)'
        }

        return jsonify({
            'session_token': session_token,
            'session': booking_session.to_dict(),
            'message': message
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error starting booking: {e}")
        return jsonify({'error': str(e)}), 500


@booking_chat_bp.route('/message', methods=['POST'])
@jwt_required()
def send_message():
    """Handle user message and advance booking flow"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        session_token = data.get('session_token')
        user_input = data.get('message')

        if not session_token:
            return jsonify({'error': 'Session token required'}), 400

        # Get booking session
        booking_session = BookingSession.query.filter_by(
            session_token=session_token,
            user_id=current_user_id
        ).first()

        if not booking_session:
            return jsonify({'error': 'Session not found'}), 404

        # Get itinerary
        itinerary = booking_session.itinerary

        # Process based on current step
        if booking_session.current_step == 'initial':
            # Save departure city
            booking_session.departure_city = user_input
            booking_session.current_step = 'dates'
            db.session.commit()

            return jsonify({
                'message': {
                    'type': 'question',
                    'step': 'dates',
                    'message': f"Great! When do you want to depart?\n\n📅 Please select your travel dates:",
                    'input_type': 'date_range',
                    'min_date': datetime.now().strftime('%Y-%m-%d')
                },
                'session': booking_session.to_dict()
            })

        elif booking_session.current_step == 'dates':
            # Save dates
            dates = json.loads(user_input)
            booking_session.departure_date = datetime.fromisoformat(dates['departure']).date()
            booking_session.return_date = datetime.fromisoformat(dates['return']).date() if dates.get('return') else None
            booking_session.current_step = 'travelers'
            db.session.commit()

            return jsonify({
                'message': {
                    'type': 'question',
                    'step': 'travelers',
                    'message': "How many travelers?",
                    'input_type': 'number',
                    'min': 1,
                    'max': 10,
                    'default': 1
                },
                'session': booking_session.to_dict()
            })

        elif booking_session.current_step == 'travelers':
            # Save number of travelers
            booking_session.num_travelers = int(user_input)
            booking_session.current_step = 'budget'
            db.session.commit()

            return jsonify({
                'message': {
                    'type': 'question',
                    'step': 'budget',
                    'message': "What's your budget preference?",
                    'input_type': 'choice',
                    'choices': [
                        {
                            'value': 'economy',
                            'label': '💰 Economy',
                            'description': 'Budget-friendly options'
                        },
                        {
                            'value': 'comfort',
                            'label': '✨ Comfort',
                            'description': 'Mid-range quality'
                        },
                        {
                            'value': 'premium',
                            'label': '👑 Premium',
                            'description': 'Luxury experience'
                        }
                    ]
                },
                'session': booking_session.to_dict()
            })

        elif booking_session.current_step == 'budget':
            # Save budget preference
            booking_session.budget_preference = user_input
            booking_session.current_step = 'searching_flights'
            db.session.commit()

            # Start searching for flights
            return jsonify({
                'message': {
                    'type': 'loading',
                    'step': 'searching_flights',
                    'message': f"✈️ Searching for flights from {booking_session.departure_city} to {itinerary.destination}...",
                },
                'session': booking_session.to_dict(),
                'trigger_search': True  # Frontend should immediately call /search-flights
            })

        elif booking_session.current_step == 'select_flight':
            # Save selected flight
            selected_flight = json.loads(user_input)
            if not booking_session.selected_flights:
                booking_session.selected_flights = []
            booking_session.selected_flights.append(selected_flight)

            # Check if multi-city and need inter-city flights
            cities = booking_session.cities or [itinerary.destination]
            current_city_index = booking_session.current_destination_index

            # For multi-city, after initial flight, check if we need flights between cities
            # (This is a simplified approach - could be expanded later)

            # Move to hotel search for current destination
            booking_session.current_step = 'searching_hotels'
            db.session.commit()

            city_name = cities[0] if cities else itinerary.destination
            if len(cities) > 1:
                city_name = cities[current_city_index] if current_city_index < len(cities) else cities[0]

            return jsonify({
                'message': {
                    'type': 'loading',
                    'step': 'searching_hotels',
                    'message': f"🏨 Great choice! Now searching for hotels in {city_name}...",
                },
                'session': booking_session.to_dict(),
                'trigger_search': True
            })

        elif booking_session.current_step == 'select_hotel':
            # Save selected hotel
            selected_hotel = json.loads(user_input)
            if not booking_session.selected_hotels:
                booking_session.selected_hotels = []
            booking_session.selected_hotels.append(selected_hotel)

            # Check if multi-city and more cities to book
            cities = booking_session.cities or [itinerary.destination]
            current_city_index = booking_session.current_destination_index

            if len(cities) > 1 and current_city_index < len(cities) - 1:
                # More cities to book hotels for
                booking_session.current_destination_index += 1
                next_city = cities[booking_session.current_destination_index]
                booking_session.current_step = 'searching_hotels'
                db.session.commit()

                return jsonify({
                    'message': {
                        'type': 'loading',
                        'step': 'searching_hotels',
                        'message': f"🏨 Great choice! Now let's find a hotel in {next_city}...",
                    },
                    'session': booking_session.to_dict(),
                    'trigger_search': True
                })
            else:
                # All cities done, move to activities
                booking_session.current_step = 'searching_activities'
                db.session.commit()

                return jsonify({
                    'message': {
                        'type': 'loading',
                        'step': 'searching_activities',
                        'message': f"🎯 Perfect! Let's find some activities and experiences...",
                    },
                    'session': booking_session.to_dict(),
                    'trigger_search': True
                })

        elif booking_session.current_step == 'select_activities':
            # Save selected activities
            selected_activities = json.loads(user_input)
            booking_session.selected_activities = selected_activities
            booking_session.current_step = 'summary'
            booking_session.completed = True
            db.session.commit()

            return jsonify({
                'message': {
                    'type': 'summary',
                    'step': 'summary',
                    'message': "🎉 Your booking plan is ready!",
                },
                'session': booking_session.to_dict()
            })

        return jsonify({'error': 'Invalid step'}), 400

    except Exception as e:
        db.session.rollback()
        print(f"Error processing message: {e}")
        return jsonify({'error': str(e)}), 500


@booking_chat_bp.route('/search-flights', methods=['POST'])
@jwt_required()
def search_flights():
    """Search for flight options"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        session_token = data.get('session_token')
        regenerate = data.get('regenerate', False)  # Allow regeneration with different criteria

        booking_session = BookingSession.query.filter_by(
            session_token=session_token,
            user_id=current_user_id
        ).first()

        if not booking_session:
            return jsonify({'error': 'Session not found'}), 404

        if not perplexity_booking_service:
            return jsonify({'error': 'Booking service not available. Please check API configuration.'}), 503

        itinerary = booking_session.itinerary

        # If regenerating and cached options exist, modify search slightly
        # (e.g., different times, different airlines preference)
        search_variation = ""
        if regenerate and booking_session.flight_options:
            search_variation = " Please show different options than previous search, focusing on alternative airlines and departure times."

        # Search flights using Perplexity
        flights = perplexity_booking_service.search_flights(
            departure_city=booking_session.departure_city,
            destination_city=itinerary.destination,
            departure_date=booking_session.departure_date,
            return_date=booking_session.return_date,
            num_travelers=booking_session.num_travelers,
            budget_preference=booking_session.budget_preference
        )

        # Cache results
        booking_session.flight_options = flights
        booking_session.current_step = 'select_flight'
        db.session.commit()

        return jsonify({
            'message': {
                'type': 'choice',
                'step': 'select_flight',
                'message': f"Found {len(flights)} flight options! Choose your flight:",
                'input_type': 'flight_cards',
                'options': flights
            },
            'session': booking_session.to_dict()
        })

    except Exception as e:
        print(f"Error searching flights: {e}")
        return jsonify({'error': str(e)}), 500


@booking_chat_bp.route('/search-hotels', methods=['POST'])
@jwt_required()
def search_hotels():
    """Search for hotel options"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        session_token = data.get('session_token')
        regenerate = data.get('regenerate', False)

        booking_session = BookingSession.query.filter_by(
            session_token=session_token,
            user_id=current_user_id
        ).first()

        if not booking_session:
            return jsonify({'error': 'Session not found'}), 404

        if not perplexity_booking_service:
            return jsonify({'error': 'Booking service not available. Please check API configuration.'}), 503

        itinerary = booking_session.itinerary

        # Get current city for multi-city support
        cities = booking_session.cities or [itinerary.destination]
        current_city_index = booking_session.current_destination_index
        current_city = cities[current_city_index] if current_city_index < len(cities) else itinerary.destination

        # Calculate check-in and check-out dates
        check_in = booking_session.departure_date
        check_out = booking_session.return_date if booking_session.return_date else (
            booking_session.departure_date + timedelta(days=3)
        )

        # If regenerating and cached options exist, we can add variation to the search
        search_variation = ""
        if regenerate and booking_session.hotel_options:
            search_variation = " Please show different hotels than the previous search, focusing on different neighborhoods and hotel chains."

        # Search hotels using Perplexity
        hotels = perplexity_booking_service.search_hotels(
            city=current_city,
            check_in=check_in,
            check_out=check_out,
            num_travelers=booking_session.num_travelers,
            budget_preference=booking_session.budget_preference,
            search_variation=search_variation
        )

        # Cache results
        booking_session.hotel_options = hotels
        booking_session.current_step = 'select_hotel'
        db.session.commit()

        # Prepare message with city context for multi-city
        is_multi_city = len(cities) > 1
        city_context = f" in {current_city}" if is_multi_city else ""
        city_progress = f" ({current_city_index + 1}/{len(cities)})" if is_multi_city else ""

        return jsonify({
            'message': {
                'type': 'choice',
                'step': 'select_hotel',
                'message': f"Found {len(hotels)} amazing hotels{city_context}! Select where you'd like to stay{city_progress}:",
                'input_type': 'hotel_map',
                'options': hotels
            },
            'session': booking_session.to_dict()
        })

    except Exception as e:
        print(f"Error searching hotels: {e}")
        return jsonify({'error': str(e)}), 500


@booking_chat_bp.route('/search-activities', methods=['POST'])
@jwt_required()
def search_activities():
    """Search for activity options"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        session_token = data.get('session_token')
        regenerate = data.get('regenerate', False)

        booking_session = BookingSession.query.filter_by(
            session_token=session_token,
            user_id=current_user_id
        ).first()

        if not booking_session:
            return jsonify({'error': 'Session not found'}), 404

        if not perplexity_booking_service:
            return jsonify({'error': 'Booking service not available. Please check API configuration.'}), 503

        itinerary = booking_session.itinerary

        # Get activities from itinerary (using activity_tags and other fields)
        activities_list = []

        # Add from activity tags
        if itinerary.activity_tags:
            activities_list.extend(itinerary.activity_tags)

        # Add from categories
        if itinerary.categories:
            activities_list.extend(itinerary.categories)

        # If no specific activities, use general destination-based activities
        if not activities_list:
            activities_list = ['Sightseeing', 'Local Tours', 'Cultural Experiences', 'Food & Dining']

        print(f"[Booking] Searching activities for {itinerary.destination}, interests: {activities_list[:5]}")

        # If regenerating and cached options exist, modify search
        search_variation = ""
        if regenerate and booking_session.activity_options:
            search_variation = " Please show different activities than the previous search, focusing on alternative experiences and less popular options."

        # Generate date range
        dates = []
        if booking_session.departure_date and booking_session.return_date:
            current_date = booking_session.departure_date
            while current_date <= booking_session.return_date:
                dates.append(current_date)
                current_date += timedelta(days=1)
        else:
            dates = [booking_session.departure_date]

        # Search activities using Perplexity
        activities = perplexity_booking_service.search_activities(
            city=itinerary.destination,
            activities_from_itinerary=activities_list,
            dates=dates,
            num_travelers=booking_session.num_travelers,
            search_variation=search_variation
        )

        # Cache results
        booking_session.activity_options = activities
        booking_session.current_step = 'select_activities'
        db.session.commit()

        return jsonify({
            'message': {
                'type': 'choice',
                'step': 'select_activities',
                'message': f"Found {len(activities)} exciting activities! Choose what you'd like to do:",
                'input_type': 'activity_cards',
                'options': activities,
                'multi_select': True
            },
            'session': booking_session.to_dict()
        })

    except Exception as e:
        print(f"Error searching activities: {e}")
        return jsonify({'error': str(e)}), 500


@booking_chat_bp.route('/session/<session_token>', methods=['GET'])
@jwt_required()
def get_session(session_token):
    """Get current booking session"""
    try:
        current_user_id = get_jwt_identity()

        booking_session = BookingSession.query.filter_by(
            session_token=session_token,
            user_id=current_user_id
        ).first()

        if not booking_session:
            return jsonify({'error': 'Session not found'}), 404

        return jsonify({
            'session': booking_session.to_dict(),
            'itinerary': booking_session.itinerary.to_dict()
        })

    except Exception as e:
        print(f"Error getting session: {e}")
        return jsonify({'error': str(e)}), 500
