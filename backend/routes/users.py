"""
User routes
"""
from flask import Blueprint, request
from marshmallow import ValidationError
from sqlalchemy import and_

from extensions import db
from models.user import User
from models.project import Project
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
        users = User.query.filter(
            and_(
                User.is_active == True,
                (User.username.ilike(search_term) |
                 User.display_name.ilike(search_term) |
                 User.email.ilike(search_term))
            )
        ).limit(limit).all()

        # Return minimal user info for selection
        results = [{
            'id': user.id,
            'username': user.username,
            'display_name': user.display_name,
            'email': user.email,
            'avatar_url': user.avatar_url,
            'is_verified': user.email_verified,
            'has_oxcert': user.has_oxcert
        } for user in users]

        return success_response(results, f'Found {len(results)} users', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/<username>', methods=['GET'])
@optional_auth
def get_user_profile(user_id, username):
    """Get user profile by username"""
    try:
        # Check cache (5 min TTL)
        cache_key = f"user_profile:{username}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        user = User.query.filter_by(username=username).first()
        if not user:
            return error_response('Not found', 'User not found', 404)

        # OPTIMIZED: Use a single query with count instead of lazy loading
        from sqlalchemy import func
        project_count = db.session.query(func.count(Project.id)).filter(
            Project.user_id == user.id,
            Project.is_deleted == False
        ).scalar() or 0

        profile = user.to_dict()
        profile['project_count'] = project_count
        profile['karma'] = user.karma

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'User profile retrieved',
            'data': profile
        }

        # Cache for 5 minutes
        CacheService.set(cache_key, response_data, ttl=300)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(user_id):
    """Update own profile"""
    try:
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
        SocketService.emit_profile_updated(user_id, user.to_dict())

        return success_response(user.to_dict(include_email=True), 'Profile updated', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@users_bp.route('/stats', methods=['GET'])
@token_required
def get_user_stats(user_id):
    """Get user statistics"""
    try:
        user = User.query.get(user_id)
        if not user:
            return error_response('Not found', 'User not found', 404)

        # OPTIMIZED: Single query to get all counts at once
        from sqlalchemy import func
        from models.comment import Comment
        from models.badge import ValidationBadge
        from models.intro import Intro

        counts = db.session.query(
            func.count(Project.id.distinct()).label('project_count'),
            func.count(Comment.id.distinct()).label('comment_count'),
            func.count(ValidationBadge.id.distinct()).label('badges_awarded'),
        ).outerjoin(Project, db.and_(Project.user_id == user_id, Project.is_deleted == False))\
         .outerjoin(Comment, Comment.user_id == user_id)\
         .outerjoin(ValidationBadge, ValidationBadge.validator_id == user_id)\
         .first()

        # Get intro counts separately (simpler query)
        intros_sent = db.session.query(func.count(Intro.id)).filter(Intro.requester_id == user_id).scalar() or 0
        intros_received = db.session.query(func.count(Intro.id)).filter(Intro.recipient_id == user_id).scalar() or 0

        stats = {
            'user_id': user_id,
            'username': user.username,
            'project_count': counts.project_count or 0,
            'comment_count': counts.comment_count or 0,
            'karma': user.karma,
            'badges_awarded': counts.badges_awarded or 0,
            'intros_sent': intros_sent,
            'intros_received': intros_received,
        }

        return success_response(stats, 'User stats retrieved', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/<user_id>/projects', methods=['GET'])
@optional_auth
def get_user_projects(current_user_id, user_id):
    """Get projects by user ID"""
    try:
        page, per_page = get_pagination_params(request)

        # Check cache (5 min TTL)
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

        # OPTIMIZED: Get count efficiently
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

        # Cache for 5 minutes
        CacheService.set(cache_key, response_data, ttl=300)

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

        # Cache for 5 minutes
        CacheService.set(cache_key, response_data, ttl=300)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/leaderboard/projects', methods=['GET'])
@optional_auth
def get_projects_leaderboard(user_id):
    """Get top projects leaderboard sorted by upvotes"""
    try:
        limit = request.args.get('limit', 50, type=int)

        # Check cache (5 min TTL)
        cache_key = f"leaderboard_projects:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # Get top projects by upvotes (eager load creator to avoid N+1 queries)
        from sqlalchemy.orm import joinedload
        projects = Project.query.filter_by(is_deleted=False)\
            .options(joinedload(Project.creator))\
            .order_by(Project.upvotes.desc())\
            .limit(limit)\
            .all()

        data = []
        for rank, project in enumerate(projects, start=1):
            project_dict = project.to_dict(include_creator=True)
            project_dict['rank'] = rank
            data.append(project_dict)

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'Projects leaderboard retrieved',
            'data': data
        }

        # Cache for 15 minutes (leaderboards don't change often)
        CacheService.set(cache_key, response_data, ttl=3600)  # 1 hour cache (auto-invalidates on changes)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@users_bp.route('/leaderboard/builders', methods=['GET'])
@optional_auth
def get_builders_leaderboard(user_id):
    """Get top builders leaderboard sorted by total karma/score"""
    try:
        limit = request.args.get('limit', 50, type=int)

        # Check cache (5 min TTL)
        cache_key = f"leaderboard_builders:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # OPTIMIZED: Get top users with project count in a single query
        from sqlalchemy import func
        from models.project import Project
        users_with_counts = db.session.query(
            User,
            func.count(Project.id).label('project_count')
        ).outerjoin(
            Project,
            and_(Project.user_id == User.id, Project.is_deleted == False)
        ).group_by(
            User.id
        ).order_by(
            User.karma.desc()
        ).limit(limit).all()

        data = []
        for rank, (user, project_count) in enumerate(users_with_counts, start=1):
            user_dict = user.to_dict()
            user_dict['rank'] = rank
            user_dict['project_count'] = project_count
            data.append(user_dict)

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'Builders leaderboard retrieved',
            'data': data
        }

        # Cache for 15 minutes (leaderboards don't change often)
        CacheService.set(cache_key, response_data, ttl=3600)  # 1 hour cache (auto-invalidates on changes)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)
