#!/usr/bin/env python3
"""
Fix existing projects with badges to properly show hybrid validation scores
Recalculates score_breakdown for all badged projects
"""
import os
import sys
os.environ.setdefault('FLASK_ENV', 'production')

from app import create_app
from extensions import db
from models.badge import ValidationBadge
from models.project import Project
from utils.scoring_helpers import recalculate_validation_score_with_badge

def fix_badge_scores():
    """Recalculate scores for all projects with badges"""
    app = create_app()

    with app.app_context():
        try:
            print("=" * 70)
            print("FIXING BADGE SCORE DISPLAY")
            print("=" * 70)

            # Get all projects with badges
            badges = ValidationBadge.query.all()
            project_ids = list(set([b.project_id for b in badges]))

            print(f"\nFound {len(project_ids)} projects with badges")

            fixed_count = 0
            error_count = 0

            for project_id in project_ids:
                try:
                    project = Project.query.get(project_id)
                    if not project:
                        print(f"  ⚠️  Project {project_id} not found")
                        continue

                    print(f"\n  Processing: {project.title[:50]}...")

                    # Recalculate scores
                    result = recalculate_validation_score_with_badge(project)

                    if result.get('success'):
                        # Update project
                        project.proof_score = result['proof_score']
                        project.validation_score = result['validation_score']
                        project.score_breakdown = result['breakdown']

                        db.session.commit()

                        print(f"    ✓ Updated - Validation: {result['validation_score']}/30")
                        print(f"      Mode: {result['breakdown']['validation']['mode']}")
                        print(f"      Badge: {result['breakdown']['validation']['human_validator_score']}/20")
                        print(f"      AI: {result['breakdown']['validation']['ai_score_normalized']}/10")

                        fixed_count += 1
                    else:
                        print(f"    ✗ Failed: {result.get('error')}")
                        error_count += 1

                except Exception as e:
                    print(f"    ✗ Error: {e}")
                    db.session.rollback()
                    error_count += 1
                    continue

            print("\n" + "=" * 70)
            print(f"✓ Fixed {fixed_count} projects")
            if error_count > 0:
                print(f"⚠️  {error_count} errors")
            print("=" * 70)

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    fix_badge_scores()
