"""
Vote Service - Fast-path Redis layer for async voting
Handles optimistic vote updates with sub-50ms response time
"""
import redis
import json
import time
from uuid import uuid4
from datetime import datetime
from typing import Dict, Optional, Tuple
from extensions import db
from models.vote import Vote
from models.project import Project


class VoteService:
    """
    High-performance voting service using Redis for instant updates

    Architecture:
    1. Fast path: Validate + update Redis + enqueue Celery task (<50ms)
    2. Slow path: Celery worker does durable DB write + reconciliation
    """

    # Redis key patterns
    KEY_VOTE_STATE = "vote:state:{project_id}"          # Hash: {upvotes, downvotes}
    KEY_VOTE_REQUEST = "vote:request:{request_id}"      # Hash: request metadata
    KEY_VOTE_EVENTS = "vote:events"                     # Stream: audit log
    KEY_VOTE_METRICS = "vote:metrics"                   # Hash: observability
    KEY_USER_UPVOTES = "user:{user_id}:upvotes"         # Set: project IDs user upvoted
    KEY_USER_DOWNVOTES = "user:{user_id}:downvotes"     # Set: project IDs user downvoted

    # Request TTLs
    REQUEST_TTL = 3600  # 1 hour - keep request metadata for debugging
    STATE_TTL = 86400   # 24 hours - cache vote counts for fast reads

    def __init__(self, redis_client=None):
        """Initialize vote service with Redis client"""
        if redis_client is None:
            from config import config
            import os
            redis_url = config[os.getenv("FLASK_ENV", "development")].REDIS_URL
            redis_client = redis.from_url(redis_url, decode_responses=True)

        self.redis = redis_client

    def fast_vote(
        self,
        user_id: str,
        project_id: str,
        vote_type: str
    ) -> Dict:
        """
        Fast-path vote handler - returns in <50ms

        Flow:
        1. Validate input
        2. Look up current user vote state from Redis
        3. Calculate deltas and apply optimistically to Redis
        4. Generate request_id and store metadata
        5. Add event to stream
        6. Return optimistic counts + request_id

        Args:
            user_id: User UUID
            project_id: Project UUID
            vote_type: 'up' or 'down'

        Returns:
            {
                'request_id': str,
                'action': 'created'|'removed'|'changed',
                'upvotes': int,
                'downvotes': int,
                'user_vote': str|None,
                'prior_vote': str|None
            }
        """
        start_time = time.time()

        # Generate unique request ID
        request_id = str(uuid4())

        try:
            # 1. Get current vote state from Redis
            prior_vote = self._get_user_vote(user_id, project_id)

            # 2. Determine action (create/remove/change)
            action, new_user_vote = self._determine_action(prior_vote, vote_type)

            # 3. Calculate vote deltas
            upvote_delta, downvote_delta = self._calculate_deltas(
                prior_vote, vote_type, action
            )

            # 4. Apply optimistic update to Redis vote state
            upvotes, downvotes = self._apply_vote_deltas(
                project_id, upvote_delta, downvote_delta
            )

            # 5. Update user's vote set
            self._update_user_vote_set(user_id, project_id, vote_type, action)

            # 6. Store request metadata for worker reconciliation
            self._store_request_metadata(
                request_id, user_id, project_id, vote_type,
                prior_vote, action, upvotes, downvotes
            )

            # 7. Add event to audit stream
            self._add_to_event_stream(
                request_id, user_id, project_id, vote_type, action
            )

            # 8. Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._update_metrics('fast_vote', latency_ms)

            return {
                'request_id': request_id,
                'action': action,
                'upvotes': upvotes,
                'downvotes': downvotes,
                'user_vote': new_user_vote,
                'prior_vote': prior_vote,
                'latency_ms': round(latency_ms, 2)
            }

        except Exception as e:
            print(f"[VoteService] Fast vote error: {e}")
            import traceback
            traceback.print_exc()

            # Update failure metrics
            self._update_metrics('fast_vote_error')

            raise

    def _get_user_vote(self, user_id: str, project_id: str) -> Optional[str]:
        """Get user's current vote from Redis (fast) or DB (fallback)"""
        try:
            # Check Redis sets for both upvote and downvote
            upvote_key = self.KEY_USER_UPVOTES.format(user_id=user_id)
            downvote_key = self.KEY_USER_DOWNVOTES.format(user_id=user_id)

            has_upvote = self.redis.sismember(upvote_key, project_id)
            has_downvote = self.redis.sismember(downvote_key, project_id)

            if has_upvote:
                return 'up'
            if has_downvote:
                return 'down'

            # If not in Redis, check DB and populate cache
            vote = Vote.query.filter_by(
                user_id=user_id,
                project_id=project_id
            ).first()

            if vote:
                # Populate Redis cache
                if vote.vote_type == 'up':
                    self.redis.sadd(upvote_key, project_id)
                    self.redis.expire(upvote_key, self.STATE_TTL)
                else:
                    self.redis.sadd(downvote_key, project_id)
                    self.redis.expire(downvote_key, self.STATE_TTL)
                return vote.vote_type

            return None

        except Exception as e:
            print(f"[VoteService] Error getting user vote: {e}")
            # Fallback to DB
            vote = Vote.query.filter_by(
                user_id=user_id,
                project_id=project_id
            ).first()
            return vote.vote_type if vote else None

    def _determine_action(
        self,
        prior_vote: Optional[str],
        vote_type: str
    ) -> Tuple[str, Optional[str]]:
        """
        Determine vote action based on prior state

        Returns:
            (action, new_user_vote)
        """
        if prior_vote is None:
            # No prior vote - create new
            return ('created', vote_type)
        elif prior_vote == vote_type:
            # Same type - remove vote
            return ('removed', None)
        else:
            # Different type - change vote
            return ('changed', vote_type)

    def _calculate_deltas(
        self,
        prior_vote: Optional[str],
        vote_type: str,
        action: str
    ) -> Tuple[int, int]:
        """
        Calculate upvote/downvote deltas

        Returns:
            (upvote_delta, downvote_delta)
        """
        upvote_delta = 0
        downvote_delta = 0

        if action == 'created':
            # New vote
            if vote_type == 'up':
                upvote_delta = 1
            else:
                downvote_delta = 1

        elif action == 'removed':
            # Remove existing vote
            if prior_vote == 'up':
                upvote_delta = -1
            else:
                downvote_delta = -1

        elif action == 'changed':
            # Change vote type
            if prior_vote == 'up':
                upvote_delta = -1
                downvote_delta = 1
            else:
                upvote_delta = 1
                downvote_delta = -1

        return (upvote_delta, downvote_delta)

    def _apply_vote_deltas(
        self,
        project_id: str,
        upvote_delta: int,
        downvote_delta: int
    ) -> Tuple[int, int]:
        """
        Apply vote deltas to Redis vote state

        Returns:
            (new_upvotes, new_downvotes)
        """
        key = self.KEY_VOTE_STATE.format(project_id=project_id)

        pipe = self.redis.pipeline()

        # Initialize from DB if not cached
        if not self.redis.exists(key):
            project = Project.query.get(project_id)
            if project:
                pipe.hset(key, mapping={
                    'upvotes': project.upvotes or 0,
                    'downvotes': project.downvotes or 0
                })

        # Apply deltas
        if upvote_delta != 0:
            pipe.hincrby(key, 'upvotes', upvote_delta)
        if downvote_delta != 0:
            pipe.hincrby(key, 'downvotes', downvote_delta)

        # Set TTL
        pipe.expire(key, self.STATE_TTL)

        # Execute pipeline
        pipe.execute()

        # Get final values
        state = self.redis.hgetall(key)
        upvotes = max(0, int(state.get('upvotes', 0)))
        downvotes = max(0, int(state.get('downvotes', 0)))

        # Ensure non-negative
        if upvotes < 0 or downvotes < 0:
            pipe = self.redis.pipeline()
            if upvotes < 0:
                pipe.hset(key, 'upvotes', 0)
            if downvotes < 0:
                pipe.hset(key, 'downvotes', 0)
            pipe.execute()
            upvotes = max(0, upvotes)
            downvotes = max(0, downvotes)

        return (upvotes, downvotes)

    def _update_user_vote_set(
        self,
        user_id: str,
        project_id: str,
        vote_type: str,
        action: str
    ):
        """Update user's vote sets in Redis"""
        upvote_key = self.KEY_USER_UPVOTES.format(user_id=user_id)
        downvote_key = self.KEY_USER_DOWNVOTES.format(user_id=user_id)

        if action == 'created':
            # Add new vote
            if vote_type == 'up':
                self.redis.sadd(upvote_key, project_id)
                self.redis.expire(upvote_key, self.STATE_TTL)
            else:
                self.redis.sadd(downvote_key, project_id)
                self.redis.expire(downvote_key, self.STATE_TTL)

        elif action == 'removed':
            # Remove vote
            if vote_type == 'up':
                self.redis.srem(upvote_key, project_id)
            else:
                self.redis.srem(downvote_key, project_id)

        elif action == 'changed':
            # Change vote type - remove from old, add to new
            if vote_type == 'up':
                self.redis.srem(downvote_key, project_id)
                self.redis.sadd(upvote_key, project_id)
                self.redis.expire(upvote_key, self.STATE_TTL)
            else:
                self.redis.srem(upvote_key, project_id)
                self.redis.sadd(downvote_key, project_id)
                self.redis.expire(downvote_key, self.STATE_TTL)

    def _store_request_metadata(
        self,
        request_id: str,
        user_id: str,
        project_id: str,
        vote_type: str,
        prior_vote: Optional[str],
        action: str,
        optimistic_upvotes: int,
        optimistic_downvotes: int
    ):
        """Store request metadata for worker reconciliation"""
        key = self.KEY_VOTE_REQUEST.format(request_id=request_id)

        metadata = {
            'request_id': request_id,
            'user_id': user_id,
            'project_id': project_id,
            'vote_type': vote_type,
            'prior_vote': prior_vote or '',
            'action': action,
            'optimistic_upvotes': optimistic_upvotes,
            'optimistic_downvotes': optimistic_downvotes,
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat()
        }

        self.redis.hset(key, mapping=metadata)
        self.redis.expire(key, self.REQUEST_TTL)

    def _add_to_event_stream(
        self,
        request_id: str,
        user_id: str,
        project_id: str,
        vote_type: str,
        action: str
    ):
        """Add vote event to Redis stream for audit/replay"""
        try:
            event = {
                'request_id': request_id,
                'user_id': user_id,
                'project_id': project_id,
                'vote_type': vote_type,
                'action': action,
                'timestamp': datetime.utcnow().isoformat()
            }

            # Add to stream (keep last 10,000 events)
            self.redis.xadd(
                self.KEY_VOTE_EVENTS,
                event,
                maxlen=10000,
                approximate=True
            )
        except Exception as e:
            print(f"[VoteService] Error adding to event stream: {e}")
            # Non-critical - don't fail the vote

    def _update_metrics(self, metric_name: str, value: float = 1):
        """Update vote metrics for observability"""
        try:
            key = self.KEY_VOTE_METRICS

            pipe = self.redis.pipeline()
            pipe.hincrby(key, f'{metric_name}_count', 1)

            if metric_name == 'fast_vote':
                # Track latency
                pipe.hincrbyfloat(key, 'total_latency_ms', value)
                pipe.hset(key, 'last_latency_ms', value)

            pipe.execute()
        except Exception as e:
            print(f"[VoteService] Error updating metrics: {e}")
            # Non-critical

    def get_request_status(self, request_id: str) -> Dict:
        """Get vote request status (for frontend polling/reconciliation)"""
        key = self.KEY_VOTE_REQUEST.format(request_id=request_id)
        metadata = self.redis.hgetall(key)

        if not metadata:
            return {'status': 'not_found'}

        return {
            'status': metadata.get('status', 'pending'),
            'request_id': request_id,
            'reconciled': metadata.get('reconciled', 'false') == 'true',
            'error': metadata.get('error', None),
            'final_upvotes': int(metadata['final_upvotes']) if 'final_upvotes' in metadata else None,
            'final_downvotes': int(metadata['final_downvotes']) if 'final_downvotes' in metadata else None
        }

    def update_request_status(
        self,
        request_id: str,
        status: str,
        final_upvotes: Optional[int] = None,
        final_downvotes: Optional[int] = None,
        reconciled: bool = False,
        error: Optional[str] = None
    ):
        """Update request status after worker processing"""
        key = self.KEY_VOTE_REQUEST.format(request_id=request_id)

        updates = {'status': status}

        if final_upvotes is not None:
            updates['final_upvotes'] = final_upvotes
        if final_downvotes is not None:
            updates['final_downvotes'] = final_downvotes
        if reconciled:
            updates['reconciled'] = 'true'
        if error:
            updates['error'] = error

        updates['updated_at'] = datetime.utcnow().isoformat()

        self.redis.hset(key, mapping=updates)

    def get_metrics(self) -> Dict:
        """Get vote service metrics for monitoring"""
        metrics = self.redis.hgetall(self.KEY_VOTE_METRICS)

        if not metrics:
            return {}

        total_votes = int(metrics.get('fast_vote_count', 0))
        total_errors = int(metrics.get('fast_vote_error_count', 0))
        total_latency = float(metrics.get('total_latency_ms', 0))

        return {
            'total_votes': total_votes,
            'total_errors': total_errors,
            'success_rate': round((total_votes / (total_votes + total_errors) * 100), 2) if (total_votes + total_errors) > 0 else 0,
            'avg_latency_ms': round(total_latency / total_votes, 2) if total_votes > 0 else 0,
            'last_latency_ms': float(metrics.get('last_latency_ms', 0))
        }

    def invalidate_project_cache(self, project_id: str):
        """Invalidate cached vote state for a project"""
        key = self.KEY_VOTE_STATE.format(project_id=project_id)
        self.redis.delete(key)

    def invalidate_user_vote_cache(self, user_id: str):
        """Invalidate user's vote cache (both upvotes and downvotes)"""
        upvote_key = self.KEY_USER_UPVOTES.format(user_id=user_id)
        downvote_key = self.KEY_USER_DOWNVOTES.format(user_id=user_id)
        self.redis.delete(upvote_key)
        self.redis.delete(downvote_key)
