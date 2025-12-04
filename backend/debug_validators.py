"""Debug script to test /admin/validators endpoint logic"""
from app import app
from extensions import db
from models.user import User
from models.traveler import Traveler
from models.validator_permissions import ValidatorPermissions
from models.validator_assignment import ValidatorAssignment
from sqlalchemy.orm import joinedload
from sqlalchemy import func, case

with app.app_context():
    try:
        print("Testing /admin/validators endpoint logic...")
        print("=" * 60)

        # QUERY BOTH TABLES for validators
        print("\n1. Querying User validators...")
        user_validators = User.query.filter(User.is_validator == True)\
            .options(joinedload(User.validator_permissions))\
            .all()
        print(f"   Found {len(user_validators)} User validators")

        print("\n2. Querying Traveler validators...")
        traveler_validators = Traveler.query.filter(Traveler.is_validator == True)\
            .all()
        print(f"   Found {len(traveler_validators)} Traveler validators")

        # Combine all validators
        all_validators = list(user_validators) + list(traveler_validators)
        print(f"\n3. Total validators: {len(all_validators)}")

        # Get assignment stats
        print("\n4. Getting assignment stats...")
        validator_stats = db.session.query(
            ValidatorAssignment.validator_id,
            func.count(ValidatorAssignment.id).label('total'),
            func.sum(case((ValidatorAssignment.status == 'pending', 1), else_=0)).label('pending'),
            func.sum(case((ValidatorAssignment.status == 'in_review', 1), else_=0)).label('in_review'),
            func.sum(case((ValidatorAssignment.status == 'validated', 1), else_=0)).label('completed')
        ).group_by(ValidatorAssignment.validator_id).all()
        print(f"   Found stats for {len(validator_stats)} validators")

        # Get all assignments with eager-loaded itineraries
        print("\n5. Getting all assignments with itineraries...")
        all_assignments = ValidatorAssignment.query\
            .options(joinedload(ValidatorAssignment.itinerary))\
            .all()
        print(f"   Found {len(all_assignments)} assignments")

        # Build category breakdown
        print("\n6. Building category breakdown...")
        category_breakdown_by_validator = {}
        for i, assignment in enumerate(all_assignments):
            print(f"   Processing assignment {i+1}/{len(all_assignments)}...")
            print(f"      validator_id: {assignment.validator_id}")
            print(f"      project_id: {assignment.project_id}")
            print(f"      itinerary: {assignment.itinerary}")

            validator_id = assignment.validator_id
            if validator_id not in category_breakdown_by_validator:
                category_breakdown_by_validator[validator_id] = {}

            if assignment.itinerary:
                print(f"      itinerary.id: {assignment.itinerary.id}")
                print(f"      itinerary.title: {assignment.itinerary.title}")
                print(f"      itinerary.categories: {assignment.itinerary.categories}")

                if assignment.itinerary.categories:
                    for category in assignment.itinerary.categories:
                        if category not in category_breakdown_by_validator[validator_id]:
                            category_breakdown_by_validator[validator_id][category] = 0
                        category_breakdown_by_validator[validator_id][category] += 1
            else:
                print("      ⚠️ itinerary is None!")

        print("\n7. Building response...")
        validators_data = []
        for validator in all_validators:
            print(f"\n   Processing validator: {validator.id}")
            print(f"      Type: {type(validator).__name__}")

            # Handle both User and Traveler models
            if isinstance(validator, Traveler):
                print("      Using Traveler.to_dict(include_sensitive=False)")
                validator_dict = validator.to_dict(include_sensitive=False)
                permissions = ValidatorPermissions.query.filter_by(validator_id=validator.id).first()
            else:
                print("      Using User.to_dict(include_email=True)")
                validator_dict = validator.to_dict(include_email=True)
                permissions = validator.validator_permissions

            print(f"      validator_dict keys: {validator_dict.keys()}")
            print(f"      permissions: {permissions}")

            validators_data.append(validator_dict)

        print("\n" + "=" * 60)
        print(f"✅ SUCCESS! Built data for {len(validators_data)} validators")

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ ERROR: {e}")
        import traceback
        print("\nTraceback:")
        traceback.print_exc()
