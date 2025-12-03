"""
Safety Rating routes - Travel safety feedback (TripIt migration)
Replaces Vote endpoints with Safety Rating concepts
"""
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import joinedload
from datetime import datetime

from extensions import db
from models.safety_rating import SafetyRating
from models.itinerary import Itinerary
from models.traveler import Traveler
from schemas.itinerary import SafetyRatingSchema
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, get_pagination_params
from utils.cache import CacheService
from marshmallow import ValidationError

safety_ratings_bp = Blueprint('safety_ratings', __name__)


@safety_ratings_bp.route('', methods=['POST'])
@token_required
def add_safety_rating(user_id):
    """Add or update a safety rating for an itinerary"""
    try:
        data = request.get_json()

        itinerary_id = data.get('itinerary_id')
        if not itinerary_id:
            return error_response('Validation error', 'itinerary_id is required', 400)

        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Check if user already rated this itinerary
        existing_rating = SafetyRating.query.filter_by(
            itinerary_id=itinerary_id,
            traveler_id=user_id
        ).first()

        # Prepare rating data
        rating_data = {
            'overall_safety_score': min(5, max(1, int(data.get('overall_safety_score', 3)))),
            'rating_type': data.get('rating_type', 'overall'),
            'detailed_feedback': data.get('detailed_feedback'),
            'accommodation_safety': data.get('accommodation_safety'),
            'route_safety': data.get('route_safety'),
            'community_safety': data.get('community_safety'),
            'women_safety_score': data.get('women_safety_score'),
            'experience_date': data.get('experience_date'),
        }

        # Photo evidence
        photo_ipfs_hashes = data.get('photo_ipfs_hashes', [])

        if existing_rating:
            # Update existing rating
            for key, value in rating_data.items():
                if value is not None:
                    setattr(existing_rating, key, value)

            if photo_ipfs_hashes:
                existing_rating.photo_ipfs_hashes = photo_ipfs_hashes

            existing_rating.updated_at = datetime.utcnow()
            db.session.commit()
            rating = existing_rating
        else:
            # Create new rating
            rating = SafetyRating(
                itinerary_id=itinerary_id,
                traveler_id=user_id,
                photo_ipfs_hashes=photo_ipfs_hashes,
                **rating_data
            )
            db.session.add(rating)
            db.session.commit()

        # Recalculate itinerary's average safety score
        all_ratings = SafetyRating.query.filter_by(itinerary_id=itinerary_id).all()
        if all_ratings:
            avg_safety = sum(r.overall_safety_score for r in all_ratings) / len(all_ratings)
            itinerary.safety_score = round(avg_safety, 2)
            itinerary.safety_ratings_count = len(all_ratings)
            db.session.commit()

        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        # Emit Socket.IO event
        try:
            from services.socket_service import SocketService
            SocketService.emit_project_rated(itinerary_id, itinerary.safety_score)
        except Exception as e:
            print(f"Failed to emit socket event: {e}")

        return success_response(
            rating.to_dict(),
            'Safety rating added/updated',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/<itinerary_id>', methods=['GET'])
@optional_auth
def get_itinerary_safety_ratings(user_id, itinerary_id):
    """Get all safety ratings for an itinerary"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Verify itinerary exists
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary or itinerary.is_deleted:
            return error_response('Not found', 'Itinerary not found', 404)

        # Get ratings
        query = SafetyRating.query.filter_by(itinerary_id=itinerary_id)
        total = query.count()

        ratings = query.order_by(
            SafetyRating.created_at.desc()
        ).limit(per_page).offset((page - 1) * per_page).all()

        data = [r.to_dict() for r in ratings]

        response_data = {
            'status': 'success',
            'message': 'Safety ratings retrieved',
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
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/<rating_id>', methods=['GET'])
@optional_auth
def get_safety_rating(user_id, rating_id):
    """Get a specific safety rating"""
    try:
        rating = SafetyRating.query.get(rating_id)
        if not rating:
            return error_response('Not found', 'Safety rating not found', 404)

        response_data = {
            'status': 'success',
            'message': 'Safety rating retrieved',
            'data': rating.to_dict()
        }

        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/<rating_id>', methods=['PUT', 'PATCH'])
@token_required
def update_safety_rating(user_id, rating_id):
    """Update a safety rating"""
    try:
        rating = SafetyRating.query.get(rating_id)
        if not rating:
            return error_response('Not found', 'Safety rating not found', 404)

        if rating.traveler_id != user_id:
            return error_response('Forbidden', 'You can only edit your own ratings', 403)

        data = request.get_json()

        # Update fields
        if 'overall_safety_score' in data:
            rating.overall_safety_score = min(5, max(1, int(data['overall_safety_score'])))
        if 'rating_type' in data:
            rating.rating_type = data['rating_type']
        if 'detailed_feedback' in data:
            rating.detailed_feedback = data['detailed_feedback']
        if 'accommodation_safety' in data:
            rating.accommodation_safety = data['accommodation_safety']
        if 'route_safety' in data:
            rating.route_safety = data['route_safety']
        if 'community_safety' in data:
            rating.community_safety = data['community_safety']
        if 'women_safety_score' in data:
            rating.women_safety_score = data['women_safety_score']
        if 'photo_ipfs_hashes' in data:
            rating.photo_ipfs_hashes = data['photo_ipfs_hashes']

        rating.updated_at = datetime.utcnow()
        db.session.commit()

        # Recalculate itinerary's average safety score
        itinerary = Itinerary.query.get(rating.itinerary_id)
        all_ratings = SafetyRating.query.filter_by(itinerary_id=rating.itinerary_id).all()
        if all_ratings and itinerary:
            avg_safety = sum(r.overall_safety_score for r in all_ratings) / len(all_ratings)
            itinerary.safety_score = round(avg_safety, 2)
            itinerary.safety_ratings_count = len(all_ratings)
            db.session.commit()

        CacheService.invalidate_itinerary(rating.itinerary_id)
        CacheService.invalidate_itinerary_feed()

        return success_response(
            rating.to_dict(),
            'Safety rating updated',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/<rating_id>', methods=['DELETE'])
@token_required
def delete_safety_rating(user_id, rating_id):
    """Delete a safety rating"""
    try:
        rating = SafetyRating.query.get(rating_id)
        if not rating:
            return error_response('Not found', 'Safety rating not found', 404)

        if rating.traveler_id != user_id:
            return error_response('Forbidden', 'You can only delete your own ratings', 403)

        itinerary_id = rating.itinerary_id
        db.session.delete(rating)
        db.session.commit()

        # Recalculate itinerary's average safety score
        itinerary = Itinerary.query.get(itinerary_id)
        all_ratings = SafetyRating.query.filter_by(itinerary_id=itinerary_id).all()
        if itinerary:
            if all_ratings:
                avg_safety = sum(r.overall_safety_score for r in all_ratings) / len(all_ratings)
                itinerary.safety_score = round(avg_safety, 2)
            else:
                itinerary.safety_score = 0
            itinerary.safety_ratings_count = len(all_ratings)
            db.session.commit()

        CacheService.invalidate_itinerary(itinerary_id)
        CacheService.invalidate_itinerary_feed()

        return success_response(None, 'Safety rating deleted', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/user/ratings', methods=['GET'])
@token_required
def get_user_safety_ratings(user_id):
    """Get all safety ratings submitted by the user"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        query = SafetyRating.query.filter_by(traveler_id=user_id)
        total = query.count()

        ratings = query.order_by(
            SafetyRating.created_at.desc()
        ).limit(per_page).offset((page - 1) * per_page).all()

        data = [r.to_dict() for r in ratings]

        response_data = {
            'status': 'success',
            'message': 'User ratings retrieved',
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
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/<rating_id>/helpful', methods=['POST'])
@token_required
def mark_rating_helpful(user_id, rating_id):
    """Mark a safety rating as helpful"""
    try:
        rating = SafetyRating.query.get(rating_id)
        if not rating:
            return error_response('Not found', 'Safety rating not found', 404)

        # Increment helpful count
        rating.helpful_count = (rating.helpful_count or 0) + 1
        db.session.commit()

        CacheService.invalidate_itinerary(rating.itinerary_id)

        return success_response(
            {'helpful_count': rating.helpful_count},
            'Rating marked as helpful',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@safety_ratings_bp.route('/<rating_id>/unhelpful', methods=['POST'])
@token_required
def mark_rating_unhelpful(user_id, rating_id):
    """Mark a safety rating as unhelpful"""
    try:
        rating = SafetyRating.query.get(rating_id)
        if not rating:
            return error_response('Not found', 'Safety rating not found', 404)

        # Increment unhelpful count
        rating.unhelpful_count = (rating.unhelpful_count or 0) + 1
        db.session.commit()

        CacheService.invalidate_itinerary(rating.itinerary_id)

        return success_response(
            {'unhelpful_count': rating.unhelpful_count},
            'Rating marked as unhelpful',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
