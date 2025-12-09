"""
Increase best_season column length from 100 to 500 characters
to accommodate longer AI-generated content
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

def upgrade():
    """Increase best_season column length"""
    from app import app
    from extensions import db

    with app.app_context():
        try:
            # For PostgreSQL
            db.session.execute(text("""
                ALTER TABLE itineraries
                ALTER COLUMN best_season TYPE VARCHAR(500);
            """))
            db.session.commit()
            print("✅ Successfully increased best_season column length to 500")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            raise

def downgrade():
    """Revert best_season column length"""
    from app import app
    from extensions import db

    with app.app_context():
        try:
            # For PostgreSQL
            db.session.execute(text("""
                ALTER TABLE itineraries
                ALTER COLUMN best_season TYPE VARCHAR(100);
            """))
            db.session.commit()
            print("✅ Successfully reverted best_season column length to 100")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Rollback failed: {e}")
            raise

if __name__ == '__main__':
    upgrade()
