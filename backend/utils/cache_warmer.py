"""
Background Cache Warmer - Pre-heats critical caches for instant response times
Runs as background job to keep hot paths always cached
"""
import time
from threading import Thread
from datetime import datetime, timedelta
from flask import current_app
from extensions import db
from utils.cache import CacheService
from models.project import Project
from models.user import User
from models.user_stats import UserDashboardStats
from models.chain import Chain
from models.notification import Notification
from sqlalchemy.orm import joinedload, contains_eager
from sqlalchemy import func


class CacheWarmer:
    """Intelligent cache warmer for critical routes"""

    @staticmethod
    def warm_feed_cache():
        """Pre-warm feed caches for instant loading"""
        print(f"[{datetime.now()}] Warming feed caches...")

        try:
            # Use existing app context instead of creating new one
            # Warm trending feed (most accessed)
            for page in range(1, 4):  # First 3 pages
                try:
                    query = Project.query.filter_by(is_deleted=False)\
                        .options(joinedload(Project.creator))\
                        .order_by(Project.proof_score.desc(), Project.created_at.desc())\
                        .limit(20).offset((page - 1) * 20)

                    projects = query.all()
                    data = [p.to_dict(include_creator=True) for p in projects]

                    # Cache with long TTL
                    CacheService.cache_feed(page, 'trending', {
                        'status': 'success',
                        'data': data,
                        'pagination': {'page': page, 'per_page': 20}
                    }, ttl=3600)

                    print(f"  [OK] Warmed feed page {page} (trending)")
                except Exception as e:
                    print(f"  [FAIL] Failed to warm feed page {page}: {e}")

            # Warm newest feed
            for page in range(1, 3):
                try:
                    query = Project.query.filter_by(is_deleted=False)\
                        .options(joinedload(Project.creator))\
                        .order_by(Project.created_at.desc())\
                        .limit(20).offset((page - 1) * 20)

                    projects = query.all()
                    data = [p.to_dict(include_creator=True) for p in projects]

                    CacheService.cache_feed(page, 'newest', {
                        'status': 'success',
                        'data': data,
                        'pagination': {'page': page, 'per_page': 20}
                    }, ttl=1800)

                    print(f"  [OK] Warmed feed page {page} (newest)")
                except Exception as e:
                    print(f"  [FAIL] Failed to warm newest page {page}: {e}")

        except Exception as e:
            print(f"  [FAIL] Feed cache warming failed: {e}")

    @staticmethod
    def warm_leaderboard_cache():
        """Pre-warm leaderboard for instant access"""
        print(f"[{datetime.now()}] Warming leaderboard cache...")

        try:
            # Top projects
            top_projects = Project.query.filter_by(is_deleted=False)\
                .order_by(Project.proof_score.desc())\
                .limit(50).all()

            leaderboard_data = {
                'top_projects': [p.to_dict(include_creator=True) for p in top_projects],
                'generated_at': datetime.utcnow().isoformat()
            }

            # Cache directly with key
            CacheService.set("leaderboard:all_time", leaderboard_data, ttl=1800)
            print(f"  [OK] Warmed leaderboard (50 projects)")

        except Exception as e:
            print(f"  [FAIL] Leaderboard cache warming failed: {e}")

    @staticmethod
    def warm_top_profiles():
        """Pre-warm top user profiles"""
        print(f"[{datetime.now()}] Warming top profiles...")

        try:
            # Top 20 users by karma (denormalized stats)
            karma_score = func.coalesce(UserDashboardStats.karma_score, 0)
            top_users = User.query.filter_by(is_active=True)\
                .outerjoin(UserDashboardStats, UserDashboardStats.user_id == User.id)\
                .options(contains_eager(User.dashboard_stats))\
                .order_by(karma_score.desc(), User.created_at.asc())\
                .limit(20).all()

            for user in top_users:
                try:
                    user_data = user.to_dict(include_email=False)
                    CacheService.set(f"user_profile:{user.username}", user_data, ttl=1800)
                except Exception as e:
                    print(f"  [FAIL] Failed to warm profile {user.username}: {e}")

            print(f"  [OK] Warmed {len(top_users)} top profiles")

        except Exception as e:
            print(f"  [FAIL] Profile cache warming failed: {e}")

    @staticmethod
    def warm_trending_chains():
        """Pre-warm trending chains"""
        print(f"[{datetime.now()}] Warming trending chains...")

        try:
            chains = Chain.query.filter_by(is_public=True, is_active=True)\
                .order_by(
                    (Chain.project_count * 0.6 + Chain.follower_count * 0.3).desc()
                ).limit(20).all()

            for chain in chains:
                try:
                    # Warm chain posts (first page)
                    from models.chain_post import ChainPost
                    posts = ChainPost.query.filter_by(
                        chain_id=chain.id,
                        parent_id=None,
                        is_deleted=False,
                        is_hidden=False
                    ).options(joinedload(ChainPost.author))\
                    .order_by(
                        ChainPost.is_pinned.desc(),
                        ChainPost.upvote_count.desc(),
                        ChainPost.created_at.desc()
                    ).limit(20).all()

                    posts_data = [p.to_dict(include_author=True) for p in posts]
                    CacheService.cache_chain_posts(chain.slug, 'hot', 1, {
                        'posts': posts_data,
                        'total': len(posts),
                        'page': 1,
                        'per_page': 20
                    }, ttl=300)

                except Exception as e:
                    print(f"  [FAIL] Failed to warm chain {chain.slug}: {e}")

            print(f"  [OK] Warmed {len(chains)} trending chains")

        except Exception as e:
            print(f"  [FAIL] Chain cache warming failed: {e}")

    @staticmethod
    def warm_all():
        """Warm all critical caches sequentially (safer than parallel)"""
        print(f"\n{'='*60}")
        print(f"[{datetime.now()}] Starting cache warming...")
        print(f"{'='*60}\n")

        try:
            # Run sequentially to avoid overwhelming the database
            CacheWarmer.warm_feed_cache()
            CacheWarmer.warm_leaderboard_cache()
            CacheWarmer.warm_top_profiles()
            CacheWarmer.warm_trending_chains()
        except Exception as e:
            print(f"[ERROR] Cache warming failed: {e}")

        print(f"\n{'='*60}")
        print(f"[{datetime.now()}] Cache warming completed!")
        print(f"{'='*60}\n")

    @staticmethod
    def start_background_warmer(app, interval=300):
        """Start background cache warmer that runs every interval seconds"""
        def warmer_loop():
            while True:
                try:
                    # Use app context for all database operations
                    with app.app_context():
                        CacheWarmer.warm_all()
                    time.sleep(interval)
                except Exception as e:
                    print(f"[ERROR] Cache warmer failed: {e}")
                    time.sleep(60)  # Wait 1 minute before retrying

        thread = Thread(target=warmer_loop, daemon=True)
        thread.start()
        print(f"[CACHE WARMER] Started background cache warming (interval: {interval}s)")


if __name__ == "__main__":
    # Test cache warmer
    CacheWarmer.warm_all()
