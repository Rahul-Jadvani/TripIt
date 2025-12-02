"""
Revert foreign key back to travelers table
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

def revert_foreign_key():
    """Revert foreign key back to travelers table"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Reverting foreign key back to travelers table...")

        # Drop the current foreign key constraint
        print("Dropping current foreign key constraint...")
        cursor.execute("""
            ALTER TABLE itineraries
            DROP CONSTRAINT IF EXISTS itineraries_created_by_traveler_id_fkey
        """)
        print("✓ Constraint dropped")

        # Add foreign key back to travelers table
        print("Adding foreign key back to travelers table...")
        cursor.execute("""
            ALTER TABLE itineraries
            ADD CONSTRAINT itineraries_created_by_traveler_id_fkey
            FOREIGN KEY (created_by_traveler_id)
            REFERENCES travelers(id)
            ON DELETE CASCADE
        """)
        print("✓ Foreign key restored to travelers table")

        print("\n✅ Revert completed successfully!")

    except Exception as e:
        print(f"\n❌ Revert failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    revert_foreign_key()
