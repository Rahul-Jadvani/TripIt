"""
Update sameerkatte to be a validator
"""
from app import app
from extensions import db
from models.traveler import Traveler

with app.app_context():
    try:
        print("Looking for sameerkatte...")

        # Find sameerkatte
        traveler = Traveler.query.filter_by(email='sameerkatte@gmail.com').first()

        if traveler:
            print(f"Found: {traveler.username} ({traveler.email})")
            print(f"Current is_validator: {traveler.is_validator}")

            # Update to validator
            traveler.is_validator = True
            db.session.commit()

            print(f"✅ Updated is_validator to: {traveler.is_validator}")
        else:
            print("❌ sameerkatte not found in travelers table")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
