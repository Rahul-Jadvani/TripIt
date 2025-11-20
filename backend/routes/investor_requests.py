"""
Investor Request Routes
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy.orm import joinedload
from extensions import db
from models.investor_request import InvestorRequest
from models.user import User
from utils.decorators import token_required
from utils.helpers import get_pagination_params
from utils.cache import CacheService


investor_requests_bp = Blueprint('investor_requests', __name__, url_prefix='/api/investor-requests')


@investor_requests_bp.route('/apply', methods=['POST'])
@token_required
def apply_for_investor(user_id):
    """Apply for investor account"""
    try:
        data = request.get_json()

        # Validate required fields
        errors = {}

        # Location is mandatory
        if not data.get('location', '').strip():
            errors['location'] = 'Location is required'

        # LinkedIn URL is mandatory and must be valid
        linkedin_url = data.get('linkedin_url', '').strip()
        if not linkedin_url:
            errors['linkedin_url'] = 'LinkedIn URL is required'
        elif not (linkedin_url.startswith('http://linkedin.com/') or
                  linkedin_url.startswith('https://linkedin.com/') or
                  linkedin_url.startswith('http://www.linkedin.com/') or
                  linkedin_url.startswith('https://www.linkedin.com/')):
            errors['linkedin_url'] = 'Please enter a valid LinkedIn profile URL'

        # Bio is mandatory with minimum length
        bio = data.get('bio', '').strip()
        if not bio:
            errors['bio'] = 'Bio is required'
        elif len(bio) < 50:
            errors['bio'] = 'Bio should be at least 50 characters'

        # Reason is mandatory with minimum length
        reason = data.get('reason', '').strip()
        if not reason:
            errors['reason'] = 'Please tell us why you want to be an investor'
        elif len(reason) < 30:
            errors['reason'] = 'Please provide a more detailed explanation (at least 30 characters)'

        # Number of investments is mandatory
        if not data.get('num_investments'):
            errors['num_investments'] = 'Number of investments is required'

        # Investment stages is mandatory
        if not data.get('investment_stages') or len(data.get('investment_stages', [])) == 0:
            errors['investment_stages'] = 'Please select at least one investment stage'

        # Industries is mandatory
        if not data.get('industries') or len(data.get('industries', [])) == 0:
            errors['industries'] = 'Please select at least one industry'

        # Geographic focus is mandatory
        if not data.get('geographic_focus') or len(data.get('geographic_focus', [])) == 0:
            errors['geographic_focus'] = 'Please select at least one geographic region'

        # If there are validation errors, return them
        if errors:
            return jsonify({
                'status': 'error',
                'message': 'Validation failed',
                'errors': errors
            }), 400

        # Check if user already has a pending or approved request
        existing_request = InvestorRequest.query.filter_by(user_id=user_id).first()
        if existing_request:
            if existing_request.status == 'pending':
                # Return existing pending request for editing
                return jsonify({
                    'status': 'pending',
                    'message': 'You have a pending investor request',
                    'data': existing_request.to_dict()
                }), 200
            elif existing_request.status == 'approved':
                return jsonify({
                    'status': 'error',
                    'message': 'You are already an approved investor'
                }), 400
            elif existing_request.status == 'rejected':
                # Delete the old rejected request so user can reapply
                db.session.delete(existing_request)
                db.session.commit()

        # Create new investor request with all enhanced fields
        investor_request = InvestorRequest(
            user_id=user_id,
            # Basic Info
            plan_type=data.get('plan_type', 'free'),
            investor_type=data.get('investor_type', 'individual'),
            name=data.get('name'),
            company_name=data.get('company_name'),
            position_title=data.get('position_title'),
            linkedin_url=data.get('linkedin_url'),
            website_url=data.get('website_url'),
            location=data.get('location'),
            years_experience=data.get('years_experience'),
            # Investment Focus
            investment_stages=data.get('investment_stages', []),
            industries=data.get('industries', []),
            ticket_size_min=data.get('ticket_size_min'),
            ticket_size_max=data.get('ticket_size_max'),
            geographic_focus=data.get('geographic_focus', []),
            # About
            reason=data.get('reason'),
            bio=data.get('bio'),
            investment_thesis=data.get('investment_thesis'),
            # Track Record (Optional)
            num_investments=data.get('num_investments'),
            notable_investments=data.get('notable_investments', []),
            portfolio_highlights=data.get('portfolio_highlights'),
            # Value Add (Optional)
            value_adds=data.get('value_adds', []),
            expertise_areas=data.get('expertise_areas'),
            # Visibility Settings
            is_public=data.get('is_public', False),
            open_to_requests=data.get('open_to_requests', False),
            # Contact (Optional)
            twitter_url=data.get('twitter_url'),
            calendar_link=data.get('calendar_link'),
            # Organization-specific
            fund_size=data.get('fund_size'),
        )

        db.session.add(investor_request)
        db.session.commit()

        # Invalidate investor requests cache
        CacheService.invalidate_investor_requests()

        return jsonify({
            'status': 'success',
            'message': 'Investor request submitted successfully',
            'data': investor_request.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/apply', methods=['PUT'])
@token_required
def update_pending_application(user_id):
    """Update investor application/profile (pending or approved)"""
    try:
        data = request.get_json()

        # Allow editing even if the request is already approved
        investor_request = InvestorRequest.query.filter_by(user_id=user_id).first()

        if not investor_request:
            return jsonify({
                'status': 'error',
                'message': 'No investor profile found'
            }), 404

        if investor_request.status not in ['pending', 'approved']:
            return jsonify({
                'status': 'error',
                'message': 'Your investor request cannot be updated at this time'
            }), 400

        # Validate required fields (same as create)
        errors = {}

        # Location is mandatory
        if not data.get('location', '').strip():
            errors['location'] = 'Location is required'

        # LinkedIn URL is mandatory and must be valid
        linkedin_url = data.get('linkedin_url', '').strip()
        if not linkedin_url:
            errors['linkedin_url'] = 'LinkedIn URL is required'
        elif not (linkedin_url.startswith('http://linkedin.com/') or
                  linkedin_url.startswith('https://linkedin.com/') or
                  linkedin_url.startswith('http://www.linkedin.com/') or
                  linkedin_url.startswith('https://www.linkedin.com/')):
            errors['linkedin_url'] = 'Please enter a valid LinkedIn profile URL'

        # Bio is mandatory with minimum length
        bio = data.get('bio', '').strip()
        if not bio:
            errors['bio'] = 'Bio is required'
        elif len(bio) < 50:
            errors['bio'] = 'Bio should be at least 50 characters'

        # Reason is mandatory with minimum length
        reason = data.get('reason', '').strip()
        if not reason:
            errors['reason'] = 'Please tell us why you want to be an investor'
        elif len(reason) < 30:
            errors['reason'] = 'Please provide a more detailed explanation (at least 30 characters)'

        # Number of investments is mandatory
        if not data.get('num_investments'):
            errors['num_investments'] = 'Number of investments is required'

        # Investment stages is mandatory
        if not data.get('investment_stages') or len(data.get('investment_stages', [])) == 0:
            errors['investment_stages'] = 'Please select at least one investment stage'

        # Industries is mandatory
        if not data.get('industries') or len(data.get('industries', [])) == 0:
            errors['industries'] = 'Please select at least one industry'

        # Geographic focus is mandatory
        if not data.get('geographic_focus') or len(data.get('geographic_focus', [])) == 0:
            errors['geographic_focus'] = 'Please select at least one geographic region'

        # If there are validation errors, return them
        if errors:
            return jsonify({
                'status': 'error',
                'message': 'Validation failed',
                'errors': errors
            }), 400

        # Update all fields
        investor_request.plan_type = data.get('plan_type', investor_request.plan_type)
        investor_request.investor_type = data.get('investor_type', investor_request.investor_type)
        investor_request.name = data.get('name')
        investor_request.company_name = data.get('company_name')
        investor_request.position_title = data.get('position_title')
        investor_request.linkedin_url = data.get('linkedin_url')
        investor_request.website_url = data.get('website_url')
        investor_request.location = data.get('location')
        investor_request.years_experience = data.get('years_experience')
        investor_request.investment_stages = data.get('investment_stages', [])
        investor_request.industries = data.get('industries', [])
        investor_request.ticket_size_min = data.get('ticket_size_min')
        investor_request.ticket_size_max = data.get('ticket_size_max')
        investor_request.geographic_focus = data.get('geographic_focus', [])
        investor_request.reason = data.get('reason')
        investor_request.bio = data.get('bio')
        investor_request.investment_thesis = data.get('investment_thesis')
        investor_request.num_investments = data.get('num_investments')
        investor_request.notable_investments = data.get('notable_investments', [])
        investor_request.portfolio_highlights = data.get('portfolio_highlights')
        investor_request.value_adds = data.get('value_adds', [])
        investor_request.expertise_areas = data.get('expertise_areas')
        investor_request.is_public = data.get('is_public', False)
        investor_request.open_to_requests = data.get('open_to_requests', False)
        investor_request.twitter_url = data.get('twitter_url')
        investor_request.calendar_link = data.get('calendar_link')
        investor_request.fund_size = data.get('fund_size')
        investor_request.updated_at = datetime.utcnow()

        db.session.commit()

        # Invalidate investor requests cache
        CacheService.invalidate_investor_requests()

        return jsonify({
            'status': 'success',
            'message': 'Investor application updated successfully',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/pending', methods=['GET'])
def get_pending_requests():
    """Get all pending investor requests with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Check cache first (10 minutes TTL)
        cached = CacheService.get_cached_investor_requests('pending', page)
        if cached:
            return jsonify(cached), 200

        # OPTIMIZED: Eager load user to prevent N+1 queries
        query = InvestorRequest.query.filter_by(status='pending')\
            .options(joinedload(InvestorRequest.user))

        total = query.count()
        requests = query.order_by(InvestorRequest.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'status': 'success',
            'data': [req.to_dict() for req in requests],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (10 minutes)
        CacheService.cache_investor_requests('pending', page, response_data, ttl=600)

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/all', methods=['GET'])
def get_all_requests():
    """Get all investor requests with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)
        status_filter = request.args.get('status', 'all')  # pending, approved, rejected, all

        # Check cache first (10 minutes TTL)
        cached = CacheService.get_cached_investor_requests(status_filter, page)
        if cached:
            return jsonify(cached), 200

        # OPTIMIZED: Eager load user to prevent N+1 queries
        query = InvestorRequest.query.options(joinedload(InvestorRequest.user))

        if status_filter and status_filter != 'all':
            query = query.filter_by(status=status_filter)

        total = query.count()
        requests = query.order_by(InvestorRequest.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'status': 'success',
            'data': [req.to_dict() for req in requests],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (10 minutes)
        CacheService.cache_investor_requests(status_filter, page, response_data, ttl=600)

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/<request_id>/approve', methods=['POST'])
def approve_request(request_id):
    """Approve investor request"""
    try:
        investor_request = InvestorRequest.query.get(request_id)
        if not investor_request:
            return jsonify({
                'status': 'error',
                'message': 'Request not found'
            }), 404

        # Update request status
        investor_request.status = 'approved'
        investor_request.reviewed_by = None
        investor_request.reviewed_at = datetime.utcnow()

        # Update user to investor
        user = User.query.get(investor_request.user_id)
        if user:
            user.is_investor = True

        db.session.commit()

        # Invalidate investor requests cache
        CacheService.invalidate_investor_requests()

        return jsonify({
            'status': 'success',
            'message': 'Investor request approved',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/<request_id>/reject', methods=['POST'])
def reject_request(request_id):
    """Reject investor request"""
    try:
        investor_request = InvestorRequest.query.get(request_id)
        if not investor_request:
            return jsonify({
                'status': 'error',
                'message': 'Request not found'
            }), 404

        # Update request status
        investor_request.status = 'rejected'
        investor_request.reviewed_by = None
        investor_request.reviewed_at = datetime.utcnow()

        db.session.commit()

        # Invalidate investor requests cache
        CacheService.invalidate_investor_requests()

        return jsonify({
            'status': 'success',
            'message': 'Investor request rejected',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/my-request', methods=['GET'])
@token_required
def get_my_request(user_id):
    """Get current user's investor request status"""
    try:
        investor_request = InvestorRequest.query.filter_by(user_id=user_id).first()

        if not investor_request:
            return jsonify({
                'status': 'success',
                'data': None
            }), 200

        return jsonify({
            'status': 'success',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/user/<user_id>', methods=['GET'])
def get_user_investor_profile(user_id):
    """Get investor profile for a specific user (public endpoint)"""
    try:
        # Only return approved and public investor profiles
        investor_request = InvestorRequest.query.filter_by(
            user_id=user_id,
            status='approved',
            is_public=True
        ).first()

        if not investor_request:
            return jsonify({
                'status': 'success',
                'data': None
            }), 200

        return jsonify({
            'status': 'success',
            'data': investor_request.to_dict(include_user=True)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/profile', methods=['PUT'])
@token_required
def update_investor_profile(user_id):
    """Update investor profile (only for approved investors)"""
    try:
        # Get investor request
        investor_request = InvestorRequest.query.filter_by(user_id=user_id).first()

        if not investor_request:
            return jsonify({
                'status': 'error',
                'message': 'Investor profile not found'
            }), 404

        # Only approved investors can edit their profile
        if investor_request.status != 'approved':
            return jsonify({
                'status': 'error',
                'message': 'Only approved investors can edit their profile'
            }), 403

        data = request.get_json()

        # Update editable fields
        # Basic Info
        if 'investor_type' in data:
            investor_request.investor_type = data['investor_type']
        if 'name' in data:
            investor_request.name = data['name']
        if 'company_name' in data:
            investor_request.company_name = data['company_name']
        if 'position_title' in data:
            investor_request.position_title = data['position_title']
        if 'linkedin_url' in data:
            investor_request.linkedin_url = data['linkedin_url']
        if 'website_url' in data:
            investor_request.website_url = data['website_url']
        if 'location' in data:
            investor_request.location = data['location']
        if 'years_experience' in data:
            investor_request.years_experience = data['years_experience']

        # Investment Focus
        if 'investment_stages' in data:
            investor_request.investment_stages = data['investment_stages']
        if 'industries' in data:
            investor_request.industries = data['industries']
        if 'ticket_size_min' in data:
            investor_request.ticket_size_min = data['ticket_size_min']
        if 'ticket_size_max' in data:
            investor_request.ticket_size_max = data['ticket_size_max']
        if 'geographic_focus' in data:
            investor_request.geographic_focus = data['geographic_focus']

        # About
        if 'bio' in data:
            investor_request.bio = data['bio']
        if 'investment_thesis' in data:
            investor_request.investment_thesis = data['investment_thesis']

        # Track Record
        if 'num_investments' in data:
            investor_request.num_investments = data['num_investments']
        if 'notable_investments' in data:
            investor_request.notable_investments = data['notable_investments']
        if 'portfolio_highlights' in data:
            investor_request.portfolio_highlights = data['portfolio_highlights']

        # Value Add
        if 'value_adds' in data:
            investor_request.value_adds = data['value_adds']
        if 'expertise_areas' in data:
            investor_request.expertise_areas = data['expertise_areas']

        # Visibility Settings
        if 'is_public' in data:
            investor_request.is_public = data['is_public']
        if 'open_to_requests' in data:
            investor_request.open_to_requests = data['open_to_requests']

        # Contact
        if 'twitter_url' in data:
            investor_request.twitter_url = data['twitter_url']
        if 'calendar_link' in data:
            investor_request.calendar_link = data['calendar_link']

        # Organization-specific
        if 'fund_size' in data:
            investor_request.fund_size = data['fund_size']

        # Update timestamp
        investor_request.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/public', methods=['GET'])
def get_public_investors():
    """Get public investors directory (filtered by is_public and open_to_requests)"""
    try:
        # Get query params for filtering
        open_to_requests = request.args.get('open_to_requests', 'false').lower() == 'true'
        investor_type = request.args.get('investor_type')  # individual, organization
        industries = request.args.getlist('industries')  # Can pass multiple
        investment_stages = request.args.getlist('investment_stages')  # Can pass multiple
        location = request.args.get('location')

        # Base query: approved investors with is_public=True
        query = InvestorRequest.query.filter_by(
            status='approved',
            is_public=True
        )

        # Filter by open_to_requests if specified
        if open_to_requests:
            query = query.filter_by(open_to_requests=True)

        # Filter by investor type
        if investor_type:
            query = query.filter_by(investor_type=investor_type)

        # Filter by location (case-insensitive partial match)
        if location:
            query = query.filter(InvestorRequest.location.ilike(f'%{location}%'))

        # Filter by industries (check if any industry in the list matches)
        if industries:
            # JSON array contains any of the specified industries
            from sqlalchemy import or_, cast, String
            industry_filters = []
            for industry in industries:
                industry_filters.append(
                    cast(InvestorRequest.industries, String).like(f'%{industry}%')
                )
            query = query.filter(or_(*industry_filters))

        # Filter by investment stages
        if investment_stages:
            from sqlalchemy import or_, cast, String
            stage_filters = []
            for stage in investment_stages:
                stage_filters.append(
                    cast(InvestorRequest.investment_stages, String).like(f'%{stage}%')
                )
            query = query.filter(or_(*stage_filters))

        # Order by most recently updated
        investors = query.order_by(InvestorRequest.updated_at.desc()).all()

        return jsonify({
            'status': 'success',
            'data': {
                'investors': [inv.to_dict(include_user=True) for inv in investors],
                'count': len(investors)
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/<request_id>/remove-investor', methods=['POST'])
def remove_investor_status(request_id):
    """Remove investor status from a user (admin only)"""
    try:
        # Get the investor request
        investor_request = InvestorRequest.query.get(request_id)
        if not investor_request:
            return jsonify({
                'status': 'error',
                'message': 'Investor request not found'
            }), 404

        # Get the associated user
        user = User.query.get(investor_request.user_id)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        # Remove investor status
        user.is_investor = False

        # Update request status to rejected (or you could delete it)
        investor_request.status = 'rejected'
        investor_request.reviewed_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Investor status removed successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@investor_requests_bp.route('/<request_id>/update-permissions', methods=['POST'])
def update_investor_permissions(request_id):
    """Update investor permissions/visibility settings (admin only)"""
    try:
        data = request.get_json()

        # Get the investor request
        investor_request = InvestorRequest.query.get(request_id)
        if not investor_request:
            return jsonify({
                'status': 'error',
                'message': 'Investor request not found'
            }), 404

        # Update visibility settings
        if 'is_public' in data:
            investor_request.is_public = data['is_public']
        if 'open_to_requests' in data:
            investor_request.open_to_requests = data['open_to_requests']

        # Update plan type if provided
        if 'plan_type' in data:
            investor_request.plan_type = data['plan_type']

        # Update timestamp
        investor_request.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Permissions updated successfully',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
