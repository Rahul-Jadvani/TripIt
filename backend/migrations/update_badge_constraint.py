"""
Update validation_badges table constraint to include stone and demerit badge types
"""
from sqlalchemy import text
from extensions import db
from app import create_app

def update_badge_constraint():
    """Update the badge_type constraint to include new types"""
    app = create_app()

    with app.app_context():
        print("Updating validation_badges constraint...")

        # Drop the old constraint
        db.session.execute(text("""
            ALTER TABLE validation_badges
            DROP CONSTRAINT IF EXISTS validation_badges_badge_type_check;
        """))

        # Add the new constraint with all badge types
        db.session.execute(text("""
            ALTER TABLE validation_badges
            ADD CONSTRAINT validation_badges_badge_type_check
            CHECK (badge_type IN ('stone', 'silver', 'gold', 'platinum', 'demerit'));
        """))

        db.session.commit()
        print("[SUCCESS] Successfully updated badge_type constraint!")
        print("   Allowed types: stone, silver, gold, platinum, demerit")

if __name__ == '__main__':
    update_badge_constraint()
