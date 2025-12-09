"""
Migration script to add is_validator and is_investor columns to travelers table
"""
from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        print("Adding is_validator and is_investor columns to travelers table...")

        # Add is_validator column
        try:
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN is_validator BOOLEAN DEFAULT FALSE
            """))
            print("✅ Added is_validator column")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("⚠️  is_validator column already exists, skipping...")
            else:
                raise e

        # Add is_investor column
        try:
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN is_investor BOOLEAN DEFAULT FALSE
            """))
            print("✅ Added is_investor column")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("⚠️  is_investor column already exists, skipping...")
            else:
                raise e

        db.session.commit()
        print("\n🎉 Migration completed successfully!")

    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
