"""
Travel Intel routes - Travel-focused Q&A and intelligence (TripIt migration)
Replaces Comment endpoints with Travel Intel (typed intelligence) concepts
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from marshmallow import ValidationError
import traceback
import logging

from extensions import db
from models.travel_intel import TravelIntel
from models.itinerary import Itinerary
from schemas.itinerary import TravelIntelSchema
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from utils.cache import CacheService

logger = logging.getLogger(__name__)

travel_intel_bp = Blueprint('travel_intel', __name__)


@travel_intel_bp.route('', methods=['GET'])
@optional_auth
def get_travel_intel(user_id):
    """Get travel intel for an itinerary"""
    try:
        itinerary_id = request.args.get('itinerary_id')
        if not itinerary_id:
            return error_response('Bad request', 'itinerary_id required', 400)

        intel_type = request.args.get('type', '').strip()  # Filter by type
        sort = request.args.get('sort', 'newest')  # newest, helpful, critical

        page, per_page = get_pagination_params(request)

        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Build query for top-level intel only (not replies)
        query = TravelIntel.query.filter_by(
            itinerary_id=itinerary_id,
            parent_intel_id=None
        )

        # Filter by type if specified
        if intel_type:
            query = query.filter(TravelIntel.intel_type == intel_type.lower())

        # Sorting
        if sort == 'helpful':
            query = query.order_by(TravelIntel.helpful_count.desc())
        elif sort == 'critical':
            query = query.filter(TravelIntel.severity_level == 'critical').order_by(
                TravelIntel.created_at.desc()
            )
        else:  # newest (default)
            query = query.order_by(TravelIntel.created_at.desc())

        total = query.count()
        intel_items = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [i.to_dict() for i in intel_items]

        response_data = {
            'status': 'success',
            'message': 'Travel intel retrieved',
            'data': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"GET /travel_intel ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('', methods=['POST'])
@token_required
def create_travel_intel(user_id):
    """Create travel intel (question, update, warning, recommendation, or local insight)"""
    try:
        data = request.get_json()

        itinerary_id = data.get('itinerary_id')
        if not itinerary_id:
            return error_response('Validation error', 'itinerary_id is required', 400)

        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Create travel intel
        intel = TravelIntel(
            itinerary_id=itinerary_id,
            traveler_id=user_id,
            parent_intel_id=data.get('parent_intel_id'),
            intel_type=data.get('intel_type', 'update').lower(),
            title=data.get('title'),
            content=data.get('content'),
            location_gps=data.get('location_gps'),
            severity_level=data.get('severity_level', 'medium').lower(),
            safety_related=data.get('safety_related', False),
            status=data.get('status', 'open'),
            photo_ipfs_hashes=data.get('photo_ipfs_hashes', [])
        )

        db.session.add(intel)
        db.session.commit()

        # Reload with relationships
        from sqlalchemy.orm import joinedload
        intel = TravelIntel.query.options(joinedload(TravelIntel.traveler)).get(intel.id)

        # Invalidate caches
        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_intel(itinerary_id)

        # Emit Socket.IO event (using emit_comment_added since travel intel replaced comments)
        try:
            from services.socket_service import SocketService
            SocketService.emit_comment_added(itinerary_id, intel.to_dict())
        except Exception as e:
            # Socket events are non-critical, log and continue
            print(f"Failed to emit socket event: {e}")

        # Notify itinerary creator of new intel
        try:
            from utils.notifications import notify_intel_posted, notify_intel_reply
            from models.traveler import Traveler

            traveler = Traveler.query.get(user_id)

            if traveler:
                # If it's a reply to another intel, notify the parent intel author
                if data.get('parent_intel_id'):
                    parent_intel = TravelIntel.query.get(data['parent_intel_id'])
                    if parent_intel and parent_intel.traveler_id != user_id:
                        notify_intel_reply(
                            parent_intel.traveler_id,
                            parent_intel,
                            intel,
                            traveler
                        )
                else:
                    # Otherwise notify itinerary creator
                    notify_intel_posted(itinerary.traveler_id, itinerary, intel, traveler)
        except Exception as e:
            logger.error(f"Travel Intel NOTIFICATION ERROR: {str(e)}")

        return success_response(
            intel.to_dict(),
            'Travel intel created',
            201
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"POST /travel_intel ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/<intel_id>', methods=['GET'])
@optional_auth
def get_travel_intel_detail(user_id, intel_id):
    """Get detailed travel intel with replies"""
    try:
        intel = TravelIntel.query.get(intel_id)
        if not intel:
            return error_response('Not found', 'Travel intel not found', 404)

        # Get replies
        replies = TravelIntel.query.filter_by(
            parent_intel_id=intel_id
        ).order_by(TravelIntel.created_at.asc()).all()

        response_data = {
            'status': 'success',
            'message': 'Travel intel retrieved',
            'data': {
                'intel': intel.to_dict(),
                'replies': [r.to_dict() for r in replies]
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"GET /travel_intel/<id> ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/<intel_id>', methods=['PUT', 'PATCH'])
@token_required
def update_travel_intel(user_id, intel_id):
    """Update travel intel"""
    try:
        intel = TravelIntel.query.get(intel_id)
        if not intel:
            return error_response('Not found', 'Travel intel not found', 404)

        if intel.traveler_id != user_id:
            return error_response('Forbidden', 'You can only edit your own intel', 403)

        data = request.get_json()

        # Update fields
        if 'title' in data:
            intel.title = data['title']
        if 'content' in data:
            intel.content = data['content']
        if 'location_gps' in data:
            intel.location_gps = data['location_gps']
        if 'severity_level' in data:
            intel.severity_level = data['severity_level'].lower()
        if 'status' in data:
            intel.status = data['status']
        if 'photo_ipfs_hashes' in data:
            intel.photo_ipfs_hashes = data['photo_ipfs_hashes']

        intel.updated_at = datetime.utcnow()
        db.session.commit()

        # Reload with relationships
        from sqlalchemy.orm import joinedload
        intel = TravelIntel.query.options(joinedload(TravelIntel.traveler)).get(intel.id)

        # Invalidate cache
        CacheService.invalidate_itinerary(intel.itinerary_id)
        CacheService.invalidate_itinerary_intel(intel.itinerary_id)

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_comment_updated(intel.itinerary_id, intel.to_dict())
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(
            intel.to_dict(),
            'Travel intel updated',
            200
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"PUT /travel_intel/<id> ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/<intel_id>', methods=['DELETE'])
@token_required
def delete_travel_intel(user_id, intel_id):
    """Delete travel intel (soft delete)"""
    try:
        intel = TravelIntel.query.get(intel_id)
        if not intel:
            return error_response('Not found', 'Travel intel not found', 404)

        if intel.traveler_id != user_id:
            return error_response('Forbidden', 'You can only delete your own intel', 403)

        # Hard delete since we don't have is_deleted column
        db.session.delete(intel)
        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_itinerary(intel.itinerary_id)
        CacheService.invalidate_itinerary_intel(intel.itinerary_id)

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_comment_deleted(intel.itinerary_id, intel_id)
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(None, 'Travel intel deleted', 200)

    except Exception as e:
        db.session.rollback()
        logger.error(f"DELETE /travel_intel/<id> ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/<intel_id>/helpful', methods=['POST'])
@token_required
def mark_intel_helpful(user_id, intel_id):
    """Mark travel intel as helpful"""
    try:
        intel = TravelIntel.query.get(intel_id)
        if not intel:
            return error_response('Not found', 'Travel intel not found', 404)

        intel.helpful_count = (intel.helpful_count or 0) + 1
        db.session.commit()

        CacheService.invalidate_itinerary(intel.itinerary_id)

        return success_response(
            {'helpful_count': intel.helpful_count},
            'Intel marked as helpful',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/<intel_id>/unhelpful', methods=['POST'])
@token_required
def mark_intel_unhelpful(user_id, intel_id):
    """Mark travel intel as unhelpful"""
    try:
        intel = TravelIntel.query.get(intel_id)
        if not intel:
            return error_response('Not found', 'Travel intel not found', 404)

        intel.unhelpful_count = (intel.unhelpful_count or 0) + 1
        db.session.commit()

        CacheService.invalidate_itinerary(intel.itinerary_id)

        return success_response(
            {'unhelpful_count': intel.unhelpful_count},
            'Intel marked as unhelpful',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/user/intel', methods=['GET'])
@token_required
def get_user_travel_intel(user_id):
    """Get all travel intel submitted by the user"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        query = TravelIntel.query.filter_by(traveler_id=user_id)
        total = query.count()

        intel_items = query.order_by(
            TravelIntel.created_at.desc()
        ).limit(per_page).offset((page - 1) * per_page).all()

        data = [i.to_dict() for i in intel_items]

        response_data = {
            'status': 'success',
            'message': 'User travel intel retrieved',
            'data': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"GET /travel_intel/user/intel ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/<intel_id>/respond', methods=['POST'])
@token_required
def respond_to_intel(user_id, intel_id):
    """Add response/resolution to travel intel"""
    try:
        intel = TravelIntel.query.get(intel_id)
        if not intel:
            return error_response('Not found', 'Travel intel not found', 404)

        data = request.get_json() or {}

        # Update response fields
        intel.responder_sbt_id = user_id
        intel.response_status = data.get('response_status', 'resolved')
        intel.status = data.get('status', 'resolved')
        intel.updated_at = datetime.utcnow()

        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_itinerary(intel.itinerary_id)

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_comment_updated(intel.itinerary_id, intel.to_dict())
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(
            intel.to_dict(),
            'Intel response recorded',
            200
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"POST /travel_intel/<id>/respond ERROR: {str(e)}")
        return error_response('Error', str(e), 500)


@travel_intel_bp.route('/stats/<itinerary_id>', methods=['GET'])
@optional_auth
def get_itinerary_intel_stats(user_id, itinerary_id):
    """Get travel intel statistics for an itinerary"""
    try:
        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Get stats
        total_intel = TravelIntel.query.filter_by(
            itinerary_id=itinerary_id
        ).count()

        by_type = {}
        for intel_type in ['question', 'update', 'warning', 'recommendation', 'local_insight']:
            count = TravelIntel.query.filter_by(
                itinerary_id=itinerary_id,
                intel_type=intel_type
            ).count()
            by_type[intel_type] = count

        critical_count = TravelIntel.query.filter_by(
            itinerary_id=itinerary_id,
            severity_level='critical'
        ).count()

        resolved_count = TravelIntel.query.filter_by(
            itinerary_id=itinerary_id,
            status='resolved'
        ).count()

        response_data = {
            'status': 'success',
            'message': 'Intel statistics retrieved',
            'data': {
                'total': total_intel,
                'by_type': by_type,
                'critical_count': critical_count,
                'resolved_count': resolved_count,
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"GET /travel_intel/stats/<id> ERROR: {str(e)}")
        return error_response('Error', str(e), 500)
