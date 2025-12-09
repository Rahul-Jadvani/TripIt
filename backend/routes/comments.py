"""
Comment routes
"""
from flask import Blueprint, request
from datetime import datetime
from marshmallow import ValidationError
import traceback
import logging

from extensions import db
from models.comment import Comment
from models.itinerary import Itinerary
from schemas.comment import CommentCreateSchema, CommentUpdateSchema
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from utils.content_utils import get_content_by_id
from utils.user_utils import get_user_by_id

# Setup logging
logger = logging.getLogger(__name__)

comments_bp = Blueprint('comments', __name__)


@comments_bp.route('', methods=['GET'])
@optional_auth
def get_comments(user_id):
    """Get project comments"""
    try:
        project_id = request.args.get('project_id')
        if not project_id:
            return error_response('Bad request', 'project_id required', 400)

        page, per_page = get_pagination_params(request)

        # OPTIMIZED: Check cache first (10 min TTL)
        from utils.cache import CacheService
        cached = CacheService.get_cached_comments(project_id, page)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # Check both Project and Itinerary tables
        content = get_content_by_id(project_id)
        if not content:
            return error_response('Not found', 'Content not found', 404)

        # OPTIMIZED: Eager load author to avoid N+1 queries
        from sqlalchemy.orm import joinedload
        query = Comment.query.filter_by(project_id=project_id, parent_id=None, is_deleted=False)
        query = query.options(joinedload(Comment.author))  # Eager load authors

        total = query.count()
        comments = query.order_by(Comment.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()

        data = [c.to_dict(include_author=True) for c in comments]

        response = paginated_response(data, total, page, per_page)

        # Cache for 10 minutes - paginated_response returns a tuple (data, status_code)
        # Extract just the data dict for caching
        cache_data = response[0] if isinstance(response, tuple) else response.get_json()
        CacheService.cache_comments(project_id, page, cache_data, ttl=600)

        return response
    except Exception as e:
        logger.error(f"❌ GET /comments ERROR: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@comments_bp.route('', methods=['POST'])
@token_required
def create_comment(user_id):
    """Create comment"""
    try:
        data = request.get_json()
        schema = CommentCreateSchema()
        validated_data = schema.load(data)

        # Check both Project and Itinerary tables
        content = get_content_by_id(validated_data['project_id'])
        if not content:
            return error_response('Not found', 'Content not found', 404)

        comment = Comment(
            project_id=validated_data['project_id'],
            user_id=user_id,
            parent_id=validated_data.get('parent_id'),
            content=validated_data['content']
        )

        content.comment_count += 1

        # Recalculate community score immediately
        from models.project import Project
        from models.itinerary import Itinerary

        if isinstance(content, Project):
            from models.event_listeners import update_project_community_score
            update_project_community_score(content)
        elif isinstance(content, Itinerary):
            # Queue full scoring task for itinerary
            from tasks.scoring_tasks import score_itinerary_task
            # Commit first so comment_count is persisted
            db.session.add(comment)
            db.session.commit()
            score_itinerary_task.delay(content.id)
            # Set flag to skip double commit below
            content._skip_commit = True

        db.session.add(comment)
        if not hasattr(content, '_skip_commit'):
            db.session.commit()

        # CRITICAL: Ensure author is loaded after commit
        # This loads the relationship so to_dict() includes author info
        from sqlalchemy.orm import joinedload
        comment = Comment.query.options(joinedload(Comment.author)).get(comment.id)

        # Invalidate project cache and comments cache
        from utils.cache import CacheService
        CacheService.invalidate_project(validated_data['project_id'])
        CacheService.invalidate_project_comments(validated_data['project_id'])

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        SocketService.emit_comment_added(validated_data['project_id'], comment.to_dict(include_author=True))

        # Notify content owner of new comment
        try:
            from utils.notifications import notify_comment_posted, notify_comment_reply
            # Check both user tables for commenter
            commenter = get_user_by_id(user_id)

            if commenter:
                # If it's a reply to another comment, notify the parent comment author
                if validated_data.get('parent_id'):
                    from models.comment import Comment as CommentModel
                    parent_comment = CommentModel.query.get(validated_data['parent_id'])
                    if parent_comment and parent_comment.user_id != user_id:
                        notify_comment_reply(parent_comment.user_id, parent_comment, comment, commenter)
                else:
                    # Otherwise notify content owner (handle both created_by_traveler_id and user_id)
                    content_owner_id = getattr(content, 'created_by_traveler_id', None) or getattr(content, 'user_id', None)
                    if content_owner_id:
                        notify_comment_posted(content_owner_id, content, comment, commenter)
        except Exception as e:
            logger.error(f"❌ POST /comments NOTIFICATION ERROR: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Don't fail the response - comment was already created and emitted
            # Just log the notification error

        return success_response(comment.to_dict(include_author=True), 'Comment created', 201)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@comments_bp.route('/<comment_id>', methods=['PUT'])
@token_required
def update_comment(user_id, comment_id):
    """Update comment"""
    try:
        comment = Comment.query.get(comment_id)
        if not comment:
            return error_response('Not found', 'Comment not found', 404)

        if comment.user_id != user_id:
            return error_response('Forbidden', 'You can only edit your own comments', 403)

        data = request.get_json()
        schema = CommentUpdateSchema()
        validated_data = schema.load(data)

        comment.content = validated_data['content']
        comment.updated_at = datetime.utcnow()

        db.session.commit()

        # Invalidate project cache and comments cache
        from utils.cache import CacheService
        CacheService.invalidate_project(comment.project_id)
        CacheService.invalidate_project_comments(comment.project_id)

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        SocketService.emit_comment_updated(comment.project_id, comment.to_dict(include_author=True))

        return success_response(comment.to_dict(include_author=True), 'Comment updated', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@comments_bp.route('/<comment_id>', methods=['DELETE'])
@token_required
def delete_comment(user_id, comment_id):
    """Delete comment (soft delete)"""
    try:
        comment = Comment.query.get(comment_id)
        if not comment:
            return error_response('Not found', 'Comment not found', 404)

        if comment.user_id != user_id:
            return error_response('Forbidden', 'You can only delete your own comments', 403)

        # Get the content (Project or Itinerary) to update comment count
        content = get_content_by_id(comment.project_id)
        if content:
            content.comment_count = max(0, content.comment_count - 1)

            # Recalculate community score immediately
            from models.event_listeners import update_project_community_score
            update_project_community_score(content)

        comment.is_deleted = True
        db.session.commit()

        # Invalidate project cache and comments cache
        from utils.cache import CacheService
        CacheService.invalidate_project(comment.project_id)
        CacheService.invalidate_project_comments(comment.project_id)

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        SocketService.emit_comment_deleted(comment.project_id, comment_id)

        return success_response(None, 'Comment deleted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@comments_bp.route('/<comment_id>/vote', methods=['POST'])
@token_required
def vote_comment(user_id, comment_id):
    """Vote on a comment (upvote/downvote)"""
    try:
        comment = Comment.query.get(comment_id)
        if not comment:
            return error_response('Not found', 'Comment not found', 404)

        data = request.get_json()
        vote_type = data.get('vote_type', 'up')  # 'up' or 'down'

        if vote_type == 'up':
            comment.upvotes += 1
        elif vote_type == 'down':
            comment.downvotes += 1
        else:
            return error_response('Bad request', 'Invalid vote_type. Use "up" or "down"', 400)

        db.session.commit()

        # Invalidate project cache and comments cache
        from utils.cache import CacheService
        CacheService.invalidate_project(comment.project_id)
        CacheService.invalidate_project_comments(comment.project_id)

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        SocketService.emit_comment_voted(comment.project_id, comment.id, vote_type)

        return success_response(comment.to_dict(include_author=True), f'Comment {vote_type}voted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
