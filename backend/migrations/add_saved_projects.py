"""
Migration: Add saved_projects table

Run this with: python migrations/add_saved_projects.py
"""
from app import create_app
from extensions import db
from models.saved_project import SavedProject

def migrate():
    """Create saved_projects table"""
    app = create_app()

    with app.app_context():
        print("Creating saved_projects table...")

        # Create the table
        db.create_all()

        print("✓ Migration completed successfully!")
        print("  - Created 'saved_projects' table")
        print("  - Added indexes for user_id and project_id")

if __name__ == '__main__':
    migrate()
