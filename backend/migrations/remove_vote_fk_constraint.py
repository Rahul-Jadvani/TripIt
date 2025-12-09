"""
Migration: Remove foreign key constraint from votes.project_id
This allows voting on both projects and itineraries

Run with: python migrations/remove_vote_fk_constraint.py
"""

from app import app
from extensions import db
from sqlalchemy import text

def migrate():
    with app.app_context():
        print("[MIGRATION] Removing foreign key constraint from votes.project_id...")

        try:
            # Check if constraint exists
            result = db.session.execute(text("""
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'votes'
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%project%'
            """)).fetchall()

            if result:
                constraint_name = result[0][0]
                print(f"[MIGRATION] Found constraint: {constraint_name}")

                # Drop the foreign key constraint
                db.session.execute(text(f"""
                    ALTER TABLE votes
                    DROP CONSTRAINT IF EXISTS {constraint_name}
                """))

                db.session.commit()
                print("[MIGRATION] ✅ Foreign key constraint removed successfully")
                print("[MIGRATION] Votes can now reference both projects and itineraries")
            else:
                print("[MIGRATION] No foreign key constraint found - already removed")

        except Exception as e:
            db.session.rollback()
            print(f"[MIGRATION] ❌ Error: {e}")
            raise

if __name__ == "__main__":
    migrate()
