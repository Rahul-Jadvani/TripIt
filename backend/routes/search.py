"""
Search routes
"""
from flask import Blueprint, request
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from extensions import db
from models.itinerary import Itinerary
from models.user import User
from models.traveler import Traveler
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

        # OPTIMIZED: Search itineraries with pagination - eager load creator to avoid N+1 queries
        search_pattern = f'%{query}%'
        itinerary_query = Itinerary.query.options(joinedload(Itinerary.itinerary_creator)).filter(
            Itinerary.is_deleted == False,
            or_(
                Itinerary.title.ilike(search_pattern),
                Itinerary.description.ilike(search_pattern),
                Itinerary.destination.ilike(search_pattern),
                Itinerary.travel_style.ilike(search_pattern)
            )
        ).order_by(Itinerary.created_at.desc())

        # OPTIMIZED: Use pagination for itineraries
        itineraries_total = itinerary_query.count()
        itineraries = itinerary_query.limit(per_page).offset((page - 1) * per_page).all()

        # OPTIMIZED: Search users with pagination - Search BOTH tables
        # Search Traveler table (Google OAuth users)
        traveler_query = Traveler.query.filter(
            Traveler.is_active == True,
            or_(
                Traveler.username.ilike(search_pattern),
                Traveler.display_name.ilike(search_pattern),
                Traveler.email.ilike(search_pattern),
                Traveler.bio.ilike(search_pattern)
            )
        ).order_by(Traveler.created_at.desc())

        # Search User table (email/password users)
        user_query = User.query.filter(
            User.is_active == True,
            or_(
                User.username.ilike(search_pattern),
                User.display_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.bio.ilike(search_pattern)
            )
        ).order_by(User.created_at.desc())

        # Limit users to half of per_page or max 20
        user_limit = min(per_page // 2, 20)

        travelers = traveler_query.limit(user_limit).all()
        users_from_user_table = user_query.limit(user_limit).all()

        # Combine users from both tables
        all_users = list(travelers) + list(users_from_user_table)
        all_users = all_users[:user_limit]  # Trim to limit

        users_total = traveler_query.count() + user_query.count()

        # Format results with error handling
        itinerary_results = []
        for i in itineraries:
            try:
                itinerary_results.append(i.to_dict(include_creator=True, user_id=user_id))
            except Exception as e:
                print(f"Error formatting itinerary {i.id}: {e}")
                # Add basic itinerary info without creator
                itinerary_results.append(i.to_dict(include_creator=False, user_id=user_id))

        user_results = []
        for u in all_users:
            try:
                # Handle different parameter names for User vs Traveler
                if isinstance(u, Traveler):
                    user_results.append(u.to_dict(include_sensitive=False))
                elif isinstance(u, User):
                    user_results.append(u.to_dict(include_email=False))
                else:
                    user_results.append({
                        'id': u.id,
                        'username': u.username or 'Unknown',
                        'display_name': u.display_name or u.username or 'Unknown',
                        'avatar_url': getattr(u, 'avatar_url', None),
                        'bio': getattr(u, 'bio', None),
                        'created_at': u.created_at.isoformat() if u.created_at else None
                    })
            except Exception as e:
                print(f"Error formatting user {u.id}: {e}")
                import traceback
                traceback.print_exc()
                # Add minimal user info
                user_results.append({
                    'id': u.id,
                    'username': getattr(u, 'username', 'Unknown'),
                    'display_name': getattr(u, 'display_name', 'Unknown')
                })

        response_data = {
            'projects': itinerary_results,  # Keep 'projects' key for backwards compatibility with frontend
            'itineraries': itinerary_results,  # Also provide 'itineraries' key
            'users': user_results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'itineraries_total': itineraries_total,
                'users_total': users_total,
                'total': itineraries_total + users_total
            }
        }

        # Cache the results
        CacheService.cache_search_results(cache_key, response_data, ttl=300)

        return success_response(response_data, 'Search completed', 200)

    except Exception as e:
        import traceback
        print(f"[SEARCH ERROR] Query: {query if 'query' in locals() else 'N/A'}")
        print(f"[SEARCH ERROR] Error: {str(e)}")
        print(f"[SEARCH ERROR] Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)

