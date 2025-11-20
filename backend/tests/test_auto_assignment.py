"""
Test auto-assignment function directly
"""
import sys
import os
sys.path.insert(0, '.')

# Force UTF-8 encoding for Windows
if os.name == 'nt':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from app import app
from extensions import db
from models.project import Project
from models.user import User
from models.validator_permissions import ValidatorPermissions
from models.validator_assignment import ValidatorAssignment
from utils.auto_assignment import auto_assign_project_to_validators

print("="*80)
print("TESTING AUTO-ASSIGNMENT")
print("="*80)

with app.app_context():
    # Find the test project with categories
    print("\n[1] Finding project with categories...")
    project = Project.query.filter(
        Project.title.like('%Test Multi-Category%')
    ).first()

    if not project:
        # Try to find any project with non-empty categories
        all_projects = Project.query.all()
        for p in all_projects:
            if p.categories and len(p.categories) > 0:
                project = p
                break

    if not project:
        print("X No project with categories found")
        print("\nPlease create a project with categories first via the UI")
        exit(1)

    print(f"✓ Found project: {project.title}")
    print(f"  ID: {project.id}")
    print(f"  Categories: {project.categories}")

    # Check existing assignments
    print("\n[2] Checking existing assignments for this project...")
    existing = ValidatorAssignment.query.filter_by(project_id=project.id).all()
    print(f"  Existing assignments: {len(existing)}")
    for assignment in existing:
        validator = User.query.filter_by(id=assignment.validator_id).first()
        print(f"    - {validator.username}: {assignment.status}")

    # Check validators and their permissions
    print("\n[3] Checking validators and permissions...")
    validators = User.query.filter_by(is_validator=True).all()
    print(f"  Found {len(validators)} validators")

    for validator in validators:
        permissions = ValidatorPermissions.query.filter_by(validator_id=validator.id).first()
        print(f"\n  Validator: {validator.username}")

        if not permissions:
            print(f"    ! No permissions record")
            continue

        print(f"    - can_validate_all: {permissions.can_validate_all}")
        print(f"    - allowed_categories: {permissions.allowed_categories}")

        # Check if should assign
        should_assign = False
        reason = ""

        if permissions.can_validate_all:
            should_assign = True
            reason = "can_validate_all = True"
        elif permissions.allowed_categories and project.categories:
            matching = [cat for cat in project.categories if cat in permissions.allowed_categories]
            if matching:
                should_assign = True
                reason = f"matches categories: {matching}"
            else:
                reason = f"no matching categories"
        else:
            reason = "no preferences or project has no categories"

        status = "[SHOULD ASSIGN]" if should_assign else "[SKIP]"
        print(f"    {status} {reason}")

    # Test auto-assignment
    print("\n[4] Running auto-assignment function...")
    print("-" * 60)

    try:
        assignments = auto_assign_project_to_validators(project, assigned_by_id='test-script')
        print("-" * 60)
        print(f"\n✓ Auto-assignment completed!")
        print(f"  Created {len(assignments)} new assignments")

        if len(assignments) > 0:
            for assignment in assignments:
                validator = User.query.filter_by(id=assignment.validator_id).first()
                print(f"    - {validator.username} ({assignment.status})")

        # Check total assignments now
        all_assignments = ValidatorAssignment.query.filter_by(project_id=project.id).all()
        print(f"\n  Total assignments for this project: {len(all_assignments)}")

    except Exception as e:
        print("-" * 60)
        print(f"✗ Error during auto-assignment: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "="*80)
print("TEST COMPLETE")
print("="*80)
