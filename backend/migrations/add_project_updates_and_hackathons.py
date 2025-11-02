"""
Migration: Add project_updates table and hackathons field to projects
- Creates project_updates table for tracking project announcements and milestones
- Adds hackathons JSON field to projects table for multiple hackathon support
"""

import sys
sys.path.insert(0, '.')

from app import app
from extensions import db
from sqlalchemy import text

def run_migration():
    with app.app_context():
        try:
            print("Starting migration: add_project_updates_and_hackathons...")

            # 1. Create project_updates table
            print("\n[1/2] Creating project_updates table...")
            create_updates_table = text("""
                CREATE TABLE IF NOT EXISTS project_updates (
                    id VARCHAR(36) PRIMARY KEY,
                    project_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    update_type VARCHAR(50) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content TEXT,
                    update_metadata JSON,
                    color VARCHAR(20) DEFAULT 'yellow',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            db.session.execute(create_updates_table)
            db.session.commit()
            print("[OK] project_updates table created successfully")

            # 2. Add hackathons JSON field to projects table
            print("\n[2/2] Adding hackathons field to projects table...")
            add_hackathons_field = text("""
                ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS hackathons JSON DEFAULT '[]'::json
            """)
            db.session.execute(add_hackathons_field)
            db.session.commit()
            print("[OK] hackathons field added to projects table")

            # 3. Migrate existing hackathon data to new hackathons array
            print("\n[3/3] Migrating existing hackathon data...")
            migrate_hackathon_data = text("""
                UPDATE projects
                SET hackathons = json_build_array(
                    json_build_object(
                        'name', hackathon_name,
                        'date', CAST(hackathon_date AS TEXT),
                        'prize', NULL
                    )
                )
                WHERE hackathon_name IS NOT NULL
                AND hackathon_name != ''
                AND (hackathons IS NULL OR hackathons::text = '[]')
            """)
            db.session.execute(migrate_hackathon_data)
            db.session.commit()
            print("[OK] Existing hackathon data migrated")

            print("\n[SUCCESS] Migration completed successfully!")

        except Exception as e:
            print(f"\n[ERROR] Migration failed: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            raise

if __name__ == '__main__':
    run_migration()
