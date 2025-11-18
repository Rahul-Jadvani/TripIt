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
# Legacy scoring removed - validation score updated by AI system
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

        # ENFORCE: 1 PROJECT = 1 BADGE ONLY
        # Check if ANY badge already exists for this project
        from models.user import User
        existing_badge = ValidationBadge.query.filter_by(project_id=validated_data['project_id']).first()

        if existing_badge:
            # Get validator name
            validator = User.query.get(existing_badge.validator_id)
            validator_name = validator.display_name if validator else "Unknown Validator"

            return error_response(
                'Badge already awarded',
                f'This project already has a {existing_badge.badge_type} badge awarded by {validator_name}',
                400
            )

        # Create badge
        badge = ValidationBadge(
            project_id=validated_data['project_id'],
            validator_id=user_id,
            badge_type=validated_data['badge_type'],
            rationale=validated_data.get('rationale'),
            points=ValidationBadge.BADGE_POINTS[validated_data['badge_type']]
        )

        db.session.add(badge)

        # Update ValidatorAssignment status to 'validated' if exists
        # This ensures the project shows in validator's "validated" dashboard section
        from models.validator_assignment import ValidatorAssignment
        assignment = ValidatorAssignment.query.filter_by(
            validator_id=user_id,
            project_id=validated_data['project_id']
        ).first()

        if assignment:
            assignment.status = 'validated'
            assignment.validated_by = user_id
            assignment.reviewed_at = datetime.utcnow()
            assignment.review_notes = validated_data.get('rationale', '')

            # Mark other assignments for this project as 'completed'
            other_assignments = ValidatorAssignment.query.filter(
                ValidatorAssignment.project_id == validated_data['project_id'],
                ValidatorAssignment.id != assignment.id
            ).all()

            for other in other_assignments:
                other.status = 'completed'
                other.review_notes = f'Validated by another validator ({user_id})'

        # Badge awarded - recalculate validation score (math only, no AI re-analysis)
        from utils.scoring_helpers import recalculate_validation_score_with_badge
        recalc_result = recalculate_validation_score_with_badge(project)

        if recalc_result.get('success'):
            # Update project scores with recalculated values
            project.proof_score = recalc_result['proof_score']
            project.validation_score = recalc_result['validation_score']
            project.score_breakdown = recalc_result['breakdown']
        else:
            print(f"Failed to recalculate scores: {recalc_result.get('error')}")

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
