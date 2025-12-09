"""
Migration: Add validator fields and custom badge fields
- users.is_validator
- users.validator_approved_at
- users.validator_approved_by
- validation_badges.custom_badge_name
- validation_badges.custom_badge_image_url
- validator_permissions table

Run this with: python migrations/add_validator_and_custom_badges.py
"""
import sys
import os

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    """Add validator fields, custom badge fields, and validator_permissions table"""
    app = create_app()

    with app.app_context():
        print("=== Starting migration: Add validator and custom badge fields ===\n")

        with db.engine.connect() as conn:
            # 1. Add is_validator column to users table
            print("1. Checking users.is_validator...")
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name='is_validator'
            """))

            if result.fetchone() is None:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_validator BOOLEAN DEFAULT FALSE"))
                conn.commit()
                print("   [SUCCESS] Added 'is_validator' column to users table")
            else:
                print("   [INFO] Column 'is_validator' already exists, skipping...")

            # 2. Add validator_approved_at column to users table
            print("\n2. Checking users.validator_approved_at...")
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name='validator_approved_at'
            """))

            if result.fetchone() is None:
                conn.execute(text("ALTER TABLE users ADD COLUMN validator_approved_at TIMESTAMP"))
                conn.commit()
                print("   [SUCCESS] Added 'validator_approved_at' column to users table")
            else:
                print("   [INFO] Column 'validator_approved_at' already exists, skipping...")

            # 3. Add validator_approved_by column to users table
            print("\n3. Checking users.validator_approved_by...")
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name='validator_approved_by'
            """))

            if result.fetchone() is None:
                conn.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN validator_approved_by VARCHAR(36)
                """))
                conn.commit()
                print("   [SUCCESS] Added 'validator_approved_by' column to users table")
            else:
                print("   [INFO] Column 'validator_approved_by' already exists, skipping...")

            # 4. Add custom_badge_name column to validation_badges table
            print("\n4. Checking validation_badges.custom_badge_name...")
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='validation_badges' AND column_name='custom_badge_name'
            """))

            if result.fetchone() is None:
                conn.execute(text("ALTER TABLE validation_badges ADD COLUMN custom_badge_name VARCHAR(100)"))
                conn.commit()
                print("   [SUCCESS] Added 'custom_badge_name' column to validation_badges table")
            else:
                print("   [INFO] Column 'custom_badge_name' already exists, skipping...")

            # 5. Add custom_badge_image_url column to validation_badges table
            print("\n5. Checking validation_badges.custom_badge_image_url...")
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='validation_badges' AND column_name='custom_badge_image_url'
            """))

            if result.fetchone() is None:
                conn.execute(text("ALTER TABLE validation_badges ADD COLUMN custom_badge_image_url TEXT"))
                conn.commit()
                print("   [SUCCESS] Added 'custom_badge_image_url' column to validation_badges table")
            else:
                print("   [INFO] Column 'custom_badge_image_url' already exists, skipping...")

            # 6. Update validation_badges check constraint to include 'custom'
            print("\n6. Updating validation_badges badge_type constraint...")
            try:
                # Drop old constraint if exists
                conn.execute(text("""
                    ALTER TABLE validation_badges
                    DROP CONSTRAINT IF EXISTS validation_badges_badge_type_check
                """))
                # Add new constraint with 'custom' included
                conn.execute(text("""
                    ALTER TABLE validation_badges
                    ADD CONSTRAINT validation_badges_badge_type_check
                    CHECK (badge_type IN ('stone', 'silver', 'gold', 'platinum', 'demerit', 'custom'))
                """))
                conn.commit()
                print("   [SUCCESS] Updated badge_type constraint to include 'custom'")
            except Exception as e:
                print(f"   [INFO] Could not update constraint (may not exist): {e}")

            # 7. Create validator_permissions table
            print("\n7. Checking validator_permissions table...")
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_name='validator_permissions'
            """))

            if result.fetchone() is None:
                conn.execute(text("""
                    CREATE TABLE validator_permissions (
                        id VARCHAR(36) PRIMARY KEY,
                        validator_id VARCHAR(36) NOT NULL UNIQUE,
                        can_validate_all BOOLEAN DEFAULT FALSE,
                        allowed_badge_types JSON DEFAULT '[]',
                        allowed_project_ids JSON DEFAULT '[]',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (validator_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """))
                conn.commit()
                print("   [SUCCESS] Created 'validator_permissions' table")
            else:
                print("   [INFO] Table 'validator_permissions' already exists, skipping...")

        print("\n=== Migration completed successfully! ===")
        print("\nSummary of changes:")
        print("  ✓ Added validator fields to users table")
        print("  ✓ Added custom badge fields to validation_badges table")
        print("  ✓ Created validator_permissions table")
        print("  ✓ Updated badge_type constraint")
        print("\nYou can now restart your application!")

if __name__ == '__main__':
    migrate()
