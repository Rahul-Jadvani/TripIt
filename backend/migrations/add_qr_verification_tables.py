"""
Migration: Add QR Verification Tables (Vendors and UserVerifications)
Purpose: Create database tables for QR-based verification and vendor login system
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def run_migration():
    """Create vendors and user_verifications tables"""

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
        print("MIGRATION: Add QR Verification Tables")
        print("=" * 60)
        print()

        # 1. Create vendors table
        print("1. Creating vendors table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendors (
                id VARCHAR(36) PRIMARY KEY,
                vendor_name VARCHAR(200) NOT NULL,
                organization VARCHAR(200),
                contact_email VARCHAR(255) UNIQUE NOT NULL,
                contact_phone VARCHAR(20),
                password_hash VARCHAR(255) NOT NULL,
                vendor_type VARCHAR(50) NOT NULL,
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100) DEFAULT 'India',
                address TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                total_scans INTEGER DEFAULT 0,
                last_scan_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✓ vendors table created")

        # 2. Add indexes to vendors table
        print("2. Adding indexes to vendors table...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_vendors_contact_email ON vendors(contact_email);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_vendors_vendor_type ON vendors(vendor_type);
        """)
        print("   ✓ vendors indexes added")

        # 3. Create user_verifications table
        print("3. Creating user_verifications table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_verifications (
                id VARCHAR(36) PRIMARY KEY,
                traveler_id VARCHAR(36) UNIQUE NOT NULL,
                wallet_address VARCHAR(42) NOT NULL,
                sbt_token_id VARCHAR(256),
                verification_token VARCHAR(64) UNIQUE NOT NULL,
                qr_ipfs_url VARCHAR(500),
                qr_ipfs_hash VARCHAR(100),
                verification_status VARCHAR(20) DEFAULT 'verified',
                full_name VARCHAR(200),
                emergency_contact_1_name VARCHAR(100),
                emergency_contact_1_phone VARCHAR(20),
                emergency_contact_2_name VARCHAR(100),
                emergency_contact_2_phone VARCHAR(20),
                blood_group VARCHAR(10),
                scan_count INTEGER DEFAULT 0,
                last_scanned_at TIMESTAMP,
                last_scanned_by_vendor_id VARCHAR(36),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT fk_user_verifications_traveler
                    FOREIGN KEY (traveler_id)
                    REFERENCES travelers(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_user_verifications_vendor
                    FOREIGN KEY (last_scanned_by_vendor_id)
                    REFERENCES vendors(id)
                    ON DELETE SET NULL
            );
        """)
        print("   ✓ user_verifications table created")

        # 4. Add indexes to user_verifications table
        print("4. Adding indexes to user_verifications table...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_verifications_traveler_id ON user_verifications(traveler_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_verifications_wallet_address ON user_verifications(wallet_address);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_verifications_verification_token ON user_verifications(verification_token);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_verifications_sbt_token_id ON user_verifications(sbt_token_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_verifications_created_at ON user_verifications(created_at);
        """)
        print("   ✓ user_verifications indexes added")

        print()
        print("=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        print("Tables created:")
        print("  - vendors")
        print("    - id (VARCHAR(36), primary key)")
        print("    - vendor_name (VARCHAR(200), not null)")
        print("    - organization (VARCHAR(200))")
        print("    - contact_email (VARCHAR(255), unique, not null, indexed)")
        print("    - contact_phone (VARCHAR(20))")
        print("    - password_hash (VARCHAR(255), not null)")
        print("    - vendor_type (VARCHAR(50), not null, indexed)")
        print("    - city, state, country, address (location fields)")
        print("    - is_active (BOOLEAN, default true)")
        print("    - total_scans (INTEGER, default 0)")
        print("    - last_scan_at (TIMESTAMP)")
        print("    - created_at, updated_at (TIMESTAMP)")
        print()
        print("  - user_verifications")
        print("    - id (VARCHAR(36), primary key)")
        print("    - traveler_id (VARCHAR(36), FK to travelers, unique, indexed)")
        print("    - wallet_address (VARCHAR(42), indexed)")
        print("    - sbt_token_id (VARCHAR(256), indexed)")
        print("    - verification_token (VARCHAR(64), unique, indexed)")
        print("    - qr_ipfs_url, qr_ipfs_hash (IPFS storage)")
        print("    - verification_status (VARCHAR(20), default 'verified')")
        print("    - full_name, emergency contacts, blood_group (denormalized data)")
        print("    - scan_count, last_scanned_at, last_scanned_by_vendor_id (tracking)")
        print("    - created_at, updated_at (TIMESTAMP)")
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


def rollback_migration():
    """Rollback: Drop vendors and user_verifications tables"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return False

    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cursor = conn.cursor()

        print("=" * 60)
        print("ROLLBACK: Remove QR Verification Tables")
        print("=" * 60)
        print()

        # Drop user_verifications first (has FK to vendors)
        print("1. Dropping user_verifications table...")
        cursor.execute("DROP TABLE IF EXISTS user_verifications CASCADE;")
        print("   ✓ user_verifications table dropped")

        # Drop vendors table
        print("2. Dropping vendors table...")
        cursor.execute("DROP TABLE IF EXISTS vendors CASCADE;")
        print("   ✓ vendors table dropped")

        print()
        print("=" * 60)
        print("✅ ROLLBACK COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()

        cursor.close()
        conn.close()
        return True

    except psycopg2.Error as e:
        print()
        print("=" * 60)
        print("❌ ROLLBACK FAILED")
        print("=" * 60)
        print(f"Database Error: {e}")
        print()
        return False

    except Exception as e:
        print()
        print("=" * 60)
        print("❌ ROLLBACK FAILED")
        print("=" * 60)
        print(f"Error: {e}")
        print()
        return False


if __name__ == "__main__":
    # Check for rollback flag
    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        success = rollback_migration()
    else:
        success = run_migration()

    sys.exit(0 if success else 1)
