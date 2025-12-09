"""
Direct Messages Routes
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, and_, union_all, select
from datetime import datetime
from extensions import db
from models.direct_message import DirectMessage
from models.intro import Intro  # Using Intro instead of IntroRequest
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
    """Get all conversations for current user (including accepted intros)"""
    try:
        print(f"\n[CONVERSATIONS DEBUG] Starting for user_id: {user_id}")

        # STEP 1: Get all user IDs from DirectMessages
        message_user_ids = db.session.query(
            db.distinct(
                db.case(
                    (DirectMessage.sender_id == user_id, DirectMessage.recipient_id),
                    else_=DirectMessage.sender_id
                )
            )
        ).filter(
            or_(
                DirectMessage.sender_id == user_id,
                DirectMessage.recipient_id == user_id
            )
        ).all()
        message_user_ids = {uid[0] for uid in message_user_ids if uid[0] != user_id}
        print(f"[CONVERSATIONS DEBUG] Message user IDs: {message_user_ids}")

        # STEP 2: Get all user IDs from accepted Intros
        # Intro uses requester_id and recipient_id
        print(f"[CONVERSATIONS DEBUG] Querying Intros for user_id: {user_id}")
        accepted_intro_users = db.session.query(
            db.distinct(
                db.case(
                    (Intro.requester_id == user_id, Intro.recipient_id),
                    else_=Intro.requester_id
                )
            )
        ).filter(
            and_(
                or_(
                    Intro.requester_id == user_id,
                    Intro.recipient_id == user_id
                ),
                Intro.status == 'accepted'
            )
        ).all()
        print(f"[CONVERSATIONS DEBUG] Raw accepted intro query result: {accepted_intro_users}")
        accepted_intro_user_ids = {uid[0] for uid in accepted_intro_users if uid[0] != user_id}
        print(f"[CONVERSATIONS DEBUG] Accepted intro user IDs: {accepted_intro_user_ids}")

        # STEP 3: Combine all conversation user IDs
        all_conversation_user_ids = message_user_ids | accepted_intro_user_ids
        print(f"[CONVERSATIONS DEBUG] Combined conversation user IDs: {all_conversation_user_ids}")

        if not all_conversation_user_ids:
            print(f"[CONVERSATIONS DEBUG] No conversation user IDs found, returning empty array")
            return jsonify({
                'status': 'success',
                'data': []
            }), 200

        # STEP 4: Get conversation stats and last activity time for each user
        # For users with messages, use last message time
        # For users with only accepted intros (no messages), use intro accepted_at time
        conversations_with_messages = db.session.query(
            User.id,
            db.func.max(DirectMessage.created_at).label('last_activity_time'),
            db.func.count(
                db.case(
                    (and_(DirectMessage.recipient_id == user_id, DirectMessage.is_read == False), 1),
                    else_=None
                )
            ).label('unread_count')
        ).outerjoin(
            DirectMessage,
            or_(
                and_(DirectMessage.sender_id == User.id, DirectMessage.recipient_id == user_id),
                and_(DirectMessage.recipient_id == User.id, DirectMessage.sender_id == user_id)
            )
        ).filter(
            User.id.in_(all_conversation_user_ids)
        ).group_by(
            User.id
        ).all()

        # Create a dict to store last activity times (from messages or intro acceptance)
        conversation_times = {}
        for uid, last_msg_time, unread in conversations_with_messages:
            conversation_times[uid] = {
                'last_message_time': last_msg_time,
                'unread_count': unread
            }

        # For users with no messages, get the intro accepted_at time
        for uid in all_conversation_user_ids:
            if uid not in conversation_times or conversation_times[uid]['last_message_time'] is None:
                # Get the accepted intro timestamp
                intro = Intro.query.filter(
                    and_(
                        or_(
                            and_(Intro.requester_id == user_id, Intro.recipient_id == uid),
                            and_(Intro.recipient_id == user_id, Intro.requester_id == uid)
                        ),
                        Intro.status == 'accepted'
                    )
                ).first()

                if intro:
                    # Use updated_at as proxy for accepted time (intro was last updated when accepted)
                    if uid not in conversation_times:
                        conversation_times[uid] = {'last_message_time': None, 'unread_count': 0}
                    conversation_times[uid]['last_activity_time'] = intro.updated_at
                else:
                    if uid not in conversation_times:
                        conversation_times[uid] = {'last_message_time': None, 'unread_count': 0, 'last_activity_time': None}

        # Sort by last activity time (messages or intro acceptance)
        sorted_user_ids = sorted(
            all_conversation_user_ids,
            key=lambda uid: conversation_times.get(uid, {}).get('last_activity_time') or
                           conversation_times.get(uid, {}).get('last_message_time') or
                           datetime.min,
            reverse=True
        )

        conversations = [
            (uid, conversation_times[uid]['last_message_time'], conversation_times[uid]['unread_count'])
            for uid in sorted_user_ids
        ]

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
                print(f"[CONVERSATIONS DEBUG] User not found for ID: {other_user_id}")
                continue

            last_message = last_message_dict.get(other_user_id)

            result.append({
                'user': user.to_dict(),
                'last_message': last_message.to_dict(include_users=False) if last_message else None,
                'last_message_time': last_message_time.isoformat() if last_message_time else None,
                'unread_count': unread_count
            })

        print(f"[CONVERSATIONS DEBUG] Final result count: {len(result)}")
        print(f"[CONVERSATIONS DEBUG] Final result: {[{'user_id': r['user']['id'], 'username': r['user'].get('username')} for r in result]}")

        return jsonify({
            'status': 'success',
            'data': result
        }), 200

    except Exception as e:
        import traceback
        print(f"[CONVERSATIONS DEBUG] ERROR in get_conversations: {str(e)}")
        print(f"[CONVERSATIONS DEBUG] Traceback: {traceback.format_exc()}")
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
