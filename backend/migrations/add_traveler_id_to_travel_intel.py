"""
Add traveler_id column to travel_intel table
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
    """Add traveler_id column to travel_intel"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Adding traveler_id to travel_intel table...")

        # Check if column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='travel_intel' AND column_name='traveler_id'
        """)
        exists = cursor.fetchone()

        if not exists:
            print("Adding traveler_id column...")
            cursor.execute("""
                ALTER TABLE travel_intel
                ADD COLUMN traveler_id VARCHAR(36)
            """)
            print("✓ traveler_id column added")

            # Check if there are existing rows that need default traveler_id
            cursor.execute("SELECT COUNT(*) FROM travel_intel WHERE traveler_id IS NULL")
            null_count = cursor.fetchone()[0]

            if null_count > 0:
                print(f"Found {null_count} rows with NULL traveler_id")
                print("Setting default traveler_id for existing rows...")
                cursor.execute("""
                    UPDATE travel_intel
                    SET traveler_id = (SELECT id FROM travelers LIMIT 1)
                    WHERE traveler_id IS NULL
                """)
                print(f"✓ Updated {null_count} existing rows")

            # Make column NOT NULL
            print("Adding NOT NULL constraint...")
            cursor.execute("""
                ALTER TABLE travel_intel
                ALTER COLUMN traveler_id SET NOT NULL
            """)
            print("✓ NOT NULL constraint added")

            # Add foreign key constraint
            print("Adding foreign key constraint...")
            cursor.execute("""
                ALTER TABLE travel_intel
                ADD CONSTRAINT travel_intel_traveler_id_fkey
                FOREIGN KEY (traveler_id)
                REFERENCES travelers(id)
                ON DELETE CASCADE
            """)
            print("✓ Foreign key constraint added")

            # Add index
            print("Adding index...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_travel_intel_traveler_id
                ON travel_intel(traveler_id)
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
