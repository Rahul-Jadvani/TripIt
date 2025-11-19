"""
Add unique constraints to project_views table to prevent duplicate views
This prevents race conditions where multiple concurrent requests create duplicate view records
"""
from sqlalchemy import text
from extensions import db


def upgrade():
    """Add unique constraints to prevent duplicate views"""
    print("[Migration] Adding unique constraints to project_views...")

    try:
        with db.engine.connect() as conn:
            # First, remove any duplicate views that may already exist
            # Keep the oldest view for each user/session per project

            # Remove duplicate views for logged-in users (by user_id)
            conn.execute(text("""
                DELETE FROM project_views
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM project_views
                    WHERE user_id IS NOT NULL
                    GROUP BY project_id, user_id
                )
                AND user_id IS NOT NULL
            """))
            conn.commit()

            print("[Migration] Removed duplicate logged-in user views")

            # Remove duplicate views for anonymous users (by session_id)
            conn.execute(text("""
                DELETE FROM project_views
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM project_views
                    WHERE session_id IS NOT NULL
                    GROUP BY project_id, session_id
                )
                AND session_id IS NOT NULL
            """))
            conn.commit()

            print("[Migration] Removed duplicate anonymous user views")

            # Add unique constraint for logged-in users (project_id + user_id)
            try:
                conn.execute(text("""
                    ALTER TABLE project_views
                    ADD CONSTRAINT uq_project_user_view
                    UNIQUE (project_id, user_id)
                """))
                conn.commit()
                print("[Migration] Added unique constraint: uq_project_user_view")
            except Exception as e:
                if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                    print("[Migration] Unique constraint uq_project_user_view already exists")
                else:
                    raise

            # Add unique constraint for anonymous users (project_id + session_id)
            try:
                conn.execute(text("""
                    ALTER TABLE project_views
                    ADD CONSTRAINT uq_project_session_view
                    UNIQUE (project_id, session_id)
                """))
                conn.commit()
                print("[Migration] Added unique constraint: uq_project_session_view")
            except Exception as e:
                if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                    print("[Migration] Unique constraint uq_project_session_view already exists")
                else:
                    raise

        print("[Migration] ✅ Successfully added unique constraints to project_views")

    except Exception as e:
        print(f"[Migration] ❌ Error adding unique constraints: {e}")
        raise


def downgrade():
    """Remove unique constraints"""
    print("[Migration] Removing unique constraints from project_views...")

    try:
        with db.engine.connect() as conn:
            # Drop unique constraint for logged-in users
            try:
                conn.execute(text("""
                    ALTER TABLE project_views
                    DROP CONSTRAINT IF EXISTS uq_project_user_view
                """))
                conn.commit()
                print("[Migration] Dropped constraint: uq_project_user_view")
            except Exception as e:
                print(f"[Migration] Warning dropping uq_project_user_view: {e}")

            # Drop unique constraint for anonymous users
            try:
                conn.execute(text("""
                    ALTER TABLE project_views
                    DROP CONSTRAINT IF EXISTS uq_project_session_view
                """))
                conn.commit()
                print("[Migration] Dropped constraint: uq_project_session_view")
            except Exception as e:
                print(f"[Migration] Warning dropping uq_project_session_view: {e}")

        print("[Migration] ✅ Successfully removed unique constraints from project_views")

    except Exception as e:
        print(f"[Migration] ❌ Error removing unique constraints: {e}")
        raise


if __name__ == '__main__':
    """Run migration manually"""
    import os
    import sys

    # Add parent directory to path for imports
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from app import create_app

    app = create_app()
    with app.app_context():
        print("Running migration: add_project_view_unique_constraints")
        upgrade()
        print("Migration complete!")
