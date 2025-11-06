"""
Notification routes
"""
from flask import Blueprint, request

from extensions import db
from models.notification import Notification
from utils.decorators import token_required
from utils.helpers import success_response, error_response, get_pagination_params
from utils.notifications import mark_all_as_read, get_unread_count

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@token_required
def get_notifications(user_id):
    """Get user's notifications"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Query parameters
        unread_only = request.args.get('unread_only', '').lower() == 'true'
        types = request.args.get('types', '').strip()

        # OPTIMIZED: Create cache key from filters
        from utils.cache import CacheService
        filters_key = f"{unread_only}:{types}"

        # Check cache first (5 min TTL)
        cached = CacheService.get_cached_notifications(user_id, page, filters_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # Build query
        query = Notification.query.filter_by(user_id=user_id)

        # Filter by read status
        if unread_only:
            query = query.filter(Notification.is_read == False)

        # Filter by types
        if types:
            type_list = [t.strip() for t in types.split(',') if t.strip()]
            if type_list:
                query = query.filter(Notification.notification_type.in_(type_list))

        # Order by created_at descending
        query = query.order_by(Notification.created_at.desc())

        # Paginate
        total = query.count()
        notifications = query.offset((page - 1) * per_page).limit(per_page).all()

        # Convert to dict
        notifications_data = [
            notif.to_dict(include_relations=True) for notif in notifications
        ]

        # OPTIMIZED: Check cached unread count first
        unread_count = CacheService.get_cached_unread_count(user_id)
        if unread_count is None:
            unread_count = get_unread_count(user_id)
            CacheService.cache_unread_count(user_id, unread_count, ttl=300)

        response_data = {
            'status': 'success',
            'message': 'Notifications retrieved successfully',
            'data': {
                'notifications': notifications_data,
                'unread_count': unread_count,
                'pagination': {
                    'page': page,
                    'limit': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            }
        }

        # Cache for 5 minutes
        CacheService.cache_notifications(user_id, page, filters_key, response_data, ttl=300)

        return success_response(response_data['data'], response_data['message'], 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(user_id, notification_id):
    """Mark notification as read"""
    try:
        notification = Notification.query.get(notification_id)

        if not notification:
            return error_response('Not found', 'Notification not found', 404)

        # Check ownership
        if notification.user_id != user_id:
            return error_response('Forbidden', 'Not your notification', 403)

        # Mark as read
        notification.mark_as_read()

        # Invalidate cache
        from utils.cache import CacheService
        CacheService.invalidate_user_notifications(user_id)

        return success_response(
            notification.to_dict(include_relations=True),
            'Notification marked as read',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@notifications_bp.route('/read-all', methods=['POST'])
@token_required
def mark_all_notifications_read(user_id):
    """Mark all notifications as read"""
    try:
        count = mark_all_as_read(user_id)

        # Invalidate cache
        from utils.cache import CacheService
        CacheService.invalidate_user_notifications(user_id)

        return success_response(
            {'count': count},
            f'{count} notifications marked as read',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@notifications_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_notification_count(user_id):
    """Get unread notification count"""
    try:
        # OPTIMIZED: Check cache first
        from utils.cache import CacheService
        count = CacheService.get_cached_unread_count(user_id)

        if count is None:
            count = get_unread_count(user_id)
            CacheService.cache_unread_count(user_id, count, ttl=300)

        return success_response(
            {'unread_count': count},
            'Unread count retrieved successfully',
            200
        )

    except Exception as e:
        return error_response('Error', str(e), 500)
