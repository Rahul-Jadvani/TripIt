"""
Check if travel groups tables exist and create them if needed
"""
from app import app
from extensions import db
from models.travel_group import TravelGroup, travel_group_itineraries
from models.travel_group_member import TravelGroupMember
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)

    print("=== Checking Travel Groups Tables ===")

    # Check if tables exist
    existing_tables = inspector.get_table_names()

    tables_to_check = [
        'travel_groups',
        'travel_group_members',
        'travel_group_itineraries'
    ]

    missing_tables = []
    for table in tables_to_check:
        if table in existing_tables:
            print(f"✓ Table '{table}' exists")
            # Show columns
            columns = inspector.get_columns(table)
            print(f"  Columns: {[c['name'] for c in columns]}")
        else:
            print(f"✗ Table '{table}' is MISSING")
            missing_tables.append(table)

    print()

    if missing_tables:
        print(f"Missing tables: {missing_tables}")
        print("\nCreating missing tables...")
        try:
            db.create_all()
            print("✓ Tables created successfully!")
        except Exception as e:
            print(f"✗ Error creating tables: {e}")
    else:
        print("All travel group tables exist!")

    # Test query
    print("\n=== Testing Query ===")
    try:
        groups = TravelGroup.query.limit(5).all()
        print(f"✓ Found {len(groups)} travel groups in database")
        for g in groups:
            print(f"  - {g.name} ({g.destination})")
    except Exception as e:
        print(f"✗ Error querying: {e}")
