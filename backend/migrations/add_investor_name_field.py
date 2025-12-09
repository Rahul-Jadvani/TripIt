"""
Migration: Add name field to investor_requests table
Adds name field to store the investor's full name

Run this with: python migrations/add_investor_name_field.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    """Add name column to investor_requests table"""
    app = create_app()

    with app.app_context():
        print("Adding name field to investor_requests table...")

        with db.engine.connect() as conn:
            # Check if column exists before adding
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='investor_requests' AND column_name='name'
            """))

            if result.fetchone() is None:
                print("[INFO] Adding 'name' column...")

                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN name VARCHAR(200)"))
                conn.commit()

                print("[SUCCESS] 'name' field added successfully!")
                print("  - Added 'name' column (VARCHAR 200)")
                print("\n[INFO] Existing investor requests will have NULL name values until updated")
            else:
                print("[INFO] 'name' field already exists, skipping...")

if __name__ == '__main__':
    migrate()
