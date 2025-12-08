"""
Migration: Add booking_sessions table
Run this with: python migrations/add_booking_sessions.py
"""
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

def upgrade():
    """Create booking_sessions table"""
    app = create_app(os.getenv('FLASK_ENV', 'development'))

    with app.app_context():
        # Create booking_sessions table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS booking_sessions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                itinerary_id VARCHAR(36) NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
                session_token VARCHAR(100) UNIQUE NOT NULL,
                current_step VARCHAR(50) DEFAULT 'initial',
                departure_city VARCHAR(200),
                departure_date DATE,
                return_date DATE,
                num_travelers INTEGER,
                budget_preference VARCHAR(50),
                current_destination_index INTEGER DEFAULT 0,
                selected_flights JSON,
                selected_hotels JSON,
                selected_activities JSON,
                flight_options JSON,
                hotel_options JSON,
                activity_options JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed BOOLEAN DEFAULT FALSE
            )
        """))

        # Create indexes
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_id
            ON booking_sessions(user_id)
        """))

        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_booking_sessions_itinerary_id
            ON booking_sessions(itinerary_id)
        """))

        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_booking_sessions_session_token
            ON booking_sessions(session_token)
        """))

        db.session.commit()
        print("✅ booking_sessions table created successfully")


def downgrade():
    """Drop booking_sessions table"""
    app = create_app(os.getenv('FLASK_ENV', 'development'))

    with app.app_context():
        db.session.execute(text("DROP TABLE IF EXISTS booking_sessions CASCADE"))
        db.session.commit()
        print("✅ booking_sessions table dropped successfully")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
        downgrade()
    else:
        upgrade()
