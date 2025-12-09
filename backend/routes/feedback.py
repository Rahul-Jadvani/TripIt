"""
Feedback routes - handle suggestions, improvements, contact, and reports
"""
from flask import Blueprint, request
from marshmallow import ValidationError

from extensions import db
from models.feedback import Feedback
from utils.decorators import token_required, optional_auth, admin_required
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params

feedback_bp = Blueprint('feedback', __name__)


@feedback_bp.route('', methods=['POST'])
@token_required
def submit_feedback(user_id):
    """Submit feedback (suggestion, improvement, contact, or report)"""
    try:
        data = request.get_json()

        feedback_type = data.get('feedback_type')
        message = data.get('message', '').strip()

        if not feedback_type or feedback_type not in ['suggestion', 'improvement', 'contact', 'report']:
            return error_response('Invalid type', 'feedback_type must be: suggestion, improvement, contact, or report', 400)

        if not message or len(message) < 10:
            return error_response('Invalid message', 'Message must be at least 10 characters', 400)

        if len(message) > 2000:
            return error_response('Message too long', 'Message must be less than 2000 characters', 400)

        feedback = Feedback(
            feedback_type=feedback_type,
            message=message,
            contact_email=data.get('contact_email'),
            user_id=user_id,
        )

        # Handle reports
        if feedback_type == 'report':
            report_reason = data.get('report_reason')
            if not report_reason or report_reason not in ['spam', 'inappropriate', 'harassment', 'false_info', 'other']:
                return error_response('Invalid reason', 'report_reason must be: spam, inappropriate, harassment, false_info, or other', 400)

            feedback.report_reason = report_reason
            # Optional: include project/user IDs if provided
            feedback.reported_project_id = data.get('reported_project_id')
            feedback.reported_user_id = data.get('reported_user_id')

        db.session.add(feedback)
        db.session.commit()

        message_map = {
            'suggestion': 'Thank you for your suggestion!',
            'improvement': 'Thank you for helping us improve!',
            'contact': 'Thank you for reaching out. We\'ll get back to you soon!',
            'report': 'Thank you for your report. We\'ll review it shortly.',
        }

        return success_response(
            feedback.to_dict(),
            message_map.get(feedback_type, 'Feedback submitted'),
            201
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@feedback_bp.route('/admin', methods=['GET'])
@admin_required
def get_all_feedback(user_id):
    """Admin: Get all feedback with filters"""
    try:
        page, per_page = get_pagination_params(request)

        feedback_type = request.args.get('type')
        status = request.args.get('status')

        # OPTIMIZED: Check cache first (10 min TTL)
        from utils.cache import CacheService
        filters_key = f"{feedback_type or 'all'}:{status or 'all'}"
        cached = CacheService.get_cached_feedback_list(page, filters_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        query = Feedback.query

        if feedback_type:
            query = query.filter_by(feedback_type=feedback_type)

        if status:
            query = query.filter_by(status=status)

        query = query.order_by(Feedback.created_at.desc())

        total = query.count()
        feedback_items = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [item.to_dict(include_admin=True) for item in feedback_items]

        response = paginated_response(data, total, page, per_page)

        # Cache for 10 minutes
        CacheService.cache_feedback_list(page, filters_key, response.get_json(), ttl=600)

        return response

    except Exception as e:
        return error_response('Error', str(e), 500)


@feedback_bp.route('/admin/<feedback_id>/status', methods=['PATCH'])
@admin_required
def update_feedback_status(user_id, feedback_id):
    """Admin: Update feedback status"""
    try:
        feedback = Feedback.query.get(feedback_id)
        if not feedback:
            return error_response('Not found', 'Feedback not found', 404)

        data = request.get_json()
        new_status = data.get('status')

        if not new_status or new_status not in ['pending', 'reviewed', 'resolved', 'dismissed']:
            return error_response('Invalid status', 'status must be: pending, reviewed, resolved, or dismissed', 400)

        feedback.status = new_status
        feedback.admin_notes = data.get('admin_notes')
        feedback.reviewed_by = user_id

        from datetime import datetime
        feedback.reviewed_at = datetime.utcnow()

        db.session.commit()

        # Invalidate cache
        from utils.cache import CacheService
        CacheService.invalidate_feedback()

        return success_response(feedback.to_dict(include_admin=True), 'Status updated', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@feedback_bp.route('/admin/<feedback_id>', methods=['DELETE'])
@admin_required
def delete_feedback(user_id, feedback_id):
    """Admin: Delete feedback"""
    try:
        feedback = Feedback.query.get(feedback_id)
        if not feedback:
            return error_response('Not found', 'Feedback not found', 404)

        db.session.delete(feedback)
        db.session.commit()

        # Invalidate cache
        from utils.cache import CacheService
        CacheService.invalidate_feedback()

        return success_response(None, 'Feedback deleted', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
