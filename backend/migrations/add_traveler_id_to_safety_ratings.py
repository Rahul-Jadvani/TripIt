"""
Add traveler_id column to safety_ratings table
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

def add_traveler_id_column():
    """Add traveler_id column to safety_ratings"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Adding traveler_id to safety_ratings table...")

        # Check if column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='safety_ratings' AND column_name='traveler_id'
        """)
        exists = cursor.fetchone()

        if not exists:
            print("Adding traveler_id column...")
            cursor.execute("""
                ALTER TABLE safety_ratings
                ADD COLUMN traveler_id VARCHAR(36)
            """)
            print("✓ traveler_id column added")

            # Add foreign key constraint
            print("Adding foreign key constraint...")
            cursor.execute("""
                ALTER TABLE safety_ratings
                ADD CONSTRAINT safety_ratings_traveler_id_fkey
                FOREIGN KEY (traveler_id)
                REFERENCES travelers(id)
                ON DELETE CASCADE
            """)
            print("✓ Foreign key constraint added")

            # Add index
            print("Adding index...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_safety_ratings_traveler_id
                ON safety_ratings(traveler_id)
            """)
            print("✓ Index added")
        else:
            print("✓ traveler_id column already exists")

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
    add_traveler_id_column()
