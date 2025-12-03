"""
Add extended itinerary fields for trip details
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

def add_extended_fields():
    """Add extended itinerary fields"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Adding extended itinerary fields...")

        # Add trip_highlights (Trip Highlights - formerly projectStory)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS trip_highlights TEXT
        """)
        print("✓ trip_highlights added")

        # Add trip_journey (Trip Journey & Experience - formerly inspiration)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS trip_journey TEXT
        """)
        print("✓ trip_journey added")

        # Add day_by_day_plan (Day-by-Day Itinerary - formerly hackathonName)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS day_by_day_plan TEXT
        """)
        print("✓ day_by_day_plan added")

        # Add safety_intelligence (Safety Intelligence & Risks - formerly hackathonDate)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS safety_intelligence TEXT
        """)
        print("✓ safety_intelligence added")

        # Add hidden_gems (Hidden Gems & Local Businesses - formerly marketComparison)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS hidden_gems TEXT
        """)
        print("✓ hidden_gems added")

        # Add unique_highlights (Unique Highlights - formerly noveltyFactor)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS unique_highlights TEXT
        """)
        print("✓ unique_highlights added")

        # Add safety_tips (Safety & Travel Tips)
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS safety_tips TEXT
        """)
        print("✓ safety_tips added")

        # Add screenshots JSON array
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN IF NOT EXISTS screenshots JSON DEFAULT '[]'::json
        """)
        print("✓ screenshots added")

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
    add_extended_fields()
