"""
Migration: Add enhanced investor profile fields
Adds comprehensive fields for investor profiles including:
- Investor type (individual/organization)
- Professional info (position, experience, location)
- Investment focus (stages, industries, ticket size, geography)
- About (bio, investment thesis)
- Track record (investments, portfolio)
- Value add (mentorship, expertise)
- Visibility settings (public, open_to_requests)
- Contact info (twitter, calendar)
- Organization-specific (fund size)
- Admin notes

Run this with: python migrations/add_enhanced_investor_fields.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    """Add new columns to investor_requests table"""
    app = create_app()

    with app.app_context():
        print("Adding enhanced investor fields to investor_requests table...")

        # Add new columns
        with db.engine.connect() as conn:
            # Check if columns exist before adding
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='investor_requests' AND column_name='investor_type'
            """))

            if result.fetchone() is None:
                print("[INFO] Adding new columns...")

                # Basic Info
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN investor_type VARCHAR(20) DEFAULT 'individual'"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN position_title VARCHAR(200)"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN website_url TEXT"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN location VARCHAR(200)"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN years_experience VARCHAR(20)"))

                # Investment Focus
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN investment_stages JSON"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN industries JSON"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN ticket_size_min INTEGER"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN ticket_size_max INTEGER"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN geographic_focus JSON"))

                # About
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN bio TEXT"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN investment_thesis TEXT"))

                # Track Record
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN num_investments VARCHAR(20)"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN notable_investments JSON"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN portfolio_highlights TEXT"))

                # Value Add
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN value_adds JSON"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN expertise_areas TEXT"))

                # Visibility
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN is_public BOOLEAN DEFAULT FALSE"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN open_to_requests BOOLEAN DEFAULT FALSE"))

                # Contact
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN twitter_url TEXT"))
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN calendar_link TEXT"))

                # Organization
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN fund_size VARCHAR(50)"))

                # Admin
                conn.execute(text("ALTER TABLE investor_requests ADD COLUMN admin_notes TEXT"))

                # Add constraint for investor_type
                conn.execute(text("""
                    ALTER TABLE investor_requests
                    ADD CONSTRAINT check_investor_type
                    CHECK (investor_type IN ('individual', 'organization'))
                """))

                conn.commit()

                print("[SUCCESS] Enhanced investor fields added!")
                print("  - Added 'investor_type' column (individual/organization)")
                print("  - Added 'position_title', 'website_url', 'location', 'years_experience'")
                print("  - Added 'investment_stages', 'industries', 'ticket_size_min/max', 'geographic_focus'")
                print("  - Added 'bio', 'investment_thesis'")
                print("  - Added 'num_investments', 'notable_investments', 'portfolio_highlights'")
                print("  - Added 'value_adds', 'expertise_areas'")
                print("  - Added 'is_public', 'open_to_requests' (visibility settings)")
                print("  - Added 'twitter_url', 'calendar_link'")
                print("  - Added 'fund_size' (for organizations)")
                print("  - Added 'admin_notes'")
                print("\n[INFO] Existing investor requests will have default values")
            else:
                print("[INFO] Enhanced investor fields already exist, skipping...")

if __name__ == '__main__':
    migrate()
