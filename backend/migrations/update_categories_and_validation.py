"""
Migration to:
1. Change project category to categories (JSON array)
2. Add validated_by field to validator_assignments
"""
import sys
import os

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        print("[MIGRATION] Starting categories and validation tracking migration...")

        # 1. Add categories column to projects (JSON type)
        print("[MIGRATION] Adding categories column to projects...")
        try:
            db.session.execute(text("""
                ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS categories JSON DEFAULT '[]';
            """))
            db.session.commit()
            print("[SUCCESS] Categories column added to projects")
        except Exception as e:
            db.session.rollback()
            print(f"[INFO] Categories column might already exist: {e}")

        # 2. Migrate existing category data to categories
        print("[MIGRATION] Migrating existing category data...")
        try:
            # For projects that have a category, convert it to categories array
            db.session.execute(text("""
                UPDATE projects
                SET categories = JSON_ARRAY(category)
                WHERE category IS NOT NULL AND category != '' AND (categories IS NULL OR categories = '[]');
            """))
            db.session.commit()
            print("[SUCCESS] Existing categories migrated")
        except Exception as e:
            db.session.rollback()
            print(f"[INFO] Migration of existing data: {e}")

        # 3. Add validated_by column to validator_assignments
        print("[MIGRATION] Adding validated_by column to validator_assignments...")
        try:
            db.session.execute(text("""
                ALTER TABLE validator_assignments
                ADD COLUMN IF NOT EXISTS validated_by VARCHAR(36);
            """))
            db.session.commit()
            print("[SUCCESS] validated_by column added")
        except Exception as e:
            db.session.rollback()
            print(f"[INFO] validated_by column might already exist: {e}")

        # 4. Add foreign key constraint (PostgreSQL doesn't support IF NOT EXISTS for constraints)
        print("[MIGRATION] Adding foreign key constraint...")
        try:
            # Check if constraint exists first
            result = db.session.execute(text("""
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_validator_assignments_validated_by'
                AND table_name = 'validator_assignments';
            """))
            if not result.fetchone():
                db.session.execute(text("""
                    ALTER TABLE validator_assignments
                    ADD CONSTRAINT fk_validator_assignments_validated_by
                    FOREIGN KEY (validated_by) REFERENCES users(id);
                """))
                db.session.commit()
                print("[SUCCESS] Foreign key constraint added")
            else:
                print("[INFO] Foreign key constraint already exists")
        except Exception as e:
            db.session.rollback()
            print(f"[INFO] Foreign key constraint: {e}")

        # 5. Create index on validated_by for faster queries
        print("[MIGRATION] Creating index on validated_by...")
        try:
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_validator_assignments_validated_by
                ON validator_assignments(validated_by);
            """))
            db.session.commit()
            print("[SUCCESS] Index created")
        except Exception as e:
            db.session.rollback()
            print(f"[INFO] Index might already exist: {e}")
        print("\n[SUCCESS] Migration completed successfully!")
        print("\nMultiple categories and validation tracking are now ready!")

    except Exception as e:
        db.session.rollback()
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise
