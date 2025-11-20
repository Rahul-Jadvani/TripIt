"""
Fix all existing project scores to match breakdown totals
Run: python fix_all_project_scores.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from models.project import Project
from models.event_listeners import update_project_community_score

app = create_app()

def fix_all_scores():
    """Recalculate community score and total score for ALL projects"""
    with app.app_context():
        print("\n" + "="*70)
        print("FIXING ALL PROJECT SCORES")
        print("="*70)

        # Get all non-deleted projects
        projects = Project.query.filter(Project.is_deleted == False).all()

        print(f"\n📊 Found {len(projects)} projects to check\n")

        fixed_count = 0
        already_correct = 0

        for i, project in enumerate(projects, 1):
            # Store old values
            old_community = project.community_score
            old_total = project.proof_score

            # Recalculate community score and total
            update_project_community_score(project)

            # Calculate expected total
            new_total = (
                project.quality_score +
                project.verification_score +
                project.validation_score +
                project.community_score
            )

            # Check if anything changed
            community_changed = abs(old_community - project.community_score) > 0.01
            total_changed = abs(old_total - new_total) > 0.01

            if community_changed or total_changed:
                print(f"✓ Fixed: {project.title[:50]}")
                if community_changed:
                    print(f"  Community: {old_community:.2f} → {project.community_score:.2f}")
                if total_changed:
                    print(f"  Total: {old_total:.2f} → {new_total:.2f}")
                fixed_count += 1
            else:
                already_correct += 1

            # Progress indicator every 50 projects
            if i % 50 == 0:
                print(f"  ... processed {i}/{len(projects)} projects")

        # Commit all changes
        db.session.commit()

        print("\n" + "="*70)
        print("RESULTS")
        print("="*70)
        print(f"✓ Fixed: {fixed_count} projects")
        print(f"✓ Already correct: {already_correct} projects")
        print(f"✓ Total processed: {len(projects)} projects")
        print("="*70 + "\n")

        return fixed_count


if __name__ == '__main__':
    print("\n🔧 Starting score fix process...\n")
    fixed = fix_all_scores()

    if fixed > 0:
        print(f"✅ Successfully fixed {fixed} projects!")
    else:
        print("✅ All projects already have correct scores!")

    print("\n💡 All project scores are now synchronized!\n")
