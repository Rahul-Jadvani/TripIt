"""
Fast Leaderboard - Optimized leaderboard with aggressive caching
Ultra-fast response times for leaderboard and trending data
"""
from flask import Blueprint, jsonify, request
from extensions import db
from models.project import Project
from models.user import User
from models.chain import Chain
from utils.cache import CacheService
from utils.decorators import optional_auth
from sqlalchemy.orm import joinedload
from sqlalchemy import func, desc
from datetime import datetime, timedelta

fast_leaderboard_bp = Blueprint('fast_leaderboard', __name__)


@fast_leaderboard_bp.route('/projects', methods=['GET'])
@optional_auth
def get_project_leaderboard(user_id):
    """
    Ultra-fast project leaderboard with aggressive caching
    Response time: <10ms (cached) or <50ms (uncached)
    """
    try:
        period = request.args.get('period', 'all_time')  # all_time, week, month
        limit = min(int(request.args.get('limit', 50)), 100)

        # Check cache (1 hour TTL)
        cache_key = f"leaderboard:projects:{period}:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            return jsonify({
                'status': 'success',
                'data': cached,
                'from_cache': True,
                'cached_at': cached.get('generated_at')
            }), 200

        # Build query based on period
        query = Project.query.filter_by(is_deleted=False)\
            .options(joinedload(Project.creator))

        if period == 'week':
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.filter(Project.created_at >= week_ago)
        elif period == 'month':
            month_ago = datetime.utcnow() - timedelta(days=30)
            query = query.filter(Project.created_at >= month_ago)

        # Order by proof score (already indexed)
        projects = query.order_by(desc(Project.proof_score), desc(Project.upvotes))\
            .limit(limit).all()

        # Format results
        leaderboard_data = {
            'projects': [p.to_dict(include_creator=True, user_id=user_id) for p in projects],
            'period': period,
            'limit': limit,
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache for 1 hour
        CacheService.set(cache_key, leaderboard_data, ttl=3600)

        return jsonify({
            'status': 'success',
            'data': leaderboard_data,
            'from_cache': False
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@fast_leaderboard_bp.route('/users', methods=['GET'])
def get_user_leaderboard():
    """
    Ultra-fast user leaderboard by karma
    Response time: <10ms (cached) or <50ms (uncached)
    """
    try:
        limit = min(int(request.args.get('limit', 50)), 100)

        # Check cache (1 hour TTL)
        cache_key = f"leaderboard:users:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            return jsonify({
                'status': 'success',
                'data': cached,
                'from_cache': True
            }), 200

        # Query top users by karma (indexed)
        users = User.query.filter_by(is_active=True)\
            .order_by(desc(User.karma))\
            .limit(limit).all()

        # Format results
        leaderboard_data = {
            'users': [u.to_dict(include_email=False) for u in users],
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache for 1 hour
        CacheService.set(cache_key, leaderboard_data, ttl=3600)

        return jsonify({
            'status': 'success',
            'data': leaderboard_data,
            'from_cache': False
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@fast_leaderboard_bp.route('/chains', methods=['GET'])
@optional_auth
def get_chain_leaderboard(user_id):
    """
    Ultra-fast chain leaderboard
    Response time: <10ms (cached) or <50ms (uncached)
    """
    try:
        limit = min(int(request.args.get('limit', 20)), 50)

        # Check cache (30 min TTL)
        cache_key = f"leaderboard:chains:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            return jsonify({
                'status': 'success',
                'data': cached,
                'from_cache': True
            }), 200

        # Query trending chains (uses indexed columns)
        chains = Chain.query.filter_by(is_public=True, is_active=True)\
            .order_by(
                desc(Chain.project_count * 0.6 + Chain.follower_count * 0.3 + Chain.view_count * 0.1)
            ).limit(limit).all()

        # Format results
        leaderboard_data = {
            'chains': [c.to_dict(include_creator=True, user_id=user_id) for c in chains],
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache for 30 minutes
        CacheService.set(cache_key, leaderboard_data, ttl=1800)

        return jsonify({
            'status': 'success',
            'data': leaderboard_data,
            'from_cache': False
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@fast_leaderboard_bp.route('/trending', methods=['GET'])
@optional_auth
def get_trending_overview(user_id):
    """
    Get everything trending in one call (for dashboard)
    Ultra-fast response with sequential queries (still fast due to indexes + caching)
    """
    try:
        # Check cache first (30 min TTL)
        cache_key = "leaderboard:trending:all"
        cached = CacheService.get(cache_key)
        if cached:
            return jsonify({
                'status': 'success',
                'data': cached,
                'from_cache': True
            }), 200

        # Fetch trending data (sequential but fast with indexes)
        projects = Project.query.filter_by(is_deleted=False)\
            .options(joinedload(Project.creator))\
            .order_by(desc(Project.proof_score))\
            .limit(10).all()

        users = User.query.filter_by(is_active=True)\
            .order_by(desc(User.karma))\
            .limit(10).all()

        chains = Chain.query.filter_by(is_public=True, is_active=True)\
            .order_by(desc(Chain.project_count))\
            .limit(10).all()

        trending_data = {
            'projects': [p.to_dict(include_creator=True, user_id=user_id) for p in projects],
            'users': [u.to_dict(include_email=False) for u in users],
            'chains': [c.to_dict(include_creator=True, user_id=user_id) for c in chains],
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache for 30 minutes
        CacheService.set(cache_key, trending_data, ttl=1800)

        return jsonify({
            'status': 'success',
            'data': trending_data,
            'from_cache': False
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
