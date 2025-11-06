"""
Badge routes
"""
from flask import Blueprint, request
from datetime import datetime
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload

from extensions import db
from models.badge import ValidationBadge
from models.project import Project
from schemas.badge import BadgeAwardSchema
from utils.decorators import admin_required, token_required
from utils.helpers import success_response, error_response, get_pagination_params
from utils.scores import ProofScoreCalculator
from utils.cache import CacheService

badges_bp = Blueprint('badges', __name__)


@badges_bp.route('/award', methods=['POST'])
@token_required
def award_badge(user_id):
    """Award validation badge (admin only)"""
    try:
        data = request.get_json()
        schema = BadgeAwardSchema()
        validated_data = schema.load(data)

        project = Project.query.get(validated_data['project_id'])
        if not project:
            return error_response('Not found', 'Project not found', 404)

        # Create badge
        badge = ValidationBadge(
            project_id=validated_data['project_id'],
            validator_id=user_id,
            badge_type=validated_data['badge_type'],
            rationale=validated_data.get('rationale'),
            points=ValidationBadge.BADGE_POINTS[validated_data['badge_type']]
        )

        db.session.add(badge)

        # Recalculate project scores
        ProofScoreCalculator.update_project_scores(project)

        db.session.commit()
        CacheService.invalidate_project(validated_data['project_id'])
        CacheService.invalidate_leaderboard()  # Badges affect leaderboard
        CacheService.invalidate_project_badges(validated_data['project_id'])  # Invalidate badges cache

        # Emit Socket.IO event for real-time badge notifications
        from services.socket_service import SocketService
        SocketService.emit_badge_awarded(validated_data['project_id'], badge.to_dict(include_validator=True))
        SocketService.emit_leaderboard_updated()  # Badges affect leaderboard

        return success_response(badge.to_dict(include_validator=True), 'Badge awarded', 201)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@badges_bp.route('/<project_id>', methods=['GET'])
def get_project_badges(project_id):
    """Get badges for a project with caching"""
    try:
        # Check cache first (1 hour TTL)
        cached = CacheService.get_cached_project_badges(project_id)
        if cached:
            return success_response(cached, 'Badges retrieved', 200)

        # OPTIMIZED: Eager load validator to prevent N+1 queries
        badges = ValidationBadge.query.filter_by(project_id=project_id)\
            .options(joinedload(ValidationBadge.validator))\
            .order_by(ValidationBadge.created_at.desc())\
            .all()

        data = [b.to_dict(include_validator=True) for b in badges]

        # Cache the results
        CacheService.cache_project_badges(project_id, data, ttl=3600)

        return success_response(data, 'Badges retrieved', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)
