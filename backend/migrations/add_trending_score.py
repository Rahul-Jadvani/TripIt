"""
Migration script to add trending_score column to projects table
"""
from extensions import db
from app import create_app
from sqlalchemy import text

# Create app context
app = create_app()

with app.app_context():
    try:
        # Add trending_score column
        db.session.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0.0
        """))

        # Add index for trending_score
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_projects_trending_score
            ON projects(trending_score DESC)
        """))

        db.session.commit()
        print("Successfully added trending_score column and index!")

    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")
