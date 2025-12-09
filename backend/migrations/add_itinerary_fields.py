"""
Migration script to add new fields to itineraries table
"""
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app import create_app
from extensions import db
from sqlalchemy import text

def add_itinerary_fields():
    """Add new fields to itineraries table"""
    app = create_app()

    with app.app_context():
        try:
            print("Adding new fields to itineraries table...")

            with db.engine.connect() as conn:
                # Check existing columns
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='itineraries'
                """))
                existing_columns = [row[0] for row in result]
                print(f"Existing columns: {len(existing_columns)}")

                # Add budget_amount if it doesn't exist
                if 'budget_amount' not in existing_columns:
                    print("Adding budget_amount column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN budget_amount FLOAT
                    """))
                    conn.commit()
                    print("✓ budget_amount column added")
                else:
                    print("✓ budget_amount column already exists")

                # Add budget_currency if it doesn't exist
                if 'budget_currency' not in existing_columns:
                    print("Adding budget_currency column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD'
                    """))
                    conn.commit()
                    print("✓ budget_currency column added")
                else:
                    print("✓ budget_currency column already exists")

                # Add route_map_url if it doesn't exist
                if 'route_map_url' not in existing_columns:
                    print("Adding route_map_url column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN route_map_url VARCHAR(500)
                    """))
                    conn.commit()
                    print("✓ route_map_url column added")
                else:
                    print("✓ route_map_url column already exists")

                # Add best_season if it doesn't exist
                if 'best_season' not in existing_columns:
                    print("Adding best_season column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN best_season VARCHAR(100)
                    """))
                    conn.commit()
                    print("✓ best_season column added")
                else:
                    print("✓ best_season column already exists")

                # Add activity_tags if it doesn't exist
                if 'activity_tags' not in existing_columns:
                    print("Adding activity_tags column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN activity_tags JSON DEFAULT '[]'::json
                    """))
                    conn.commit()
                    print("✓ activity_tags column added")
                else:
                    print("✓ activity_tags column already exists")

                # Add travel_style if it doesn't exist
                if 'travel_style' not in existing_columns:
                    print("Adding travel_style column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN travel_style VARCHAR(100)
                    """))
                    conn.commit()
                    print("✓ travel_style column added")
                else:
                    print("✓ travel_style column already exists")

                # Add travel_companions if it doesn't exist
                if 'travel_companions' not in existing_columns:
                    print("Adding travel_companions column...")
                    conn.execute(text("""
                        ALTER TABLE itineraries
                        ADD COLUMN travel_companions JSON DEFAULT '[]'::json
                    """))
                    conn.commit()
                    print("✓ travel_companions column added")
                else:
                    print("✓ travel_companions column already exists")

                # Make start_date and end_date nullable
                print("Making start_date and end_date nullable...")
                conn.execute(text("""
                    ALTER TABLE itineraries
                    ALTER COLUMN start_date DROP NOT NULL
                """))
                conn.execute(text("""
                    ALTER TABLE itineraries
                    ALTER COLUMN end_date DROP NOT NULL
                """))
                conn.commit()
                print("✓ start_date and end_date are now nullable")

            print("\n✅ Migration completed successfully!")

        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            raise


if __name__ == '__main__':
    add_itinerary_fields()
