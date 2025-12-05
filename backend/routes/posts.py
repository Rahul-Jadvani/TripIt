"""
Posts Routes - Signature-verified posts with wallet attestation
Endpoints: create, list, detail
"""
from flask import Blueprint, request
from extensions import db
from models.post import Post
from models.traveler import Traveler
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response
from web3 import Web3
from eth_account.messages import encode_defunct
from datetime import datetime
from uuid import uuid4

posts_bp = Blueprint('posts', __name__)


@posts_bp.route('/posts', methods=['POST'])
@token_required
def create_post(user_id):
    """
    Create a signature-verified post

    Request Body:
        content_url (str): IPFS or CDN URL
        caption (str): Post caption
        signature (str): EIP-191 signature of message
        wallet_address (str): Signer wallet address
        location (str, optional): Location
        tags (list, optional): Array of tags
        post_type (str, optional): Type (photo, video, text, itinerary, snap)

    Message Format:
        "TripIt Post\nContent: {content_url}\nCaption: {caption}\nTimestamp: {timestamp}"

    Returns:
        201: Post created
        400: Invalid input or signature
    """
    data = request.get_json()

    # Required fields
    content_url = data.get('content_url')
    caption = data.get('caption', '')
    signature = data.get('signature')
    wallet_address = data.get('wallet_address')

    # Optional fields
    location = data.get('location')
    tags = data.get('tags', [])
    post_type = data.get('post_type', 'photo')

    # Validate required fields
    if not all([content_url, signature, wallet_address]):
        return error_response('Missing required fields: content_url, signature, wallet_address', status_code=400)

    # Get traveler
    traveler = Traveler.query.get(user_id)
    if not traveler:
        return error_response('Traveler not found', status_code=404)

    # Verify wallet is bound to this traveler
    if not traveler.wallet_address:
        return error_response('Wallet not bound. Please bind your wallet first.', status_code=400)

    if traveler.wallet_address.lower() != wallet_address.lower():
        return error_response('Wallet address does not match bound wallet', status_code=400)

    # Verify signature
    timestamp = int(datetime.utcnow().timestamp())
    message = f"TripIt Post\nContent: {content_url}\nCaption: {caption}\nTimestamp: {timestamp}"

    w3 = Web3()
    message_hash = encode_defunct(text=message)

    try:
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        verified = recovered_address.lower() == wallet_address.lower()
    except Exception as e:
        return error_response(f'Signature verification failed: {str(e)}', status_code=400)

    if not verified:
        return error_response('Invalid signature: recovered address does not match', status_code=400)

    # Create post
    post = Post(
        id=str(uuid4()),
        traveler_id=user_id,
        content_url=content_url,
        caption=caption,
        signature=signature,
        wallet_address=wallet_address,
        verified=verified,
        location=location,
        tags=tags,
        post_type=post_type
    )

    db.session.add(post)
    db.session.commit()

    return success_response(
        post.to_dict(),
        message='Post created and verified successfully',
        status_code=201
    )


@posts_bp.route('/posts', methods=['GET'])
@optional_auth
def get_posts(user_id):
    """
    Get paginated posts feed

    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 20, max: 100)
        verified_only (bool): Only show verified posts (default: true)
        post_type (str): Filter by type (photo, video, text, itinerary, snap)
        traveler_id (str): Filter by traveler

    Returns:
        200: Paginated posts
    """
    # Parse query params
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    verified_only = request.args.get('verified_only', 'true').lower() == 'true'
    post_type = request.args.get('post_type')
    traveler_id = request.args.get('traveler_id')

    # Build query
    query = Post.query

    # Filter by verified status
    if verified_only:
        query = query.filter_by(verified=True)

    # Filter by post type
    if post_type:
        query = query.filter_by(post_type=post_type)

    # Filter by traveler
    if traveler_id:
        query = query.filter_by(traveler_id=traveler_id)

    # Order by created_at descending
    query = query.order_by(Post.created_at.desc())

    # Pagination
    offset = (page - 1) * per_page
    total = query.count()
    posts = query.offset(offset).limit(per_page).all()

    # Serialize
    posts_data = [post.to_dict() for post in posts]

    return paginated_response(
        posts_data,
        total=total,
        page=page,
        per_page=per_page
    )


@posts_bp.route('/posts/<post_id>', methods=['GET'])
@optional_auth
def get_post(user_id, post_id):
    """
    Get single post by ID

    Returns:
        200: Post details
        404: Post not found
    """
    post = Post.query.get(post_id)

    if not post:
        return error_response('Post not found', status_code=404)

    return success_response(post.to_dict())


@posts_bp.route('/posts/<post_id>', methods=['DELETE'])
@token_required
def delete_post(user_id, post_id):
    """
    Delete a post (only creator can delete)

    Returns:
        200: Post deleted
        403: Not authorized
        404: Post not found
    """
    post = Post.query.get(post_id)

    if not post:
        return error_response('Post not found', status_code=404)

    # Check ownership
    if post.traveler_id != user_id:
        return error_response('You can only delete your own posts', status_code=403)

    db.session.delete(post)
    db.session.commit()

    return success_response({'deleted': True}, message='Post deleted successfully')


@posts_bp.route('/posts/<post_id>/like', methods=['POST'])
@token_required
def like_post(user_id, post_id):
    """
    Like a post (placeholder - implement with likes table later)

    Returns:
        200: Post liked
        404: Post not found
    """
    post = Post.query.get(post_id)

    if not post:
        return error_response('Post not found', status_code=404)

    # TODO: Implement likes table to track who liked what
    # For now, just increment counter
    post.likes_count += 1
    db.session.commit()

    return success_response(
        {'likes_count': post.likes_count},
        message='Post liked'
    )


@posts_bp.route('/my-posts', methods=['GET'])
@token_required
def get_my_posts(user_id):
    """
    Get current user's posts

    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 20)

    Returns:
        200: User's posts
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    # Query user's posts
    query = Post.query.filter_by(traveler_id=user_id).order_by(Post.created_at.desc())

    # Pagination
    offset = (page - 1) * per_page
    total = query.count()
    posts = query.offset(offset).limit(per_page).all()

    posts_data = [post.to_dict() for post in posts]

    return paginated_response(
        posts_data,
        total=total,
        page=page,
        per_page=per_page
    )
