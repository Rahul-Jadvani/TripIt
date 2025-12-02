"""
Women's Safety Routes - Female guides, safety resources, and women-safe features (Phase 5)
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, and_
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta

from extensions import db
from models.women_guide import WomenGuide
from models.guide_booking import GuideBooking
from models.guide_review import GuideReview
from models.women_safety_resource import WomenSafetyResource
from models.traveler import Traveler
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, get_pagination_params
from utils.cache import CacheService

women_safety_bp = Blueprint('women_safety', __name__)


# ============================================================================
# WOMEN GUIDES ENDPOINTS
# ============================================================================

@women_safety_bp.route('/guides', methods=['GET'])
@optional_auth
def list_women_guides(user_id):
    """List verified female travel guides"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20)

        # Filters
        search = request.args.get('search', '').strip()
        location = request.args.get('location', '').strip()
        specialization = request.args.get('specialization', '').strip()
        language = request.args.get('language', '').strip()
        min_rating = request.args.get('min_rating', type=float, default=3.0)
        verified_only = request.args.get('verified_only', type=lambda v: v.lower() == 'true') if request.args.get('verified_only') else True
        available_only = request.args.get('available_only', type=lambda v: v.lower() == 'true') if request.args.get('available_only') else True
        featured_only = request.args.get('featured', type=lambda v: v.lower() == 'true') if request.args.get('featured') else None

        # Base query
        query = WomenGuide.query.filter(WomenGuide.is_active == True)

        # Verified filter
        if verified_only:
            query = query.filter(WomenGuide.is_verified == True)

        # Availability filter
        if available_only:
            query = query.filter(WomenGuide.availability_status == 'available')

        # Featured filter
        if featured_only:
            query = query.filter(WomenGuide.is_featured == True)

        # Rating filter
        query = query.filter(WomenGuide.average_rating >= min_rating)

        # Text search on traveler info (joined)
        if search:
            query = query.join(Traveler).filter(or_(
                Traveler.username.icontains(search),
                Traveler.display_name.icontains(search),
                Traveler.bio.icontains(search)
            ))

        # Location filter
        if location:
            query = query.filter(WomenGuide.service_locations.contains([location]))

        # Specialization filter
        if specialization:
            query = query.filter(WomenGuide.specializations.contains([specialization]))

        # Language filter
        if language:
            query = query.filter(WomenGuide.languages_spoken.contains([language]))

        # Sort by rating/popularity
        query = query.order_by(WomenGuide.average_rating.desc(), WomenGuide.total_reviews.desc())

        total = query.count()
        guides = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [g.to_dict() for g in guides]

        return success_response({
            'guides': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            }
        }, 'Women guides retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@women_safety_bp.route('/guides/<guide_id>', methods=['GET'])
