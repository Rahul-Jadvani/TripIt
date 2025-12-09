"""
Caching utilities using Upstash Redis
"""
import json
from upstash_redis import Redis
from flask import current_app


class CacheService:
    """Redis caching service"""

    # Redis client singleton (initialized once on app startup)
    _redis_client = None

    @classmethod
    def initialize(cls, upstash_url: str, upstash_token: str):
        """Initialize Upstash Redis connection (call once on app startup)"""
        try:
            print(f"[CacheService] Initializing Upstash Redis connection to: {upstash_url}")

            # Initialize Upstash Redis client
            cls._redis_client = Redis(url=upstash_url, token=upstash_token)

            # Test connection
            print(f"[CacheService] Testing connection...")
            cls._redis_client.ping()

            print(f"[CacheService] Connected to Upstash Redis: {upstash_url}")
        except Exception as e:
            import traceback
            print(f"[CacheService] Upstash Redis connection failed: {e}")
            print(f"[CacheService] Traceback: {traceback.format_exc()}")
            cls._redis_client = None

    @staticmethod
    def get_redis_client():
        """Get Redis client instance (must be initialized first via initialize())"""
        return CacheService._redis_client

    @staticmethod
    def set(key: str, value, ttl: int = 3600):
        """Set cache value with TTL (default 1 hour)"""
        try:
            # Prevent caching Flask Response objects
            from flask import Response
            if isinstance(value, Response):
                print(f"Cache set error: Cannot cache Flask Response object (key: {key})")
                return False

            client = CacheService.get_redis_client()
            if client:
                # Serialize if not string
                if not isinstance(value, str):
                    value = json.dumps(value)
                client.setex(key, ttl, value)
                return True
        except Exception as e:
            print(f"Cache set error: {e}")
        return False

    @staticmethod
    def get(key: str):
        """Get cache value"""
        try:
            client = CacheService.get_redis_client()
            if client:
                value = client.get(key)
                if value:
                    # Try to deserialize
                    try:
                        return json.loads(value)
                    except:
                        return value
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    @staticmethod
    def delete(key: str):
        """Delete cache key"""
        try:
            client = CacheService.get_redis_client()
            if client:
                client.delete(key)
                return True
        except Exception as e:
            print(f"Cache delete error: {e}")
        return False

    @staticmethod
    def clear_pattern(pattern: str):
        """Delete all keys matching pattern"""
        try:
            client = CacheService.get_redis_client()
            if client:
                keys = client.keys(pattern)
                if keys:
                    client.delete(*keys)
                return True
        except Exception as e:
            print(f"Cache clear error: {e}")
        return False

    @staticmethod
    def cache_feed(page: int, sort: str, data: list, ttl: int = 600):
        """Cache project feed (10 minutes)"""
        key = f"feed:{sort}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_feed(page: int, sort: str):
        """Get cached project feed"""
        key = f"feed:{sort}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_project_feed():
        """Invalidate all feed caches when project changes"""
        CacheService.clear_pattern("feed:*")

    @staticmethod
    def cache_project(project_id: str, data: dict, ttl: int = 3600):
        """Cache project details (1 hour)"""
        key = f"project:{project_id}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_project(project_id: str):
        """Get cached project"""
        key = f"project:{project_id}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_project(project_id: str):
        """Invalidate project cache and related feeds"""
        CacheService.delete(f"project:{project_id}")
        CacheService.invalidate_project_feed()

    @staticmethod
    def cache_user(user_id: str, data: dict, ttl: int = 3600):
        """Cache user profile (1 hour)"""
        key = f"user:{user_id}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_user(user_id: str):
        """Get cached user"""
        key = f"user:{user_id}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_user(user_id: str):
        """Invalidate user cache"""
        CacheService.delete(f"user:{user_id}")

    @staticmethod
    def invalidate_leaderboard():
        """Invalidate all leaderboard caches when rankings change"""
        CacheService.clear_pattern("leaderboard_*")
        CacheService.clear_pattern("leaderboard:*")  # Also clear projects.py leaderboard pattern

    @staticmethod
    def invalidate_user_projects(user_id: str):
        """Invalidate user's projects list cache"""
        CacheService.clear_pattern(f"user_projects:{user_id}:*")

    @staticmethod
    def get_projects_count(sort: str = 'all'):
        """Get cached project count (for pagination)"""
        key = f"count:projects:{sort}"
        return CacheService.get(key)

    @staticmethod
    def set_projects_count(count: int, sort: str = 'all', ttl: int = 3600):
        """Cache project count (1 hour - invalidated on project create/delete)"""
        key = f"count:projects:{sort}"
        return CacheService.set(key, count, ttl)

    @staticmethod
    def invalidate_counts():
        """Invalidate all count caches when projects change"""
        CacheService.clear_pattern("count:*")

    # ============================================================================
    # ITINERARY CACHING (TripIt)
    # ============================================================================

    @staticmethod
    def cache_itinerary(itinerary_id: str, data: dict, ttl: int = 3600):
        """Cache itinerary details (1 hour)"""
        key = f"itinerary:{itinerary_id}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_itinerary(itinerary_id: str):
        """Get cached itinerary"""
        key = f"itinerary:{itinerary_id}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_itinerary(itinerary_id: str):
        """Invalidate itinerary cache and related feeds"""
        CacheService.delete(f"itinerary:{itinerary_id}")
        CacheService.invalidate_itinerary_feed()
        CacheService.invalidate_itinerary_intel(itinerary_id)

    @staticmethod
    def invalidate_itinerary_feed():
        """Invalidate all itinerary feed caches when itineraries change"""
        CacheService.clear_pattern("itinerary_feed:*")
        CacheService.delete("featured_itineraries")
        CacheService.delete("rising_stars_itineraries")

    @staticmethod
    def invalidate_user_itineraries(user_id: str):
        """Invalidate a user's itineraries cache"""
        CacheService.clear_pattern(f"user_itineraries:{user_id}:*")

    @staticmethod
    def invalidate_itinerary_intel(itinerary_id: str):
        """Invalidate itinerary intel caches"""
        CacheService.clear_pattern(f"itinerary_intel:{itinerary_id}:*")
        CacheService.clear_pattern(f"travel_intel:{itinerary_id}:*")

    # ============================================================================
    # CHAIN CACHING
    # ============================================================================

    @staticmethod
    def cache_chain(slug: str, data: dict, ttl: int = 3600):
        """Cache chain details (1 hour)"""
        key = f"chain:{slug}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_chain(slug: str):
        """Get cached chain"""
        key = f"chain:{slug}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_chain(slug: str):
        """Invalidate chain cache"""
        CacheService.delete(f"chain:{slug}")
        CacheService.clear_pattern("chains:list:*")  # Invalidate list caches

    @staticmethod
    def cache_chain_list(page: int, sort: str, filters: str, data: dict, ttl: int = 600):
        """Cache chain list (10 minutes)"""
        key = f"chains:list:{sort}:{filters}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_chain_list(page: int, sort: str, filters: str):
        """Get cached chain list"""
        key = f"chains:list:{sort}:{filters}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def cache_chain_projects(slug: str, page: int, sort: str, data: dict, ttl: int = 600):
        """Cache chain projects list (10 minutes)"""
        key = f"chain:{slug}:projects:{sort}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_chain_projects(slug: str, page: int, sort: str):
        """Get cached chain projects"""
        key = f"chain:{slug}:projects:{sort}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_chain_projects(slug: str):
        """Invalidate chain projects cache"""
        CacheService.clear_pattern(f"chain:{slug}:projects:*")

    # ============================================================================
    # EVENT CACHING
    # ============================================================================

    @staticmethod
    def cache_event(slug: str, data: dict, ttl: int = 3600):
        """Cache event details (1 hour)"""
        key = f"event:{slug}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_event(slug: str):
        """Get cached event"""
        key = f"event:{slug}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_event(slug: str):
        """Invalidate event cache"""
        CacheService.delete(f"event:{slug}")
        CacheService.clear_pattern("events:list:*")

    @staticmethod
    def cache_event_list(page: int, sort: str, filters: str, data: dict, ttl: int = 600):
        """Cache event list (10 minutes)"""
        key = f"events:list:{sort}:{filters}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_event_list(page: int, sort: str, filters: str):
        """Get cached event list"""
        key = f"events:list:{sort}:{filters}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def cache_event_projects(slug: str, page: int, sort: str, data: dict, ttl: int = 600):
        """Cache event projects (10 minutes)"""
        key = f"event:{slug}:projects:{sort}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_event_projects(slug: str, page: int, sort: str):
        """Get cached event projects"""
        key = f"event:{slug}:projects:{sort}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_event_projects(slug: str):
        """Invalidate event projects cache"""
        CacheService.clear_pattern(f"event:{slug}:projects:*")

    # ============================================================================
    # NOTIFICATION CACHING
    # ============================================================================

    @staticmethod
    def cache_notifications(user_id: str, page: int, filters: str, data: dict, ttl: int = 300):
        """Cache notifications (5 minutes)"""
        key = f"notifications:{user_id}:{filters}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_notifications(user_id: str, page: int, filters: str):
        """Get cached notifications"""
        key = f"notifications:{user_id}:{filters}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_user_notifications(user_id: str):
        """Invalidate user notifications cache"""
        CacheService.clear_pattern(f"notifications:{user_id}:*")

    @staticmethod
    def cache_unread_count(user_id: str, count: int, ttl: int = 300):
        """Cache unread notification count (5 minutes)"""
        key = f"notifications:unread:{user_id}"
        return CacheService.set(key, count, ttl)

    @staticmethod
    def get_cached_unread_count(user_id: str):
        """Get cached unread count"""
        key = f"notifications:unread:{user_id}"
        return CacheService.get(key)

    # ============================================================================
    # COMMENT CACHING
    # ============================================================================

    @staticmethod
    def cache_comments(project_id: str, page: int, data: dict, ttl: int = 600):
        """Cache project comments (10 minutes)"""
        key = f"comments:project:{project_id}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_comments(project_id: str, page: int):
        """Get cached comments"""
        key = f"comments:project:{project_id}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_project_comments(project_id: str):
        """Invalidate project comments cache"""
        CacheService.clear_pattern(f"comments:project:{project_id}:*")

    # ============================================================================
    # FEEDBACK CACHING
    # ============================================================================

    @staticmethod
    def cache_feedback_list(page: int, filters: str, data: dict, ttl: int = 600):
        """Cache feedback list (10 minutes)"""
        key = f"feedback:list:{filters}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_feedback_list(page: int, filters: str):
        """Get cached feedback list"""
        key = f"feedback:list:{filters}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_feedback():
        """Invalidate all feedback caches"""
        CacheService.clear_pattern("feedback:*")

    # ============================================================================
    # ADMIN STATS CACHING
    # ============================================================================

    @staticmethod
    def cache_admin_stats(data: dict, ttl: int = 300):
        """Cache admin dashboard stats (5 minutes)"""
        key = "admin:stats"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_admin_stats():
        """Get cached admin stats"""
        key = "admin:stats"
        return CacheService.get(key)

    @staticmethod
    def invalidate_admin_stats():
        """Invalidate admin stats"""
        CacheService.delete("admin:stats")

    # ============================================================================
    # ANALYTICS CACHING
    # ============================================================================

    @staticmethod
    def cache_analytics(entity_type: str, entity_id: str, data: dict, ttl: int = 1800):
        """Cache analytics data (30 minutes)"""
        key = f"analytics:{entity_type}:{entity_id}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_analytics(entity_type: str, entity_id: str):
        """Get cached analytics"""
        key = f"analytics:{entity_type}:{entity_id}"
        return CacheService.get(key)

    # ============================================================================
    # SEARCH CACHING
    # ============================================================================

    @staticmethod
    def cache_search_results(query: str, data: dict, ttl: int = 300):
        """Cache search results (5 minutes)"""
        key = f"search:{query}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_search_results(query: str):
        """Get cached search results"""
        key = f"search:{query}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_search_results(query: str = None):
        """Invalidate search results cache for a specific query or all search results"""
        if query:
            key = f"search:{query}"
            CacheService.delete(key)
        else:
            # Invalidate all search results with pattern search:*
            CacheService.clear_pattern("search:*")

    # ============================================================================
    # INTRO REQUESTS CACHING
    # ============================================================================

    @staticmethod
    def cache_intro_requests(user_id: str, request_type: str, page: int, data: dict, ttl: int = 300):
        """Cache intro requests (5 minutes)"""
        key = f"intro_requests:{request_type}:{user_id}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_intro_requests(user_id: str, request_type: str, page: int):
        """Get cached intro requests"""
        key = f"intro_requests:{request_type}:{user_id}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_intro_requests(user_id: str):
        """Invalidate intro requests cache"""
        CacheService.clear_pattern(f"intro_requests:*:{user_id}:*")

    # ============================================================================
    # BADGES CACHING
    # ============================================================================

    @staticmethod
    def cache_project_badges(project_id: str, data: list, ttl: int = 3600):
        """Cache project badges (1 hour)"""
        key = f"badges:project:{project_id}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_project_badges(project_id: str):
        """Get cached project badges"""
        key = f"badges:project:{project_id}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_project_badges(project_id: str):
        """Invalidate project badges cache"""
        CacheService.delete(f"badges:project:{project_id}")

    # ============================================================================
    # VOTES CACHING
    # ============================================================================

    @staticmethod
    def cache_user_votes(user_id: str, page: int, data: dict, ttl: int = 600):
        """Cache user votes (10 minutes)"""
        key = f"votes:user:{user_id}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_user_votes(user_id: str, page: int):
        """Get cached user votes"""
        key = f"votes:user:{user_id}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_user_votes(user_id: str):
        """Invalidate user votes cache"""
        CacheService.clear_pattern(f"votes:user:{user_id}:*")

    # ============================================================================
    # INVESTOR REQUESTS CACHING
    # ============================================================================

    @staticmethod
    def cache_investor_requests(status: str, page: int, data: dict, ttl: int = 600):
        """Cache investor requests (10 minutes)"""
        key = f"investor_requests:{status}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_investor_requests(status: str, page: int):
        """Get cached investor requests"""
        key = f"investor_requests:{status}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_investor_requests():
        """Invalidate all investor requests caches"""
        CacheService.clear_pattern("investor_requests:*")

    @staticmethod
    def cache_public_investors(filters: str, data: dict, ttl: int = 600):
        """Cache public investors directory (10 minutes)"""
        key = f"public_investors:{filters}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_public_investors(filters: str):
        """Get cached public investors"""
        key = f"public_investors:{filters}"
        return CacheService.get(key)

    # ============================================================================
    # PROJECT UPDATES CACHING
    # ============================================================================

    @staticmethod
    def cache_project_updates(project_id: str, page: int, data: dict, ttl: int = 600):
        """Cache project updates (10 minutes)"""
        key = f"project_updates:{project_id}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_project_updates(project_id: str, page: int):
        """Get cached project updates"""
        key = f"project_updates:{project_id}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_project_updates(project_id: str):
        """Invalidate project updates cache"""
        CacheService.clear_pattern(f"project_updates:{project_id}:*")

    # ============================================================================
    # CHAIN POSTS CACHING
    # ============================================================================

    @staticmethod
    def cache_chain_posts(chain_slug: str, sort: str, page: int, data: dict, ttl: int = 300):
        """Cache chain posts (5 minutes)"""
        key = f"chain_posts:{chain_slug}:{sort}:page:{page}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_chain_posts(chain_slug: str, sort: str, page: int):
        """Get cached chain posts"""
        key = f"chain_posts:{chain_slug}:{sort}:page:{page}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_chain_posts(chain_slug: str):
        """Invalidate chain posts cache"""
        CacheService.clear_pattern(f"chain_posts:{chain_slug}:*")

    @staticmethod
    def cache_chain_post(post_id: str, data: dict, ttl: int = 600):
        """Cache single chain post (10 minutes)"""
        key = f"chain_post:{post_id}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_chain_post(post_id: str):
        """Get cached chain post"""
        key = f"chain_post:{post_id}"
        return CacheService.get(key)

    @staticmethod
    def invalidate_chain_post(post_id: str):
        """Invalidate single chain post cache"""
        CacheService.delete(f"chain_post:{post_id}")

    # ============================================================================
    # BLOCKCHAIN/CERT CACHING
    # ============================================================================

    @staticmethod
    def cache_cert_info(wallet_address: str, data: dict, ttl: int = 1800):
        """Cache cert info (30 minutes)"""
        key = f"cert_info:{wallet_address}"
        return CacheService.set(key, data, ttl)

    @staticmethod
    def get_cached_cert_info(wallet_address: str):
        """Get cached cert info"""
        key = f"cert_info:{wallet_address}"
        return CacheService.get(key)
