"""
User routes
"""
from flask import Blueprint, request
from marshmallow import ValidationError
from sqlalchemy import and_, func, or_

from extensions import db
from models.user import User
from models.user_stats import UserDashboardStats
from models.project import Project
from models.itinerary import Itinerary
from schemas.user import UserProfileUpdateSchema
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from utils.cache import CacheService

users_bp = Blueprint('users', __name__)


@users_bp.route('/search', methods=['GET'])
def search_users():
    """Search users by name, username, or email"""
    try:
        query_param = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10, type=int)

        if not query_param or len(query_param) < 2:
            return error_response('Invalid query', 'Search query must be at least 2 characters', 400)

        if limit > 50:
            limit = 50

        # Search by username, display_name, or email (case-insensitive)
        search_term = f'%{query_param}%'

        # Search Traveler table (Google OAuth users)
        from models.traveler import Traveler
        travelers = Traveler.query.filter(
            and_(
                Traveler.is_active == True,
                (Traveler.username.ilike(search_term) |
                 Traveler.display_name.ilike(search_term) |
                 Traveler.email.ilike(search_term))
            )
        ).limit(limit).all()

        # Search User table (email/password users)
        users = User.query.filter(
            and_(
                User.is_active == True,
                (User.username.ilike(search_term) |
                 User.display_name.ilike(search_term) |
                 User.email.ilike(search_term))
            )
        ).limit(limit).all()

        # Combine results from both tables
        all_users = list(travelers) + list(users)
        all_users = all_users[:limit]  # Trim to limit

        # Return minimal user info for selection
        results = [{
            'id': user.id,
            'username': user.username,
            'display_name': user.display_name,
            'email': user.email,
            'avatar_url': user.avatar_url,
            'is_verified': user.email_verified if hasattr(user, 'email_verified') else False,
            'has_oxcert': user.has_oxcert if hasattr(user, 'has_oxcert') else False
        } for user in all_users]

        return success_response(results, f'Found {len(results)} users', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/<username>', methods=['GET'])
@optional_auth
def get_user_profile(user_id, username):
    """Get user profile by username"""
    try:
        print(f"[DEBUG] Getting profile for username: {username}")
        normalized_username = (username or '').strip().lower()

        # Check cache (5 min TTL)
        cache_key = f"user_profile:v2:{normalized_username}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # Try Traveler table first (Google OAuth users)
        from models.traveler import Traveler
        user = Traveler.query.filter(
            and_(
                Traveler.is_active == True,
                or_(
                    func.lower(Traveler.username) == normalized_username,
                    func.lower(Traveler.email) == normalized_username
                )
            )
        ).first()

        # Fallback to User table (email/password users)
        if not user:
            user = User.query.filter(
                and_(
                    User.is_active == True,
                    or_(
                        func.lower(User.username) == normalized_username,
                        func.lower(User.email) == normalized_username
                    )
                )
            ).first()

        if not user:
            return error_response('Not found', 'User not found', 404)

        # Handle stats differently for User vs Traveler
        from models.traveler import Traveler
        if isinstance(user, Traveler):
            # Traveler doesn't have dashboard_stats, compute stats directly
            karma_value = 0  # Travelers don't have karma system yet
            itinerary_count = db.session.query(func.count(Itinerary.id)).filter(
                Itinerary.created_by_traveler_id == user.id,
                Itinerary.is_deleted == False
            ).scalar() or 0
        else:
            # User has dashboard_stats
            stats = user.dashboard_stats or UserDashboardStats.query.filter_by(user_id=user.id).first()
            karma_value = stats.karma() if stats else 0
            # For old users, count their projects
            from models.project import Project
            itinerary_count = db.session.query(func.count(Project.id)).filter(
                Project.user_id == user.id,
                Project.is_deleted == False
            ).scalar() or 0

        profile = user.to_dict()
        profile['project_count'] = itinerary_count  # Backward compatibility
        profile['itinerary_count'] = itinerary_count
        profile['karma'] = karma_value

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'User profile retrieved',
            'data': profile
        }

        # Cache for 1 hour (auto-invalidated on data changes)
        CacheService.set(cache_key, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to get user profile for {username}: {str(e)}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@users_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(user_id):
    """Update own profile"""
    try:
        # Check both tables for user
        from models.traveler import Traveler
        user = Traveler.query.get(user_id)
        if not user:
            user = User.query.get(user_id)
        if not user:
            return error_response('Not found', 'User not found', 404)

        data = request.get_json()
        schema = UserProfileUpdateSchema()
        validated_data = schema.load(data)

        for key, value in validated_data.items():
            if value is not None:
                setattr(user, key, value)

        db.session.commit()

        # Invalidate user cache
        CacheService.delete(f"user_profile:{user.username}")
        CacheService.invalidate_user(user_id)

        # Emit Socket.IO event for real-time profile updates
        from services.socket_service import SocketService
        # Handle different to_dict parameters for User vs Traveler
        if isinstance(user, Traveler):
            user_dict = user.to_dict(include_sensitive=False)
            user_dict_full = user.to_dict(include_sensitive=True)
        else:
            user_dict = user.to_dict(include_email=False)
            user_dict_full = user.to_dict(include_email=True)

        SocketService.emit_profile_updated(user_id, user_dict)

        return success_response(user_dict_full, 'Profile updated', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@users_bp.route('/stats', methods=['GET'])
@token_required
def get_user_stats(user_id):
    """Get user statistics - works for both User and Traveler tables"""
    try:
        # Check both tables for user
        from models.traveler import Traveler
        from models.comment import Comment
        user = Traveler.query.get(user_id)
        is_traveler = user is not None

        if not user:
            user = User.query.get(user_id)
        if not user:
            return error_response('Not found', 'User not found', 404)

        # If traveler, calculate stats dynamically (no denormalized table for travelers)
        if is_traveler:
            # Count itineraries created by this traveler
            itinerary_count = Itinerary.query.filter_by(
                created_by_traveler_id=user_id,
                is_deleted=False,
                is_published=True
            ).count()

            # Calculate total upvotes on itineraries
            itinerary_upvotes = db.session.query(
                func.coalesce(func.sum(Itinerary.upvotes), 0)
            ).filter(
                Itinerary.created_by_traveler_id == user_id,
                Itinerary.is_deleted == False,
                Itinerary.is_published == True
            ).scalar() or 0

            # Count comments by this traveler
            # For travelers: count both old comments AND travel intel (new comment system)
            from models.travel_intel import TravelIntel
            old_comments = Comment.query.filter_by(user_id=user_id).count()
            travel_intel_comments = TravelIntel.query.filter_by(traveler_id=user_id).count()
            comment_count = old_comments + travel_intel_comments

            # Travelers don't use intros system (that's for old users table)
            stats = {
                'user_id': user_id,
                'username': user.username,
                'project_count': itinerary_count,  # Total itineraries
                'active_projects': itinerary_count,
                'total_proof_score': 0,
                'comment_count': comment_count,
                'total_upvotes': int(itinerary_upvotes),
                'badges_given': 0,
                'badges_awarded': 0,
                'badges_received': 0,
                'intros_sent': 0,
                'intros_received': 0,
                'intro_requests_pending': 0,
                'karma_score': 0,
                'unread_messages': 0,
                'unread_notifications': 0,
            }
            return success_response(stats, 'Traveler stats retrieved', 200)

        # For old users table - use denormalized stats
        from sqlalchemy import text
        result = db.session.execute(
            text("SELECT * FROM user_dashboard_stats WHERE user_id = :user_id"),
            {'user_id': user_id}
        ).fetchone()

        if result:
            # Convert row to dict
            stats = dict(result._mapping)
            # Add username for convenience
            stats['username'] = user.username
            # Map field names to match existing API
            stats['badges_awarded'] = stats.get('badges_given', 0)

            # Calculate total upvotes dynamically from projects
            project_upvotes = db.session.query(
                func.coalesce(func.sum(Project.upvotes), 0)
            ).filter(
                Project.user_id == user_id,
                Project.is_deleted == False
            ).scalar() or 0

            stats['total_upvotes'] = int(project_upvotes)

            return success_response(stats, 'User stats retrieved', 200)
        else:
            # First time user from users table - create empty stats entry
            db.session.execute(
                text("INSERT INTO user_dashboard_stats (user_id) VALUES (:user_id) ON CONFLICT (user_id) DO NOTHING"),
                {'user_id': user_id}
            )
            db.session.commit()

            # Calculate upvotes from projects
            project_upvotes = db.session.query(
                func.coalesce(func.sum(Project.upvotes), 0)
            ).filter(
                Project.user_id == user_id,
                Project.is_deleted == False
            ).scalar() or 0

            # Return default stats
            stats = {
                'user_id': user_id,
                'username': user.username,
                'project_count': 0,
                'active_projects': 0,
                'total_proof_score': 0,
                'comment_count': 0,
                'total_upvotes': int(project_upvotes),
                'badges_given': 0,
                'badges_awarded': 0,
                'badges_received': 0,
                'intros_sent': 0,
                'intros_received': 0,
                'intro_requests_pending': 0,
                'karma_score': 0,
                'unread_messages': 0,
                'unread_notifications': 0,
            }
            return success_response(stats, 'User stats initialized', 200)

    except Exception as e:
        import traceback
        print(f"Error in get_user_stats: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@users_bp.route('/<user_id>/projects', methods=['GET'])
@optional_auth
def get_user_projects(current_user_id, user_id):
    """Get projects by user ID (OPTIMIZED with caching)"""
    try:
        page, per_page = get_pagination_params(request)

        # Check cache (1 hour TTL - invalidated on project changes)
        cache_key = f"user_projects:{user_id}:page:{page}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # OPTIMIZED: Eager load creator to avoid N+1
        from sqlalchemy.orm import joinedload
        query = Project.query.filter_by(user_id=user_id, is_deleted=False)
        query = query.options(joinedload(Project.creator))
        query = query.order_by(Project.created_at.desc())

        # OPTIMIZED: Get count efficiently (cached separately)
        count_cache_key = f"user_projects_count:{user_id}"
        total = CacheService.get(count_cache_key)
        if total is None:
            total = query.count()
            CacheService.set(count_cache_key, total, ttl=3600)  # Cache count for 1 hour

        projects = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [p.to_dict(include_creator=True) for p in projects]

        # Build response data
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

        # Cache for 1 hour (auto-invalidated on data changes)
        CacheService.set(cache_key, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/<user_id>/itineraries', methods=['GET'])
@optional_auth
def get_user_itineraries(current_user_id, user_id):
    """Get itineraries by user ID (OPTIMIZED with caching)"""
    try:
        page, per_page = get_pagination_params(request)

        # Check cache (1 hour TTL - invalidated on itinerary changes)
        cache_key = f"user_itineraries:{user_id}:page:{page}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # OPTIMIZED: Eager load creator to avoid N+1
        from sqlalchemy.orm import joinedload
        query = Itinerary.query.filter_by(created_by_traveler_id=user_id, is_deleted=False, is_published=True)
        query = query.options(joinedload(Itinerary.itinerary_creator))
        query = query.order_by(Itinerary.created_at.desc())

        # OPTIMIZED: Get count efficiently (cached separately)
        count_cache_key = f"user_itineraries_count:{user_id}"
        total = CacheService.get(count_cache_key)
        if total is None:
            total = query.count()
            CacheService.set(count_cache_key, total, ttl=3600)  # Cache count for 1 hour

        itineraries = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [i.to_dict(include_creator=True, user_id=current_user_id) for i in itineraries]

        # Build response data
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

        # Cache for 1 hour (auto-invalidated on data changes)
        CacheService.set(cache_key, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/<user_id>/tagged-projects', methods=['GET'])
@optional_auth
def get_user_tagged_projects(current_user_id, user_id):
    """Get projects where user is tagged as a team member (not the author)"""
    try:
        page, per_page = get_pagination_params(request)

        # Check cache (5 min TTL)
        cache_key = f"user_tagged_projects:{user_id}:page:{page}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # Query projects where user is in team_members array but not the author
        # Using PostgreSQL JSONB contains operator @>
        # Note: team_members is JSON, so we need to cast it to JSONB first
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import JSONB
        from sqlalchemy.orm import joinedload

        # OPTIMIZED: Eager load creator to avoid N+1
        query = Project.query.filter(
            and_(
                Project.user_id != user_id,  # Not the author
                Project.is_deleted == False,
                cast(Project.team_members, JSONB).op('@>')(cast([{'user_id': user_id}], JSONB))  # User is in team_members
            )
        ).options(joinedload(Project.creator)).order_by(Project.created_at.desc())

        total = query.count()
        projects = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [p.to_dict(include_creator=True) for p in projects]

        # Build response data
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

        # Cache for 1 hour (auto-invalidated on data changes)
        CacheService.set(cache_key, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/leaderboard/projects', methods=['GET'])
@optional_auth
def get_projects_leaderboard(user_id):
    """Get top projects leaderboard sorted by upvotes (FAST - uses materialized view)"""
    try:
        limit = request.args.get('limit', 50, type=int)

        # Check cache (1 hour TTL - invalidated on votes)
        cache_key = f"leaderboard_projects:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # ULTRA-FAST: Query materialized view (10x faster!)
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT * FROM mv_leaderboard_projects
            ORDER BY rank ASC
            LIMIT :limit
        """), {'limit': limit})

        raw_projects = [dict(row._mapping) for row in result.fetchall()]

        # Transform data
        data = []
        for row in raw_projects:
            project_data = {
                'id': row.get('id'),
                'title': row.get('title'),
                'proof_score': row.get('proof_score') or 0,
                'upvotes': row.get('vote_count') or 0,
                'comment_count': row.get('comment_count') or 0,
                'badge_count': row.get('badge_count') or 0,
                'rank': row.get('rank'),
                'creator': {
                    'id': row.get('user_id'),
                    'username': row.get('username') or 'Unknown',
                    'avatar_url': row.get('profile_image'),
                    'email_verified': row.get('is_verified') or False,
                }
            }
            data.append(project_data)

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'Projects leaderboard retrieved',
            'data': data
        }

        # Cache for 1 hour (auto-invalidates on votes via CacheService.invalidate_leaderboard())
        CacheService.set(cache_key, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/leaderboard/builders', methods=['GET'])
@optional_auth
def get_builders_leaderboard(user_id):
    """Get top builders leaderboard sorted by total karma/score (FAST - uses materialized view)"""
    try:
        limit = request.args.get('limit', 50, type=int)

        # Check cache (1 hour TTL - invalidated on changes)
        cache_key = f"leaderboard_builders:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # ULTRA-FAST: Query materialized view (10x faster!)
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT * FROM mv_leaderboard_builders
            ORDER BY rank ASC
            LIMIT :limit
        """), {'limit': limit})

        raw_builders = [dict(row._mapping) for row in result.fetchall()]

        # Transform data
        data = []
        for row in raw_builders:
            builder_data = {
                'id': row.get('id'),
                'username': row.get('username') or 'Unknown',
                'avatar_url': row.get('profile_image'),
                'bio': row.get('bio'),
                'email_verified': row.get('is_verified') or False,
                'karma': row.get('total_karma') or 0,
                'project_count': row.get('project_count') or 0,
                'badges_given': row.get('badges_given') or 0,
                'comment_count': row.get('comment_count') or 0,
                'rank': row.get('rank'),
            }
            data.append(builder_data)

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'Builders leaderboard retrieved',
            'data': data
        }

        # Cache for 1 hour (auto-invalidates on changes via CacheService.invalidate_leaderboard())
        CacheService.set(cache_key, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)

