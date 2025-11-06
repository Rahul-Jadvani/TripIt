"""
Redis Caching Service for User-Specific Data
==============================================
Instagram-style instant updates with background sync to Postgres

Features:
- Instant UI updates (upvotes, follows, bookmarks)
- Background sync to database
- Read path: Redis first, Postgres fallback
- TTL: 24 hours with auto-refresh on access

Usage:
    from services.redis_cache_service import RedisUserCache

    # Upvote a project (instant)
    RedisUserCache.add_upvote(user_id, project_id)

    # Check if upvoted (fast)
    has_upvoted = RedisUserCache.has_upvoted(user_id, project_id)

    # Get all user upvotes for feed (bulk)
    upvoted_ids = RedisUserCache.get_user_upvotes(user_id, project_ids)
"""

import redis
import json
from typing import Set, List, Optional, Dict
from datetime import timedelta
from extensions import db
from models.vote import Vote
from models.chain import ChainFollower


class RedisUserCache:
    """
    Redis cache for user-specific interactions
    Instagram-style: Write to Redis instantly, sync to DB in background
    """

    # Redis client (initialized in app.py)
    redis_client: redis.Redis = None

    # Cache key prefixes
    PREFIX_UPVOTES = "user:upvotes:"        # user:upvotes:{user_id} -> Set[project_id]
    PREFIX_FOLLOWS = "user:follows:"        # user:follows:{user_id} -> Set[chain_id]
    PREFIX_BOOKMARKS = "user:bookmarks:"    # user:bookmarks:{user_id} -> Set[project_id]

    # TTL (24 hours)
    DEFAULT_TTL = 60 * 60 * 24

    @classmethod
    def initialize(cls, redis_url: str):
        """Initialize Redis connection"""
        cls.redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        print(f"[RedisUserCache] Connected to Redis: {redis_url}")

    @classmethod
    def _get_key(cls, prefix: str, user_id: str) -> str:
        """Generate cache key"""
        return f"{prefix}{user_id}"

    # ========================================================================
    # UPVOTES
    # ========================================================================

    @classmethod
    def add_upvote(cls, user_id: str, project_id: str, sync_db: bool = True) -> bool:
        """
        Add upvote to cache (instant UI update)

        Args:
            user_id: User ID
            project_id: Project ID
            sync_db: If True, also write to database immediately

        Returns:
            bool: True if upvote was added, False if already existed
        """
        try:
            key = cls._get_key(cls.PREFIX_UPVOTES, user_id)

            # Add to Redis set
            added = cls.redis_client.sadd(key, project_id)

            # Set TTL
            cls.redis_client.expire(key, cls.DEFAULT_TTL)

            # Sync to database if requested
            if sync_db and added:
                cls._sync_upvote_to_db(user_id, project_id, is_upvote=True)

            return bool(added)

        except Exception as e:
            print(f"[RedisUserCache] Error adding upvote: {e}")
            # Fallback to database
            if sync_db:
                cls._sync_upvote_to_db(user_id, project_id, is_upvote=True)
            return False

    @classmethod
    def remove_upvote(cls, user_id: str, project_id: str, sync_db: bool = True) -> bool:
        """Remove upvote from cache (instant UI update)"""
        try:
            key = cls._get_key(cls.PREFIX_UPVOTES, user_id)

            # Remove from Redis set
            removed = cls.redis_client.srem(key, project_id)

            # Sync to database if requested
            if sync_db and removed:
                cls._sync_upvote_to_db(user_id, project_id, is_upvote=False)

            return bool(removed)

        except Exception as e:
            print(f"[RedisUserCache] Error removing upvote: {e}")
            # Fallback to database
            if sync_db:
                cls._sync_upvote_to_db(user_id, project_id, is_upvote=False)
            return False

    @classmethod
    def has_upvoted(cls, user_id: str, project_id: str) -> bool:
        """
        Check if user has upvoted project (fast lookup)

        Read path:
        1. Check Redis cache (instant)
        2. If cache miss, load from DB and populate cache

        Returns:
            bool: True if upvoted, False otherwise
        """
        try:
            key = cls._get_key(cls.PREFIX_UPVOTES, user_id)

            # Check if key exists
            if not cls.redis_client.exists(key):
                # Cache miss - load from database
                cls._load_upvotes_from_db(user_id)

            # Check membership
            return cls.redis_client.sismember(key, project_id)

        except Exception as e:
            print(f"[RedisUserCache] Error checking upvote: {e}")
            # Fallback to database
            return cls._check_upvote_in_db(user_id, project_id)

    @classmethod
    def get_user_upvotes(cls, user_id: str, project_ids: Optional[List[str]] = None) -> Set[str]:
        """
        Get all project IDs upvoted by user (for feed rendering)

        Args:
            user_id: User ID
            project_ids: Optional list to filter (if None, returns all)

        Returns:
            Set of upvoted project IDs
        """
        try:
            key = cls._get_key(cls.PREFIX_UPVOTES, user_id)

            # Load from DB if not in cache
            if not cls.redis_client.exists(key):
                cls._load_upvotes_from_db(user_id)

            # Get all members
            if project_ids:
                # Filter by provided IDs (intersection)
                return set(cls.redis_client.sinter(key, *project_ids))
            else:
                # Return all
                return cls.redis_client.smembers(key)

        except Exception as e:
            print(f"[RedisUserCache] Error getting upvotes: {e}")
            # Fallback to database
            return cls._get_upvotes_from_db(user_id, project_ids)

    @classmethod
    def _load_upvotes_from_db(cls, user_id: str):
        """Load user's upvotes from database into Redis cache"""
        try:
            upvotes = Vote.query.filter_by(user_id=user_id, vote_type='up').all()

            if upvotes:
                key = cls._get_key(cls.PREFIX_UPVOTES, user_id)
                project_ids = [str(u.project_id) for u in upvotes]

                # Batch add to Redis
                cls.redis_client.sadd(key, *project_ids)
                cls.redis_client.expire(key, cls.DEFAULT_TTL)

                print(f"[RedisUserCache] Loaded {len(project_ids)} upvotes from DB for user {user_id}")

        except Exception as e:
            print(f"[RedisUserCache] Error loading upvotes from DB: {e}")

    @classmethod
    def _sync_upvote_to_db(cls, user_id: str, project_id: str, is_upvote: bool):
        """Sync upvote to database (background operation)"""
        try:
            if is_upvote:
                # Add upvote
                existing = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()
                if not existing:
                    upvote = Vote(user_id=user_id, project_id=project_id, vote_type='up')
                    db.session.add(upvote)
                else:
                    existing.vote_type = 'up'
            else:
                # Remove upvote
                upvote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()
                if upvote:
                    db.session.delete(upvote)

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            print(f"[RedisUserCache] Error syncing upvote to DB: {e}")

    @classmethod
    def _check_upvote_in_db(cls, user_id: str, project_id: str) -> bool:
        """Fallback: Check upvote in database"""
        try:
            return Vote.query.filter_by(
                user_id=user_id,
                project_id=project_id,
                vote_type='up'
            ).count() > 0
        except:
            return False

    @classmethod
    def _get_upvotes_from_db(cls, user_id: str, project_ids: Optional[List[str]] = None) -> Set[str]:
        """Fallback: Get upvotes from database"""
        try:
            query = Vote.query.filter_by(user_id=user_id, vote_type='up')
            if project_ids:
                query = query.filter(Vote.project_id.in_(project_ids))
            return set(str(u.project_id) for u in query.all())
        except:
            return set()

    # ========================================================================
    # CHAIN FOLLOWS
    # ========================================================================

    @classmethod
    def add_follow(cls, user_id: str, chain_id: str, sync_db: bool = True) -> bool:
        """Add chain follow to cache (instant UI update)"""
        try:
            key = cls._get_key(cls.PREFIX_FOLLOWS, user_id)

            # Add to Redis set
            added = cls.redis_client.sadd(key, chain_id)

            # Set TTL
            cls.redis_client.expire(key, cls.DEFAULT_TTL)

            # Sync to database if requested
            if sync_db and added:
                cls._sync_follow_to_db(user_id, chain_id, is_following=True)

            return bool(added)

        except Exception as e:
            print(f"[RedisUserCache] Error adding follow: {e}")
            if sync_db:
                cls._sync_follow_to_db(user_id, chain_id, is_following=True)
            return False

    @classmethod
    def remove_follow(cls, user_id: str, chain_id: str, sync_db: bool = True) -> bool:
        """Remove chain follow from cache (instant UI update)"""
        try:
            key = cls._get_key(cls.PREFIX_FOLLOWS, user_id)

            # Remove from Redis set
            removed = cls.redis_client.srem(key, chain_id)

            # Sync to database if requested
            if sync_db and removed:
                cls._sync_follow_to_db(user_id, chain_id, is_following=False)

            return bool(removed)

        except Exception as e:
            print(f"[RedisUserCache] Error removing follow: {e}")
            if sync_db:
                cls._sync_follow_to_db(user_id, chain_id, is_following=False)
            return False

    @classmethod
    def is_following(cls, user_id: str, chain_id: str) -> bool:
        """Check if user follows chain (fast lookup)"""
        try:
            key = cls._get_key(cls.PREFIX_FOLLOWS, user_id)

            # Check if key exists
            if not cls.redis_client.exists(key):
                # Cache miss - load from database
                cls._load_follows_from_db(user_id)

            # Check membership
            return cls.redis_client.sismember(key, chain_id)

        except Exception as e:
            print(f"[RedisUserCache] Error checking follow: {e}")
            # Fallback to database
            return cls._check_follow_in_db(user_id, chain_id)

    @classmethod
    def get_user_follows(cls, user_id: str) -> Set[str]:
        """Get all chain IDs followed by user"""
        try:
            key = cls._get_key(cls.PREFIX_FOLLOWS, user_id)

            # Load from DB if not in cache
            if not cls.redis_client.exists(key):
                cls._load_follows_from_db(user_id)

            # Return all
            return cls.redis_client.smembers(key)

        except Exception as e:
            print(f"[RedisUserCache] Error getting follows: {e}")
            # Fallback to database
            return cls._get_follows_from_db(user_id)

    @classmethod
    def _load_follows_from_db(cls, user_id: str):
        """Load user's chain follows from database into Redis cache"""
        try:
            follows = ChainFollower.query.filter_by(user_id=user_id).all()

            if follows:
                key = cls._get_key(cls.PREFIX_FOLLOWS, user_id)
                chain_ids = [str(f.chain_id) for f in follows]

                # Batch add to Redis
                cls.redis_client.sadd(key, *chain_ids)
                cls.redis_client.expire(key, cls.DEFAULT_TTL)

                print(f"[RedisUserCache] Loaded {len(chain_ids)} follows from DB for user {user_id}")

        except Exception as e:
            print(f"[RedisUserCache] Error loading follows from DB: {e}")

    @classmethod
    def _sync_follow_to_db(cls, user_id: str, chain_id: str, is_following: bool):
        """Sync follow to database (background operation)"""
        try:
            if is_following:
                # Add follow
                existing = ChainFollower.query.filter_by(user_id=user_id, chain_id=chain_id).first()
                if not existing:
                    follow = ChainFollower(user_id=user_id, chain_id=chain_id)
                    db.session.add(follow)
            else:
                # Remove follow
                follow = ChainFollower.query.filter_by(user_id=user_id, chain_id=chain_id).first()
                if follow:
                    db.session.delete(follow)

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            print(f"[RedisUserCache] Error syncing follow to DB: {e}")

    @classmethod
    def _check_follow_in_db(cls, user_id: str, chain_id: str) -> bool:
        """Fallback: Check follow in database"""
        try:
            return ChainFollower.query.filter_by(
                user_id=user_id,
                chain_id=chain_id
            ).count() > 0
        except:
            return False

    @classmethod
    def _get_follows_from_db(cls, user_id: str) -> Set[str]:
        """Fallback: Get follows from database"""
        try:
            follows = ChainFollower.query.filter_by(user_id=user_id).all()
            return set(str(f.chain_id) for f in follows)
        except:
            return set()

    # ========================================================================
    # BULK OPERATIONS (for feed rendering)
    # ========================================================================

    @classmethod
    def fill_user_data_bulk(cls, user_id: str, items: List[Dict]) -> List[Dict]:
        """
        Fill user-specific data for bulk items (feed, search results)

        Args:
            user_id: Current user ID
            items: List of dicts with 'id' and 'type' ('project' or 'chain')

        Returns:
            Same items with 'user_has_upvoted' or 'user_is_following' added
        """
        try:
            # Get user's upvotes and follows in bulk
            project_ids = [item['id'] for item in items if item.get('type') == 'project']
            chain_ids = [item['id'] for item in items if item.get('type') == 'chain']

            upvoted_ids = cls.get_user_upvotes(user_id, project_ids) if project_ids else set()
            followed_ids = cls.get_user_follows(user_id) if chain_ids else set()

            # Fill data
            for item in items:
                if item.get('type') == 'project':
                    item['user_has_upvoted'] = item['id'] in upvoted_ids
                elif item.get('type') == 'chain':
                    item['user_is_following'] = item['id'] in followed_ids

            return items

        except Exception as e:
            print(f"[RedisUserCache] Error filling user data: {e}")
            return items

    # ========================================================================
    # CACHE INVALIDATION
    # ========================================================================

    @classmethod
    def invalidate_user(cls, user_id: str):
        """Invalidate all cache entries for a user"""
        try:
            keys = [
                cls._get_key(cls.PREFIX_UPVOTES, user_id),
                cls._get_key(cls.PREFIX_FOLLOWS, user_id),
                cls._get_key(cls.PREFIX_BOOKMARKS, user_id),
            ]
            cls.redis_client.delete(*keys)
            print(f"[RedisUserCache] Invalidated cache for user {user_id}")

        except Exception as e:
            print(f"[RedisUserCache] Error invalidating cache: {e}")

    @classmethod
    def clear_all(cls):
        """Clear all user cache (use with caution)"""
        try:
            # Find all keys with our prefixes
            keys = cls.redis_client.keys("user:*")
            if keys:
                cls.redis_client.delete(*keys)
                print(f"[RedisUserCache] Cleared {len(keys)} cache entries")

        except Exception as e:
            print(f"[RedisUserCache] Error clearing cache: {e}")

    # ========================================================================
    # HEALTH CHECK
    # ========================================================================

    @classmethod
    def health_check(cls) -> Dict:
        """Check Redis connection and cache stats"""
        try:
            # Ping Redis
            cls.redis_client.ping()

            # Get cache stats
            info = cls.redis_client.info('stats')
            memory_info = cls.redis_client.info('memory')

            # Count cache keys
            upvote_keys = len(cls.redis_client.keys(f"{cls.PREFIX_UPVOTES}*"))
            follow_keys = len(cls.redis_client.keys(f"{cls.PREFIX_FOLLOWS}*"))

            return {
                'status': 'healthy',
                'connected': True,
                'total_keys': info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0),
                'cache_hit_rate': round(
                    info.get('keyspace_hits', 0) /
                    max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1) * 100,
                    2
                ),
                'memory_used': memory_info.get('used_memory_human'),
                'cached_users': {
                    'upvotes': upvote_keys,
                    'follows': follow_keys
                }
            }

        except Exception as e:
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e)
            }
