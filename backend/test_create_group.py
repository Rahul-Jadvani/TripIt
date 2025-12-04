"""
Test creating a travel group to debug the issue
"""
from app import app
from extensions import db
from models.travel_group import TravelGroup
from models.travel_group_member import TravelGroupMember
from models.traveler import Traveler
from datetime import datetime, timedelta
import traceback

with app.app_context():
    print("=== Testing Travel Group Creation ===\n")

    # Get a traveler
    traveler = Traveler.query.first()
    if not traveler:
        print("✗ No travelers found in database!")
        print("  Please create a traveler first.")
        exit(1)

    print(f"✓ Using traveler: {traveler.username} (ID: {traveler.id})")

    # Test data
    test_data = {
        'name': 'Test Himalayan Trek',
        'description': 'A test group for trekking in Himalayas',
        'destination': 'Manali, Himachal Pradesh',
        'start_date': (datetime.now() + timedelta(days=30)).date(),
        'end_date': (datetime.now() + timedelta(days=37)).date(),
        'group_type': 'adventure',
        'max_members': 10,
        'activity_tags': ['Trekking', 'Mountain', 'Photography'],
        'is_women_only': False,
        'created_by_traveler_id': traveler.id
    }

    print(f"\nTest data:")
    for key, value in test_data.items():
        print(f"  {key}: {value}")

    # Try creating group
    print("\n=== Creating Group ===")
    try:
        group = TravelGroup(**test_data)
        db.session.add(group)
        db.session.flush()
        print(f"✓ Group created: {group.id}")

        # Try adding creator as member
        print("\n=== Adding Creator as Member ===")
        member = TravelGroupMember(
            group_id=group.id,
            traveler_id=traveler.id,
            role='organizer',
            join_status='accepted',
            traveler_reputation_at_join=traveler.traveler_reputation_score or 0.0
        )
        db.session.add(member)
        db.session.commit()
        print(f"✓ Creator added as organizer")

        print(f"\n✓ SUCCESS! Group created with ID: {group.id}")
        print(f"  Group dict: {group.to_dict()}")

        # Clean up test data
        print("\n=== Cleaning up test data ===")
        db.session.delete(member)
        db.session.delete(group)
        db.session.commit()
        print("✓ Test data cleaned up")

    except Exception as e:
        db.session.rollback()
        print(f"\n✗ ERROR: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()
