"""
Migration script to add team_members field to projects table
"""
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app import create_app
from extensions import db
from sqlalchemy import text

def add_team_members_field():
    """Add team_members field to projects table"""
    app = create_app()

    with app.app_context():
        try:
            print("Adding team_members field to projects table...")

            with db.engine.connect() as conn:
                # Check if column already exists
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='projects'
                    AND column_name='team_members'
                """))
                existing_columns = [row[0] for row in result]

                # Add team_members if it doesn't exist
                if 'team_members' not in existing_columns:
                    print("Adding team_members column...")
                    conn.execute(text("""
                        ALTER TABLE projects
                        ADD COLUMN team_members JSON DEFAULT '[]'::json
                    """))
                    conn.commit()
                    print("✓ team_members column added")
                else:
                    print("✓ team_members column already exists")

            print("\n✅ Migration completed successfully!")

        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    add_team_members_field()