@optional_auth
def get_women_guide(user_id, guide_id):
    """Get detailed profile of a women guide"""
    try:
        guide = WomenGuide.query.options(
            joinedload(WomenGuide.reviews),
            joinedload(WomenGuide.traveler)
        ).get(guide_id)

        if not guide:
            return error_response('Not found', 'Guide not found', 404)

        if not guide.is_active:
            return error_response('Forbidden', 'This guide profile is not active', 403)

        data = guide.to_dict(include_reviews=True)

        # Add booking availability info
        if user_id:
            existing_booking = GuideBooking.query.filter(
                GuideBooking.guide_id == guide_id,
                GuideBooking.traveler_id == user_id,
                GuideBooking.status.in_(['pending', 'confirmed'])
            ).first()
            data['user_has_pending_booking'] = existing_booking is not None

        return success_response(data, 'Guide profile retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@women_safety_bp.route('/guides/<guide_id>/book', methods=['POST'])
@token_required
def book_women_guide(user_id, guide_id):
    """Request a booking with a women guide"""
    try:
        data = request.get_json()

        # Verify guide exists
        guide = WomenGuide.query.get(guide_id)
        if not guide or not guide.is_active:
            return error_response('Not found', 'Guide not found or inactive', 404)

        if guide.availability_status != 'available':
            return error_response('Bad request', 'Guide is not currently available', 400)

        # Validate booking data
        if not data.get('start_date') or not data.get('end_date'):
            return error_response('Validation error', 'start_date and end_date are required', 400)

        if not data.get('destination'):
            return error_response('Validation error', 'destination is required', 400)

        # Create booking
        booking = GuideBooking(
            guide_id=guide_id,
            traveler_id=user_id,
            destination=data.get('destination'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            group_size=data.get('group_size', 1),
            activity_type=data.get('activity_type'),
            special_requirements=data.get('special_requirements'),
            notes_from_traveler=data.get('notes'),
            status='pending'
        )

        # Calculate cost if hourly rate is set
        if guide.hourly_rate_usd:
            # Rough estimate: 8 hours per day
            days = (booking.end_date - booking.start_date).days + 1
            booking.total_cost_usd = guide.hourly_rate_usd * 8 * days

        db.session.add(booking)
        db.session.commit()

        # Emit event for guide to see new booking request
        from services.socket_service import SocketService
        SocketService.emit_guide_booking_request(guide_id, booking.to_dict())

        return success_response(booking.to_dict(), 'Booking request sent to guide', 201)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@women_safety_bp.route('/guides/<guide_id>/reviews', methods=['POST'])
@token_required
def submit_guide_review(user_id, guide_id):
    """Submit a review for a women guide"""
    try:
        data = request.get_json()

        # Verify guide exists
        guide = WomenGuide.query.get(guide_id)
        if not guide:
            return error_response('Not found', 'Guide not found', 404)

        # Verify user has completed a booking with this guide
        booking = GuideBooking.query.filter(
            GuideBooking.guide_id == guide_id,
            GuideBooking.traveler_id == user_id,
            GuideBooking.status == 'completed'
        ).first()

        if not booking:
            return error_response('Forbidden', 'You must complete a booking to review this guide', 403)

        # Check for existing review
        existing_review = GuideReview.query.filter(
            GuideReview.guide_id == guide_id,
            GuideReview.traveler_id == user_id,
            GuideReview.booking_id == booking.id
        ).first()

        if existing_review:
            return error_response('Conflict', 'You have already reviewed this booking', 409)

        # Validate rating
        rating = int(data.get('rating', 0))
        if rating < 1 or rating > 5:
            return error_response('Validation error', 'Rating must be between 1 and 5', 400)

        # Create review
        review = GuideReview(
            guide_id=guide_id,
            traveler_id=user_id,
            booking_id=booking.id,
            rating=rating,
            review_title=data.get('review_title'),
            review_text=data.get('review_text'),
            safety_rating=data.get('safety_rating', rating),
            knowledge_rating=data.get('knowledge_rating', rating),
            communication_rating=data.get('communication_rating', rating),
            professionalism_rating=data.get('professionalism_rating', rating),
            value_for_money_rating=data.get('value_for_money_rating', rating),
            verified_traveler=True,
            tour_type=booking.activity_type,
            tour_date=booking.start_date,
            group_size_on_tour=booking.group_size
        )

        db.session.add(review)

        # Update guide's rating
        all_reviews = GuideReview.query.filter_by(guide_id=guide_id, is_approved=True).all()
        if all_reviews:
            new_rating = sum(r.rating for r in all_reviews + [review]) / (len(all_reviews) + 1)
            guide.average_rating = round(new_rating, 2)
            guide.total_reviews = len(all_reviews) + 1

        db.session.commit()

        return success_response(review.to_dict(), 'Review submitted successfully', 201)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


# ============================================================================
# SAFETY RESOURCES ENDPOINTS
# ============================================================================

@women_safety_bp.route('/resources', methods=['GET'])
@optional_auth
def get_safety_resources(user_id):
    """Get women safety tips, guides, and resources"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=15)

        # Filters
        category = request.args.get('category', '').strip()
        region = request.args.get('region', '').strip()
        language = request.args.get('language', 'en').strip()
        featured_only = request.args.get('featured', type=lambda v: v.lower() == 'true') if request.args.get('featured') else None

        # Base query
        query = WomenSafetyResource.query.filter(WomenSafetyResource.language == language)

        # Category filter
        if category:
            query = query.filter(WomenSafetyResource.category == category)

        # Region filter
        if region:
            query = query.filter(or_(
                WomenSafetyResource.target_region == region,
                WomenSafetyResource.target_countries.contains([region])
            ))

        # Featured filter
        if featured_only:
            query = query.filter(WomenSafetyResource.is_featured == True)

        # Sort by pinned and featured status
        query = query.order_by(
            WomenSafetyResource.is_pinned.desc(),
            WomenSafetyResource.is_featured.desc(),
            WomenSafetyResource.created_at.desc()
        )

        total = query.count()
        resources = query.limit(per_page).offset((page - 1) * per_page).all()

        # Track view count
        for resource in resources:
            resource.view_count += 1

        db.session.commit()

        data = [r.to_dict() for r in resources]

        return success_response({
            'resources': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            },
            'categories': ['tips', 'emergency', 'legal', 'health', 'packing', 'cultural', 'navigation']
        }, 'Safety resources retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@women_safety_bp.route('/resources/<resource_id>/helpful', methods=['POST'])
@optional_auth
def mark_resource_helpful(user_id, resource_id):
    """Mark a safety resource as helpful"""
    try:
        resource = WomenSafetyResource.query.get(resource_id)
        if not resource:
            return error_response('Not found', 'Resource not found', 404)

        resource.helpful_count += 1
        db.session.commit()

        return success_response(
            {'helpful_count': resource.helpful_count},
            'Resource marked as helpful',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


# ============================================================================
# WOMEN TRAVELER SAFETY FEATURES
# ============================================================================

@women_safety_bp.route('/settings', methods=['GET'])
@token_required
def get_women_safety_settings(user_id):
    """Get women-specific safety settings for current traveler"""
    try:
        traveler = Traveler.query.get(user_id)
        if not traveler:
            return error_response('Not found', 'Traveler not found', 404)

        return success_response({
            'women_only_group_preference': traveler.women_only_group_preference,
            'location_sharing_enabled': traveler.location_sharing_enabled,
            'emergency_contacts': [
                {
                    'name': traveler.emergency_contact_1_name,
                    'phone': traveler.emergency_contact_1_phone,
                } if traveler.emergency_contact_1_name else None,
                {
                    'name': traveler.emergency_contact_2_name,
                    'phone': traveler.emergency_contact_2_phone,
                } if traveler.emergency_contact_2_name else None,
            ],
            'medical_conditions': '***REDACTED***' if traveler.medical_conditions else None,
            'insurance_provider': traveler.insurance_provider,
        }, 'Women safety settings retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@women_safety_bp.route('/settings', methods=['PUT'])
@token_required
def update_women_safety_settings(user_id):
    """Update women-specific safety settings"""
    try:
        traveler = Traveler.query.get(user_id)
        if not traveler:
            return error_response('Not found', 'Traveler not found', 404)

        data = request.get_json()

        # Update preferences
        if 'women_only_group_preference' in data:
            traveler.women_only_group_preference = data['women_only_group_preference']

        if 'location_sharing_enabled' in data:
            traveler.location_sharing_enabled = data['location_sharing_enabled']

        if 'emergency_contacts' in data:
            contacts = data['emergency_contacts']
            if len(contacts) > 0 and contacts[0]:
                traveler.emergency_contact_1_name = contacts[0].get('name')
                traveler.emergency_contact_1_phone = contacts[0].get('phone')
            if len(contacts) > 1 and contacts[1]:
                traveler.emergency_contact_2_name = contacts[1].get('name')
                traveler.emergency_contact_2_phone = contacts[1].get('phone')

        if 'insurance_provider' in data:
            traveler.insurance_provider = data['insurance_provider']

        traveler.updated_at = datetime.utcnow()
        db.session.commit()

        return success_response(None, 'Women safety settings updated', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
