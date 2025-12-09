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
    """
    Extract list of ACTUAL CITIES from itinerary for multi-city trip planning.
    Filters out attractions, landmarks, and non-city locations.
    """
    cities = []

    # Blacklist of common attraction/landmark keywords to filter out
    attraction_keywords = [
        'falls', 'waterfall', 'temple', 'fort', 'palace', 'chowk', 'bazaar',
        'market', 'park', 'garden', 'museum', 'church', 'mosque', 'shrine',
        'lake', 'beach', 'hill', 'mountain', 'peak', 'valley', 'trek', 'trail',
        'restaurant', 'cafe', 'hotel', 'resort', 'mall', 'center', 'square',
        'gate', 'arch', 'tower', 'monument', 'memorial', 'bridge', 'station'
    ]

    def is_likely_city(name):
        """Check if name is likely a city, not an attraction"""
        if not name or len(name) < 3:
            return False
        name_lower = name.lower()
        # Filter out attractions
        for keyword in attraction_keywords:
            if keyword in name_lower:
                return False
        return True

    # Primary destination (always include)
    if itinerary.destination and is_likely_city(itinerary.destination):
        cities.append(itinerary.destination)

    # Check regions array (these are usually actual cities)
    if itinerary.regions and isinstance(itinerary.regions, list):
        for region in itinerary.regions:
            if region and is_likely_city(region):
                # Clean up the region name (remove extra descriptors)
                clean_region = region.split(',')[0].strip()  # Take first part before comma
                clean_region = clean_region.split('&')[0].strip()  # Take first part before &
                if clean_region and clean_region not in cities:
                    cities.append(clean_region)

    # Deduplicate and limit to 3 cities max for practical booking
    unique_cities = []
    for city in cities:
        if city not in unique_cities:
            unique_cities.append(city)

    # For now, simplify: if we detect more than 1 city, only use up to 3 most important ones
    # This prevents illogical routing
    if len(unique_cities) > 3:
        unique_cities = unique_cities[:3]

    # If only one city or no cities, return single destination
    return unique_cities if len(unique_cities) > 1 else [itinerary.destination]

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

        # Use LLM to intelligently detect cities for multi-city support
        if perplexity_booking_service:
            try:
                # Build itinerary dict for LLM
                itinerary_dict = {
                    'title': itinerary.title,
                    'destination': itinerary.destination,
                    'description': itinerary.description or '',
                    'day_by_day_plan': itinerary.day_by_day_plan or '',
                    'regions': itinerary.regions or []
                }
                cities = perplexity_booking_service.extract_travel_route(itinerary_dict)
                print(f"[Booking] LLM extracted cities: {cities}")
            except Exception as e:
                print(f"[Booking] LLM extraction failed, falling back to keyword-based: {e}")
                cities = extract_cities_from_itinerary(itinerary)
        else:
            cities = extract_cities_from_itinerary(itinerary)

        is_multi_city = len(cities) > 1
        print(f"[Booking] Final cities: {cities} (multi-city: {is_multi_city})")

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

        # If multi-city, first ask for route confirmation
        if is_multi_city:
            message = {
                'type': 'question',
                'step': 'confirm_cities',
                'message': f"I've detected this as a multi-city trip!\n\nProposed route: {' → '.join(cities)}\n\nIs this route correct? You can modify it or proceed.",
                'input_type': 'city_confirmation',
                'detected_cities': cities,
                'allow_edit': True
            }
        else:
            # Single city - proceed directly
            message = {
                'type': 'question',
                'step': 'departure',
                'message': f"Let's book your trip to {itinerary.destination}!\n\nWhere will you be traveling from?",
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
        if booking_session.current_step == 'confirm_cities':
            # User confirmed/edited the city route
            try:
                cities_data = json.loads(user_input)
                confirmed_cities = cities_data.get('cities', [])

                # Update cities in session
                booking_session.cities = confirmed_cities
                booking_session.current_step = 'initial'
                db.session.commit()

                # Now ask for departure city
                destination_text = ', '.join(confirmed_cities[:-1]) + f", and {confirmed_cities[-1]}"
                return jsonify({
                    'message': {
                        'type': 'question',
                        'step': 'departure',
                        'message': f"✅ Great! Your route: {' → '.join(confirmed_cities)}\n\nWhere will you be traveling from?",
                        'input_type': 'text',
                        'placeholder': 'Enter your departure city (e.g., New York, NY)'
                    },
                    'session': booking_session.to_dict()
                })
            except Exception as e:
                print(f"Error processing city confirmation: {e}")
                return jsonify({'error': 'Invalid city confirmation data'}), 400

        elif booking_session.current_step == 'initial':
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

            # Initialize flight segments for multi-city
            cities = booking_session.cities or [itinerary.destination]
            is_multi_city = len(cities) > 1

            # Build flight segments: departure -> city1 -> city2 -> ... -> return to departure
            flight_segments = []

            # Outbound segments
            current_from = booking_session.departure_city
            for city in cities:
                flight_segments.append({
                    'from': current_from,
                    'to': city,
                    'type': 'outbound',
                    'booked': False
                })
                current_from = city

            # Return segment (from last city back to departure)
            if booking_session.return_date:
                flight_segments.append({
                    'from': cities[-1],
                    'to': booking_session.departure_city,
                    'type': 'return',
                    'booked': False
                })

            booking_session.flight_segments = flight_segments
            booking_session.current_flight_segment = 0
            db.session.commit()

            # Start searching for first flight segment
            first_segment = flight_segments[0]
            segment_text = f"Searching for flights from {first_segment['from']} to {first_segment['to']}"
            if is_multi_city:
                segment_text += f" (Segment 1/{len(flight_segments)})"

            return jsonify({
                'message': {
                    'type': 'loading',
                    'step': 'searching_flights',
                    'message': segment_text + "...",
                },
                'session': booking_session.to_dict(),
                'trigger_search': True
            })

        elif booking_session.current_step == 'select_flight':
            # Save selected flight or handle skip
            selected_flight = json.loads(user_input)
            if not booking_session.selected_flights:
                booking_session.selected_flights = []

            # Check if user wants to skip this flight
            is_skip = selected_flight.get('skip', False)

            # Add segment information to the flight
            flight_segments = booking_session.flight_segments or []
            current_segment_index = booking_session.current_flight_segment

            if current_segment_index < len(flight_segments):
                segment = flight_segments[current_segment_index]

                if is_skip:
                    # Create a skipped flight entry
                    selected_flight = {
                        'skipped': True,
                        'airline': 'N/A',
                        'flight_number': 'SKIPPED',
                        'departure_time': 'N/A',
                        'arrival_time': 'N/A',
                        'duration': 'N/A',
                        'stops': 0,
                        'price': 0,
                        'booking_url': '#',
                        'segment': {
                            'from': segment['from'],
                            'to': segment['to'],
                            'type': segment['type'],
                            'index': current_segment_index
                        }
                    }
                else:
                    selected_flight['segment'] = {
                        'from': segment['from'],
                        'to': segment['to'],
                        'type': segment['type'],
                        'index': current_segment_index
                    }

                # Mark segment as booked
                flight_segments[current_segment_index]['booked'] = True

            booking_session.selected_flights.append(selected_flight)

            # Check if there are more flight segments to book
            next_segment_index = current_segment_index + 1
            if next_segment_index < len(flight_segments):
                # More segments to book
                booking_session.current_flight_segment = next_segment_index
                booking_session.flight_segments = flight_segments
                booking_session.current_step = 'searching_flights'
                db.session.commit()

                next_segment = flight_segments[next_segment_index]
                segment_type = "Return" if next_segment['type'] == 'return' else "Connecting"
                segment_text = f"{segment_type} flight: {next_segment['from']} → {next_segment['to']} (Segment {next_segment_index + 1}/{len(flight_segments)})"

                return jsonify({
                    'message': {
                        'type': 'loading',
                        'step': 'searching_flights',
                        'message': segment_text + "...",
                    },
                    'session': booking_session.to_dict(),
                    'trigger_search': True
                })
            else:
                # All flight segments booked, move to hotel search
                cities = booking_session.cities or [itinerary.destination]
                city_name = cities[0]

                booking_session.current_step = 'searching_hotels'
                booking_session.current_destination_index = 0
                db.session.commit()

                return jsonify({
                    'message': {
                        'type': 'loading',
                        'step': 'searching_hotels',
                        'message': f"Great! All flights booked. Now searching for hotels in {city_name}...",
                    },
                    'session': booking_session.to_dict(),
                    'trigger_search': True
                })

        elif booking_session.current_step == 'select_hotel':
            # Save selected hotel or handle skip
            selected_hotel = json.loads(user_input)
            if not booking_session.selected_hotels:
                booking_session.selected_hotels = []

            # Check if user wants to skip this hotel
            is_skip = selected_hotel.get('skip', False)
            if is_skip:
                cities = booking_session.cities or [itinerary.destination]
                current_city_index = booking_session.current_destination_index
                city_name = cities[current_city_index] if current_city_index < len(cities) else itinerary.destination

                selected_hotel = {
                    'skipped': True,
                    'name': 'Hotel Skipped',
                    'star_rating': 0,
                    'address': city_name,
                    'amenities': [],
                    'price_per_night': 0,
                    'total_price': 0,
                    'rating': 0,
                    'review_count': 0,
                    'booking_url': '#'
                }

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
                        'message': f"Great choice! Now let's find a hotel in {next_city}...",
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
                        'message': f"Perfect! Let's find some activities and experiences...",
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
                    'message': "Your booking plan is ready!",
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

        # Get current flight segment
        flight_segments = booking_session.flight_segments or []
        current_segment_index = booking_session.current_flight_segment

        # Determine departure and destination for current segment
        if flight_segments and current_segment_index < len(flight_segments):
            current_segment = flight_segments[current_segment_index]
            departure_city = current_segment['from']
            destination_city = current_segment['to']
            is_return = current_segment['type'] == 'return'
        else:
            # Fallback to single-city
            departure_city = booking_session.departure_city
            destination_city = itinerary.destination
            is_return = False

        # Use return date for return flights, departure date for outbound
        flight_date = booking_session.return_date if is_return else booking_session.departure_date

        # If regenerating and cached options exist, modify search slightly
        search_variation = ""
        if regenerate and booking_session.flight_options:
            search_variation = " Please show different options than previous search, focusing on alternative airlines and departure times."

        # Search flights using Perplexity
        flights = perplexity_booking_service.search_flights(
            departure_city=departure_city,
            destination_city=destination_city,
            departure_date=flight_date,
            return_date=None,  # One-way for each segment
            num_travelers=booking_session.num_travelers,
            budget_preference=booking_session.budget_preference
        )

        # Cache results
        booking_session.flight_options = flights
        booking_session.current_step = 'select_flight'
        db.session.commit()

        # Build message with segment context
        segment_label = ""
        if flight_segments and current_segment_index < len(flight_segments):
            segment_type = "Return" if is_return else "Outbound"
            segment_label = f" ({segment_type} - Segment {current_segment_index + 1}/{len(flight_segments)})"

        return jsonify({
            'message': {
                'type': 'choice',
                'step': 'select_flight',
                'message': f"Found {len(flights)} flight options{segment_label}! Choose your flight:",
                'input_type': 'flight_cards',
                'options': flights,
                'segment_info': {
                    'from': departure_city,
                    'to': destination_city,
                    'type': 'return' if is_return else 'outbound',
                    'index': current_segment_index,
                    'total': len(flight_segments)
                } if flight_segments else None
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
