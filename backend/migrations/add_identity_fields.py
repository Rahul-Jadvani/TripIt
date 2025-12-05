"""
Migration: Add Identity Fields to Travelers Table
Purpose: Add blockchain identity fields for wallet binding, profile hashing, and Aadhaar verification
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Add identity fields to travelers table"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return False

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cursor = conn.cursor()

        print("=" * 60)
        print("MIGRATION: Add Identity Fields to Travelers Table")
        print("=" * 60)
        print()

        # 1. Add wallet_address and wallet_bound_at
        print("1. Adding wallet_address and wallet_bound_at columns...")
        cursor.execute("""
            ALTER TABLE travelers
            ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42),
            ADD COLUMN IF NOT EXISTS wallet_bound_at TIMESTAMP;
        """)
        print("   ✓ Columns added")

        # 2. Add unique constraint on wallet_address (allows multiple NULLs)
        print("2. Adding unique index on wallet_address...")
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_travelers_wallet_address_unique
            ON travelers(wallet_address)
            WHERE wallet_address IS NOT NULL;
        """)
        print("   ✓ Unique index created")

        # 3. Add google_sub for OAuth identity
        print("3. Adding google_sub column...")
        cursor.execute("""
            ALTER TABLE travelers
            ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
        """)
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_travelers_google_sub_unique
            ON travelers(google_sub)
            WHERE google_sub IS NOT NULL;
        """)
        print("   ✓ google_sub column and index added")

        # 4. Add profile hashing fields
        print("4. Adding profile hash fields...")
        cursor.execute("""
            ALTER TABLE travelers
            ADD COLUMN IF NOT EXISTS profile_hash VARCHAR(64),
            ADD COLUMN IF NOT EXISTS profile_hash_salt VARCHAR(32),
            ADD COLUMN IF NOT EXISTS profile_hash_updated_at TIMESTAMP;
        """)
        print("   ✓ Profile hash columns added")

        # 5. Add Aadhaar verification fields
        print("5. Adding Aadhaar verification fields...")
        cursor.execute("""
            ALTER TABLE travelers
            ADD COLUMN IF NOT EXISTS aadhaar_status VARCHAR(20) DEFAULT 'not_verified',
            ADD COLUMN IF NOT EXISTS aadhaar_verified_at TIMESTAMP;
        """)
        print("   ✓ Aadhaar fields added")

        # 6. Add emergency_contacts_hash
        print("6. Adding emergency_contacts_hash column...")
        cursor.execute("""
            ALTER TABLE travelers
            ADD COLUMN IF NOT EXISTS emergency_contacts_hash VARCHAR(64);
        """)
        print("   ✓ emergency_contacts_hash added")

        # 7. Add reputation_score (separate from traveler_reputation_score)
        print("7. Adding reputation_score column...")
        cursor.execute("""
            ALTER TABLE travelers
            ADD COLUMN IF NOT EXISTS reputation_score FLOAT DEFAULT 0.0;
        """)
        print("   ✓ reputation_score added")

        # 8. Add indexes for performance
        print("8. Adding performance indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_travelers_wallet_address ON travelers(wallet_address);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_travelers_google_sub ON travelers(google_sub);
        """)
        print("   ✓ Indexes added")

        print()
        print("=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        print("New fields added to travelers table:")
        print("  - wallet_address (VARCHAR(42), unique, nullable)")
        print("  - wallet_bound_at (TIMESTAMP)")
        print("  - google_sub (VARCHAR(255), unique, nullable)")
        print("  - profile_hash (VARCHAR(64))")
        print("  - profile_hash_salt (VARCHAR(32))")
        print("  - profile_hash_updated_at (TIMESTAMP)")
        print("  - aadhaar_status (VARCHAR(20), default 'not_verified')")
        print("  - aadhaar_verified_at (TIMESTAMP)")
        print("  - emergency_contacts_hash (VARCHAR(64))")
        print("  - reputation_score (FLOAT, default 0.0)")
        print()

        cursor.close()
        conn.close()
        return True

    except psycopg2.Error as e:
        print()
        print("=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print(f"Database Error: {e}")
        print()
        return False

    except Exception as e:
        print()
        print("=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print(f"Error: {e}")
        print()
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
