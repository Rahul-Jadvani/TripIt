"""
Migration: Add cities column to booking_sessions table for multi-city support
"""
from extensions import db
from sqlalchemy import text

def upgrade():
    """Add cities column"""
    try:
        with db.engine.connect() as conn:
            # Add cities column (JSON type)
            conn.execute(text("""
                ALTER TABLE booking_sessions
                ADD COLUMN IF NOT EXISTS cities JSON;
            """))
            conn.commit()
            print("✅ Added cities column to booking_sessions")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

def downgrade():
    """Remove cities column"""
    try:
        with db.engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE booking_sessions
                DROP COLUMN IF EXISTS cities;
            """))
            conn.commit()
            print("✅ Removed cities column from booking_sessions")
    except Exception as e:
        print(f"❌ Downgrade failed: {e}")
        raise

if __name__ == '__main__':
    from app import app
    with app.app_context():
        upgrade()
