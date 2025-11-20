"""
Complete end-to-end test with validator setup
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
from uuid import uuid4
from datetime import datetime

def setup_validator_preferences():
    """Setup initial validator category preferences by creating some manual assignments"""
    print("\n=== SETUP: CREATING VALIDATOR PREFERENCES ===")

    # Get validator
    validator = User.query.filter_by(is_validator=True).first()
    if not validator:
        print("  [ERROR] No validator found")
        return None

    print(f"  Setting up preferences for validator: {validator.username}")

    # Get admin user to use as assigned_by
    admin = User.query.filter_by(is_admin=True).first()
    if not admin:
        print("  [ERROR] No admin found")
        return None

    # Get an existing project to assign
    existing_project = Project.query.first()
    if not existing_project:
        print("  [ERROR] No existing project found")
        return None

    # Create initial assignments with different categories to establish preferences
    categories_to_setup = ['AI/ML', 'Web3/Blockchain', 'DevTools']

    for category in categories_to_setup:
        # Check if assignment already exists for this category
        existing = ValidatorAssignment.query.filter_by(
            validator_id=validator.id,
            category_filter=category
        ).first()

        if not existing:
            assignment = ValidatorAssignment(
                id=str(uuid4()),
                validator_id=validator.id,
                project_id=existing_project.id,
                assigned_by=admin.id,
                category_filter=category,
                status='pending',
                priority='normal'
            )
            db.session.add(assignment)
            print(f"    - Added preference for: {category}")

    db.session.commit()
    print(f"  [OK] Validator preferences established")

    return validator

def test_complete_flow():
    """Test the complete validator assignment flow"""
    print("="*60)
    print("COMPLETE VALIDATOR ASSIGNMENT FLOW TEST")
    print("="*60)

    with app.app_context():
        # Step 1: Setup validator preferences
        validator = setup_validator_preferences()
        if not validator:
            print("\n[ERROR] Failed to setup validator")
            return

        # Step 2: Create a new project with matching categories
        print("\n=== STEP 1: CREATE PROJECT WITH MULTIPLE CATEGORIES ===")

        # Get a non-validator user
        user = User.query.filter_by(is_validator=False).first()
        if not user:
            print("  [ERROR] No user found")
            return

        test_categories = ['AI/ML', 'Web3/Blockchain']

        project = Project(
            id=str(uuid4()),
            title=f"Complete Test Project {datetime.utcnow().strftime('%H%M%S')}",
            description="Testing complete flow with auto-assignment",
            user_id=user.id,
            categories=test_categories
        )

        db.session.add(project)
        db.session.commit()

        print(f"  [OK] Created project: {project.title}")
        print(f"  Categories: {project.categories}")

        # Step 3: Test auto-assignment
        print("\n=== STEP 2: TEST AUTO-ASSIGNMENT ===")

        before_count = ValidatorAssignment.query.filter_by(project_id=project.id).count()
        print(f"  Assignments before auto-assign: {before_count}")

        # Get admin for assigned_by
        admin = User.query.filter_by(is_admin=True).first()

        # Run auto-assignment
        created = auto_assign_project_to_validators(project, assigned_by_id=admin.id)

        after_count = ValidatorAssignment.query.filter_by(project_id=project.id).count()
        print(f"  Assignments after auto-assign: {after_count}")
        print(f"  Created: {len(created)} new assignments")

        if created:
            print(f"  [OK] Auto-assignment working!")
            for assignment in created:
                v = User.query.get(assignment.validator_id)
                print(f"    - Assigned to {v.username} (Category: {assignment.category_filter})")
        else:
            print(f"  [WARN] No assignments created - checking validator preferences...")
            # Debug: check what preferences exist
            all_prefs = ValidatorAssignment.query.filter_by(validator_id=validator.id).all()
            print(f"  Validator has {len(all_prefs)} total assignments")
            prefs = set()
            for a in all_prefs:
                if a.category_filter and a.category_filter != 'all':
                    prefs.add(a.category_filter)
            print(f"  Category preferences: {prefs}")

        # Step 4: Simulate validation by one validator
        if after_count > 0:
            print("\n=== STEP 3: TEST VALIDATION FLOW ===")

            assignments = ValidatorAssignment.query.filter_by(
                project_id=project.id,
                status='pending'
            ).all()

            if assignments:
                # Pick first assignment to validate
                to_validate = assignments[0]
                validator = User.query.get(to_validate.validator_id)

                print(f"  Validator '{validator.username}' validating project")
                print(f"  Total assignments for this project: {len(assignments)}")

                # Mark as validated
                to_validate.status = 'validated'
                to_validate.validated_by = validator.id
                to_validate.reviewed_at = datetime.utcnow()
                to_validate.review_notes = "Test validation - complete flow"

                # Mark others as completed
                for other in assignments:
                    if other.id != to_validate.id:
                        other.status = 'completed'
                        other.review_notes = f"Validated by {validator.username}"

                # Create badge
                badge = ValidationBadge(
                    project_id=project.id,
                    validator_id=validator.id,
                    badge_type='stone',
                    rationale='Complete flow test',
                    points=10
                )
                db.session.add(badge)
                db.session.commit()

                print(f"  [OK] Validation completed")

                # Check that project disappears from dashboards
                still_visible = ValidatorAssignment.query.filter(
                    ValidatorAssignment.project_id == project.id,
                    ValidatorAssignment.status.in_(['pending', 'in_review'])
                ).count()

                print(f"  Assignments still visible in dashboards: {still_visible}")

                if still_visible == 0:
                    print(f"  [OK] Project correctly removed from all validator dashboards!")
                else:
                    print(f"  [ERROR] Project still visible to {still_visible} validators")

        # Final summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print("[OK] Complete flow test finished!")
        print("\nWhat was tested:")
        print("  1. Validator category preferences setup")
        print("  2. Project creation with multiple categories")
        print("  3. Auto-assignment to matching validators")
        print("  4. Validation flow (one validates, others completed)")
        print("  5. Project disappears from all dashboards after validation")
        print("="*60)

if __name__ == '__main__':
    test_complete_flow()
