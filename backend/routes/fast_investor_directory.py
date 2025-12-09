"""
Fast Investor Directory - Optimized public investor directory
Ultra-fast filtering and searching with aggressive caching
"""
from flask import Blueprint, jsonify, request
from extensions import db
from models.investor_request import InvestorRequest
from models.user import User
from utils.cache import CacheService
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import joinedload
from datetime import datetime

fast_investor_directory_bp = Blueprint('fast_investor_directory', __name__)


@fast_investor_directory_bp.route('/public', methods=['GET'])
def get_public_investor_directory():
    """
    Ultra-fast public investor directory with caching and optimized queries
    Response time: <20ms (cached) or <100ms (uncached)
    """
    try:
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)

        # Filters
        investor_type = request.args.get('type', '').strip()  # individual, organization
        sectors = request.args.getlist('sector')  # Can filter by multiple sectors
        min_check_size = request.args.get('min_check_size', type=int)
        max_check_size = request.args.get('max_check_size', type=int)
        search = request.args.get('search', '').strip()

        # Build cache key from filters
        filters_key = f"{investor_type}:{','.join(sorted(sectors))}:{min_check_size}:{max_check_size}:{search}:{page}"
        cache_key = f"investor_directory:{filters_key}"

        # Check cache (10 min TTL)
        cached = CacheService.get(cache_key)
        if cached:
            return jsonify({
                'status': 'success',
                'data': cached,
                'from_cache': True
            }), 200

        # OPTIMIZED: Build query with eager loading
        query = InvestorRequest.query.filter_by(
            status='approved',
            is_public=True
        ).options(joinedload(InvestorRequest.user))

        # Apply filters
        if investor_type:
            query = query.filter(InvestorRequest.investor_type == investor_type)

        if sectors:
            # Filter by sectors (stored as JSON array)
            for sector in sectors:
                query = query.filter(
                    func.json_array_length(
                        func.json_extract(InvestorRequest.sectors, '$')
                    ) > 0
                ).filter(
                    InvestorRequest.sectors.contains([sector])
                )

        if min_check_size:
            query = query.filter(InvestorRequest.min_check_size >= min_check_size)

        if max_check_size:
            query = query.filter(
                or_(
                    InvestorRequest.max_check_size == None,
                    InvestorRequest.max_check_size <= max_check_size
                )
            )

        # Search in name, bio, company_name
        if search:
            search_pattern = f'%{search}%'
            query = query.join(User).filter(
                or_(
                    User.display_name.ilike(search_pattern),
                    User.bio.ilike(search_pattern),
                    InvestorRequest.company_name.ilike(search_pattern)
                )
            )

        # Order by updated_at (most recently updated first)
        query = query.order_by(InvestorRequest.updated_at.desc())

        # Execute with pagination
        total = query.count()
        investors = query.offset((page - 1) * per_page).limit(per_page).all()

        # Format results
        directory_data = {
            'investors': [inv.to_dict() for inv in investors],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            },
            'filters': {
                'type': investor_type,
                'sectors': sectors,
                'min_check_size': min_check_size,
                'max_check_size': max_check_size,
                'search': search
            },
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache for 10 minutes
        CacheService.set(cache_key, directory_data, ttl=600)

        return jsonify({
            'status': 'success',
            'data': directory_data,
            'from_cache': False
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@fast_investor_directory_bp.route('/stats', methods=['GET'])
def get_directory_stats():
    """
    Get investor directory statistics (cached heavily)
    """
    try:
        cache_key = "investor_directory:stats"
        cached = CacheService.get(cache_key)
        if cached:
            return jsonify({
                'status': 'success',
                'data': cached,
                'from_cache': True
            }), 200

        # Calculate stats
        total_investors = InvestorRequest.query.filter_by(
            status='approved',
            is_public=True
        ).count()

        by_type = db.session.query(
            InvestorRequest.investor_type,
            func.count(InvestorRequest.id)
        ).filter_by(
            status='approved',
            is_public=True
        ).group_by(InvestorRequest.investor_type).all()

        stats_data = {
            'total_investors': total_investors,
            'by_type': {t: count for t, count in by_type},
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache for 1 hour
        CacheService.set(cache_key, stats_data, ttl=3600)

        return jsonify({
            'status': 'success',
            'data': stats_data,
            'from_cache': False
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
