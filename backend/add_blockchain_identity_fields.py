"""
Migration: Add Blockchain Identity Fields to Travelers Table
Run this once to add wallet_address, profile_hash, and other blockchain identity fields
"""
from app import app, db
from sqlalchemy import text

def migrate():
    """Add blockchain identity fields to travelers table"""
    with app.app_context():
        print("Starting migration: Adding blockchain identity fields...")

        try:
            # Check if columns already exist
            check_query = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='travelers' AND column_name='wallet_address'
            """)
            result = db.session.execute(check_query).fetchone()

            if result:
                print("✓ Columns already exist. Skipping migration.")
                return

            # Add blockchain identity columns
            print("Adding wallet_address column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) UNIQUE
            """))

            print("Adding wallet_bound_at column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS wallet_bound_at TIMESTAMP
            """))

            print("Adding google_sub column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE
            """))

            print("Adding profile_hash column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS profile_hash VARCHAR(64)
            """))

            print("Adding profile_hash_salt column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS profile_hash_salt VARCHAR(32)
            """))

            print("Adding profile_hash_updated_at column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS profile_hash_updated_at TIMESTAMP
            """))

            print("Adding emergency_contacts_hash column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS emergency_contacts_hash VARCHAR(64)
            """))

            print("Adding aadhaar_status column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS aadhaar_status VARCHAR(20) DEFAULT 'not_verified'
            """))

            print("Adding aadhaar_verified_at column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS aadhaar_verified_at TIMESTAMP
            """))

            print("Adding reputation_score column...")
            db.session.execute(text("""
                ALTER TABLE travelers
                ADD COLUMN IF NOT EXISTS reputation_score FLOAT DEFAULT 0.0
            """))

            # Create indexes for better query performance
            print("Creating indexes...")
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_travelers_wallet_address
                ON travelers(wallet_address)
            """))

            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_travelers_google_sub
                ON travelers(google_sub)
            """))

            # Commit all changes
            db.session.commit()

            print("✅ Migration completed successfully!")
            print("\nAdded columns:")
            print("  - wallet_address (VARCHAR(42), UNIQUE, INDEXED)")
            print("  - wallet_bound_at (TIMESTAMP)")
            print("  - google_sub (VARCHAR(255), UNIQUE, INDEXED)")
            print("  - profile_hash (VARCHAR(64))")
            print("  - profile_hash_salt (VARCHAR(32))")
            print("  - profile_hash_updated_at (TIMESTAMP)")
            print("  - emergency_contacts_hash (VARCHAR(64))")
            print("  - aadhaar_status (VARCHAR(20), DEFAULT 'not_verified')")
            print("  - aadhaar_verified_at (TIMESTAMP)")
            print("  - reputation_score (FLOAT, DEFAULT 0.0)")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    migrate()
