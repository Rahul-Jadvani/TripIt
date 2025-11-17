"""
Validator Routes - For validators to view and validate projects
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from extensions import db
from models.user import User
from models.project import Project
from models.badge import ValidationBadge
from models.validator_permissions import ValidatorPermissions
from models.validator_assignment import ValidatorAssignment
from utils.decorators import validator_required, admin_or_validator_required
from utils.cache import CacheService
from services.socket_service import SocketService
# Legacy scoring removed - using AI scoring system
from tasks.scoring_tasks import score_project_task

validator_bp = Blueprint('validator', __name__)  # Validator routes blueprint


@validator_bp.route('/dashboard', methods=['GET'])
@validator_required
def get_validator_dashboard(user_id):
    """Get validator's assigned projects"""
    try:
        from models.validator_assignment import ValidatorAssignment
        from sqlalchemy.orm import joinedload

        # Get ALL assignments for this validator (pending, in_review, validated, etc.)
        assignments = ValidatorAssignment.query.filter(
            ValidatorAssignment.validator_id == user_id
        ).options(
            joinedload(ValidatorAssignment.project).joinedload(Project.creator)
        ).order_by(
            ValidatorAssignment.priority.desc(),
            ValidatorAssignment.created_at.desc()
        ).all()

        # Filter assignments based on status
        # For pending/in_review: exclude projects with badges
        # For validated: include all
        filtered_assignments = []
        for assignment in assignments:
            # If validated, always include it
            if assignment.status == 'validated':
                filtered_assignments.append(assignment)
            # If pending/in_review, only include if project has no badges
            elif assignment.status in ['pending', 'in_review']:
                # Check if project has any badges
                has_badges = ValidationBadge.query.filter_by(
                    project_id=assignment.project_id
                ).first()

                # Only include if no badges
                if not has_badges:
                    filtered_assignments.append(assignment)

        # Build response
        result = []
        for assignment in filtered_assignments:
            assignment_dict = assignment.to_dict()
            if assignment.project:
                assignment_dict['project'] = assignment.project.to_dict(include_creator=True)
            result.append(assignment_dict)

        return jsonify({
            'status': 'success',
            'data': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/assignments/<assignment_id>/validate', methods=['POST'])
@validator_required
def validate_assigned_project(user_id, assignment_id):
    """Validate a project - marks all assignments for this project as completed"""
    try:
        from models.validator_assignment import ValidatorAssignment

        data = request.get_json() or {}

        # Get the assignment
        assignment = ValidatorAssignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'status': 'error', 'message': 'Assignment not found'}), 404

        # Verify this assignment belongs to the validator
        if assignment.validator_id != user_id:
            return jsonify({'status': 'error', 'message': 'Not your assignment'}), 403

        # Check if already validated
        if assignment.status == 'validated':
            return jsonify({'status': 'error', 'message': 'Project already validated'}), 400

        # Check if project was validated by someone else
        other_validation = ValidatorAssignment.query.filter(
            ValidatorAssignment.project_id == assignment.project_id,
            ValidatorAssignment.status == 'validated'
        ).first()

        if other_validation:
            return jsonify({'status': 'error', 'message': 'Project already validated by another validator'}), 400

        # Get badge data
        badge_type = data.get('badge_type', 'stone')
        rationale = data.get('rationale', '')

        # Update THIS assignment as validated
        assignment.status = 'validated'
        assignment.validated_by = user_id
        assignment.reviewed_at = datetime.utcnow()
        assignment.review_notes = rationale

        # Mark ALL OTHER assignments for this project as 'completed' (not validated)
        # This removes the project from other validators' dashboards
        other_assignments = ValidatorAssignment.query.filter(
            ValidatorAssignment.project_id == assignment.project_id,
            ValidatorAssignment.id != assignment_id
        ).all()

        for other in other_assignments:
            other.status = 'completed'  # Mark as completed but not validated
            other.review_notes = f'Validated by another validator ({user_id})'

        # Award badge
        project = assignment.project
        if project:
            badge = ValidationBadge(
                project_id=project.id,
                validator_id=user_id,
                badge_type=badge_type,
                rationale=rationale,
                points=ValidationBadge.BADGE_POINTS.get(badge_type, 10)
            )
            db.session.add(badge)

            # Update project validation score via AI system
            try:
                score_project_task.delay(project.id)
            except Exception as e:
                print(f"Failed to queue validator badge rescore: {e}")

        db.session.commit()

        # Invalidate caches
        CacheService.invalidate_project(assignment.project_id)
        CacheService.invalidate_leaderboard()

        # Emit real-time update
        SocketService.emit_badge_awarded(assignment.project_id, badge.to_dict(include_validator=True))

        return jsonify({
            'status': 'success',
            'message': 'Project validated successfully',
            'data': assignment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/assignments/<assignment_id>/start-review', methods=['POST'])
@validator_required
def start_review(user_id, assignment_id):
    """Mark assignment as in_review"""
    try:
        from models.validator_assignment import ValidatorAssignment

        assignment = ValidatorAssignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'status': 'error', 'message': 'Assignment not found'}), 404

        if assignment.validator_id != user_id:
            return jsonify({'status': 'error', 'message': 'Not your assignment'}), 403

        assignment.status = 'in_review'
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Review started',
            'data': assignment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/assignments/<assignment_id>/reject', methods=['POST'])
