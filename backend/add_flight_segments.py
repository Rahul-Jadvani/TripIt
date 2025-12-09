#!/usr/bin/env python
"""Add flight segment columns to booking_sessions table"""
from app import app
from extensions import db
from sqlalchemy import text

def add_flight_segment_columns():
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE booking_sessions ADD COLUMN IF NOT EXISTS current_flight_segment INTEGER DEFAULT 0'))
                conn.execute(text('ALTER TABLE booking_sessions ADD COLUMN IF NOT EXISTS flight_segments JSON'))
                conn.commit()
            print('✅ Successfully added flight segment columns to booking_sessions table')
        except Exception as e:
            print(f'❌ Error: {e}')

if __name__ == '__main__':
    add_flight_segment_columns()
