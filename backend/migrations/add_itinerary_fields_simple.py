"""
Simple migration script to add new fields to itineraries table
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

def add_itinerary_fields():
    """Add new fields to itineraries table"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Adding new fields to itineraries table...")

        # Get existing columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='itineraries'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {len(existing_columns)}")

        # Add budget_amount if it doesn't exist
        if 'budget_amount' not in existing_columns:
            print("Adding budget_amount column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN budget_amount FLOAT
            """)
            print("✓ budget_amount column added")
        else:
            print("✓ budget_amount column already exists")

        # Add budget_currency if it doesn't exist
        if 'budget_currency' not in existing_columns:
            print("Adding budget_currency column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD'
            """)
            print("✓ budget_currency column added")
        else:
            print("✓ budget_currency column already exists")

        # Add route_map_url if it doesn't exist
        if 'route_map_url' not in existing_columns:
            print("Adding route_map_url column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN route_map_url VARCHAR(500)
            """)
            print("✓ route_map_url column added")
        else:
            print("✓ route_map_url column already exists")

        # Add best_season if it doesn't exist
        if 'best_season' not in existing_columns:
            print("Adding best_season column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN best_season VARCHAR(100)
            """)
            print("✓ best_season column added")
        else:
            print("✓ best_season column already exists")

        # Add activity_tags if it doesn't exist
        if 'activity_tags' not in existing_columns:
            print("Adding activity_tags column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN activity_tags JSON DEFAULT '[]'::json
            """)
            print("✓ activity_tags column added")
        else:
            print("✓ activity_tags column already exists")

        # Add travel_style if it doesn't exist
        if 'travel_style' not in existing_columns:
            print("Adding travel_style column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN travel_style VARCHAR(100)
            """)
            print("✓ travel_style column added")
        else:
            print("✓ travel_style column already exists")

        # Add travel_companions if it doesn't exist
        if 'travel_companions' not in existing_columns:
            print("Adding travel_companions column...")
            cursor.execute("""
                ALTER TABLE itineraries
                ADD COLUMN travel_companions JSON DEFAULT '[]'::json
            """)
            print("✓ travel_companions column added")
        else:
            print("✓ travel_companions column already exists")

        # Make start_date and end_date nullable
        print("Making start_date and end_date nullable...")
        try:
            cursor.execute("""
                ALTER TABLE itineraries
                ALTER COLUMN start_date DROP NOT NULL
            """)
            print("✓ start_date is now nullable")
        except Exception as e:
            print(f"  (start_date may already be nullable: {e})")

        try:
            cursor.execute("""
                ALTER TABLE itineraries
                ALTER COLUMN end_date DROP NOT NULL
            """)
            print("✓ end_date is now nullable")
        except Exception as e:
            print(f"  (end_date may already be nullable: {e})")

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
    add_itinerary_fields()
