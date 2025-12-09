"""
Migration to fix itineraries foreign key from travelers to users
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def fix_foreign_key():
    """Update foreign key from travelers to users"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Fixing itineraries foreign key constraint...")

        # Drop the old foreign key constraint
        print("Dropping old foreign key constraint...")
        cursor.execute("""
            ALTER TABLE itineraries
            DROP CONSTRAINT IF EXISTS itineraries_created_by_traveler_id_fkey
        """)
        print("✓ Old constraint dropped")

        # Add new foreign key pointing to users table
        print("Adding new foreign key to users table...")
        cursor.execute("""
            ALTER TABLE itineraries
            ADD CONSTRAINT itineraries_created_by_traveler_id_fkey
            FOREIGN KEY (created_by_traveler_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        """)
        print("✓ New foreign key added")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    fix_foreign_key()
