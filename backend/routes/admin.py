"""
Admin Routes - Comprehensive admin panel
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from extensions import db
from models.user import User
from models.project import Project
from models.badge import ValidationBadge
from models.investor_request import InvestorRequest
from models.validator_permissions import ValidatorPermissions
from models.chain import Chain, ChainModerationLog
from models.admin_scoring_config import AdminScoringConfig
from utils.decorators import admin_required
from utils.cache import CacheService
from utils.notifications import (
    notify_investor_request_approved,
    notify_investor_request_rejected,
    notify_validator_added,
    notify_validator_assignment,
)
from services.email_service import EmailService
from services.socket_service import SocketService
from schemas.scoring import UpdateConfigSchema
from tasks.scoring_tasks import score_project_task
from uuid import uuid4

admin_bp = Blueprint('admin', __name__)


# ============================================================================
# USER MANAGEMENT
# ============================================================================

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users(user_id):
    """Get all users with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')  # 'admin', 'validator', 'investor', 'regular'

        query = User.query

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    User.username.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.display_name.ilike(f'%{search}%')
                )
            )

        # Role filter
        if role_filter == 'admin':
            query = query.filter(User.is_admin == True)
        elif role_filter == 'validator':
            query = query.filter(User.is_validator == True)
        elif role_filter == 'investor':
            query = query.filter(User.is_investor == True)
        elif role_filter == 'regular':
            query = query.filter(
                User.is_admin == False,
                User.is_validator == False,
                User.is_investor == False
            )

        # Pagination
        users = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'data': {
                'users': [user.to_dict(include_email=True) for user in users.items],
                'total': users.total,
                'pages': users.pages,
                'current_page': page,
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/users/<user_id>/toggle-admin', methods=['POST'])
@admin_required
def toggle_admin(admin_id, user_id):
    """Make user admin or remove admin status"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404

        was_admin = user.is_admin
        user.is_admin = not user.is_admin
        db.session.commit()

        # Send email notification
        try:
            EmailService.send_admin_role_changed_email(
                user=user,
                is_admin=user.is_admin
            )
        except Exception as email_err:
            print(f"[Admin] Warning: failed to send admin role changed email: {email_err}")

        action = 'granted' if user.is_admin else 'removed'
        return jsonify({
            'status': 'success',
            'message': f'Admin access {action} for {user.username}',
            'data': user.to_dict(include_email=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/users/<user_id>/toggle-active', methods=['POST'])
@admin_required
def toggle_user_active(admin_id, user_id):
    """Ban or unban a user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404

        # Prevent self-ban
        if user_id == admin_id:
            return jsonify({'status': 'error', 'message': 'Cannot ban yourself'}), 400

        was_active = user.is_active
        user.is_active = not user.is_active
        db.session.commit()

        # Invalidate search cache when user's active status changes
        CacheService.invalidate_search_results()

        # Send email notification
        try:
            if user.is_active and not was_active:
                # User was unbanned
                EmailService.send_user_unbanned_email(user=user)
            elif not user.is_active and was_active:
                # User was banned
                EmailService.send_user_banned_email(user=user, reason=None)
        except Exception as email_err:
            print(f"[Admin] Warning: failed to send user ban/unban email: {email_err}")

        action = 'activated' if user.is_active else 'banned'
        return jsonify({
            'status': 'success',
            'message': f'User {action} successfully',
            'data': user.to_dict(include_email=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(admin_id, user_id):
    """Delete a user and all their data"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404

        # Prevent self-deletion
        if user_id == admin_id:
            return jsonify({'status': 'error', 'message': 'Cannot delete yourself'}), 400

        username = user.username
        db.session.delete(user)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'User {username} deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# VALIDATOR MANAGEMENT
# ============================================================================

@admin_bp.route('/validators', methods=['GET'])
@admin_required
def get_all_validators(user_id):
    """Get all validators with their permissions and assignment counts"""
    try:
        from models.validator_assignment import ValidatorAssignment
        from sqlalchemy.orm import joinedload
        from sqlalchemy import func, case

        # OPTIMIZED: Single aggregation query instead of N+1 queries
        # Get all validators with eager-loaded permissions
        validators = User.query.filter(User.is_validator == True)\
            .options(joinedload(User.validator_permissions))\
            .all()

        # Get assignment stats for ALL validators in ONE query using aggregation
        validator_stats = db.session.query(
            ValidatorAssignment.validator_id,
            func.count(ValidatorAssignment.id).label('total'),
            func.sum(case((ValidatorAssignment.status == 'pending', 1), else_=0)).label('pending'),
            func.sum(case((ValidatorAssignment.status == 'in_review', 1), else_=0)).label('in_review'),
            func.sum(case((ValidatorAssignment.status == 'validated', 1), else_=0)).label('completed')
        ).group_by(ValidatorAssignment.validator_id).all()

        # Convert to dict for easy lookup
        stats_by_validator = {
            stat[0]: {
                'total': stat[1] or 0,
                'pending': stat[2] or 0,
                'in_review': stat[3] or 0,
                'completed': stat[4] or 0
            }
            for stat in validator_stats
        }

        # Get all assignments with eager-loaded projects in ONE query
        all_assignments = ValidatorAssignment.query\
            .options(joinedload(ValidatorAssignment.project))\
            .all()

        # Build category breakdown per validator
        category_breakdown_by_validator = {}
        for assignment in all_assignments:
            validator_id = assignment.validator_id
            if validator_id not in category_breakdown_by_validator:
                category_breakdown_by_validator[validator_id] = {}

            if assignment.project and assignment.project.categories:
                for category in assignment.project.categories:
                    if category not in category_breakdown_by_validator[validator_id]:
                        category_breakdown_by_validator[validator_id][category] = 0
                    category_breakdown_by_validator[validator_id][category] += 1

        # Build response with minimal additional queries
        validators_data = []
        for validator in validators:
            validator_dict = validator.to_dict(include_email=True)

            # Use eager-loaded permissions
            permissions = validator.validator_permissions
            if permissions:
                validator_dict['permissions'] = permissions.to_dict()
            else:
                validator_dict['permissions'] = {
                    'can_validate_all': False,
                    'allowed_badge_types': [],
                    'allowed_project_ids': []
                }

            # Use pre-computed assignment stats
            stats = stats_by_validator.get(validator.id, {
                'total': 0,
                'pending': 0,
                'in_review': 0,
                'completed': 0
            })

            validator_dict['assignments'] = {
                'total': stats['total'],
                'pending': stats['pending'],
                'in_review': stats['in_review'],
                'completed': stats['completed'],
                'category_breakdown': category_breakdown_by_validator.get(validator.id, {})
            }

            validators_data.append(validator_dict)

        return jsonify({
            'status': 'success',
            'data': validators_data
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/validators/add-email', methods=['POST'])
@admin_required
def add_validator_by_email(user_id):
    """Add validator by email - create account if doesn't exist"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'status': 'error', 'message': 'Email is required'}), 400

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # User doesn't exist - return message to create account first
            return jsonify({
                'status': 'pending',
                'message': 'No account found with this email. Please ask the user to create an account first.',
                'email': email
            }), 404

        # User exists - make them validator
        if user.is_validator:
            return jsonify({
                'status': 'info',
                'message': f'{user.username} is already a validator'
            }), 200

        user.is_validator = True
        user.validator_approved_at = datetime.utcnow()
        user.validator_approved_by = user_id

        # Create default permissions
        permissions = ValidatorPermissions(
            validator_id=user.id,
            can_validate_all=False,
            allowed_badge_types=['stone', 'silver', 'gold', 'platinum', 'demerit'],
            allowed_project_ids=[]
        )
        db.session.add(permissions)
        db.session.commit()

        # Notify user in-app and via email
        try:
            notify_validator_added(user, actor_id=user_id)
        except Exception as notify_err:
            print(f"[Admin] Warning: failed to create validator notification: {notify_err}")

        try:
            EmailService.send_validator_added_email(validator=user)
        except Exception as email_err:
            print(f"[Admin] Warning: failed to send validator email: {email_err}")

        return jsonify({
            'status': 'success',
            'message': f'{user.username} is now a validator',
            'data': user.to_dict(include_email=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/validators/<validator_id>/remove', methods=['POST'])
@admin_required
def remove_validator(user_id, validator_id):
    """Remove validator status"""
    try:
        validator = User.query.get(validator_id)
        if not validator:
            return jsonify({'status': 'error', 'message': 'Validator not found'}), 404

        validator.is_validator = False

        # Delete permissions
        permissions = ValidatorPermissions.query.filter_by(validator_id=validator_id).first()
        if permissions:
            db.session.delete(permissions)

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Validator access removed from {validator.username}'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/validators/<validator_id>/permissions', methods=['POST'])
@admin_required
def update_validator_permissions(user_id, validator_id):
    """Update validator permissions"""
    try:
        data = request.get_json()

        validator = User.query.get(validator_id)
        if not validator or not validator.is_validator:
            return jsonify({'status': 'error', 'message': 'Validator not found'}), 404

        # Get or create permissions
        permissions = ValidatorPermissions.query.filter_by(validator_id=validator_id).first()
        if not permissions:
            permissions = ValidatorPermissions(validator_id=validator_id)
            db.session.add(permissions)

        # Update permissions
        if 'can_validate_all' in data:
            permissions.can_validate_all = data['can_validate_all']

        if 'allowed_badge_types' in data:
            permissions.allowed_badge_types = data['allowed_badge_types']

        if 'allowed_project_ids' in data:
            permissions.allowed_project_ids = data['allowed_project_ids']

        if 'allowed_categories' in data:
            permissions.allowed_categories = data['allowed_categories']

        permissions.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Permissions updated successfully',
            'data': permissions.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# PROJECT MANAGEMENT
# ============================================================================

@admin_bp.route('/projects', methods=['GET'])
@admin_required
def get_all_projects(user_id):
    """Get all projects with pagination"""
    try:
        from sqlalchemy.orm import joinedload

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')

        # OPTIMIZED: Eager load creator to prevent N+1 queries
        query = Project.query.options(joinedload(Project.creator))

        if search:
            query = query.filter(
                db.or_(
                    Project.title.ilike(f'%{search}%'),
                    Project.description.ilike(f'%{search}%')
                )
            )

        projects = query.order_by(Project.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'data': {
                'projects': [project.to_dict(include_creator=True) for project in projects.items],
                'total': projects.total,
                'pages': projects.pages,
                'current_page': page,
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/projects/<project_id>', methods=['PUT'])
@admin_required
def update_project(user_id, project_id):
    """Edit any project"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        data = request.get_json()

        # Update allowed fields
        allowed_fields = ['title', 'description', 'demo_url', 'github_url', 'category', 'tags']
        # Track if score-affecting fields were changed
        score_affecting_fields = {'description', 'github_url', 'category'}
        needs_rescore = any(field in score_affecting_fields and field in data for field in score_affecting_fields)

        for field in allowed_fields:
            if field in data:
                setattr(project, field, data[field])

        project.updated_at = datetime.utcnow()
        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_project(project_id)

        # Trigger rescore if score-affecting fields were changed
        if needs_rescore:
            try:
                from tasks.scoring_tasks import score_project_task
                score_project_task.delay(project.id)
                CacheService.invalidate_leaderboard()  # Scores affect leaderboard
            except Exception as e:
                print(f"Failed to queue admin project rescore: {e}")

        return jsonify({
            'status': 'success',
            'message': 'Project updated successfully',
            'data': project.to_dict(include_creator=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/projects/<project_id>', methods=['DELETE'])
@admin_required
def delete_project(user_id, project_id):
    """Delete any project"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        title = project.title
        db.session.delete(project)
        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_project(project_id)

        return jsonify({
            'status': 'success',
            'message': f'Project "{title}" deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/projects/<project_id>/feature', methods=['POST'])
@admin_required
def feature_project(user_id, project_id):
    """Feature or unfeature a project"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        was_featured = project.is_featured
        project.is_featured = not project.is_featured
        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_project(project_id)

        # Send email notification when project is featured (not unfeatured)
        if project.is_featured and not was_featured:
            try:
                project_owner = User.query.get(project.user_id)
                if project_owner:
                    EmailService.send_project_featured_email(
                        project_owner=project_owner,
                        project=project
                    )
            except Exception as email_err:
                print(f"[Admin] Warning: failed to send project featured email: {email_err}")

        action = 'featured' if project.is_featured else 'unfeatured'
        return jsonify({
            'status': 'success',
            'message': f'Project {action} successfully',
            'data': project.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# INVESTOR REQUEST MANAGEMENT
# ============================================================================

@admin_bp.route('/investor-requests', methods=['GET'])
@admin_required
def get_investor_requests(user_id):
    """Get all investor requests"""
    try:
        status_filter = request.args.get('status', '')  # 'pending', 'approved', 'rejected'

        query = InvestorRequest.query

        if status_filter:
            query = query.filter_by(status=status_filter)

        requests = query.order_by(InvestorRequest.created_at.desc()).all()

        return jsonify({
            'status': 'success',
            'data': [req.to_dict() for req in requests]
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/investor-requests/<request_id>/approve', methods=['POST'])
@admin_required
def approve_investor_request(user_id, request_id):
    """Approve investor request"""
    try:
        investor_request = InvestorRequest.query.get(request_id)
        if not investor_request:
            return jsonify({'status': 'error', 'message': 'Request not found'}), 404

        investor_request.status = 'approved'
        investor_request.reviewed_by = user_id
        investor_request.reviewed_at = datetime.utcnow()

        # Update user to investor
        user = User.query.get(investor_request.user_id)
        if user:
            user.is_investor = True

        db.session.commit()

        # Send notification to the investor
        notify_investor_request_approved(investor_request.user_id, investor_request.name)

        # Send approval email to the investor
        try:
            if user:
                EmailService.send_investor_approved_email(
                    investor=user,
                    investor_name=investor_request.name
                )
        except Exception as email_err:
            print(f"[Admin] Warning: failed to send investor approval email: {email_err}")

        return jsonify({
            'status': 'success',
            'message': 'Investor request approved',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/investor-requests/<request_id>/reject', methods=['POST'])
@admin_required
def reject_investor_request(user_id, request_id):
    """Reject investor request"""
    try:
        investor_request = InvestorRequest.query.get(request_id)
        if not investor_request:
            return jsonify({'status': 'error', 'message': 'Request not found'}), 404

        investor_request.status = 'rejected'
        investor_request.reviewed_by = user_id
        investor_request.reviewed_at = datetime.utcnow()

        db.session.commit()

        # Send notification to the investor
        notify_investor_request_rejected(investor_request.user_id)

        # Send rejection email to the investor
        try:
            user = User.query.get(investor_request.user_id)
            if user:
                EmailService.send_investor_rejected_email(
                    investor=user,
                    investor_name=investor_request.name,
                    reason=None  # Could add admin_notes field if needed
                )
        except Exception as email_err:
            print(f"[Admin] Warning: failed to send investor rejection email: {email_err}")

        return jsonify({
            'status': 'success',
            'message': 'Investor request rejected',
            'data': investor_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# ANALYTICS & STATS
# ============================================================================

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_platform_stats(user_id):
    """Get platform statistics"""
    try:
        from sqlalchemy import func, case

        # OPTIMIZED: Get all stats in fewer queries using aggregation
        # User stats - single query with aggregation
        user_stats = db.session.query(
            func.count(User.id).label('total'),
            func.sum(case((User.is_active == True, 1), else_=0)).label('active'),
            func.sum(case((User.is_admin == True, 1), else_=0)).label('admins'),
            func.sum(case((User.is_validator == True, 1), else_=0)).label('validators'),
            func.sum(case((User.is_investor == True, 1), else_=0)).label('investors')
        ).first()

        total_users = user_stats[0] or 0
        active_users = user_stats[1] or 0
        admins = user_stats[2] or 0
        validators = user_stats[3] or 0
        investors = user_stats[4] or 0

        # Project stats - single query
        project_stats = db.session.query(
            func.count(Project.id).label('total'),
            func.sum(case((Project.is_featured == True, 1), else_=0)).label('featured')
        ).first()

        total_projects = project_stats[0] or 0
        featured_projects = project_stats[1] or 0

        # Badge stats - single query with GROUP BY
        badge_stats = db.session.query(
            ValidationBadge.badge_type,
            func.count(ValidationBadge.id).label('count')
        ).group_by(ValidationBadge.badge_type).all()

        total_badges = sum(count for _, count in badge_stats)
        badge_breakdown = {badge_type: count for badge_type, count in badge_stats}
        # Fill in missing badge types with 0
        for badge_type in ['stone', 'silver', 'gold', 'platinum', 'demerit', 'custom']:
            if badge_type not in badge_breakdown:
                badge_breakdown[badge_type] = 0

        # Investor request stats - single query
        investor_stats = db.session.query(
            InvestorRequest.status,
            func.count(InvestorRequest.id).label('count')
        ).group_by(InvestorRequest.status).all()

        pending_investor_requests = next((count for status, count in investor_stats if status == 'pending'), 0)
        approved_investor_requests = next((count for status, count in investor_stats if status == 'approved'), 0)

        # Chain stats - single query
        chain_stats = db.session.query(
            func.count(Chain.id).label('total'),
            func.sum(case((Chain.status == 'active', 1), else_=0)).label('active'),
            func.sum(case((Chain.status == 'banned', 1), else_=0)).label('banned'),
            func.sum(case((Chain.status == 'suspended', 1), else_=0)).label('suspended'),
            func.sum(case((Chain.is_featured == True, 1), else_=0)).label('featured')
        ).first()

        total_chains = chain_stats[0] or 0
        active_chains = chain_stats[1] or 0
        banned_chains = chain_stats[2] or 0
        suspended_chains = chain_stats[3] or 0
        featured_chains = chain_stats[4] or 0

        return jsonify({
            'status': 'success',
            'data': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'admins': admins,
                    'validators': validators,
                    'investors': investors,
                },
                'projects': {
                    'total': total_projects,
                    'featured': featured_projects,
                },
                'badges': {
                    'total': total_badges,
                    'breakdown': badge_breakdown,
                },
                'investor_requests': {
                    'pending': pending_investor_requests,
                    'approved': approved_investor_requests,
                },
                'chains': {
                    'total': total_chains,
                    'active': active_chains,
                    'banned': banned_chains,
                    'suspended': suspended_chains,
                    'featured': featured_chains,
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# VALIDATOR ASSIGNMENT MANAGEMENT
# ============================================================================

@admin_bp.route('/validator-assignments', methods=['POST'])
@admin_required
def assign_project_to_validator(admin_id):
    """Assign a project to a validator for review"""
    try:
        from models.validator_assignment import ValidatorAssignment
        from uuid import uuid4

        data = request.get_json()
        validator_id = data.get('validator_id')
        project_id = data.get('project_id')
        category_filter = data.get('category_filter')
        priority = data.get('priority', 'normal')

        if not validator_id or not project_id:
            return jsonify({'status': 'error', 'message': 'validator_id and project_id are required'}), 400

        # Verify validator exists and is a validator
        validator = User.query.get(validator_id)
        if not validator or not validator.is_validator:
            return jsonify({'status': 'error', 'message': 'Invalid validator'}), 400

        # Verify project exists
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # Check if assignment already exists
        existing = ValidatorAssignment.query.filter_by(
            validator_id=validator_id,
            project_id=project_id
        ).first()

        if existing:
            return jsonify({'status': 'error', 'message': 'Project already assigned to this validator'}), 400

        # Create assignment
        assignment = ValidatorAssignment(
            id=str(uuid4()),
            validator_id=validator_id,
            project_id=project_id,
            assigned_by=admin_id,
            category_filter=category_filter,
            priority=priority,
            status='pending'
        )

        db.session.add(assignment)
        db.session.commit()

        # Notify the validator (in-app + email)
        try:
            notify_validator_assignment(validator, project, actor_id=admin_id, priority=priority)
        except Exception as notify_err:
            print(f"[Admin] Warning: failed to create assignment notification: {notify_err}")

        try:
            EmailService.send_validator_assignment_email(
                validator=validator,
                project=project,
                priority=priority
            )
        except Exception as email_err:
            print(f"[Admin] Warning: failed to send assignment email: {email_err}")

        return jsonify({
            'status': 'success',
            'message': 'Project assigned to validator successfully',
            'data': assignment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/validator-assignments/bulk', methods=['POST'])
@admin_required
def bulk_assign_projects(admin_id):
    """Bulk assign projects to a validator based on filters"""
    try:
        from models.validator_assignment import ValidatorAssignment
        from uuid import uuid4

        data = request.get_json()
        validator_id = data.get('validator_id')
        category_filter = data.get('category_filter')  # 'all', or specific category
        priority = data.get('priority', 'normal')
        limit = data.get('limit', 50)  # Max projects to assign

        if not validator_id:
            return jsonify({'status': 'error', 'message': 'validator_id is required'}), 400

        # Verify validator exists
        validator = User.query.get(validator_id)
        if not validator or not validator.is_validator:
            return jsonify({'status': 'error', 'message': 'Invalid validator'}), 400

        # Build query for projects
        query = Project.query.filter_by(is_deleted=False)

        if category_filter and category_filter != 'all':
            # Check if category is in the categories JSON array
            from sqlalchemy import cast, String
            query = query.filter(
                cast(Project.categories, String).like(f'%{category_filter}%')
            )

        # Get projects that aren't already assigned to this validator
        assigned_project_ids = db.session.query(ValidatorAssignment.project_id).filter_by(
            validator_id=validator_id
        ).all()
        assigned_ids = [p[0] for p in assigned_project_ids]

        if assigned_ids:
            query = query.filter(Project.id.notin_(assigned_ids))

        projects = query.order_by(Project.created_at.desc()).limit(limit).all()

        # Create assignments
        assignments_created = 0
        created_projects = []
        for project in projects:
            assignment = ValidatorAssignment(
                id=str(uuid4()),
                validator_id=validator_id,
                project_id=project.id,
                assigned_by=admin_id,
                category_filter=category_filter,
                priority=priority,
                status='pending'
            )
            db.session.add(assignment)
            assignments_created += 1
            created_projects.append(project)

        db.session.commit()

        # Notify the validator (in-app + email for each project)
        try:
            for project in created_projects:
                notify_validator_assignment(validator, project, actor_id=admin_id, priority=priority)
                EmailService.send_validator_assignment_email(
                    validator=validator,
                    project=project,
                    priority=priority
                )
        except Exception as notify_err:
            print(f"[Admin] Warning: notification/email failed for bulk assignment: {notify_err}")

        return jsonify({
            'status': 'success',
            'message': f'{assignments_created} projects assigned to validator',
            'data': {'count': assignments_created}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/validator-assignments/<assignment_id>', methods=['DELETE'])
@admin_required
def remove_validator_assignment(admin_id, assignment_id):
    """Remove a validator assignment"""
    try:
        from models.validator_assignment import ValidatorAssignment

        assignment = ValidatorAssignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'status': 'error', 'message': 'Assignment not found'}), 404

        db.session.delete(assignment)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Assignment removed successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/validator-assignments/validator/<validator_id>', methods=['GET'])
@admin_required
def get_validator_assignments(admin_id, validator_id):
    """Get all assignments for a specific validator"""
    try:
        from models.validator_assignment import ValidatorAssignment

        assignments = ValidatorAssignment.query.filter_by(
            validator_id=validator_id
        ).order_by(ValidatorAssignment.created_at.desc()).all()

        # Include project details
        result = []
        for assignment in assignments:
            assignment_data = assignment.to_dict()
            assignment_data['project'] = assignment.project.to_dict(include_creator=True)
            result.append(assignment_data)

        return jsonify({
            'status': 'success',
            'data': result
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/categories', methods=['GET'])
@admin_required
def get_project_categories(admin_id):
    """Get all unique project categories"""
    try:
        # Get distinct categories
        categories = db.session.query(Project.category).distinct().filter(
            Project.category.isnot(None),
            Project.is_deleted == False
        ).all()

        category_list = [c[0] for c in categories if c[0]]

        # Add default categories if not present
        default_categories = [
            'AI/ML', 'Web3/Blockchain', 'FinTech', 'HealthTech', 'EdTech',
            'E-Commerce', 'SaaS', 'DevTools', 'IoT', 'Gaming', 'Social', 'Other'
        ]

        all_categories = list(set(category_list + default_categories))
        all_categories.sort()

        return jsonify({
            'status': 'success',
            'data': {'categories': all_categories}
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# BADGE MANAGEMENT
# ============================================================================

@admin_bp.route('/badges', methods=['GET'])
@admin_required
def get_all_badges(user_id):
    """Get all badges with pagination and filtering"""
    try:
        from sqlalchemy.orm import joinedload

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        project_id = request.args.get('project_id')
        validator_id = request.args.get('validator_id')
        badge_type = request.args.get('badge_type')

        query = ValidationBadge.query.options(
            joinedload(ValidationBadge.validator),
            joinedload(ValidationBadge.project)
        )

        # Apply filters
        if project_id:
            query = query.filter(ValidationBadge.project_id == project_id)
        if validator_id:
            query = query.filter(ValidationBadge.validator_id == validator_id)
        if badge_type:
            query = query.filter(ValidationBadge.badge_type == badge_type)

        # Paginate
        badges = query.order_by(ValidationBadge.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'data': {
                'badges': [badge.to_dict(include_validator=True, include_project=True) for badge in badges.items],
                'total': badges.total,
                'pages': badges.pages,
                'current_page': page
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/badges/<badge_id>', methods=['GET'])
@admin_required
def get_badge(user_id, badge_id):
    """Get a specific badge"""
    try:
        badge = ValidationBadge.query.get(badge_id)
        if not badge:
            return jsonify({'status': 'error', 'message': 'Badge not found'}), 404

        return jsonify({
            'status': 'success',
            'data': badge.to_dict(include_validator=True, include_project=True)
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/badges/<badge_id>', methods=['PUT', 'PATCH'])
@admin_required
def update_badge(user_id, badge_id):
    """Update a badge (change type, rationale, points)"""
    try:
        data = request.get_json()

        badge = ValidationBadge.query.get(badge_id)
        if not badge:
            return jsonify({'status': 'error', 'message': 'Badge not found'}), 404

        # Update fields
        if 'badge_type' in data:
            if data['badge_type'] not in ValidationBadge.BADGE_POINTS:
                return jsonify({'status': 'error', 'message': 'Invalid badge type'}), 400
            badge.badge_type = data['badge_type']
            badge.points = ValidationBadge.BADGE_POINTS[data['badge_type']]

        if 'rationale' in data:
            badge.rationale = data['rationale']

        # Update project scores via AI system
        project = Project.query.get(badge.project_id)
        if project:
            try:
                score_project_task.delay(project.id)
            except Exception as e:
                print(f"Failed to queue badge update rescore: {e}")

        db.session.commit()

        # Invalidate caches
        CacheService.invalidate_project(badge.project_id)
        CacheService.invalidate_leaderboard()

        # Emit real-time update
        SocketService.emit_badge_updated(badge.project_id, badge.to_dict(include_validator=True))

        return jsonify({
            'status': 'success',
            'message': 'Badge updated successfully',
            'data': badge.to_dict(include_validator=True, include_project=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/badges/<badge_id>', methods=['DELETE'])
@admin_required
def delete_badge(user_id, badge_id):
    """Delete a badge and reset validation status if no badges remain"""
    try:
        badge = ValidationBadge.query.get(badge_id)
        if not badge:
            return jsonify({'status': 'error', 'message': 'Badge not found'}), 404

        project_id = badge.project_id

        db.session.delete(badge)
        db.session.flush()  # Flush to get accurate count

        # Check if project has any remaining badges
        remaining_badges = ValidationBadge.query.filter_by(project_id=project_id).count()

        # If no badges remain, reset all validator assignments back to pending
        if remaining_badges == 0:
            assignments = ValidatorAssignment.query.filter_by(project_id=project_id).all()
            for assignment in assignments:
                if assignment.status in ['validated', 'completed']:
                    assignment.status = 'pending'
                    assignment.validated_by = None
                    assignment.reviewed_at = None
                    assignment.review_notes = 'Badge removed by admin - reset to pending'

        # Update project scores via AI system
        project = Project.query.get(project_id)
        if project:
            try:
                score_project_task.delay(project.id)
            except Exception as e:
                print(f"Failed to queue badge delete rescore: {e}")

        db.session.commit()

        # Invalidate caches
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()

        # Emit real-time update
        SocketService.emit_badge_removed(project_id, badge_id)

        message = 'Badge deleted successfully'
        if remaining_badges == 0:
            message += ' - Project reset to pending validation status'

        return jsonify({
            'status': 'success',
            'message': message,
            'remaining_badges': remaining_badges
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/badges/award', methods=['POST'])
@admin_required
def award_badge_as_admin(user_id):
    """Award a badge as admin (no permission checks)"""
    try:
        data = request.get_json()

        project_id = data.get('project_id')
        validator_id = data.get('validator_id', user_id)  # Can be admin or specific validator
        badge_type = data.get('badge_type')
        rationale = data.get('rationale', '')

        if not project_id or not badge_type:
            return jsonify({'status': 'error', 'message': 'project_id and badge_type required'}), 400

        # Validate badge type
        if badge_type not in ValidationBadge.BADGE_POINTS:
            return jsonify({'status': 'error', 'message': 'Invalid badge type'}), 400

        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # ENFORCE: 1 PROJECT = 1 BADGE ONLY
        # Check if ANY badge already exists for this project
        existing_badge = ValidationBadge.query.filter_by(project_id=project_id).first()

        if existing_badge:
            # Get validator name
            validator = User.query.get(existing_badge.validator_id)
            validator_name = validator.display_name if validator else "Unknown Validator"

            return jsonify({
                'status': 'error',
                'message': f'Badge already awarded by {validator_name}',
                'existing_badge': {
                    'type': existing_badge.badge_type,
                    'awarded_by': validator_name,
                    'awarded_at': existing_badge.created_at.isoformat() if existing_badge.created_at else None
                }
            }), 400

        # Create badge
        badge = ValidationBadge(
            project_id=project_id,
            validator_id=validator_id,
            badge_type=badge_type,
            rationale=rationale,
            points=ValidationBadge.BADGE_POINTS[badge_type]
        )

        db.session.add(badge)

        # Update ValidatorAssignment status to 'validated' if exists
        # This ensures the project shows in validator's "validated" dashboard section
        from models.validator_assignment import ValidatorAssignment
        assignment = ValidatorAssignment.query.filter_by(
            validator_id=validator_id,
            project_id=project_id
        ).first()

        if assignment:
            assignment.status = 'validated'
            assignment.validated_by = validator_id
            assignment.reviewed_at = datetime.utcnow()
            assignment.review_notes = rationale

            # Mark other assignments for this project as 'completed'
            other_assignments = ValidatorAssignment.query.filter(
                ValidatorAssignment.project_id == project_id,
                ValidatorAssignment.id != assignment.id
            ).all()

            for other in other_assignments:
                other.status = 'completed'
                other.review_notes = f'Validated by another validator ({validator_id})'

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

        # Invalidate cache and emit real-time update
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()
        CacheService.invalidate_project_badges(project_id)
        SocketService.emit_badge_awarded(project_id, badge.to_dict(include_validator=True))

        return jsonify({
            'status': 'success',
            'message': 'Badge awarded successfully',
            'data': badge.to_dict(include_validator=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/projects/<project_id>/badges', methods=['GET'])
@admin_required
def get_project_badges(user_id, project_id):
    """Get all badges for a specific project"""
    try:
        from sqlalchemy.orm import joinedload

        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        badges = ValidationBadge.query.filter_by(project_id=project_id).options(
            joinedload(ValidationBadge.validator)
        ).order_by(ValidationBadge.created_at.desc()).all()

        return jsonify({
            'status': 'success',
            'data': {
                'project': project.to_dict(include_creator=True),
                'badges': [badge.to_dict(include_validator=True) for badge in badges],
                'total_badges': len(badges),
                'total_points': sum(badge.points for badge in badges)
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# CHAIN MODERATION
# ============================================================================

@admin_bp.route('/chains', methods=['GET'])
@admin_required
def get_all_chains(user_id):
    """Get all chains with moderation status and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')  # 'active', 'banned', 'suspended'

        query = Chain.query

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    Chain.name.ilike(f'%{search}%'),
                    Chain.slug.ilike(f'%{search}%'),
                    Chain.description.ilike(f'%{search}%')
                )
            )

        # Status filter
        if status_filter:
            query = query.filter(Chain.status == status_filter)

        # Pagination
        chains = query.order_by(Chain.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'data': {
                'chains': [chain.to_dict(include_creator=True) for chain in chains.items],
                'total': chains.total,
                'pages': chains.pages,
                'current_page': page,
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/<slug>/ban', methods=['POST'])
@admin_required
def ban_chain(user_id, slug):
    """Ban a chain permanently"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Banned by administrator')

        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return jsonify({'status': 'error', 'message': 'Chain not found'}), 404

        # Ban the chain
        chain.status = 'banned'
        chain.banned_at = datetime.utcnow()
        chain.banned_by_id = user_id
        chain.ban_reason = reason
        chain.suspended_until = None  # Clear any suspension
        chain.is_active = False

        # Create moderation log
        log = ChainModerationLog(
            id=str(uuid4()),
            chain_id=chain.id,
            admin_id=user_id,
            action='ban',
            reason=reason,
            meta_data={'banned_at': chain.banned_at.isoformat()}
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Chain "{chain.name}" has been banned',
            'data': chain.to_dict(include_creator=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/<slug>/suspend', methods=['POST'])
@admin_required
def suspend_chain(user_id, slug):
    """Suspend a chain temporarily"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Suspended by administrator')
        duration_days = data.get('duration_days', 7)  # Default 7 days

        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return jsonify({'status': 'error', 'message': 'Chain not found'}), 404

        # Suspend the chain
        suspended_until = datetime.utcnow() + timedelta(days=duration_days)
        chain.status = 'suspended'
        chain.suspended_until = suspended_until
        chain.banned_at = datetime.utcnow()
        chain.banned_by_id = user_id
        chain.ban_reason = reason
        chain.is_active = False

        # Create moderation log
        log = ChainModerationLog(
            id=str(uuid4()),
            chain_id=chain.id,
            admin_id=user_id,
            action='suspend',
            reason=reason,
            meta_data={
                'suspended_until': suspended_until.isoformat(),
                'duration_days': duration_days
            }
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Chain "{chain.name}" has been suspended until {suspended_until.strftime("%Y-%m-%d")}',
            'data': chain.to_dict(include_creator=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/<slug>/unban', methods=['POST'])
@admin_required
def unban_chain(user_id, slug):
    """Unban or unsuspend a chain"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Unbanned by administrator')

        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return jsonify({'status': 'error', 'message': 'Chain not found'}), 404

        if chain.status not in ['banned', 'suspended']:
            return jsonify({'status': 'error', 'message': 'Chain is not banned or suspended'}), 400

        # Unban the chain
        previous_status = chain.status
        chain.status = 'active'
        chain.banned_at = None
        chain.banned_by_id = None
        chain.ban_reason = None
        chain.suspended_until = None
        chain.is_active = True

        # Create moderation log
        log = ChainModerationLog(
            id=str(uuid4()),
            chain_id=chain.id,
            admin_id=user_id,
            action='unban',
            reason=reason,
            meta_data={'previous_status': previous_status}
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Chain "{chain.name}" has been unbanned',
            'data': chain.to_dict(include_creator=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/<slug>', methods=['DELETE'])
@admin_required
def delete_chain(user_id, slug):
    """Delete a chain permanently (cascades to all related data)"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Deleted by administrator')

        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return jsonify({'status': 'error', 'message': 'Chain not found'}), 404

        chain_name = chain.name
        chain_id = chain.id

        # Create moderation log before deletion
        log = ChainModerationLog(
            id=str(uuid4()),
            chain_id=chain_id,
            admin_id=user_id,
            action='delete',
            reason=reason,
            meta_data={
                'chain_name': chain_name,
                'chain_slug': slug,
                'deleted_at': datetime.utcnow().isoformat()
            }
        )
        db.session.add(log)
        db.session.flush()  # Save log before deleting chain

        # Delete chain (cascades to chain_projects, chain_followers, etc.)
        db.session.delete(chain)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Chain "{chain_name}" has been permanently deleted'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/<slug>/feature', methods=['POST'])
@admin_required
def toggle_chain_featured(user_id, slug):
    """Feature or unfeature a chain"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return jsonify({'status': 'error', 'message': 'Chain not found'}), 404

        # Toggle featured status
        chain.is_featured = not chain.is_featured

        # Create moderation log
        action = 'feature' if chain.is_featured else 'unfeature'
        log = ChainModerationLog(
            id=str(uuid4()),
            chain_id=chain.id,
            admin_id=user_id,
            action=action,
            reason=f'Chain {action}d by administrator',
            meta_data={'is_featured': chain.is_featured}
        )
        db.session.add(log)
        db.session.commit()

        status_text = 'featured' if chain.is_featured else 'unfeatured'
        return jsonify({
            'status': 'success',
            'message': f'Chain "{chain.name}" has been {status_text}',
            'data': chain.to_dict(include_creator=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/moderation-logs', methods=['GET'])
@admin_required
def get_chain_moderation_logs(user_id):
    """Get chain moderation logs with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        chain_id = request.args.get('chain_id', '')
        action = request.args.get('action', '')  # ban, suspend, unban, delete, feature
        admin_id = request.args.get('admin_id', '')

        query = ChainModerationLog.query

        # Filters
        if chain_id:
            query = query.filter(ChainModerationLog.chain_id == chain_id)
        if action:
            query = query.filter(ChainModerationLog.action == action)
        if admin_id:
            query = query.filter(ChainModerationLog.admin_id == admin_id)

        # Pagination
        logs = query.order_by(ChainModerationLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'data': {
                'logs': [log.to_dict(include_chain=True, include_admin=True) for log in logs.items],
                'total': logs.total,
                'pages': logs.pages,
                'current_page': page,
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/chains/<slug>/logs', methods=['GET'])
@admin_required
def get_chain_logs(user_id, slug):
    """Get moderation logs for a specific chain"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return jsonify({'status': 'error', 'message': 'Chain not found'}), 404

        logs = ChainModerationLog.query.filter_by(
            chain_id=chain.id
        ).order_by(ChainModerationLog.created_at.desc()).all()

        return jsonify({
            'status': 'success',
            'data': {
                'chain': chain.to_dict(include_creator=True),
                'logs': [log.to_dict(include_admin=True) for log in logs]
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# SCORING CONFIGURATION
# ============================================================================

@admin_bp.route('/scoring/config', methods=['GET'])
@admin_required
def get_scoring_config(user_id):
    """
    Get all scoring configuration values

    Returns:
        All scoring configurations (weights, LLM config, GitHub weights, etc.)
    """
    try:
        configs = AdminScoringConfig.query.all()

        config_data = {}
        for config in configs:
            config_data[config.config_key] = {
                'value': config.config_value,
                'updated_at': config.updated_at.isoformat() if config.updated_at else None,
                'updated_by': config.updated_by
            }

        return jsonify({
            'status': 'success',
            'data': config_data
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/scoring/config', methods=['PUT'])
@admin_required
def update_scoring_config(user_id):
    """
    Update scoring configuration

    Body (JSON):
        {
            "config_key": "scoring_weights",
            "config_value": {"quality": 30, "verification": 25, ...}
        }

    Returns:
        Updated configuration
    """
    try:
        data = request.get_json()

        # Validate input
        schema = UpdateConfigSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'status': 'error', 'message': 'Validation failed', 'errors': errors}), 400

        config_key = data.get('config_key')
        config_value = data.get('config_value')

        # Get or create config
        config = AdminScoringConfig.query.filter_by(config_key=config_key).first()
        if not config:
            config = AdminScoringConfig(
                id=str(uuid4()),
                config_key=config_key
            )
            db.session.add(config)

        # Update values
        config.config_value = config_value
        config.updated_by = user_id
        config.updated_at = datetime.utcnow()

        db.session.commit()

        # Clear cache to force reload of new config
        cache_service = CacheService()
        cache_service.delete(f'scoring_config:{config_key}')

        return jsonify({
            'status': 'success',
            'message': 'Configuration updated successfully',
            'data': {
                'config_key': config.config_key,
                'config_value': config.config_value,
                'updated_at': config.updated_at.isoformat()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/projects/<project_id>/rescore', methods=['POST'])
@admin_required
def rescore_project(user_id, project_id):
    """
    Manually trigger rescoring for a specific project

    Args:
        project_id: Project UUID

    Returns:
        Task queued confirmation
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # Check if scoring is already in progress
        if project.scoring_status == 'processing':
            return jsonify({
                'status': 'error',
                'message': 'Scoring is already in progress for this project'
            }), 400

        # Reset scoring status
        project.scoring_status = 'pending'
        project.scoring_error = None
        project.scoring_retry_count = 0  # Reset retry count for manual rescore
        db.session.commit()

        # Queue scoring task
        task = score_project_task.delay(project.id)

        return jsonify({
            'status': 'success',
            'message': 'Project rescoring queued successfully',
            'data': {
                'project_id': project.id,
                'task_id': task.id,
                'scoring_status': 'queued'
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/projects/rescore/bulk', methods=['POST'])
@admin_required
def rescore_projects_bulk(user_id):
    """
    Bulk rescore projects with optional filtering

    Request Body:
        {
            "filter": "all" | "failed" | "completed" | "pending",
            "project_ids": ["uuid1", "uuid2", ...],  # Optional: specific projects
            "force": true/false  # Optional: force rescore even if processing
        }

    Returns:
        Count of projects queued for rescoring
    """
    try:
        data = request.get_json() or {}
        filter_type = data.get('filter', 'all')
        project_ids = data.get('project_ids', [])
        force = data.get('force', False)

        # Build query
        query = Project.query

        # Apply filters
        if project_ids:
            # Specific projects
            query = query.filter(Project.id.in_(project_ids))
        elif filter_type == 'failed':
            query = query.filter_by(scoring_status='failed')
        elif filter_type == 'completed':
            query = query.filter_by(scoring_status='completed')
        elif filter_type == 'pending':
            query = query.filter_by(scoring_status='pending')
        elif filter_type != 'all':
            return jsonify({
                'status': 'error',
                'message': f'Invalid filter type: {filter_type}'
            }), 400

        # Exclude processing projects unless force is True
        if not force:
            query = query.filter(Project.scoring_status != 'processing')

        projects = query.all()

        if not projects:
            return jsonify({
                'status': 'success',
                'message': 'No projects match the criteria',
                'data': {
                    'queued_count': 0,
                    'filter_applied': filter_type
                }
            }), 200

        # Queue all projects for rescoring
        queued_count = 0
        task_ids = []

        for project in projects:
            # Reset scoring status
            project.scoring_status = 'pending'
            project.scoring_error = None
            project.scoring_retry_count = 0

            # Queue task
            task = score_project_task.delay(project.id)
            task_ids.append(task.id)
            queued_count += 1

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Successfully queued {queued_count} projects for rescoring',
            'data': {
                'queued_count': queued_count,
                'filter_applied': filter_type,
                'task_ids': task_ids[:10],  # Return first 10 task IDs
                'total_tasks': len(task_ids)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/scoring/stats', methods=['GET'])
@admin_required
def get_scoring_stats(user_id):
    """
    Get scoring system statistics

    Returns:
        Overall scoring statistics (pending, processing, completed, failed)
    """
    try:
        # Count projects by scoring status
        stats = {
            'total_projects': Project.query.count(),
            'pending': Project.query.filter_by(scoring_status='pending').count(),
            'processing': Project.query.filter_by(scoring_status='processing').count(),
            'completed': Project.query.filter_by(scoring_status='completed').count(),
            'failed': Project.query.filter_by(scoring_status='failed').count(),
            'retrying': Project.query.filter_by(scoring_status='retrying').count(),
        }

        # Get average scores
        completed_projects = Project.query.filter_by(scoring_status='completed').all()
        if completed_projects:
            stats['average_scores'] = {
                'proof_score': sum(p.proof_score or 0 for p in completed_projects) / len(completed_projects),
                'quality_score': sum(p.quality_score or 0 for p in completed_projects) / len(completed_projects),
                'verification_score': sum(p.verification_score or 0 for p in completed_projects) / len(completed_projects),
                'validation_score': sum(p.validation_score or 0 for p in completed_projects) / len(completed_projects),
                'community_score': sum(p.community_score or 0 for p in completed_projects) / len(completed_projects),
                'onchain_score': sum(p.onchain_score or 0 for p in completed_projects) / len(completed_projects),
            }
        else:
            stats['average_scores'] = {
                'proof_score': 0,
                'quality_score': 0,
                'verification_score': 0,
                'validation_score': 0,
                'community_score': 0,
                'onchain_score': 0,
            }

        # Get recent failures
        recent_failures = Project.query.filter_by(scoring_status='failed')\
            .order_by(Project.last_scored_at.desc())\
            .limit(10)\
            .all()

        stats['recent_failures'] = [{
            'project_id': p.id,
            'project_name': p.project_name,
            'error': p.scoring_error,
            'retry_count': p.scoring_retry_count,
            'last_scored_at': p.last_scored_at.isoformat() if p.last_scored_at else None
        } for p in recent_failures]

        return jsonify({
            'status': 'success',
            'data': stats
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
