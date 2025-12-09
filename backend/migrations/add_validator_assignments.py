"""
Migration to add validator assignment system
- Adds category field to projects
- Creates validator_assignments table
"""
import sys
import os

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        print("[MIGRATION] Starting validator assignment migration...")

        # Add category column to projects table
        print("[MIGRATION] Adding category column to projects...")
        try:
            db.session.execute(text("""
                ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS category VARCHAR(100);
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_projects_category
                ON projects(category);
            """))
            print("[SUCCESS] Category column added to projects")
        except Exception as e:
            print(f"[INFO] Category column might already exist: {e}")

        # Create validator_assignments table
        print("[MIGRATION] Creating validator_assignments table...")
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS validator_assignments (
                id VARCHAR(36) PRIMARY KEY,
                validator_id VARCHAR(36) NOT NULL,
                project_id VARCHAR(36) NOT NULL,
                assigned_by VARCHAR(36) NOT NULL,
                category_filter VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(20) DEFAULT 'normal',
                reviewed_at TIMESTAMP,
                review_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (validator_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id),

                UNIQUE (validator_id, project_id)
            );
        """))

        # Create indexes
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_validator_assignments_validator
            ON validator_assignments(validator_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_validator_assignments_project
            ON validator_assignments(project_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_validator_assignments_status
            ON validator_assignments(status);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_validator_assignments_created
            ON validator_assignments(created_at);
        """))

        db.session.commit()
        print("[SUCCESS] validator_assignments table created successfully!")

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nValidator assignment system is now ready!")

    except Exception as e:
        db.session.rollback()
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise
