"""
Intro Request Routes
"""
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.orm import joinedload, load_only
from extensions import db
from models.intro_request import IntroRequest
from models.project import Project
from models.user import User
from models.direct_message import DirectMessage
from utils.decorators import token_required
from utils.helpers import get_pagination_params, paginated_response
from utils.cache import CacheService
from services.email_service import EmailService


intro_requests_bp = Blueprint('intro_requests', __name__, url_prefix='/api/intro-requests')


@intro_requests_bp.route('/send', methods=['POST'])
@token_required
def send_intro_request(user_id):
    """Send intro request from investor to project builder"""
    try:
        # Get user object
        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        # Check if user is investor
        if not current_user.is_investor:
            return jsonify({
                'status': 'error',
                'message': 'Only investors can request intros'
            }), 403

        data = request.get_json()
        project_id = data.get('project_id')
        message = data.get('message', '')

        if not project_id:
            return jsonify({
                'status': 'error',
                'message': 'Project ID is required'
            }), 400

        # Get project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'status': 'error',
                'message': 'Project not found'
            }), 404

        # Check if intro request already exists
        existing_request = IntroRequest.query.filter_by(
            project_id=project_id,
            investor_id=user_id
        ).first()

        if existing_request:
            if existing_request.status == 'pending':
                return jsonify({
                    'status': 'error',
                    'message': 'You already have a pending intro request for this project'
                }), 400
            elif existing_request.status == 'accepted':
                return jsonify({
                    'status': 'error',
                    'message': 'You already have an accepted intro request for this project'
                }), 400

        # Create intro request
        intro_request = IntroRequest(
            project_id=project_id,
            investor_id=user_id,
            builder_id=project.user_id,
            message=message
        )

        db.session.add(intro_request)
        db.session.commit()

        # Invalidate cache for both users
        CacheService.invalidate_intro_requests(user_id)
        CacheService.invalidate_intro_requests(project.user_id)

        # Send ZeptoMail notification to builder (best-effort)
        builder_user = User.query.options(
            load_only(
                User.id,
                User.email,
                User.username,
                User.display_name,
                User.avatar_url
            )
        ).filter_by(id=intro_request.builder_id).first()
        if not builder_user:
            builder_user = intro_request.builder or project.creator
        try:
            EmailService.send_intro_request_notification(
                builder=builder_user,
                investor=current_user,
                project=project,
                intro_request=intro_request,
                custom_message=message,
            )
        except Exception as email_error:  # pragma: no cover - logging only
            current_app.logger.warning(
                "Intro request email failed for request %s: %s",
                intro_request.id,
                email_error,
            )

        return jsonify({
            'status': 'success',
            'message': 'Intro request sent successfully',
            'data': intro_request.to_dict(include_project=True, include_users=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@intro_requests_bp.route('/received', methods=['GET'])
@token_required
def get_received_requests(user_id):
    """Get intro requests received by current user (as builder) with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)
        status_filter = request.args.get('status', 'all')  # pending, accepted, declined, all

        # Check cache first
        cached = CacheService.get_cached_intro_requests(user_id, f'received:{status_filter}', page)
        if cached:
            return jsonify(cached), 200

        # OPTIMIZED: Eager load relationships to prevent N+1 queries
        query = IntroRequest.query.filter_by(builder_id=user_id)\
            .options(
                joinedload(IntroRequest.investor),
                joinedload(IntroRequest.builder),
                joinedload(IntroRequest.project)
            )

        if status_filter and status_filter != 'all':
            query = query.filter_by(status=status_filter)

        total = query.count()
        requests = query.order_by(IntroRequest.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'status': 'success',
            'data': [req.to_dict(include_project=True, include_users=True) for req in requests],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (5 minutes)
        CacheService.cache_intro_requests(user_id, f'received:{status_filter}', page, response_data, ttl=300)

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@intro_requests_bp.route('/sent', methods=['GET'])
@token_required
def get_sent_requests(user_id):
    """Get intro requests sent by current user (as investor) with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)
        status_filter = request.args.get('status', 'all')  # pending, accepted, declined, all

        # Check cache first
        cached = CacheService.get_cached_intro_requests(user_id, f'sent:{status_filter}', page)
        if cached:
            return jsonify(cached), 200

        # OPTIMIZED: Eager load relationships to prevent N+1 queries
        query = IntroRequest.query.filter_by(investor_id=user_id)\
            .options(
                joinedload(IntroRequest.investor),
                joinedload(IntroRequest.builder),
                joinedload(IntroRequest.project)
            )

        if status_filter and status_filter != 'all':
            query = query.filter_by(status=status_filter)

        total = query.count()
        requests = query.order_by(IntroRequest.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'status': 'success',
            'data': [req.to_dict(include_project=True, include_users=True) for req in requests],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (5 minutes)
        CacheService.cache_intro_requests(user_id, f'sent:{status_filter}', page, response_data, ttl=300)

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@intro_requests_bp.route('/<request_id>/accept', methods=['POST'])
@token_required
def accept_request(user_id, request_id):
    """Accept intro request (builder only)"""
    try:
        # Get current user object (builder)
        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        intro_request = IntroRequest.query.get(request_id)
        if not intro_request:
            return jsonify({
                'status': 'error',
                'message': 'Request not found'
            }), 404

        # Check if current user is the builder
        if intro_request.builder_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to accept this request'
            }), 403

        # Update status
        intro_request.status = 'accepted'

        # Create initial direct message to start the conversation
        # Send from builder to investor to initialize the conversation
        initial_message = DirectMessage(
            sender_id=user_id,  # Builder
            recipient_id=intro_request.investor_id,
            message=f"Hi! I accepted your intro request. Looking forward to connecting!"
        )

        db.session.add(initial_message)
        db.session.commit()

        # Invalidate cache for both users
        CacheService.invalidate_intro_requests(user_id)
        CacheService.invalidate_intro_requests(intro_request.investor_id)

        # CRITICAL: Emit real-time Socket.IO event to notify investor immediately
        from services.socket_service import SocketService
        SocketService.emit_intro_accepted(
            intro_request.investor_id,  # Send to investor
            {
                'request_id': str(intro_request.id),
                'builder_id': str(intro_request.builder_id),
                'builder_name': current_user.display_name or current_user.username,
                'builder_username': current_user.username,
                'builder_avatar': current_user.avatar_url,
                'project_id': str(intro_request.project_id),
                'project_title': intro_request.project.title,
                'initial_message': initial_message.to_dict(include_users=True)
            }
        )

        return jsonify({
            'status': 'success',
            'message': 'Intro request accepted and conversation started',
            'data': intro_request.to_dict(include_project=True, include_users=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@intro_requests_bp.route('/<request_id>/decline', methods=['POST'])
@token_required
def decline_request(user_id, request_id):
    """Decline intro request (builder only)"""
    try:
        intro_request = IntroRequest.query.get(request_id)
        if not intro_request:
            return jsonify({
                'status': 'error',
                'message': 'Request not found'
            }), 404

        # Check if current user is the builder
        if intro_request.builder_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to decline this request'
            }), 403

        # Update status
        intro_request.status = 'declined'
        db.session.commit()

        # Invalidate cache for both users
        CacheService.invalidate_intro_requests(user_id)
        CacheService.invalidate_intro_requests(intro_request.investor_id)

        return jsonify({
            'status': 'success',
            'message': 'Intro request declined',
            'data': intro_request.to_dict(include_project=True, include_users=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@intro_requests_bp.route('/pending-count', methods=['GET'])
@token_required
def get_pending_count(user_id):
    """Get count of pending intro requests for current user (as builder)"""
    try:
        count = IntroRequest.query.filter_by(
            builder_id=user_id,
            status='pending'
        ).count()

        return jsonify({
            'status': 'success',
            'data': {'pending_count': count}
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
