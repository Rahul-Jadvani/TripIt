"""
Add categories column to itineraries table
"""
import psycopg2
from psycopg2.extras import Json


def run_migration(db_url):
    """Add categories column to itineraries table"""
    try:
        # Connect to database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        print("Adding categories column to itineraries table...")

        # Add categories column (JSON array)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb
        """)

        conn.commit()
        cursor.close()
        conn.close()

        print("[SUCCESS] Migration completed successfully!")
        return True

    except Exception as e:
        print(f"[ERROR] Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False


if __name__ == '__main__':
    import os
    from dotenv import load_dotenv

    load_dotenv()

    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not found in environment")
        exit(1)

    success = run_migration(db_url)
    exit(0 if success else 1)
