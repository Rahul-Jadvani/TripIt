"""
Auto-assignment utility for validator assignments
"""
from extensions import db
from models.validator_assignment import ValidatorAssignment
from models.user import User
from uuid import uuid4


def auto_assign_project_to_validators(project, assigned_by_id='system'):
    """
    Automatically assign a project to matching validators based on categories.

    Args:
        project: Project instance with categories
        assigned_by_id: ID of user/system creating the assignment (default 'system')

    Returns:
        List of created ValidatorAssignment instances
    """
    if not project or not project.categories:
        print(f"[AUTO-ASSIGN] Skipping project {project.id if project else 'None'} - no categories")
        return []

    created_assignments = []

    try:
        from models.validator_permissions import ValidatorPermissions

        # Get all validators with their permissions
        validators = User.query.filter(User.is_validator == True).all()

        print(f"[AUTO-ASSIGN] Checking {len(validators)} validators for project {project.id} with categories {project.categories}")

        for validator in validators:
            # Get validator permissions
            permissions = ValidatorPermissions.query.filter_by(validator_id=validator.id).first()

            if not permissions:
                print(f"[AUTO-ASSIGN] Validator {validator.username} has no permissions - skipping")
                continue

            # Check if validator can validate all projects OR has matching categories
            should_assign = False

            if permissions.can_validate_all:
                should_assign = True
                print(f"[AUTO-ASSIGN] Validator {validator.username} can validate all projects")
            elif permissions.allowed_categories:
                # Check if any project category matches validator's allowed categories
                has_match = any(cat in permissions.allowed_categories for cat in project.categories)
                if has_match:
                    should_assign = True
                    matching_cats = [cat for cat in project.categories if cat in permissions.allowed_categories]
                    print(f"[AUTO-ASSIGN] Validator {validator.username} has matching categories: {matching_cats}")
                else:
                    print(f"[AUTO-ASSIGN] Validator {validator.username} has no matching categories (allowed: {permissions.allowed_categories})")
            else:
                print(f"[AUTO-ASSIGN] Validator {validator.username} has no category preferences - skipping")

            if should_assign:
                # Check if assignment already exists
                existing = ValidatorAssignment.query.filter_by(
                    validator_id=validator.id,
                    project_id=project.id
                ).first()

                if not existing:
                    # Create new assignment
                    assignment = ValidatorAssignment(
                        id=str(uuid4()),
                        validator_id=validator.id,
                        project_id=project.id,
                        assigned_by=assigned_by_id,
                        category_filter=','.join(project.categories),
                        status='pending',
                        priority='normal'
                    )
                    db.session.add(assignment)
                    created_assignments.append(assignment)
                    print(f"[AUTO-ASSIGN] Created assignment for validator {validator.username}")
                else:
                    print(f"[AUTO-ASSIGN] Assignment already exists for validator {validator.username}")

        db.session.commit()
        print(f"[AUTO-ASSIGN] Created {len(created_assignments)} assignments for project {project.id}")

    except Exception as e:
        db.session.rollback()
        print(f"[AUTO-ASSIGN ERROR] Failed to auto-assign project {project.id}: {str(e)}")
        import traceback
        traceback.print_exc()

    return created_assignments
