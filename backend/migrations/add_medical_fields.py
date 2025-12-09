"""
Database Migration: Add Medical Fields to Travelers Table
Purpose: Add blood_group, medications, allergies, and other_medical_info fields
Date: 2025-12-09
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extensions import db
from app import create_app

def run_migration():
    """Add medical information fields to travelers table"""
    app = create_app()

    with app.app_context():
        try:
            print("🔄 Starting migration: Add medical fields to travelers table")

            # Add medical information columns (IF NOT EXISTS makes it idempotent)
            migrations = [
                "ALTER TABLE travelers ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);",
                "ALTER TABLE travelers ADD COLUMN IF NOT EXISTS medications TEXT;",
                "ALTER TABLE travelers ADD COLUMN IF NOT EXISTS allergies TEXT;",
                "ALTER TABLE travelers ADD COLUMN IF NOT EXISTS other_medical_info TEXT;"
            ]

            for i, sql in enumerate(migrations, 1):
                print(f"  [{i}/4] Executing: {sql}")
                db.session.execute(db.text(sql))

            db.session.commit()
            print("✅ Migration completed successfully!")
            print("\nAdded columns:")
            print("  - blood_group (VARCHAR(10))")
            print("  - medications (TEXT)")
            print("  - allergies (TEXT)")
            print("  - other_medical_info (TEXT)")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    return True

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
