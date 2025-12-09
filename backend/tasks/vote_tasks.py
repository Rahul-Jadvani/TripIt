"""
Celery Tasks for Async Vote Processing
Handles durable database writes and reconciliation
"""
from celery_app import celery
from extensions import db
from models.vote import Vote
from models.project import Project
from models.user import User
from services.vote_service import VoteService
from datetime import datetime
import traceback
import time


@celery.task(bind=True, max_retries=3, default_retry_delay=5)
def process_vote_event(
    self,
    request_id: str,
    user_id: str,
    project_id: str,
    vote_type: str,
    prior_vote: str,
    action: str
):
    """
    Lightweight vote processing task - logs events only

    NEW ARCHITECTURE:
    1. Update votes table (user vote state)
    2. Log event to vote_events table
    3. Mark post as changed in Redis
    4. DO NOT update projects table (done by Beat sync task)

    Args:
        request_id: Unique request ID from fast path
        user_id: User UUID
        project_id: Project UUID
        vote_type: 'up' or 'down'
        prior_vote: Prior vote state ('up'|'down'|'')
        action: 'created'|'removed'|'changed'

    Returns:
        Dict with processing results
    """
    start_time = time.time()
    vote_service = VoteService()

    try:
        # Reduced logging for cleaner output

        # 1. Load existing vote from database
        existing_vote = Vote.query.filter_by(
            user_id=user_id,
            project_id=project_id
        ).first()

        db_vote_type = existing_vote.vote_type if existing_vote else None

        # 2. Reconcile: Check if DB state matches our intent
        reconciliation_needed = False
        prior_vote_normalized = None if prior_vote == '' else prior_vote

        if db_vote_type != prior_vote_normalized:
            reconciliation_needed = True

        # 3. Apply vote logic to votes table ONLY
        vote_created = False

        if action == 'created':
            if existing_vote:
                # Already exists - change type if different
                if existing_vote.vote_type != vote_type:
                    existing_vote.vote_type = vote_type
            else:
                # Create new vote
                vote = Vote(user_id=user_id, project_id=project_id, vote_type=vote_type)
                db.session.add(vote)
                vote_created = True

        elif action == 'removed':
            # Remove vote
            if existing_vote:
                db.session.delete(existing_vote)

        elif action == 'changed':
            # Change vote type
            if existing_vote:
                existing_vote.vote_type = vote_type
            else:
                # Vote doesn't exist - create it
                vote = Vote(user_id=user_id, project_id=project_id, vote_type=vote_type)
                db.session.add(vote)
                vote_created = True

        # 4. Log event to vote_events table
        try:
            from sqlalchemy import text
            db.session.execute(text("""
                INSERT INTO vote_events (request_id, user_id, project_id, vote_type, action)
                VALUES (:request_id, :user_id, :project_id, :vote_type, :action)
            """), {
                'request_id': request_id,
                'user_id': user_id,
                'project_id': project_id,
                'vote_type': vote_type,
                'action': action
            })
        except Exception as e:
            print(f"[VoteTask] Warning: Failed to log event: {e}")
            # Non-critical

        # 5. Commit votes table changes
        db.session.commit()

        # 6. Update request status in Redis
        vote_service.update_request_status(
            request_id,
            status='completed',
            reconciled=reconciliation_needed
        )

        # 7. Send notification to project/itinerary owner (only on new vote creation)
        if vote_created and action == 'created':
            try:
                from utils.notifications import notify_project_vote
                from utils.content_utils import get_content_by_id
                from models.traveler import Traveler

                voter = User.query.get(user_id) or Traveler.query.get(user_id)
                content = get_content_by_id(project_id)

                if voter and content:
                    # Get owner ID - works for both Project (user_id) and Itinerary (created_by_traveler_id)
                    owner_id = getattr(content, 'user_id', None) or getattr(content, 'created_by_traveler_id', None)
                    if owner_id and owner_id != user_id:
                        notify_project_vote(owner_id, content, voter, vote_type)
            except Exception as e:
                print(f"[VoteTask] Warning: Notification failed: {e}")
                # Non-critical

        # 8. Update task metrics
        latency_ms = (time.time() - start_time) * 1000

        return {
            'success': True,
            'request_id': request_id,
            'project_id': project_id,
            'reconciliation_needed': reconciliation_needed,
            'latency_ms': round(latency_ms, 2)
        }

    except Exception as e:
        db.session.rollback()
        print(f"[VoteTask] Error processing vote: {e}")
        traceback.print_exc()

        # Update request status to failed
        vote_service.update_request_status(
            request_id,
            status='failed',
            error=str(e)
        )

        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 5 * (2 ** self.request.retries)  # 5s, 10s, 20s
            print(f"[VoteTask] Retrying in {retry_delay}s (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(countdown=retry_delay, exc=e)

        return {
            'success': False,
            'request_id': request_id,
            'error': str(e)
        }


@celery.task(bind=True, name='sync_votes_to_db')
def sync_votes_to_db(self):
    """
    Periodic task to sync Redis vote counts to PostgreSQL

    FIXED: Now recalculates from votes table (source of truth) instead of
    blindly copying Redis counts. This ensures eventual consistency even if
    Redis data becomes stale or incorrect.
    """
    start_time = time.time()
    vote_service = VoteService()

    try:
        # 1. Get all changed posts from Redis
        changed_posts = vote_service.get_changed_posts()

        if not changed_posts:
            return {'success': True, 'synced': 0}

        # 2. For each changed project, recalculate from votes table
        synced_count = 0
        failed_projects = []

        for project_id in changed_posts:
            try:
                # FIXED: Count from votes table (source of truth)
                from sqlalchemy import func, text
                upvotes_count = db.session.query(func.count(Vote.id))\
                    .filter(Vote.project_id == project_id, Vote.vote_type == 'up').scalar() or 0
                downvotes_count = db.session.query(func.count(Vote.id))\
                    .filter(Vote.project_id == project_id, Vote.vote_type == 'down').scalar() or 0

                # 3. Update project/itinerary in DB with raw SQL - try both tables
                result_projects = db.session.execute(text("""
                    UPDATE projects
                    SET upvotes = :upvotes,
                        downvotes = :downvotes
                    WHERE id = :project_id
                """), {
                    'upvotes': upvotes_count,
                    'downvotes': downvotes_count,
                    'project_id': project_id
                })

                result_itineraries = db.session.execute(text("""
                    UPDATE itineraries
                    SET upvotes = :upvotes,
                        downvotes = :downvotes
                    WHERE id = :project_id
                """), {
                    'upvotes': upvotes_count,
                    'downvotes': downvotes_count,
                    'project_id': project_id
                })

                result = result_projects if result_projects.rowcount > 0 else result_itineraries

                # 3.5. CRITICAL: Recalculate community score + total score after raw SQL update
                # Raw SQL bypasses event listeners, so we must manually update scores
                if result.rowcount > 0:
                    # Expire session to fetch fresh data after raw SQL
                    db.session.expire_all()

                    # Try to find as Project first, then as Itinerary
                    from utils.content_utils import get_content_by_id
                    content = get_content_by_id(project_id)

                    if content and isinstance(content, Project):
                        from models.event_listeners import update_project_community_score
                        update_project_community_score(content)
                        db.session.add(content)
                    elif content:
                        # It's an Itinerary - trigger full scoring calculation
                        from models.itinerary import Itinerary
                        if isinstance(content, Itinerary):
                            # Queue full scoring task to recalculate all components
                            from tasks.scoring_tasks import score_itinerary_task
                            score_itinerary_task.delay(project_id)

                # 4. Update Redis to match votes table truth
                if result.rowcount > 0:
                    key = vote_service.KEY_VOTE_STATE.format(project_id=project_id)
                    vote_service.redis.hset(key, {
                        'upvotes': upvotes_count,
                        'downvotes': downvotes_count
                    })
                    vote_service.redis.expire(key, vote_service.STATE_TTL)
                    synced_count += 1

            except Exception as e:
                print(f"[VoteSync] Error syncing {project_id}: {e}")
                failed_projects.append(project_id)

        # 5. Commit all changes at once
        db.session.commit()

        # 6. Clear successfully synced posts from Redis
        successfully_synced = list(changed_posts - set(failed_projects))
        if successfully_synced:
            vote_service.clear_changed_posts(successfully_synced)

        # 7. Invalidate caches for synced projects
        if synced_count > 0:
            batch_invalidate_caches.delay(successfully_synced, [])

        latency_ms = (time.time() - start_time) * 1000

        return {
            'success': True,
            'synced': synced_count,
            'failed': len(failed_projects),
            'latency_ms': round(latency_ms, 2)
        }

    except Exception as e:
        db.session.rollback()
        print(f"[VoteSync] Critical error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }


@celery.task(bind=True)
def batch_invalidate_caches(self, project_ids=None, user_ids=None):
    """
    Batch cache invalidation task - debounced to reduce DB load

    Collects cache invalidation requests over a 2-second window
    and executes them in a single batch

    Args:
        project_ids: List of project IDs to invalidate
        user_ids: List of user IDs to invalidate
    """
    try:
        from utils.cache import CacheService

        project_ids = project_ids or []
        user_ids = user_ids or []

        print(f"[CacheBatch] Invalidating {len(project_ids)} projects, {len(user_ids)} users")

        # Invalidate project caches
        for project_id in project_ids:
            CacheService.invalidate_project(project_id)

        # Invalidate user vote caches
        for user_id in user_ids:
            CacheService.invalidate_user_votes(user_id)

        # Invalidate global caches (once per batch)
        if project_ids:
            CacheService.invalidate_project_feed()
            CacheService.invalidate_leaderboard()

        print(f"[CacheBatch] ✓ Cache invalidation completed")

        return {
            'success': True,
            'projects_invalidated': len(project_ids),
            'users_invalidated': len(user_ids)
        }

    except Exception as e:
        print(f"[CacheBatch] Error invalidating caches: {e}")
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


@celery.task(bind=True)
def get_vote_metrics(self):
    """Get vote service metrics for monitoring dashboard"""
    try:
        vote_service = VoteService()
        return vote_service.get_metrics()
    except Exception as e:
        print(f"[VoteMetrics] Error getting metrics: {e}")
        return {}


@celery.task(bind=True, name='reconcile_all_vote_counts')
def reconcile_all_vote_counts(self, batch_size=100):
    """
    Full reconciliation task - Recalculates ALL project vote counts from votes table

    Use this to fix data inconsistencies across the entire system.
    This task:
    1. Counts votes from votes table (source of truth)
    2. Updates projects table
    3. Updates Redis cache
    4. Processes in batches to avoid blocking

    Args:
        batch_size: Number of projects to process per batch (default: 100)

    Returns:
        Dict with reconciliation statistics
    """
    start_time = time.time()
    vote_service = VoteService()

    try:
        print("[VoteReconciliation] Starting full vote count reconciliation...")

        # 1. Get all projects with votes
        from sqlalchemy import func, text
        projects_with_votes = db.session.query(Vote.project_id)\
            .distinct().limit(batch_size).all()

        project_ids = [p[0] for p in projects_with_votes]

        if not project_ids:
            print("[VoteReconciliation] No projects with votes found")
            return {'success': True, 'reconciled': 0, 'message': 'No projects to reconcile'}

        print(f"[VoteReconciliation] Processing {len(project_ids)} projects...")

        reconciled_count = 0
        fixed_count = 0

        for project_id in project_ids:
            try:
                # Count from votes table (source of truth)
                upvotes_count = db.session.query(func.count(Vote.id))\
                    .filter(Vote.project_id == project_id, Vote.vote_type == 'up').scalar() or 0
                downvotes_count = db.session.query(func.count(Vote.id))\
                    .filter(Vote.project_id == project_id, Vote.vote_type == 'down').scalar() or 0

                # Get current values from projects table
                project = Project.query.get(project_id)
                if not project:
                    continue

                # Check if values are different (need fixing)
                if project.upvotes != upvotes_count or project.downvotes != downvotes_count:
                    print(f"[VoteReconciliation] Fixing {project_id[:8]}... "
                          f"DB: {project.upvotes}↑ {project.downvotes}↓ → "
                          f"Truth: {upvotes_count}↑ {downvotes_count}↓")
                    fixed_count += 1

                # Update projects table with raw SQL
                db.session.execute(text("""
                    UPDATE projects
                    SET upvotes = :upvotes,
                        downvotes = :downvotes
                    WHERE id = :project_id
                """), {
                    'upvotes': upvotes_count,
                    'downvotes': downvotes_count,
                    'project_id': project_id
                })

                # CRITICAL: Recalculate community score + total score after raw SQL update
                # Raw SQL bypasses event listeners, so we must manually update scores
                # Expire and refresh project to get fresh data
                db.session.expire(project)
                db.session.refresh(project)
                from models.event_listeners import update_project_community_score
                update_project_community_score(project)
                # Explicitly mark project as modified so changes are committed
                db.session.add(project)
                # Note: update_project_community_score already updates proof_score

                # Update Redis cache
                key = vote_service.KEY_VOTE_STATE.format(project_id=project_id)
                vote_service.redis.hset(key, {
                    'upvotes': upvotes_count,
                    'downvotes': downvotes_count
                })
                vote_service.redis.expire(key, vote_service.STATE_TTL)

                reconciled_count += 1

            except Exception as e:
                print(f"[VoteReconciliation] Error reconciling {project_id}: {e}")
                continue

        # Commit all changes
        db.session.commit()

        # Invalidate caches
        if reconciled_count > 0:
            batch_invalidate_caches.delay(project_ids, [])

        latency_ms = (time.time() - start_time) * 1000

        print(f"[VoteReconciliation] ✓ Completed: {reconciled_count} projects reconciled, "
              f"{fixed_count} had incorrect counts (fixed)")

        return {
            'success': True,
            'reconciled': reconciled_count,
            'fixed': fixed_count,
            'latency_ms': round(latency_ms, 2)
        }

    except Exception as e:
        db.session.rollback()
        print(f"[VoteReconciliation] Critical error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }
