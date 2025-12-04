"""
Intro request routes
"""
from flask import Blueprint, request
from datetime import datetime
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload

from extensions import db
from models.intro import Intro
from models.project import Project
from models.user import User
from schemas.intro import IntroCreateSchema, IntroUpdateSchema
from utils.decorators import token_required
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params

intros_bp = Blueprint('intros', __name__)


@intros_bp.route('/request', methods=['POST'])
@token_required
def request_intro(user_id):
    """Request intro - works for all users (travelers, users) and all content (itineraries, projects)"""
    try:
        data = request.get_json()
        schema = IntroCreateSchema()
        validated_data = schema.load(data)

        # Validate content exists (either project or itinerary)
        content_id = validated_data.get('project_id')  # Can be project_id or itinerary_id
        if content_id:
            from models.itinerary import Itinerary
            content = Itinerary.query.get(content_id)
            if not content:
                # Try project as fallback
                content = Project.query.get(content_id)
            if not content:
                return error_response('Not found', 'Content not found', 404)

        # Validate recipient exists (check both tables)
        from models.traveler import Traveler
        from utils.user_utils import get_user_by_id

        recipient = get_user_by_id(validated_data['recipient_id'])
        if not recipient:
            return error_response('Not found', 'Recipient not found', 404)

        # Prevent self-intros
        if user_id == validated_data['recipient_id']:
            return error_response('Invalid request', 'You cannot request an intro to yourself', 400)

        # Create intro request
        intro = Intro(
            project_id=content_id,
            requester_id=user_id,
            recipient_id=validated_data['recipient_id'],
            message=validated_data.get('message'),
            requester_contact=validated_data.get('requester_contact')
        )

        db.session.add(intro)
        db.session.commit()

        # Invalidate intro cache for both users
        from utils.cache import CacheService
        CacheService.invalidate_user(user_id)  # Requester's sent intros
        CacheService.invalidate_user(validated_data['recipient_id'])  # Recipient's received intros

        # Emit Socket.IO event for real-time notification
        from services.socket_service import SocketService
        SocketService.emit_intro_received(validated_data['recipient_id'], intro.to_dict(include_users=True))

        return success_response(intro.to_dict(include_users=True, include_content=True), 'Intro requested successfully', 201)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error in request_intro: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@intros_bp.route('/<intro_id>/accept', methods=['PUT'])
@token_required
def accept_intro(user_id, intro_id):
    """Accept intro request - enables chatting between users"""
    try:
        intro = Intro.query.get(intro_id)
        if not intro:
            return error_response('Not found', 'Intro request not found', 404)

        if intro.recipient_id != user_id:
            return error_response('Forbidden', 'You can only accept intros addressed to you', 403)

        if intro.status == 'accepted':
            return error_response('Invalid', 'Intro already accepted', 400)

        intro.status = 'accepted'
        intro.accepted_at = datetime.utcnow()

        db.session.commit()

        # Invalidate intro cache for both users
        from utils.cache import CacheService
        CacheService.invalidate_user(user_id)  # Recipient (acceptor)
        CacheService.invalidate_user(intro.requester_id)  # Requester

        # Emit Socket.IO event to notify requester
        from services.socket_service import SocketService
        SocketService.emit_intro_accepted(intro.requester_id, intro.to_dict(include_users=True, include_content=True))

        return success_response(intro.to_dict(include_users=True, include_content=True), 'Intro accepted! You can now chat.', 200)

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error in accept_intro: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@intros_bp.route('/<intro_id>/decline', methods=['PUT'])
@token_required
def decline_intro(user_id, intro_id):
    """Decline intro request"""
    try:
        intro = Intro.query.get(intro_id)
        if not intro:
            return error_response('Not found', 'Intro request not found', 404)

        if intro.recipient_id != user_id:
            return error_response('Forbidden', 'You can only decline intros addressed to you', 403)

        if intro.status == 'declined':
            return error_response('Invalid', 'Intro already declined', 400)

        intro.status = 'declined'
        intro.declined_at = datetime.utcnow()

        db.session.commit()

        # Invalidate intro cache for both users
        from utils.cache import CacheService
        CacheService.invalidate_user(user_id)  # Recipient (decliner)
        CacheService.invalidate_user(intro.requester_id)  # Requester

        # Emit Socket.IO event to notify requester
        from services.socket_service import SocketService
        SocketService.emit_intro_declined(intro.requester_id, intro.to_dict(include_users=True, include_content=True))

        return success_response(intro.to_dict(include_users=True, include_content=True), 'Intro declined', 200)

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error in decline_intro: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@intros_bp.route('/received', methods=['GET'])
@token_required
def get_received_intros(user_id):
    """Get intros received by user - works for both users and travelers"""
    try:
        page, per_page = get_pagination_params(request)

        # Query intros where this user is the recipient
        query = Intro.query.filter_by(recipient_id=user_id).order_by(Intro.created_at.desc())
        total = query.count()
        intros = query.limit(per_page).offset((page - 1) * per_page).all()

        # Use the model's flexible to_dict method
        data = [i.to_dict(include_users=True, include_content=True) for i in intros]

        print(f"[INTROS RECEIVED] user_id={user_id[:8]}, total={total}, returned={len(data)}")

        return paginated_response(data, total, page, per_page)
    except Exception as e:
        import traceback
        print(f"Error in get_received_intros: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@intros_bp.route('/sent', methods=['GET'])
@token_required
def get_sent_intros(user_id):
    """Get intros sent by user - works for both users and travelers"""
    try:
        page, per_page = get_pagination_params(request)

        # Query intros where this user is the requester
        query = Intro.query.filter_by(requester_id=user_id).order_by(Intro.created_at.desc())
        total = query.count()
        intros = query.limit(per_page).offset((page - 1) * per_page).all()

        # Use the model's flexible to_dict method
        data = [i.to_dict(include_users=True, include_content=True) for i in intros]

        print(f"[INTROS SENT] user_id={user_id[:8]}, total={total}, returned={len(data)}")
        if data:
            print(f"[INTROS SENT] First intro: {data[0].get('id', 'NO_ID')[:8]}, recipient={data[0].get('recipient_id', 'NO_RECIPIENT')[:8]}")

        return paginated_response(data, total, page, per_page)
    except Exception as e:
        import traceback
        print(f"Error in get_sent_intros: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return error_response('Error', str(e), 500)


@intros_bp.route('/recent-connections', methods=['GET'])
def get_recent_connections():
    """Get recent accepted intro requests (public endpoint for feed)"""
    try:
        from utils.cache import CacheService

        # Check cache first (1 hour TTL)
        cached = CacheService.get('recent_connections')
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)  # Cap at 50

        # Get recent accepted intros with eager loading
        from models.intro_request import IntroRequest
        connections = IntroRequest.query.filter_by(status='accepted')\
            .options(
                joinedload(IntroRequest.investor),
                joinedload(IntroRequest.builder),
                joinedload(IntroRequest.project)
            ).order_by(IntroRequest.updated_at.desc())\
            .limit(limit).all()

        data = [conn.to_dict(include_project=True, include_users=True) for conn in connections]

        response_data = {
            'status': 'success',
            'message': 'Recent connections retrieved',
            'data': data
        }

        # Cache for 1 hour
        CacheService.set('recent_connections', response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)
