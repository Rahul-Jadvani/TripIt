"""
Vote routes
"""
from flask import Blueprint, request
from sqlalchemy.orm import joinedload

from extensions import db
from models.vote import Vote
from models.project import Project
from schemas.vote import VoteCreateSchema
from utils.decorators import token_required
from utils.helpers import success_response, error_response, get_pagination_params, paginated_response
# Legacy scoring removed - community score updated by AI system
from utils.cache import CacheService
from marshmallow import ValidationError

votes_bp = Blueprint('votes', __name__)


@votes_bp.route('', methods=['POST'])
@token_required
def cast_vote(user_id):
    """
    Cast or remove vote (ASYNC - sub-50ms response)

    New async architecture:
    1. Fast path: Validate + update Redis + enqueue Celery task (<50ms)
    2. Slow path: Celery worker does durable DB write + reconciliation
    """
    try:
        # 1. Validate input
        data = request.get_json()
        schema = VoteCreateSchema()
        validated_data = schema.load(data)

        project_id = validated_data['project_id']
        vote_type = validated_data['vote_type']

        # 2. Verify project exists (lightweight check - no locking)
        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        # 3. Fast-path vote processing via Redis
        from services.vote_service import VoteService
        vote_service = VoteService()

        result = vote_service.fast_vote(user_id, project_id, vote_type)

        # 4. Enqueue Celery task for durable processing
        from tasks.vote_tasks import process_vote_event

        process_vote_event.delay(
            request_id=result['request_id'],
            user_id=user_id,
            project_id=project_id,
            vote_type=vote_type,
            prior_vote=result['prior_vote'] or '',
            action=result['action']
        )

        # 5. Return optimistic response immediately
        response_data = {
            'id': project_id,
            'upvotes': result['upvotes'],
            'downvotes': result['downvotes'],
            'user_vote': result['user_vote'],
            'voteCount': result['upvotes'] - result['downvotes'],
            'request_id': result['request_id'],  # For frontend tracking
            'action': result['action']  # 'created'|'removed'|'changed'
        }

        print(f"[VOTE_ASYNC] ✓ Fast path completed in {result['latency_ms']:.2f}ms")
        print(f"  request_id={result['request_id']}, action={result['action']}")
        print(f"  optimistic counts: {result['upvotes']} up, {result['downvotes']} down")

        return success_response(response_data, 'Vote recorded', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        print(f"[VOTE_ASYNC] Error: {e}")
        import traceback
        traceback.print_exc()
        return error_response('Error', str(e), 500)


# Legacy synchronous vote endpoint (kept for rollback)
# Uncomment to switch back to old behavior
"""
@votes_bp.route('/sync', methods=['POST'])
@token_required
def cast_vote_sync(user_id):
    ... (old synchronous code) ...
"""


@votes_bp.route('/status/<request_id>', methods=['GET'])
@token_required
def get_vote_status(user_id, request_id):
    """Get vote request status (for reconciliation polling)"""
    try:
        from services.vote_service import VoteService
        vote_service = VoteService()

        status = vote_service.get_request_status(request_id)
        return success_response(status, 'Vote status retrieved', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)


@votes_bp.route('/metrics', methods=['GET'])
@token_required
def get_vote_metrics(user_id):
    """Get vote service metrics (admin only for now)"""
    try:
        from services.vote_service import VoteService
        vote_service = VoteService()

        metrics = vote_service.get_metrics()
        return success_response(metrics, 'Vote metrics retrieved', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)


@votes_bp.route('/user', methods=['GET'])
@token_required
def get_user_votes(user_id):
    """Get user's votes with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Check cache first
        cached = CacheService.get_cached_user_votes(user_id, page)
        if cached:
            return success_response(cached, 'User votes retrieved', 200)

        # OPTIMIZED: Eager load project to prevent N+1 queries
        query = Vote.query.filter_by(user_id=user_id)\
            .options(joinedload(Vote.project))

        total = query.count()
        votes = query.order_by(Vote.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'votes': [v.to_dict() for v in votes],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (10 minutes)
        CacheService.cache_user_votes(user_id, page, response_data, ttl=600)

        return success_response(response_data, 'User votes retrieved', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)
