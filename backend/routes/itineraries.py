"""
Itinerary routes - Travel-focused endpoints (TripIt migration)
Replaces Project endpoints with Itinerary concepts
"""
from flask import Blueprint, request, current_app, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from datetime import datetime, timedelta
from sqlalchemy import func, or_, text
from sqlalchemy.orm import joinedload, load_only

from extensions import db
from models.itinerary import Itinerary
from models.traveler import Traveler
from models.safety_rating import SafetyRating
from models.traveler_certification import TravelerCertification
from schemas.itinerary import ItinerarySchema, ItineraryCreateSchema, ItineraryUpdateSchema
from utils.decorators import token_required, admin_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from tasks.scoring_tasks import score_itinerary_task, check_rate_limit
from utils.cache import CacheService

itineraries_bp = Blueprint('itineraries', __name__)


@itineraries_bp.route('', methods=['GET'])
@optional_auth
def list_itineraries(user_id):
    """List itineraries with advanced filtering and sorting"""
    try:
        page, per_page = get_pagination_params(request)
        sort = request.args.get('sort', 'trending')  # trending, newest, top-rated, most-helpful

        # Advanced filters
        search = request.args.get('search', '').strip()
        activity_tags = request.args.getlist('activity')
        destination = request.args.get('destination', '').strip()
        min_score = request.args.get('min_score', type=int)
        min_safety_score = request.args.get('min_safety_score', type=float)
        has_gps = request.args.get('has_gps', type=lambda v: v.lower() == 'true') if request.args.get('has_gps') else None
        women_safe_only = request.args.get('women_safe', type=lambda v: v.lower() == 'true') if request.args.get('women_safe') else None
        featured_only = request.args.get('featured', type=lambda v: v.lower() == 'true') if request.args.get('featured') else None
        difficulty = request.args.get('difficulty', '').strip()

        include_param = request.args.get('include', '')
        include_parts = {part.strip().lower() for part in include_param.split(',') if part.strip()}
        include_detailed = 'detailed' in include_parts

        # Check for filters
        base_has_filters = any([
            search,
            activity_tags,
            destination,
            min_score is not None,
            min_safety_score is not None,
            has_gps is not None,
            women_safe_only,
            featured_only,
            difficulty,
        ])
        has_filters = base_has_filters or include_detailed

        # Build query - only show published itineraries
        query = Itinerary.query.filter_by(is_deleted=False, is_published=True)

        # Search in title, description, destination
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Itinerary.title.ilike(search_term),
                    Itinerary.description.ilike(search_term),
                    Itinerary.destination.ilike(search_term)
                )
            )

        # Activity tags filter
        if activity_tags:
            for activity in activity_tags:
                query = query.filter(Itinerary.activity_tags.contains([activity]))

        # Destination filter
        if destination:
            query = query.filter(Itinerary.destination.ilike(f'%{destination}%'))

        # Credibility score filter
        if min_score is not None:
            query = query.filter(Itinerary.proof_score >= min_score)

        # Safety score filter
        if min_safety_score is not None:
            query = query.filter(Itinerary.safety_score >= min_safety_score)

        # Has GPS route
        if has_gps is not None:
            if has_gps:
                query = query.filter(Itinerary.route_gpx.isnot(None), Itinerary.route_gpx != '')
            else:
                query = query.filter(or_(Itinerary.route_gpx.is_(None), Itinerary.route_gpx == ''))

        # Women-safe certified
        if women_safe_only:
            query = query.filter(Itinerary.women_safe_certified == True)

        # Difficulty level
        if difficulty:
            query = query.filter(Itinerary.difficulty_level == difficulty.lower())

        # Featured only
        if featured_only:
            query = query.filter(Itinerary.is_featured == True)

        # Sorting
        if sort == 'trending' or sort == 'hot':
            query = query.order_by(
                Itinerary.proof_score.desc(),
                Itinerary.created_at.desc()
            )
        elif sort == 'newest' or sort == 'new':
            query = query.order_by(Itinerary.created_at.desc())
        elif sort == 'top-rated' or sort == 'top':
            query = query.order_by(Itinerary.safety_score.desc(), Itinerary.proof_score.desc())
        elif sort == 'most-helpful':
            query = query.order_by(Itinerary.helpful_votes.desc())
        else:
            query = query.order_by(Itinerary.proof_score.desc(), Itinerary.created_at.desc())

        # Count and paginate
        total = query.count()
        itineraries = query.options(joinedload(Itinerary.itinerary_creator)).limit(per_page).offset((page - 1) * per_page).all()

        data = [i.to_dict(include_creator=True, user_id=user_id) for i in itineraries]

        # Build response
        total_pages = (total + per_page - 1) // per_page
        response_data = {
            'status': 'success',
            'message': 'Success',
            'data': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': total_pages,
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>', methods=['GET'])
@optional_auth
def get_itinerary(user_id, itinerary_id):
    """Get itinerary details"""
    try:
        itinerary = Itinerary.query.options(
            joinedload(Itinerary.itinerary_creator)
        ).get(itinerary_id)

        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Increment view count (handle NULL values from old records)
        itinerary.view_count = (itinerary.view_count or 0) + 1
        db.session.commit()

        # Build response data
        itinerary_data = itinerary.to_dict(include_creator=True, user_id=user_id)

        # Get average safety rating
        safety_ratings = SafetyRating.query.filter_by(itinerary_id=itinerary_id).all()
        if safety_ratings:
            avg_safety = sum(r.overall_safety_score for r in safety_ratings) / len(safety_ratings)
            itinerary_data['safety_score'] = round(avg_safety, 2)
            itinerary_data['safety_rating_count'] = len(safety_ratings)

        response_data = {
            'status': 'success',
            'message': 'Itinerary retrieved',
            'data': itinerary_data
        }

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@itineraries_bp.route('', methods=['POST'])
@token_required
def create_itinerary(user_id):
    """Create new itinerary"""
    try:
        data = request.get_json()

        schema = ItineraryCreateSchema()
        validated_data = schema.load(data)

        # Create itinerary
        itinerary = Itinerary(
            created_by_traveler_id=user_id,
            title=validated_data['title'],
            description=validated_data['description'],
            destination=validated_data['destination'],
            tagline=validated_data.get('tagline'),
            regions=validated_data.get('regions', []),
            start_date=validated_data.get('start_date'),
            end_date=validated_data.get('end_date'),
            difficulty_level=validated_data.get('difficulty_level', 'moderate'),
            budget_amount=validated_data.get('budget_amount'),
            budget_currency=validated_data.get('budget_currency', 'USD'),
            travel_style=validated_data.get('travel_style'),
            activity_tags=validated_data.get('activity_tags', []),
            travel_companions=validated_data.get('travel_companions', []),
            route_gpx=validated_data.get('route_gpx'),
            route_map_url=validated_data.get('route_map_url'),
            demo_url=validated_data.get('demo_url'),
            duration_days=validated_data.get('duration_days'),
            best_season=validated_data.get('best_season'),
            women_safe_certified=validated_data.get('women_safe_certified', False),
            is_published=True,  # Itineraries are published when created
            # Extended trip details
            trip_highlights=validated_data.get('trip_highlights'),
            trip_journey=validated_data.get('trip_journey'),
            day_by_day_plan=validated_data.get('day_by_day_plan'),
            safety_intelligence=validated_data.get('safety_intelligence'),
            hidden_gems=validated_data.get('hidden_gems'),
            unique_highlights=validated_data.get('unique_highlights'),
            safety_tips=validated_data.get('safety_tips'),
            screenshots=validated_data.get('screenshots', []),
            categories=validated_data.get('categories', []),
        )

        # Add to database
        db.session.add(itinerary)
        db.session.flush()

        # Set initial scoring status
        itinerary.scoring_status = 'pending'
        itinerary.proof_score = 0

        db.session.commit()

        # Trigger async scoring task
        try:
            score_itinerary_task.delay(itinerary.id)
        except Exception as e:
            print(f"Failed to queue scoring task: {e}")

        # Trigger AI analysis task (async with sync fallback)
        try:
            from tasks.ai_analysis_tasks import analyze_itinerary_ai
            analyze_itinerary_ai.delay(itinerary.id)
            print(f"[Itineraries] ✅ AI analysis task queued for itinerary {itinerary.id}")
        except Exception as e:
            print(f"[Itineraries] ⚠️ Failed to queue AI analysis task: {e}")
            # Sync fallback: Run AI analysis immediately
            try:
                from services.ai_analyzer import AIAnalyzer
                ai_analyzer = AIAnalyzer()
                if ai_analyzer.is_available():
                    print(f"[Itineraries] 🔄 Running AI analysis synchronously (fallback)")
                    alerts = ai_analyzer.analyze_itinerary(itinerary.to_dict(include_creator=True))
                    print(f"[Itineraries] ✅ Sync AI analysis completed: {len(alerts)} alerts")
            except Exception as sync_error:
                print(f"[Itineraries] ❌ Sync AI analysis also failed: {sync_error}")

        CacheService.invalidate_itinerary_feed()
        CacheService.invalidate_leaderboard()
        CacheService.invalidate_user_itineraries(user_id)

        # Emit Socket.IO event
        itinerary_data = itinerary.to_dict(include_creator=True)
        try:
            from services.socket_service import SocketService
            SocketService.emit_project_created(itinerary_data)
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(itinerary_data, 'Itinerary created', 201)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>', methods=['PUT', 'PATCH'])
@token_required
def update_itinerary(user_id, itinerary_id):
    """Update itinerary"""
    try:
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary:
            return error_response('Not found', 'Itinerary not found', 404)

        if itinerary.created_by_traveler_id != user_id:
            return error_response('Forbidden', 'You can only edit your own itineraries', 403)

        data = request.get_json()
        schema = ItineraryUpdateSchema()
        validated_data = schema.load(data)

        # Track if score-affecting fields were changed
        SCORE_AFFECTING_FIELDS = {
            'description', 'activity_tags', 'regions', 'route_gpx',
            'travel_style', 'difficulty_level', 'women_safe_certified'
        }
        needs_rescore = any(key in SCORE_AFFECTING_FIELDS for key in validated_data.keys())

        # Update fields
        for key, value in validated_data.items():
            # Skip None values, but allow empty arrays/lists for fields like categories
            if value is not None:
                setattr(itinerary, key, value)

        itinerary.updated_at = datetime.utcnow()

        # Log categories for debugging
        print(f"[UPDATE] Itinerary {itinerary_id} categories: {itinerary.categories}")

        db.session.commit()

        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()
        CacheService.invalidate_user_itineraries(user_id)

        # Trigger rescore if needed
        if needs_rescore:
            try:
                from tasks.scoring_tasks import score_itinerary_task
                score_itinerary_task.delay(itinerary.id)
                CacheService.invalidate_leaderboard()
            except Exception as e:
                print(f"Failed to queue rescore: {e}")

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            itinerary_data = itinerary.to_dict(include_creator=True)
            SocketService.emit_project_updated(itinerary_id, itinerary_data)
        except Exception as e:
            print(f"Failed to emit socket event: {e}")
            itinerary_data = itinerary.to_dict(include_creator=True)

        return success_response(itinerary_data, 'Itinerary updated', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>', methods=['DELETE'])
@token_required
def delete_itinerary(user_id, itinerary_id):
    """Delete itinerary (soft delete)"""
    try:
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary:
            return error_response('Not found', 'Itinerary not found', 404)

        if itinerary.created_by_traveler_id != user_id:
            return error_response('Forbidden', 'You can only delete your own itineraries', 403)

        itinerary.is_deleted = True
        db.session.commit()

        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()
        CacheService.invalidate_leaderboard()
        CacheService.invalidate_user_itineraries(user_id)

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_project_deleted(itinerary_id)
            SocketService.emit_leaderboard_updated()
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(None, 'Itinerary deleted', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>/feature', methods=['POST'])
@admin_required
def feature_itinerary(user_id, itinerary_id):
    """Feature an itinerary (admin only)"""
    try:
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary:
            return error_response('Not found', 'Itinerary not found', 404)

        itinerary.is_featured = True
        itinerary.featured_at = datetime.utcnow()
        itinerary.featured_by = user_id

        db.session.commit()
        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_project_featured(itinerary_id)
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(itinerary.to_dict(include_creator=True), 'Itinerary featured', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>/rating', methods=['POST'])
@token_required
def add_safety_rating(user_id, itinerary_id):
    """Add safety rating to itinerary"""
    try:
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        data = request.get_json() or {}

        traveler = Traveler.query.get(user_id)
        traveler_sbt_id = getattr(traveler, 'sbt_id', None) or user_id

        # Check if user already rated this itinerary
        existing_rating = SafetyRating.query.filter_by(
            itinerary_id=itinerary_id,
            traveler_id=user_id
        ).first()

        experience_date = data.get('experience_date')
        if isinstance(experience_date, str):
            try:
                experience_date = datetime.fromisoformat(experience_date).date()
            except ValueError:
                experience_date = None
        if experience_date is None:
            experience_date = datetime.utcnow().date()

        # Create or update rating
        rating_data = {
            'overall_safety_score': data.get('overall_safety_score', 5),
            'rating_type': data.get('rating_type', 'overall'),
            'detailed_feedback': data.get('detailed_feedback'),
            'accommodation_safety': data.get('accommodation_safety'),
            'route_safety': data.get('route_safety'),
            'community_safety': data.get('community_safety'),
            'women_safety_score': data.get('women_safety_score'),
            'experience_date': experience_date,
            'helpful_votes': 0,
            'unhelpful_votes': 0,
        }

        if existing_rating:
            for key, value in rating_data.items():
                if value is not None:
                    setattr(existing_rating, key, value)
            existing_rating.traveler_sbt_id = traveler_sbt_id
            db.session.commit()
        else:
            rating = SafetyRating(
                itinerary_id=itinerary_id,
                traveler_id=user_id,
                traveler_sbt_id=traveler_sbt_id,
                **rating_data
            )
            db.session.add(rating)
            db.session.commit()

        # Update itinerary's average safety score
        all_ratings = SafetyRating.query.filter_by(itinerary_id=itinerary_id).all()
        if all_ratings:
            itinerary.safety_score = sum(r.overall_safety_score for r in all_ratings) / len(all_ratings)
            itinerary.safety_ratings_count = len(all_ratings)
            db.session.commit()

        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_project_rated(itinerary_id, itinerary.safety_score)
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(
            itinerary.to_dict(include_creator=True),
            'Safety rating added',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>/view', methods=['POST'])
@optional_auth
def track_itinerary_view(user_id, itinerary_id):
    """Track unique itinerary view"""
    try:
        from models.itinerary_view import ItineraryView

        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        data = request.get_json() or {}
        session_id = data.get('session_id')

        # Get IP and user agent
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')[:500]

        # Check if already viewed
        existing_view = None
        if user_id:
            existing_view = ItineraryView.query.filter_by(
                itinerary_id=itinerary_id,
                traveler_id=user_id
            ).first()
        elif session_id:
            existing_view = ItineraryView.query.filter_by(
                itinerary_id=itinerary_id,
                session_id=session_id
            ).first()

        # Only count as new view if not already viewed
        if not existing_view:
            try:
                new_view = ItineraryView(
                    itinerary_id=itinerary_id,
                    traveler_id=user_id,
                    session_id=session_id,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                db.session.add(new_view)

                # Increment view count
                itinerary.view_count += 1
                db.session.commit()

                return success_response({
                    'view_count': itinerary.view_count,
                    'is_new_view': True
                }, 'View tracked', 200)
            except Exception as e:
                db.session.rollback()
                itinerary = Itinerary.query.get(itinerary_id)
                return success_response({
                    'view_count': itinerary.view_count if itinerary else 0,
                    'is_new_view': False
                }, 'Already viewed', 200)
        else:
            return success_response({
                'view_count': itinerary.view_count,
                'is_new_view': False
            }, 'Already viewed', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/leaderboard', methods=['GET'])
@optional_auth
def get_leaderboard(user_id):
    """Get top itineraries leaderboard"""
    try:
        timeframe = request.args.get('timeframe', 'month')  # week/month/all
        limit = request.args.get('limit', 10, type=int)
        limit = min(limit, 50)

        # Calculate date filter
        if timeframe == 'week':
            since = datetime.utcnow() - timedelta(days=7)
        elif timeframe == 'month':
            since = datetime.utcnow() - timedelta(days=30)
        else:
            since = None

        # Top itineraries
        query = Itinerary.query.filter_by(is_deleted=False)
        if since:
            query = query.filter(Itinerary.created_at >= since)

        top_itineraries = query.options(joinedload(Itinerary.itinerary_creator)).order_by(
            Itinerary.proof_score.desc()
        ).limit(limit).all()

        # Top travelers
        traveler_query = db.session.query(
            Traveler.id,
            Traveler.username,
            Traveler.first_name,
            Traveler.avatar_url,
            func.sum(Itinerary.proof_score).label('total_score'),
            func.count(Itinerary.id).label('itinerary_count')
        ).join(Itinerary, Traveler.id == Itinerary.created_by_traveler_id).filter(
            Itinerary.is_deleted == False
        )

        if since:
            traveler_query = traveler_query.filter(Itinerary.created_at >= since)

        top_travelers = traveler_query.group_by(
            Traveler.id, Traveler.username, Traveler.first_name, Traveler.avatar_url
        ).order_by(
            func.sum(Itinerary.proof_score).desc()
        ).limit(limit).all()

        # Featured itineraries
        featured = Itinerary.query.options(joinedload(Itinerary.itinerary_creator)).filter_by(
            is_deleted=False,
            is_featured=True
        ).order_by(Itinerary.featured_at.desc()).limit(limit).all()

        # Build response
        response_data = {
            'status': 'success',
            'message': 'Leaderboard retrieved',
            'data': {
                'top_itineraries': [i.to_dict(include_creator=True) for i in top_itineraries],
                'top_travelers': [{
                    'id': str(t.id),
                    'username': t.username,
                    'display_name': t.first_name,
                    'avatar_url': t.avatar_url,
                    'total_credibility_score': int(t.total_score or 0),
                    'itinerary_count': t.itinerary_count
                } for t in top_travelers],
                'featured': [i.to_dict(include_creator=True) for i in featured],
                'timeframe': timeframe,
                'limit': limit
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/featured', methods=['GET'])
@optional_auth
def get_featured_itineraries(user_id):
    """Get featured itineraries"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)

        itineraries = Itinerary.query.filter_by(
            is_deleted=False,
            is_featured=True
        ).options(joinedload(Itinerary.itinerary_creator)).order_by(
            Itinerary.featured_at.desc()
        ).limit(limit).all()

        data = [i.to_dict(include_creator=True, user_id=user_id) for i in itineraries]

        response_data = {
            'status': 'success',
            'message': 'Featured itineraries retrieved',
            'data': data
        }

        CacheService.set('featured_itineraries', response_data, ttl=3600)

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/by-destination/<path:destination>', methods=['GET'])
@optional_auth
def get_itineraries_by_destination(user_id, destination):
    """Get itineraries by destination"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)

        itineraries = Itinerary.query.filter(
            Itinerary.is_deleted == False,
            Itinerary.destination.ilike(f'%{destination}%')
        ).options(joinedload(Itinerary.itinerary_creator)).order_by(
            Itinerary.proof_score.desc()
        ).limit(limit).all()

        data = [i.to_dict(include_creator=True, user_id=user_id) for i in itineraries]

        response_data = {
            'status': 'success',
            'message': f'Itineraries for {destination} retrieved',
            'data': data
        }

        cache_key = f'destination_itineraries_{destination}'
        CacheService.set(cache_key, response_data, ttl=3600)

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/rising-stars', methods=['GET'])
@optional_auth
def get_rising_stars(user_id):
    """Get rising star itineraries (new with high engagement)"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)

        # Last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        itineraries = Itinerary.query.filter(
            Itinerary.is_deleted == False,
            Itinerary.created_at >= thirty_days_ago
        ).options(joinedload(Itinerary.itinerary_creator)).order_by(
            (Itinerary.safety_ratings_count + Itinerary.view_count).desc()
        ).limit(limit).all()

        data = [i.to_dict(include_creator=True, user_id=user_id) for i in itineraries]

        response_data = {
            'status': 'success',
            'message': 'Rising star itineraries retrieved',
            'data': data
        }

        CacheService.set('rising_stars_itineraries', response_data, ttl=3600)

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/most-requested', methods=['GET'])
@optional_auth
def get_most_requested_itineraries(user_id):
    """Get most requested/popular itineraries by view count and engagement"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)

        itineraries = Itinerary.query.filter_by(
            is_deleted=False
        ).options(joinedload(Itinerary.itinerary_creator)).order_by(
            Itinerary.view_count.desc(),
            Itinerary.safety_ratings_count.desc()
        ).limit(limit).all()

        data = [i.to_dict(include_creator=True, user_id=user_id) for i in itineraries]

        response_data = {
            'status': 'success',
            'message': 'Most requested itineraries retrieved',
            'data': data
        }

        CacheService.set('most_requested_itineraries', response_data, ttl=3600)

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)

@itineraries_bp.route('/<itinerary_id>/upvote', methods=['POST'])
@token_required
def upvote_itinerary(user_id, itinerary_id):
    """Upvote an itinerary"""
    try:
        from models.vote import Vote

        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Check if vote exists
        existing_vote = Vote.query.filter_by(user_id=user_id, project_id=itinerary_id).first()

        if existing_vote:
            # If already upvoted, remove vote
            if existing_vote.vote_type == 'up':
                db.session.delete(existing_vote)
            else:
                # Change from downvote to upvote
                existing_vote.vote_type = 'up'
        else:
            # Create new upvote
            vote = Vote(user_id=user_id, project_id=itinerary_id, vote_type='up')
            db.session.add(vote)

        db.session.commit()
        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        # Emit Socket.IO event for real-time vote updates
        from services.socket_service import SocketService
        SocketService.emit_vote_cast(itinerary_id, 'up', itinerary.proof_score)

        return success_response(itinerary.to_dict(include_creator=True, user_id=user_id), 'Itinerary upvoted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>/downvote', methods=['POST'])
@token_required
def downvote_itinerary(user_id, itinerary_id):
    """Downvote an itinerary"""
    try:
        from models.vote import Vote

        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Check if vote exists
        existing_vote = Vote.query.filter_by(user_id=user_id, project_id=itinerary_id).first()

        if existing_vote:
            # If already downvoted, remove vote
            if existing_vote.vote_type == 'down':
                db.session.delete(existing_vote)
            else:
                # Change from upvote to downvote
                existing_vote.vote_type = 'down'
        else:
            # Create new downvote
            vote = Vote(user_id=user_id, project_id=itinerary_id, vote_type='down')
            db.session.add(vote)

        db.session.commit()
        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        # Emit Socket.IO event for real-time vote updates
        from services.socket_service import SocketService
        SocketService.emit_vote_cast(itinerary_id, 'down', itinerary.proof_score)

        return success_response(itinerary.to_dict(include_creator=True, user_id=user_id), 'Itinerary downvoted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>/vote', methods=['DELETE'])
@token_required
def remove_vote(user_id, itinerary_id):
    """Remove vote from itinerary"""
    try:
        from models.vote import Vote

        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Find and remove vote
        vote = Vote.query.filter_by(user_id=user_id, project_id=itinerary_id).first()

        if not vote:
            return error_response('Not found', 'No vote to remove', 404)

        db.session.delete(vote)
        db.session.commit()
        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        # Emit Socket.IO event for real-time vote updates
        from services.socket_service import SocketService
        SocketService.emit_vote_removed(itinerary_id)

        return success_response(None, 'Vote removed', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@itineraries_bp.route('/<itinerary_id>/chains', methods=['GET'])
@optional_auth
def get_itinerary_caravans(user_id, itinerary_id):
    """Get all caravans that an itinerary belongs to"""
    try:
        from models.chain import Chain, ChainProject

        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Find all chain_projects for this itinerary
        chain_projects = ChainProject.query.filter_by(project_id=itinerary_id).all()

        # Get the associated chains
        chains = []
        for cp in chain_projects:
            chain = Chain.query.filter_by(id=cp.chain_id, is_active=True).first()
            if chain:
                chain_data = chain.to_dict()
                chain_data['added_at'] = cp.added_at.isoformat() if cp.added_at else None
                chain_data['is_pinned'] = cp.is_pinned
                chains.append(chain_data)

        return success_response({'chains': chains}, 'Caravans retrieved successfully', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)
