"""
Migration: Add extended project fields
- project_story
- inspiration
- pitch_deck_url
- market_comparison
- novelty_factor

Run this with: python migrations/add_extended_project_fields.py
"""
from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    """Add new columns to projects table"""
    app = create_app()

    with app.app_context():
        print("Adding extended project fields to projects table...")

        # Add new columns
        with db.engine.connect() as conn:
            # Check if columns exist before adding
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='projects' AND column_name='project_story'
            """))

            if result.fetchone() is None:
                conn.execute(text("ALTER TABLE projects ADD COLUMN project_story TEXT"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN inspiration TEXT"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN pitch_deck_url TEXT"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN market_comparison TEXT"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN novelty_factor TEXT"))
                conn.commit()
                print("[SUCCESS] Extended project fields added!")
                print("  - Added 'project_story' column")
                print("  - Added 'inspiration' column")
                print("  - Added 'pitch_deck_url' column")
                print("  - Added 'market_comparison' column")
                print("  - Added 'novelty_factor' column")
            else:
                print("[INFO] Extended project fields already exist, skipping...")

if __name__ == '__main__':
    migrate()
