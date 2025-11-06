"""
Search routes
"""
from flask import Blueprint, request
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from extensions import db
from models.project import Project
from models.user import User
from utils.decorators import optional_auth
from utils.helpers import success_response, error_response, get_pagination_params, paginated_response
from utils.cache import CacheService

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
@optional_auth
def search(user_id):
    """Search for projects and users with caching and pagination"""
    try:
        query = request.args.get('q', '').strip()
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=50)

        if not query:
            return error_response('Validation error', 'Search query is required', 400)

        if len(query) < 2:
            return error_response('Validation error', 'Search query must be at least 2 characters', 400)

        # Check cache first (5 minutes TTL)
        cache_key = f"{query}:{page}:{per_page}"
        cached = CacheService.get_cached_search_results(cache_key)
        if cached:
            return success_response(cached, 'Search completed', 200)

        # OPTIMIZED: Search projects with pagination - eager load creator to avoid N+1 queries
        search_pattern = f'%{query}%'
        project_query = Project.query.options(joinedload(Project.creator)).filter(
            Project.is_deleted == False,
            or_(
                Project.title.ilike(search_pattern),
                Project.tagline.ilike(search_pattern),
                Project.description.ilike(search_pattern),
                Project.hackathon_name.ilike(search_pattern)
            )
        ).order_by(Project.proof_score.desc(), Project.created_at.desc())

        # OPTIMIZED: Use pagination for projects
        projects_total = project_query.count()
        projects = project_query.limit(per_page).offset((page - 1) * per_page).all()

        # OPTIMIZED: Search users with pagination
        user_query = User.query.filter(
            User.is_active == True,
            or_(
                User.username.ilike(search_pattern),
                User.display_name.ilike(search_pattern),
                User.bio.ilike(search_pattern)
            )
        ).order_by(User.created_at.desc())

        # Limit users to half of per_page or max 20
        user_limit = min(per_page // 2, 20)
        users_total = user_query.count()
        users = user_query.limit(user_limit).all()

        # Format results
        project_results = [p.to_dict(include_creator=True, user_id=user_id) for p in projects]
        user_results = [u.to_dict(include_email=False) for u in users]

        response_data = {
            'projects': project_results,
            'users': user_results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'projects_total': projects_total,
                'users_total': users_total,
                'total': projects_total + users_total
            }
        }

        # Cache the results
        CacheService.cache_search_results(cache_key, response_data, ttl=300)

        return success_response(response_data, 'Search completed', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