@validator_required
def reject_assigned_project(user_id, assignment_id):
    """Reject a project"""
    try:
        from models.validator_assignment import ValidatorAssignment

        data = request.get_json() or {}

        assignment = ValidatorAssignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'status': 'error', 'message': 'Assignment not found'}), 404

        if assignment.validator_id != user_id:
            return jsonify({'status': 'error', 'message': 'Not your assignment'}), 403

        assignment.status = 'rejected'
        assignment.reviewed_at = datetime.utcnow()
        assignment.review_notes = data.get('notes', '')

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Project rejected',
            'data': assignment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/projects', methods=['GET'])
@validator_required
def get_validator_projects(user_id):
    """Get projects that this validator can validate"""
    try:
        # Get validator permissions
        permissions = ValidatorPermissions.query.filter_by(validator_id=user_id).first()

        if not permissions:
            return jsonify({
                'status': 'error',
                'message': 'Validator permissions not configured. Contact admin.'
            }), 403

        # Build query
        query = Project.query

        # Filter by validation status (only show unvalidated projects)
        validated_filter = request.args.get('validated', 'false')

        if validated_filter == 'false':
            # Show only projects without any badges (unvalidated)
            query = query.outerjoin(ValidationBadge).group_by(Project.id).having(
                db.func.count(ValidationBadge.id) == 0
            )
        elif validated_filter == 'true':
            # Show only projects with badges (validated)
            query = query.join(ValidationBadge).group_by(Project.id).having(
                db.func.count(ValidationBadge.id) > 0
            )
        # 'all' shows everything

        # If validator can't validate all, filter by allowed project IDs
        if not permissions.can_validate_all:
            if not permissions.allowed_project_ids:
                return jsonify({
                    'status': 'success',
                    'data': {
                        'projects': [],
                        'message': 'No projects assigned for validation. Contact admin.'
                    }
                }), 200

            query = query.filter(Project.id.in_(permissions.allowed_project_ids))

        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        projects = query.order_by(Project.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'data': {
                'projects': [project.to_dict(include_creator=True, include_badges=True) for project in projects.items],
                'total': projects.total,
                'pages': projects.pages,
                'current_page': page,
                'permissions': permissions.to_dict()
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/projects/<project_id>', methods=['GET'])
@validator_required
def get_project_detail(user_id, project_id):
    """Get detailed project information for validation"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # Check if validator has permission to validate this project
        permissions = ValidatorPermissions.query.filter_by(validator_id=user_id).first()

        if not permissions:
            return jsonify({'status': 'error', 'message': 'Validator permissions not configured'}), 403

        if not permissions.can_validate_all:
            if project_id not in permissions.allowed_project_ids:
                return jsonify({
                    'status': 'error',
                    'message': 'You do not have permission to validate this project'
                }), 403

        return jsonify({
            'status': 'success',
            'data': project.to_dict(include_creator=True, include_badges=True, include_comments=True)
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/badges/award', methods=['POST'])
@validator_required
def award_badge(user_id):
    """Award badge to project (with permission checks)"""
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        badge_type = data.get('badge_type')
        rationale = data.get('rationale', '')

        if not project_id or not badge_type:
            return jsonify({'status': 'error', 'message': 'project_id and badge_type required'}), 400

        # Get validator permissions
        permissions = ValidatorPermissions.query.filter_by(validator_id=user_id).first()

        if not permissions:
            return jsonify({'status': 'error', 'message': 'Validator permissions not configured'}), 403

        # Check project permission
        if not permissions.can_validate_all:
            # Check if validator has an assignment for this project
            assignment = ValidatorAssignment.query.filter_by(
                validator_id=user_id,
                project_id=project_id
            ).first()

            # Also check the old permissions system for backwards compatibility
            has_permission = (
                assignment is not None or
                project_id in permissions.allowed_project_ids
            )

            if not has_permission:
                return jsonify({
                    'status': 'error',
                    'message': 'You do not have permission to validate this project'
                }), 403

        # Check badge type permission
        if badge_type not in permissions.allowed_badge_types:
            return jsonify({
                'status': 'error',
                'message': f'You do not have permission to award {badge_type} badges'
            }), 403

        # Validate badge type
        if badge_type not in ValidationBadge.BADGE_POINTS:
            return jsonify({'status': 'error', 'message': 'Invalid badge type'}), 400

        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # Check if validator already awarded a badge to this project
        existing_badge = ValidationBadge.query.filter_by(
            project_id=project_id,
            validator_id=user_id
        ).first()

        if existing_badge:
            return jsonify({
                'status': 'error',
                'message': 'You have already awarded a badge to this project'
            }), 400

        # Create badge
        badge = ValidationBadge(
            project_id=project_id,
            validator_id=user_id,
            badge_type=badge_type,
            rationale=rationale,
            points=ValidationBadge.BADGE_POINTS[badge_type]
        )

        db.session.add(badge)

        # Update assignment status to "validated"
        assignment = ValidatorAssignment.query.filter_by(
            validator_id=user_id,
            project_id=project_id
        ).first()

        if assignment:
            assignment.status = 'validated'
            assignment.validated_by = user_id
            assignment.reviewed_at = datetime.utcnow()
            assignment.review_notes = rationale

            # Mark other assignments for this project as 'completed'
            other_assignments = ValidatorAssignment.query.filter(
                ValidatorAssignment.project_id == project_id,
                ValidatorAssignment.id != assignment.id
            ).all()

            for other in other_assignments:
                other.status = 'completed'
                other.review_notes = f'Validated by another validator ({user_id})'

        # Update project scores via AI system
        try:
            score_project_task.delay(project.id)
        except Exception as e:
            print(f"Failed to queue validator assignment rescore: {e}")

        db.session.commit()

        # Invalidate cache and emit real-time update
        CacheService.invalidate_project(project_id)
        SocketService.emit_badge_awarded(project_id, badge.to_dict(include_validator=True))

        return jsonify({
            'status': 'success',
            'message': 'Badge awarded successfully',
            'data': badge.to_dict(include_validator=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/permissions', methods=['GET'])
@validator_required
def get_my_permissions(user_id):
    """Get current validator's permissions"""
    try:
        permissions = ValidatorPermissions.query.filter_by(validator_id=user_id).first()

        if not permissions:
            return jsonify({
                'status': 'error',
                'message': 'Permissions not configured. Contact admin.'
            }), 404

        return jsonify({
            'status': 'success',
            'data': permissions.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@validator_bp.route('/stats', methods=['GET'])
@validator_required
def get_validator_stats(user_id):
    """Get validator statistics"""
    try:
        # Get total badges awarded by this validator
        total_badges = ValidationBadge.query.filter_by(validator_id=user_id).count()

        # Get breakdown by badge type
        badge_breakdown = {}
        for badge_type in ['stone', 'silver', 'gold', 'platinum', 'demerit']:
            count = ValidationBadge.query.filter_by(
                validator_id=user_id,
                badge_type=badge_type
            ).count()
            badge_breakdown[badge_type] = count

        # Get permissions
        permissions = ValidatorPermissions.query.filter_by(validator_id=user_id).first()

        # Count projects available for validation
        if permissions:
            if permissions.can_validate_all:
                available_projects = Project.query.count()
            else:
                available_projects = len(permissions.allowed_project_ids)
        else:
            available_projects = 0

        return jsonify({
            'status': 'success',
            'data': {
                'total_badges_awarded': total_badges,
                'badge_breakdown': badge_breakdown,
                'available_projects': available_projects,
                'permissions': permissions.to_dict() if permissions else None
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
