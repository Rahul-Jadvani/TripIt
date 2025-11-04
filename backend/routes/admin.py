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
from utils.decorators import admin_required
from utils.cache import CacheService
from services.socket_service import SocketService
from utils.scores import ProofScoreCalculator
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

        user.is_admin = not user.is_admin
        db.session.commit()

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

        user.is_active = not user.is_active
        db.session.commit()

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
        # OPTIMIZED: Eager load permissions to prevent N+1 queries
        from sqlalchemy.orm import joinedload
        validators = User.query.filter(User.is_validator == True)\
            .options(joinedload(User.validator_permissions))\
            .all()

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

            # Add assignment counts
            total_assignments = ValidatorAssignment.query.filter_by(validator_id=validator.id).count()
            pending_assignments = ValidatorAssignment.query.filter_by(
                validator_id=validator.id,
                status='pending'
            ).count()
            in_review_assignments = ValidatorAssignment.query.filter_by(
                validator_id=validator.id,
                status='in_review'
            ).count()
            completed_assignments = ValidatorAssignment.query.filter_by(
                validator_id=validator.id,
                status='validated'
            ).count()

            # Get category breakdown for assigned projects
            assignments_with_projects = ValidatorAssignment.query.filter_by(
                validator_id=validator.id
            ).join(Project).all()

            category_breakdown = {}
            for assignment in assignments_with_projects:
                if assignment.project and assignment.project.categories:
                    for category in assignment.project.categories:
                        if category not in category_breakdown:
                            category_breakdown[category] = 0
                        category_breakdown[category] += 1

            validator_dict['assignments'] = {
                'total': total_assignments,
                'pending': pending_assignments,
                'in_review': in_review_assignments,
                'completed': completed_assignments,
                'category_breakdown': category_breakdown
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
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')

        query = Project.query

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
        for field in allowed_fields:
            if field in data:
                setattr(project, field, data[field])

        project.updated_at = datetime.utcnow()
        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_project(project_id)

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

        project.is_featured = not project.is_featured
        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_project(project_id)

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
        # User stats
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        admins = User.query.filter_by(is_admin=True).count()
        validators = User.query.filter_by(is_validator=True).count()
        investors = User.query.filter_by(is_investor=True).count()

        # Project stats
        total_projects = Project.query.count()
        featured_projects = Project.query.filter_by(is_featured=True).count()

        # Badge stats
        total_badges = ValidationBadge.query.count()
        badge_breakdown = {}
        for badge_type in ['stone', 'silver', 'gold', 'platinum', 'demerit', 'custom']:
            count = ValidationBadge.query.filter_by(badge_type=badge_type).count()
            badge_breakdown[badge_type] = count

        # Investor request stats
        pending_investor_requests = InvestorRequest.query.filter_by(status='pending').count()
        approved_investor_requests = InvestorRequest.query.filter_by(status='approved').count()

        # Chain stats
        total_chains = Chain.query.count()
        active_chains = Chain.query.filter_by(status='active').count()
        banned_chains = Chain.query.filter_by(status='banned').count()
        suspended_chains = Chain.query.filter_by(status='suspended').count()
        featured_chains = Chain.query.filter_by(is_featured=True).count()

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

        db.session.commit()

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

        # Update project scores
        project = Project.query.get(badge.project_id)
        if project:
            ProofScoreCalculator.update_project_scores(project)

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

        # Update project scores
        project = Project.query.get(project_id)
        if project:
            ProofScoreCalculator.update_project_scores(project)

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

        # Create badge
        badge = ValidationBadge(
            project_id=project_id,
            validator_id=validator_id,
            badge_type=badge_type,
            rationale=rationale,
            points=ValidationBadge.BADGE_POINTS[badge_type]
        )

        db.session.add(badge)

        # Update project scores
        ProofScoreCalculator.update_project_scores(project)

        db.session.commit()

        # Invalidate cache and emit real-time update
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()
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
