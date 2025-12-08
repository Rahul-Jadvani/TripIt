"""
Database Migration: Add Remix Fields to Itineraries
Adds fields to track remixed itineraries and attribution
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    """Add remix fields to itineraries table"""

    # Get database connection info
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not found in environment")
        return False

    # Parse DATABASE_URL (format: postgresql://user:pass@host:port/dbname)
    try:
        from urllib.parse import urlparse
        result = urlparse(db_url)
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        cursor = conn.cursor()

        print("\n" + "="*80)
        print("MIGRATION: Adding Remix Fields to Itineraries")
        print("="*80 + "\n")

        # Add remix fields
        migrations = [
            {
                "name": "Add is_remixed column",
                "sql": """
                    ALTER TABLE itineraries
                    ADD COLUMN IF NOT EXISTS is_remixed BOOLEAN DEFAULT FALSE;
                """,
                "index": "CREATE INDEX IF NOT EXISTS idx_itineraries_is_remixed ON itineraries(is_remixed);"
            },
            {
                "name": "Add remixed_from_ids column",
                "sql": """
                    ALTER TABLE itineraries
                    ADD COLUMN IF NOT EXISTS remixed_from_ids JSON DEFAULT '[]'::json;
                """
            },
            {
                "name": "Add remix_count column",
                "sql": """
                    ALTER TABLE itineraries
                    ADD COLUMN IF NOT EXISTS remix_count INTEGER DEFAULT 0;
                """
            }
        ]

        for migration in migrations:
            try:
                print(f"-> {migration['name']}...", end=" ")
                cursor.execute(migration['sql'])

                if 'index' in migration:
                    cursor.execute(migration['index'])

                conn.commit()
                print("[OK] SUCCESS")
            except Exception as e:
                print(f"[ERROR]: {e}")
                conn.rollback()
                continue

        # Verify fields were added
        print("\n" + "-"*80)
        print("Verifying new fields...")
        print("-"*80)

        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'itineraries'
            AND column_name IN ('is_remixed', 'remixed_from_ids', 'remix_count')
            ORDER BY column_name;
        """)

        fields = cursor.fetchall()
        if fields:
            print("\n[OK] Successfully added fields:")
            for field in fields:
                print(f"   - {field[0]} ({field[1]}) = {field[2]}")
        else:
            print("\n[WARNING]: Could not verify fields")

        cursor.close()
        conn.close()

        print("\n" + "="*80)
        print("MIGRATION COMPLETE!")
        print("="*80)
        print("\nRemix fields have been added to the itineraries table.")
        print("These fields track:")
        print("  - is_remixed: Whether this itinerary was created by AI remix")
        print("  - remixed_from_ids: Source itinerary IDs used for remix")
        print("  - remix_count: How many times this has been remixed")
        print("\n" + "="*80 + "\n")

        return True

    except Exception as e:
        print(f"\n[FAILED] MIGRATION ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    migrate()
