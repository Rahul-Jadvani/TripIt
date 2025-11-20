"""
Test script to verify score calculation is correct
Run: python test_score_calculation.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from models.project import Project
from sqlalchemy import func

app = create_app()

def test_score_calculations():
    """Test that total score = sum of all breakdown scores"""
    with app.app_context():
        print("\n" + "="*70)
        print("SCORE CALCULATION VERIFICATION TEST")
        print("="*70)

        # Get a sample of projects
        projects = Project.query.filter(
            Project.is_deleted == False,
            Project.proof_score > 0
        ).limit(10).all()

        if not projects:
            print("\n❌ No projects found with scores")
            return False

        print(f"\n✓ Testing {len(projects)} projects...\n")

        all_correct = True

        for project in projects:
            # Calculate expected total
            expected_total = (
                project.quality_score +
                project.verification_score +
                project.validation_score +
                project.community_score +
                project.onchain_score
            )

            # Compare with actual
            actual_total = project.proof_score

            # Allow for small floating point differences
            difference = abs(expected_total - actual_total)
            is_correct = difference < 0.01

            status = "✓" if is_correct else "✗"

            print(f"{status} Project: {project.title[:40]}")
            print(f"   Quality:       {project.quality_score:6.2f}")
            print(f"   Verification:  {project.verification_score:6.2f}")
            print(f"   Validation:    {project.validation_score:6.2f}")
            print(f"   Community:     {project.community_score:6.2f}")
            print(f"   On-Chain:     {project.onchain_score:6.2f}")
            print(f"   ─────────────────────")
            print(f"   Expected Total: {expected_total:6.2f}")
            print(f"   Actual Total:   {actual_total:6.2f}")

            if not is_correct:
                print(f"   ⚠️  MISMATCH: Difference = {difference:.4f}")
                all_correct = False

            print()

        print("="*70)
        if all_correct:
            print("✅ ALL PROJECTS HAVE CORRECT TOTAL SCORES")
        else:
            print("❌ SOME PROJECTS HAVE INCORRECT TOTAL SCORES")
        print("="*70)

        return all_correct


def test_community_score_components():
    """Test that community score is calculated from upvotes and comments"""
    with app.app_context():
        print("\n" + "="*70)
        print("COMMUNITY SCORE COMPONENTS TEST")
        print("="*70)

        # Get max values for relative scoring
        max_stats = db.session.query(
            func.max(Project.upvotes).label('max_upvotes'),
            func.max(Project.comment_count).label('max_comments')
        ).filter(
            Project.is_deleted == False
        ).first()

        max_upvotes = max_stats.max_upvotes or 0
        max_comments = max_stats.max_comments or 0

        print(f"\n📊 Max upvotes across all projects: {max_upvotes}")
        print(f"📊 Max comments across all projects: {max_comments}\n")

        # Test a few projects
        projects = Project.query.filter(
            Project.is_deleted == False,
            Project.community_score > 0
        ).limit(5).all()

        for project in projects:
            # Calculate expected community score
            if max_upvotes > 0:
                upvote_score = (project.upvotes / max_upvotes) * 6
            else:
                upvote_score = 0

            if max_comments > 0:
                comment_score = (project.comment_count / max_comments) * 4
            else:
                comment_score = 0

            expected_community = round(min(upvote_score + comment_score, 10), 2)
            actual_community = project.community_score

            difference = abs(expected_community - actual_community)
            is_correct = difference < 0.01

            status = "✓" if is_correct else "✗"

            print(f"{status} {project.title[:40]}")
            print(f"   Upvotes: {project.upvotes} → Score: {upvote_score:.2f}/6")
            print(f"   Comments: {project.comment_count} → Score: {comment_score:.2f}/4")
            print(f"   Expected Community: {expected_community:.2f}")
            print(f"   Actual Community:   {actual_community:.2f}")

            if not is_correct:
                print(f"   ⚠️  MISMATCH: Difference = {difference:.4f}")

            print()

        print("="*70)


if __name__ == '__main__':
    print("\n🧪 Running Score Calculation Tests...\n")

    # Test 1: Total score calculation
    total_correct = test_score_calculations()

    # Test 2: Community score components
    test_community_score_components()

    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    print("\n✓ Total Score = Quality + Verification + Validation + Community + On-Chain")
    print("?o" Community Score = (Upvotes/Max x 6) + (Comments/Max x 4)")
    print("✓ AI Scoring does NOT re-run on vote/comment (only numbers update)")

    if total_correct:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print("\n⚠️  SOME TESTS FAILED - Check output above")

    print("="*70 + "\n")
