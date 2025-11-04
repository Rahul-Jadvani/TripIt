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

        # Get unread count
        unread_count = get_unread_count(user_id)

        return success_response({
            'notifications': notifications_data,
            'unread_count': unread_count,
            'pagination': {
                'page': page,
                'limit': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }, 'Notifications retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(notification_id, user_id):
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
        count = get_unread_count(user_id)

        return success_response(
            {'unread_count': count},
            'Unread count retrieved successfully',
            200
        )

    except Exception as e:
        return error_response('Error', str(e), 500)
