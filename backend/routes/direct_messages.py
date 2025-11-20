"""
Direct Messages Routes
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, and_
from extensions import db
from models.direct_message import DirectMessage
from models.user import User
from utils.decorators import token_required


direct_messages_bp = Blueprint('direct_messages', __name__, url_prefix='/api/messages')


@direct_messages_bp.route('/send', methods=['POST'])
@token_required
def send_message(user_id):
    """Send a direct message"""
    try:
        data = request.get_json()
        recipient_id = data.get('recipient_id')
        message_text = data.get('message')

        if not recipient_id or not message_text:
            return jsonify({
                'status': 'error',
                'message': 'Recipient ID and message are required'
            }), 400

        # Check if recipient exists
        recipient = User.query.get(recipient_id)
        if not recipient:
            return jsonify({
                'status': 'error',
                'message': 'Recipient not found'
            }), 404

        # Create message
        message = DirectMessage(
            sender_id=user_id,
            recipient_id=recipient_id,
            message=message_text
        )

        db.session.add(message)
        db.session.commit()

        # Invalidate message cache for both users
        from utils.cache import CacheService
        CacheService.invalidate_user(user_id)  # Sender
        CacheService.invalidate_user(recipient_id)  # Recipient

        # Emit Socket.IO event for real-time message delivery
        from services.socket_service import SocketService
        SocketService.emit_message_received(recipient_id, message.to_dict(include_users=True))

        return jsonify({
            'status': 'success',
            'message': 'Message sent successfully',
            'data': message.to_dict(include_users=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@direct_messages_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(user_id):
    """Get all conversations for current user"""
    try:
        # Get all users current user has conversations with
        # Note: We only group by User.id to avoid issues with JSON columns
        conversations = db.session.query(
            User.id,
            db.func.max(DirectMessage.created_at).label('last_message_time'),
            db.func.count(
                db.case(
                    (and_(DirectMessage.recipient_id == user_id, DirectMessage.is_read == False), 1),
                    else_=None
                )
            ).label('unread_count')
        ).join(
            DirectMessage,
            or_(
                and_(DirectMessage.sender_id == User.id, DirectMessage.recipient_id == user_id),
                and_(DirectMessage.recipient_id == User.id, DirectMessage.sender_id == user_id)
            )
        ).filter(
            User.id != user_id
        ).group_by(
            User.id
        ).order_by(
            db.desc('last_message_time')
        ).all()

        # OPTIMIZED: Fetch all last messages in a single query instead of N queries
        if conversations:
            user_ids = [user_id for user_id, _, _ in conversations]

            # Fetch full user objects for all conversation partners
            users_dict = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()}

            # Subquery to get the latest message for each conversation
            from sqlalchemy import func
            other_user_id_expr = db.case(
                (DirectMessage.sender_id == user_id, DirectMessage.recipient_id),
                else_=DirectMessage.sender_id
            )
            subquery = db.session.query(
                other_user_id_expr.label('other_user_id'),
                func.max(DirectMessage.created_at).label('max_time')
            ).filter(
                or_(
                    DirectMessage.sender_id == user_id,
                    DirectMessage.recipient_id == user_id
                )
            ).group_by(other_user_id_expr).subquery()

            # Get the actual last messages
            last_messages = db.session.query(DirectMessage).join(
                subquery,
                and_(
                    DirectMessage.created_at == subquery.c.max_time,
                    or_(
                        and_(DirectMessage.sender_id == user_id, DirectMessage.recipient_id == subquery.c.other_user_id),
                        and_(DirectMessage.recipient_id == user_id, DirectMessage.sender_id == subquery.c.other_user_id)
                    )
                )
            ).all()

            # Create lookup dict: other_user_id -> last_message
            last_message_dict = {}
            for msg in last_messages:
                other_id = msg.recipient_id if msg.sender_id == user_id else msg.sender_id
                last_message_dict[other_id] = msg
        else:
            last_message_dict = {}
            users_dict = {}

        result = []
        for other_user_id, last_message_time, unread_count in conversations:
            user = users_dict.get(other_user_id)
            if not user:
                continue

            last_message = last_message_dict.get(other_user_id)

            result.append({
                'user': user.to_dict(),
                'last_message': last_message.to_dict(include_users=False) if last_message else None,
                'last_message_time': last_message_time.isoformat() if last_message_time else None,
                'unread_count': unread_count
            })

        return jsonify({
            'status': 'success',
            'data': result
        }), 200

    except Exception as e:
        import traceback
        print(f"[DirectMessages] Error in get_conversations: {str(e)}")
        print(f"[DirectMessages] Traceback: {traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@direct_messages_bp.route('/conversation/<other_user_id>', methods=['GET'])
@token_required
def get_conversation_with_user(user_id, other_user_id):
    """Get all messages in conversation with specific user"""
    try:
        # Check if user exists
        user = User.query.get(other_user_id)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        # OPTIMIZED: Get all messages with eager loading to prevent N+1 queries
        from sqlalchemy.orm import joinedload
        messages = DirectMessage.query.filter(
            or_(
                and_(DirectMessage.sender_id == user_id, DirectMessage.recipient_id == other_user_id),
                and_(DirectMessage.sender_id == other_user_id, DirectMessage.recipient_id == user_id)
            )
        ).options(
            joinedload(DirectMessage.sender),
            joinedload(DirectMessage.recipient)
        ).order_by(DirectMessage.created_at.asc()).all()

        # Mark messages as read
        unread_messages = DirectMessage.query.filter(
            DirectMessage.sender_id == other_user_id,
            DirectMessage.recipient_id == user_id,
            DirectMessage.is_read == False
        ).all()

        for message in unread_messages:
            message.is_read = True

        db.session.commit()

        # Invalidate cache for both users (read status changed)
        if unread_messages:
            from utils.cache import CacheService
            CacheService.invalidate_user(user_id)  # Recipient who just read
            CacheService.invalidate_user(other_user_id)  # Sender (to update read status)

            # Emit Socket.IO event to notify sender that messages were read
            from services.socket_service import SocketService
            SocketService.emit_messages_read(other_user_id, user_id, len(unread_messages))

        return jsonify({
            'status': 'success',
            'data': {
                'user': user.to_dict(),
                'messages': [msg.to_dict(include_users=True) for msg in messages]
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@direct_messages_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count(user_id):
    """Get total unread message count"""
    try:
        count = DirectMessage.query.filter(
            DirectMessage.recipient_id == user_id,
            DirectMessage.is_read == False
        ).count()

        return jsonify({
            'status': 'success',
            'data': {'unread_count': count}
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@direct_messages_bp.route('/<message_id>/mark-read', methods=['POST'])
@token_required
def mark_as_read(user_id, message_id):
    """Mark a message as read"""
    try:
        message = DirectMessage.query.get(message_id)
        if not message:
            return jsonify({
                'status': 'error',
                'message': 'Message not found'
            }), 404

        # Check if current user is the recipient
        if message.recipient_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized'
            }), 403

        message.is_read = True
        db.session.commit()

        # Invalidate cache for both users
        from utils.cache import CacheService
        CacheService.invalidate_user(user_id)  # Recipient
        CacheService.invalidate_user(message.sender_id)  # Sender

        # Emit Socket.IO event to notify sender
        from services.socket_service import SocketService
        SocketService.emit_message_read(message.sender_id, message.id)

        return jsonify({
            'status': 'success',
            'message': 'Message marked as read'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
