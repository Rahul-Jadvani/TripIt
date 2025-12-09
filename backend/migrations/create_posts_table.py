"""
Migration: Create Posts Table
Purpose: Create table for signature-verified posts with wallet attestation
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Create posts table for signature-verified content"""

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
        print("MIGRATION: Create Posts Table")
        print("=" * 60)
        print()

        # 1. Create posts table
        print("1. Creating posts table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id VARCHAR(36) PRIMARY KEY,
                traveler_id VARCHAR(36) NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
                content_url TEXT NOT NULL,
                caption TEXT,
                post_type VARCHAR(20) DEFAULT 'photo',
                signature VARCHAR(132) NOT NULL,
                wallet_address VARCHAR(42) NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                location VARCHAR(200),
                tags JSON DEFAULT '[]',
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✓ posts table created")

        # 2. Create indexes for performance
        print("2. Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_posts_traveler_id ON posts(traveler_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_posts_wallet_address ON posts(wallet_address);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_posts_verified ON posts(verified);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
        """)
        print("   ✓ Indexes created")

        # 3. Create function to auto-update updated_at
        print("3. Creating trigger for updated_at...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_posts_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        cursor.execute("""
            DROP TRIGGER IF EXISTS trigger_update_posts_updated_at ON posts;
        """)
        cursor.execute("""
            CREATE TRIGGER trigger_update_posts_updated_at
            BEFORE UPDATE ON posts
            FOR EACH ROW
            EXECUTE FUNCTION update_posts_updated_at();
        """)
        print("   ✓ Trigger created")

        print()
        print("=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        print("Posts table created with columns:")
        print("  - id (VARCHAR(36), PK)")
        print("  - traveler_id (VARCHAR(36), FK to travelers)")
        print("  - content_url (TEXT, required)")
        print("  - caption (TEXT, nullable)")
        print("  - post_type (VARCHAR(20), default 'photo')")
        print("  - signature (VARCHAR(132), required)")
        print("  - wallet_address (VARCHAR(42), required)")
        print("  - verified (BOOLEAN, default FALSE)")
        print("  - location (VARCHAR(200), nullable)")
        print("  - tags (JSON, default [])")
        print("  - likes_count (INTEGER, default 0)")
        print("  - comments_count (INTEGER, default 0)")
        print("  - created_at (TIMESTAMP, default NOW())")
        print("  - updated_at (TIMESTAMP, auto-updated)")
        print()
        print("Indexes created:")
        print("  - idx_posts_traveler_id")
        print("  - idx_posts_wallet_address")
        print("  - idx_posts_created_at")
        print("  - idx_posts_verified")
        print("  - idx_posts_post_type")
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
