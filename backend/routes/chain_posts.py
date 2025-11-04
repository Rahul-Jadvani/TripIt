"""
Chain Posts routes - Reddit-style forum discussions within chains
"""
from flask import Blueprint, request
from marshmallow import ValidationError
from datetime import datetime
from uuid import uuid4
from sqlalchemy import desc, and_, or_

from extensions import db
from models.chain import Chain
from models.chain_post import ChainPost, ChainPostReaction
from models.user import User
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, get_pagination_params

chain_posts_bp = Blueprint('chain_posts', __name__)


@chain_posts_bp.route('/<slug>/posts', methods=['POST'])
@token_required
def create_post(user_id, slug):
    """Create a new post or reply in a chain"""
    try:
        data = request.get_json()

        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Check if chain is active
        if chain.status != 'active':
            return error_response('Forbidden', 'This chain is not accepting new posts', 403)

        # Validate required fields
        content = data.get('content', '').strip()
        if not content:
            return error_response('Validation error', 'Content is required', 400)

        title = data.get('title', '').strip()
        parent_id = data.get('parent_id')
        image_urls = data.get('image_urls', [])

        # If it's a top-level post, title is required
        if not parent_id and not title:
            return error_response('Validation error', 'Title is required for top-level posts', 400)

        # If replying, check parent exists and isn't locked
        if parent_id:
            parent_post = ChainPost.query.filter_by(id=parent_id, chain_id=chain.id).first()
            if not parent_post:
                return error_response('Not Found', 'Parent post not found', 404)
            if parent_post.is_locked:
                return error_response('Forbidden', 'This post is locked and cannot receive replies', 403)
            if parent_post.is_deleted:
                return error_response('Forbidden', 'Cannot reply to deleted posts', 403)

        # Create post
        post = ChainPost(
            id=str(uuid4()),
            chain_id=chain.id,
            author_id=user_id,
            parent_id=parent_id,
            title=title if not parent_id else None,  # Only top-level posts have titles
            content=content,
            image_urls=image_urls
        )

        db.session.add(post)
        db.session.commit()

        return success_response(
            post.to_dict(include_author=True, include_chain=False, user_id=user_id),
            'Post created successfully',
            201
        )

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        print(f"Error creating post: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts', methods=['GET'])
@optional_auth
def list_posts(user_id, slug):
    """List posts in a chain (top-level only, sorted by various methods)"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Get sort parameter
        sort = request.args.get('sort', 'hot')  # hot, new, top, pinned

        # Build base query (only top-level posts)
        query = ChainPost.query.filter_by(
            chain_id=chain.id,
            parent_id=None,  # Top-level posts only
            is_deleted=False,
            is_hidden=False
        )

        # Apply sorting
        if sort == 'hot' or sort == 'trending':
            # Hot algorithm: upvotes / time decay
            query = query.order_by(
                desc(ChainPost.is_pinned),
                desc(ChainPost.upvote_count),
                desc(ChainPost.created_at)
            )
        elif sort == 'new':
            query = query.order_by(
                desc(ChainPost.is_pinned),
                desc(ChainPost.created_at)
            )
        elif sort == 'top':
            query = query.order_by(
                desc(ChainPost.is_pinned),
                desc(ChainPost.upvote_count),
                desc(ChainPost.comment_count)
            )
        elif sort == 'active':
            query = query.order_by(
                desc(ChainPost.is_pinned),
                desc(ChainPost.last_activity_at)
            )
        else:
            # Default to hot
            query = query.order_by(
                desc(ChainPost.is_pinned),
                desc(ChainPost.upvote_count),
                desc(ChainPost.created_at)
            )

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        posts = pagination.items

        return success_response({
            'posts': [post.to_dict(include_author=True, user_id=user_id) for post in posts],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        })

    except Exception as e:
        print(f"Error listing posts: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>', methods=['GET'])
@optional_auth
def get_post(user_id, slug, post_id):
    """Get a single post with its replies"""
    try:
        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Get direct replies (one level deep, sorted by upvotes)
        replies = ChainPost.query.filter_by(
            parent_id=post_id,
            is_deleted=False,
            is_hidden=False
        ).order_by(desc(ChainPost.upvote_count), desc(ChainPost.created_at)).all()

        post_dict = post.to_dict(include_author=True, include_chain=True, user_id=user_id)
        post_dict['replies'] = [reply.to_dict(include_author=True, user_id=user_id) for reply in replies]

        return success_response(post_dict)

    except Exception as e:
        print(f"Error getting post: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>/replies', methods=['GET'])
@optional_auth
def get_post_replies(user_id, slug, post_id):
    """Get replies for a specific post (paginated, for infinite scroll)"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)
        sort = request.args.get('sort', 'top')  # top, new

        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Build query for replies
        query = ChainPost.query.filter_by(
            parent_id=post_id,
            is_deleted=False,
            is_hidden=False
        )

        # Apply sorting
        if sort == 'top':
            query = query.order_by(desc(ChainPost.upvote_count), desc(ChainPost.created_at))
        elif sort == 'new':
            query = query.order_by(desc(ChainPost.created_at))
        else:
            query = query.order_by(desc(ChainPost.upvote_count), desc(ChainPost.created_at))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        replies = pagination.items

        return success_response({
            'replies': [reply.to_dict(include_author=True, user_id=user_id) for reply in replies],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        })

    except Exception as e:
        print(f"Error getting replies: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>', methods=['PUT'])
@token_required
def update_post(user_id, slug, post_id):
    """Update a post (author only)"""
    try:
        data = request.get_json()

        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Check ownership
        if post.author_id != user_id:
            return error_response('Forbidden', 'You can only edit your own posts', 403)

        # Check if deleted
        if post.is_deleted:
            return error_response('Forbidden', 'Cannot edit deleted posts', 403)

        # Update fields
        if 'content' in data:
            content = data['content'].strip()
            if not content:
                return error_response('Validation error', 'Content cannot be empty', 400)
            post.content = content

        if 'title' in data and not post.parent_id:  # Only update title for top-level posts
            title = data['title'].strip()
            if not title:
                return error_response('Validation error', 'Title cannot be empty', 400)
            post.title = title

        if 'image_urls' in data:
            post.image_urls = data['image_urls']

        post.updated_at = datetime.utcnow()
        db.session.commit()

        return success_response(
            post.to_dict(include_author=True, user_id=user_id),
            'Post updated successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"Error updating post: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>', methods=['DELETE'])
@token_required
def delete_post(user_id, slug, post_id):
    """Soft delete a post (author or chain owner)"""
    try:
        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Check permission (author or chain owner)
        if post.author_id != user_id and chain.creator_id != user_id:
            return error_response('Forbidden', 'You do not have permission to delete this post', 403)

        # Soft delete
        post.is_deleted = True
        post.content = '[deleted]'
        post.title = '[deleted]' if post.title else None
        post.image_urls = []
        post.updated_at = datetime.utcnow()

        db.session.commit()

        return success_response(None, 'Post deleted successfully')

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting post: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>/react', methods=['POST'])
@token_required
def react_to_post(user_id, slug, post_id):
    """Add or update reaction to a post (upvote/downvote)"""
    try:
        data = request.get_json()
        reaction_type = data.get('reaction_type', '').lower()

        # Validate reaction type
        if reaction_type not in ['upvote', 'downvote']:
            return error_response('Validation error', 'Reaction type must be "upvote" or "downvote"', 400)

        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Check if post is deleted
        if post.is_deleted:
            return error_response('Forbidden', 'Cannot react to deleted posts', 403)

        # Check if user already reacted
        existing_reaction = ChainPostReaction.query.filter_by(
            post_id=post_id,
            user_id=user_id
        ).first()

        if existing_reaction:
            # Update existing reaction
            if existing_reaction.reaction_type == reaction_type:
                # Same reaction, remove it (toggle off)
                db.session.delete(existing_reaction)
                db.session.commit()
                return success_response(
                    {'reaction_removed': True},
                    'Reaction removed'
                )
            else:
                # Different reaction, update it
                existing_reaction.reaction_type = reaction_type
                existing_reaction.updated_at = datetime.utcnow()
        else:
            # Create new reaction
            reaction = ChainPostReaction(
                id=str(uuid4()),
                post_id=post_id,
                user_id=user_id,
                reaction_type=reaction_type
            )
            db.session.add(reaction)

        db.session.commit()

        # Get updated post with new counts (triggers will update counts automatically)
        db.session.refresh(post)

        return success_response(
            {
                'reaction_type': reaction_type,
                'upvote_count': post.upvote_count,
                'downvote_count': post.downvote_count
            },
            'Reaction updated successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"Error reacting to post: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>/pin', methods=['POST'])
@token_required
def pin_post(user_id, slug, post_id):
    """Pin/unpin a post (chain owner only)"""
    try:
        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Check if user is chain owner
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owners can pin posts', 403)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Only allow pinning top-level posts
        if post.parent_id:
            return error_response('Validation error', 'Only top-level posts can be pinned', 400)

        # Toggle pin status
        post.is_pinned = not post.is_pinned
        post.updated_at = datetime.utcnow()

        db.session.commit()

        return success_response(
            {'is_pinned': post.is_pinned},
            f'Post {"pinned" if post.is_pinned else "unpinned"} successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"Error pinning post: {str(e)}")
        return error_response('Error', str(e), 500)


@chain_posts_bp.route('/<slug>/posts/<post_id>/lock', methods=['POST'])
@token_required
def lock_post(user_id, slug, post_id):
    """Lock/unlock a post (chain owner only)"""
    try:
        # Get chain
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Check if user is chain owner
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owners can lock posts', 403)

        # Get post
        post = ChainPost.query.filter_by(id=post_id, chain_id=chain.id).first()
        if not post:
            return error_response('Not Found', 'Post not found', 404)

        # Toggle lock status
        post.is_locked = not post.is_locked
        post.updated_at = datetime.utcnow()

        db.session.commit()

        return success_response(
            {'is_locked': post.is_locked},
            f'Post {"locked" if post.is_locked else "unlocked"} successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"Error locking post: {str(e)}")
        return error_response('Error', str(e), 500)
