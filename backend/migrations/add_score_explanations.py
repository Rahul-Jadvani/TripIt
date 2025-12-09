"""
Add score_explanations column to itineraries table
"""
import psycopg2
from psycopg2.extras import Json

def run_migration(db_url):
    """Add score_explanations column to itineraries table"""
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        print("Adding score_explanations column to itineraries table...")

        # Add score_explanations column (JSON object)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS score_explanations JSONB DEFAULT '{}'::jsonb
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
    from config import Config
    run_migration(Config.SQLALCHEMY_DATABASE_URI)
