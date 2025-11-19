"""
Celery Tasks for Async Vote Processing
Handles durable database writes and reconciliation
"""
from celery import Task
from celery_app import celery
from extensions import db
from models.vote import Vote
from models.project import Project
from models.user import User
from services.vote_service import VoteService
from datetime import datetime
import traceback
import time


class CallbackTask(Task):
    """Base task with Flask app context"""
    def __call__(self, *args, **kwargs):
        from app import create_app
        app = create_app()
        with app.app_context():
            return self.run(*args, **kwargs)


@celery.task(bind=True, base=CallbackTask, max_retries=3, default_retry_delay=5)
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
    Durable vote processing task - runs asynchronously

    Flow:
    1. Acquire project row lock (serialized writes)
    2. Load ground truth from votes table
    3. Reconcile: only apply if intent differs from DB
    4. Update project counts + community score
    5. Commit to database
    6. Update request status in Redis
    7. Enqueue cache invalidation (batched)
    8. Emit Socket.IO events
    9. Send notifications

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
        print(f"[VoteTask] Processing request {request_id}: {action} {vote_type} on project {project_id} by user {user_id}")

        # 1. Acquire project row lock for serialized writes
        project = db.session.query(Project).with_for_update().get(project_id)
        if not project:
            error_msg = 'Project not found'
            vote_service.update_request_status(
                request_id, 'failed', error=error_msg
            )
            return {'success': False, 'error': error_msg}

        # 2. Load ground truth from database
        existing_vote = Vote.query.filter_by(
            user_id=user_id,
            project_id=project_id
        ).first()

        db_vote_type = existing_vote.vote_type if existing_vote else None

        # 3. Reconcile: Check if DB state matches our intent
        reconciliation_needed = False

        # Convert empty string to None for comparison
        prior_vote_normalized = None if prior_vote == '' else prior_vote

        # If DB state doesn't match our assumption, we need to reconcile
        if db_vote_type != prior_vote_normalized:
            print(f"[VoteTask] RECONCILIATION: DB has '{db_vote_type}', expected '{prior_vote_normalized}'")
            reconciliation_needed = True

        # 4. Apply vote logic based on action
        upvote_delta = 0
        downvote_delta = 0
        vote_created = False

        if action == 'created':
            # Create new vote
            if existing_vote:
                # Already exists in DB - reconciliation case
                if existing_vote.vote_type != vote_type:
                    # Different type - change it
                    if existing_vote.vote_type == 'up':
                        upvote_delta = -1
                    else:
                        downvote_delta = -1

                    existing_vote.vote_type = vote_type

                    if vote_type == 'up':
                        upvote_delta += 1
                    else:
                        downvote_delta += 1
                # else: same type already exists, no change needed
            else:
                # Create new vote
                vote = Vote(user_id=user_id, project_id=project_id, vote_type=vote_type)
                db.session.add(vote)
                vote_created = True

                if vote_type == 'up':
                    upvote_delta = 1
                else:
                    downvote_delta = 1

        elif action == 'removed':
            # Remove vote
            if existing_vote:
                if existing_vote.vote_type == 'up':
                    upvote_delta = -1
                else:
                    downvote_delta = -1

                db.session.delete(existing_vote)
            # else: already removed, no change needed

        elif action == 'changed':
            # Change vote type
            if existing_vote:
                if existing_vote.vote_type == 'up':
                    upvote_delta = -1
                    downvote_delta = 1
                else:
                    upvote_delta = 1
                    downvote_delta = -1

                existing_vote.vote_type = vote_type
            else:
                # Vote doesn't exist - create it
                vote = Vote(user_id=user_id, project_id=project_id, vote_type=vote_type)
                db.session.add(vote)
                vote_created = True

                if vote_type == 'up':
                    upvote_delta = 1
                else:
                    downvote_delta = 1

        # 5. Update project counts
        project.upvotes = max(0, (project.upvotes or 0) + upvote_delta)
        project.downvotes = max(0, (project.downvotes or 0) + downvote_delta)

        # 6. Recalculate community score
        from models.event_listeners import update_project_community_score
        update_project_community_score(project)

        # 7. Commit to database
        db.session.commit()

        print(f"[VoteTask] ✓ Committed: project {project_id} now has {project.upvotes} upvotes, {project.downvotes} downvotes")

        # 8. Update request status in Redis
        vote_service.update_request_status(
            request_id,
            status='completed',
            final_upvotes=project.upvotes,
            final_downvotes=project.downvotes,
            reconciled=reconciliation_needed
        )

        # 9. Enqueue batched cache invalidation (debounced to reduce DB load)
        batch_invalidate_caches.apply_async(
            args=[[project_id], [user_id]],
            countdown=2  # Wait 2 seconds to batch multiple votes
        )

        # 10. Queue materialized view refresh (debounced)
        try:
            from sqlalchemy import text
            event_type = 'vote_removed' if action == 'removed' else 'vote_cast'
            db.session.execute(text(f"SELECT queue_mv_refresh('mv_feed_projects', '{event_type}')"))
            db.session.commit()
        except Exception as e:
            print(f"[VoteTask] Warning: MV refresh queue failed: {e}")
            # Non-critical

        # 11. Emit Socket.IO events
        from services.socket_service import SocketService

        if action == 'removed':
            SocketService.emit_vote_removed(project_id)
        else:
            new_score = project.upvotes - project.downvotes
            SocketService.emit_vote_cast(project_id, vote_type, new_score)

        SocketService.emit_leaderboard_updated()

        # If reconciliation occurred, notify frontend
        if reconciliation_needed:
            from extensions import socketio
            socketio.emit('vote:reconciled', {
                'request_id': request_id,
                'project_id': project_id,
                'final_upvotes': project.upvotes,
                'final_downvotes': project.downvotes
            })

        # 12. Send notification to project owner (only on new vote creation)
        if vote_created and action == 'created':
            try:
                from utils.notifications import notify_project_vote
                voter = User.query.get(user_id)
                if voter and project.user_id != user_id:
                    notify_project_vote(project.user_id, project, voter, vote_type)
            except Exception as e:
                print(f"[VoteTask] Warning: Notification failed: {e}")
                # Non-critical

        # 13. Update task metrics
        latency_ms = (time.time() - start_time) * 1000
        print(f"[VoteTask] ✓ Completed in {latency_ms:.2f}ms (reconciliation: {reconciliation_needed})")

        return {
            'success': True,
            'request_id': request_id,
            'project_id': project_id,
            'final_upvotes': project.upvotes,
            'final_downvotes': project.downvotes,
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


@celery.task(bind=True, base=CallbackTask)
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


@celery.task(bind=True, base=CallbackTask)
def get_vote_metrics(self):
    """Get vote service metrics for monitoring dashboard"""
    try:
        vote_service = VoteService()
        return vote_service.get_metrics()
    except Exception as e:
        print(f"[VoteMetrics] Error getting metrics: {e}")
        return {}
