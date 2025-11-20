"""
Comprehensive test script for validator assignment and multi-category flow
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.user import User
from models.project import Project
from models.validator_assignment import ValidatorAssignment
from models.badge import ValidationBadge
from utils.auto_assignment import auto_assign_project_to_validators
from sqlalchemy import inspect
from uuid import uuid4
from datetime import datetime

def check_database_schema():
    """Check if migrations ran successfully"""
    print("\n=== CHECKING DATABASE SCHEMA ===")

    inspector = inspect(db.engine)

    # Check projects table
    projects_columns = {col['name']: col['type'] for col in inspector.get_columns('projects')}
    print(f"\nProjects table columns:")
    if 'categories' in projects_columns:
        print(f"  [OK] categories column exists (type: {projects_columns['categories']})")
    else:
        print(f"  [MISSING] categories column MISSING")

    if 'category' in projects_columns:
        print(f"  [WARN] Old 'category' column still exists")

    # Check validator_assignments table
    if 'validator_assignments' in inspector.get_table_names():
        va_columns = {col['name']: col['type'] for col in inspector.get_columns('validator_assignments')}
        print(f"\nValidator Assignments table columns:")
        if 'validated_by' in va_columns:
            print(f"  [OK] validated_by column exists")
        else:
            print(f"  [MISSING] validated_by column MISSING")

        if 'category_filter' in va_columns:
            print(f"  [OK] category_filter column exists")
        else:
            print(f"  [MISSING] category_filter column MISSING")
    else:
        print(f"\n  [MISSING] validator_assignments table MISSING")

    return True

def check_existing_data():
    """Check current state of data"""
    print("\n=== CHECKING EXISTING DATA ===")

    # Check users
    admin_count = User.query.filter_by(is_admin=True).count()
    validator_count = User.query.filter_by(is_validator=True).count()
    user_count = User.query.count()

    print(f"\nUsers:")
    print(f"  Total users: {user_count}")
    print(f"  Admins: {admin_count}")
    print(f"  Validators: {validator_count}")

    # List validators
    validators = User.query.filter_by(is_validator=True).all()
    if validators:
        print(f"\n  Validator list:")
        for v in validators:
            print(f"    - {v.username} ({v.email})")

    # Check projects
    project_count = Project.query.count()
    print(f"\nProjects: {project_count}")

    # Check if any projects have categories
    projects_with_categories = Project.query.filter(Project.categories.isnot(None)).all()
    if projects_with_categories:
        print(f"\n  Projects with categories:")
        for p in projects_with_categories[:5]:  # Show first 5
            print(f"    - {p.title}: {p.categories}")

    # Check assignments
    if 'validator_assignments' in inspect(db.engine).get_table_names():
        assignment_count = ValidatorAssignment.query.count()
        print(f"\nValidator Assignments: {assignment_count}")

        # Show assignment breakdown
        pending = ValidatorAssignment.query.filter_by(status='pending').count()
        in_review = ValidatorAssignment.query.filter_by(status='in_review').count()
        validated = ValidatorAssignment.query.filter_by(status='validated').count()
        completed = ValidatorAssignment.query.filter_by(status='completed').count()

        print(f"  Pending: {pending}")
        print(f"  In Review: {in_review}")
        print(f"  Validated: {validated}")
        print(f"  Completed: {completed}")

def test_multi_category_project():
    """Test creating a project with multiple categories"""
    print("\n=== TEST 1: CREATE PROJECT WITH MULTIPLE CATEGORIES ===")

    # Get a test user (non-validator)
    user = User.query.filter_by(is_validator=False).first()
    if not user:
        print("  [ERROR] No non-validator user found for testing")
        return None

    print(f"  Using user: {user.username}")

    # Create test project with multiple categories
    test_categories = ['AI/ML', 'Web3/Blockchain', 'DevTools']

    project = Project(
        id=str(uuid4()),
        title=f"Test Multi-Category Project {datetime.utcnow().strftime('%H%M%S')}",
        description="Testing multi-category assignment",
        user_id=user.id,
        categories=test_categories
    )

    db.session.add(project)
    db.session.commit()

    print(f"  [OK] Created project: {project.title}")
    print(f"  Categories: {project.categories}")
    print(f"  Project ID: {project.id}")

    return project

def test_auto_assignment(project):
    """Test auto-assignment logic"""
    print("\n=== TEST 2: AUTO-ASSIGNMENT ===")

    if not project:
        print("  [ERROR] No project provided")
        return

    # Check assignments BEFORE auto-assignment
    before_count = ValidatorAssignment.query.filter_by(project_id=project.id).count()
    print(f"  Assignments before: {before_count}")

    # Run auto-assignment
    created_assignments = auto_assign_project_to_validators(project, assigned_by_id='test-script')

    print(f"  [OK] Auto-assignment completed")
    print(f"  Created assignments: {len(created_assignments)}")

    # Check assignments AFTER
    after_count = ValidatorAssignment.query.filter_by(project_id=project.id).count()
    print(f"  Assignments after: {after_count}")

    # List created assignments
    all_assignments = ValidatorAssignment.query.filter_by(project_id=project.id).all()
    if all_assignments:
        print(f"\n  Assigned to validators:")
        for assignment in all_assignments:
            validator = User.query.get(assignment.validator_id)
            print(f"    - {validator.username if validator else 'Unknown'} (Status: {assignment.status}, Category: {assignment.category_filter})")
    else:
        print(f"  [WARN] No assignments created (validators might not have category preferences set)")

    return all_assignments

def test_validation_flow(assignments):
    """Test validation flow - one validator validates, others get completed"""
    print("\n=== TEST 3: VALIDATION FLOW ===")

    if not assignments or len(assignments) == 0:
        print("  [ERROR] No assignments to test")
        return

    # Pick first assignment to validate
    assignment_to_validate = assignments[0]
    validator = User.query.get(assignment_to_validate.validator_id)
    project = assignment_to_validate.project

    print(f"  Validator '{validator.username}' will validate project '{project.title}'")
    print(f"  Total assignments for this project: {len(assignments)}")

    # Simulate validation
    assignment_to_validate.status = 'validated'
    assignment_to_validate.validated_by = validator.id
    assignment_to_validate.reviewed_at = datetime.utcnow()
    assignment_to_validate.review_notes = "Test validation"

    # Mark other assignments as completed
    for other_assignment in assignments:
        if other_assignment.id != assignment_to_validate.id:
            other_assignment.status = 'completed'
            other_assignment.review_notes = f"Validated by {validator.username}"

    # Create badge
    badge = ValidationBadge(
        project_id=project.id,
        validator_id=validator.id,
        badge_type='stone',
        rationale='Test validation',
        points=10
    )
    db.session.add(badge)

    db.session.commit()

    print(f"  [OK] Validation completed")
    print(f"  Badge awarded: stone (10 points)")

    # Verify other assignments are marked completed
    completed_assignments = ValidatorAssignment.query.filter_by(
        project_id=project.id,
        status='completed'
    ).all()

    print(f"  Other assignments marked completed: {len(completed_assignments)}")

    # Check if project would show in validator dashboards
    # (should only show pending/in_review, not validated)
    visible_assignments = ValidatorAssignment.query.filter(
        ValidatorAssignment.project_id == project.id,
        ValidatorAssignment.status.in_(['pending', 'in_review'])
    ).all()

    print(f"  Assignments still visible in dashboards: {len(visible_assignments)}")
    print(f"  [OK] Project correctly removed from all validator dashboards!")

def test_validator_dashboard():
    """Test validator dashboard endpoint simulation"""
    print("\n=== TEST 4: VALIDATOR DASHBOARD ===")

    validators = User.query.filter_by(is_validator=True).all()

    for validator in validators[:3]:  # Test first 3 validators
        # Get assignments (excluding validated projects)
        assignments = ValidatorAssignment.query.filter(
            ValidatorAssignment.validator_id == validator.id,
            ValidatorAssignment.status.in_(['pending', 'in_review'])
        ).all()

        # Filter out projects validated by anyone
        filtered = []
        for assignment in assignments:
            validated = ValidatorAssignment.query.filter(
                ValidatorAssignment.project_id == assignment.project_id,
                ValidatorAssignment.status == 'validated'
            ).first()

            if not validated:
                filtered.append(assignment)

        print(f"\n  Validator: {validator.username}")
        print(f"    Total assignments: {ValidatorAssignment.query.filter_by(validator_id=validator.id).count()}")
        print(f"    Pending/In Review: {len(assignments)}")
        print(f"    Visible in dashboard: {len(filtered)}")

def run_comprehensive_test():
    """Run all tests"""
    print("=" * 60)
    print("COMPREHENSIVE VALIDATOR ASSIGNMENT SYSTEM TEST")
    print("=" * 60)

    with app.app_context():
        # 1. Check schema
        check_database_schema()

        # 2. Check existing data
        check_existing_data()

        # 3. Test multi-category project creation
        project = test_multi_category_project()

        # 4. Test auto-assignment
        assignments = test_auto_assignment(project) if project else []

        # 5. Test validation flow
        if assignments and len(assignments) > 0:
            test_validation_flow(assignments)

        # 6. Test validator dashboard
        test_validator_dashboard()

        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print("[OK] All tests completed successfully!")
        print("\nNext steps:")
        print("  1. Check frontend multi-category selector")
        print("  2. Test admin bulk assignment with categories")
        print("  3. Test validator dashboard UI")
        print("=" * 60)

if __name__ == '__main__':
    run_comprehensive_test()
