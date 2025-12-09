"""
Migration: Add indexes for messages, intros (FIXED column names)
Run this with: python migrations/add_messaging_indexes_fixed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    """Add performance indexes for messaging and intros"""
    app = create_app()

    with app.app_context():
        print("=== Adding Messaging & Intros Indexes (FIXED) ===\n")

        with db.engine.connect() as conn:
            # First, rollback any failed transaction
            try:
                conn.execute(text("ROLLBACK"))
            except:
                pass

            indexes = [
                # Intro Requests indexes (FIXED: investor_id, builder_id)
                ("idx_intro_requests_builder", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_builder 
                    ON intro_requests(builder_id, status, created_at DESC)
                """),
                ("idx_intro_requests_investor", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_investor 
                    ON intro_requests(investor_id, status, created_at DESC)
                """),
                ("idx_intro_requests_project", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_project 
                    ON intro_requests(project_id, status)
                """),
                
                # Saved Projects indexes
                ("idx_saved_projects_user", """
                    CREATE INDEX IF NOT EXISTS idx_saved_projects_user 
                    ON saved_projects(user_id, created_at DESC)
                """),
                ("idx_saved_projects_project", """
                    CREATE INDEX IF NOT EXISTS idx_saved_projects_project 
                    ON saved_projects(project_id, created_at DESC)
                """),
                
                # Project Views indexes
                ("idx_project_views_project", """
                    CREATE INDEX IF NOT EXISTS idx_project_views_project 
                    ON project_views(project_id, viewed_at DESC)
                """),
                ("idx_project_views_user", """
                    CREATE INDEX IF NOT EXISTS idx_project_views_user 
                    ON project_views(user_id, viewed_at DESC)
                """),
                
                # Investor Requests indexes
                ("idx_investor_requests_user", """
                    CREATE INDEX IF NOT EXISTS idx_investor_requests_user 
                    ON investor_requests(user_id, status)
                """),
                ("idx_investor_requests_status", """
                    CREATE INDEX IF NOT EXISTS idx_investor_requests_status 
                    ON investor_requests(status, created_at DESC)
                """),
            ]

            for idx_name, idx_sql in indexes:
                try:
                    conn.execute(text(idx_sql))
                    conn.commit()
                    print(f"   [SUCCESS] {idx_name}")
                except Exception as e:
                    print(f"   [INFO] {idx_name}: {str(e)[:60]}")
                    # Rollback and continue
                    try:
                        conn.execute(text("ROLLBACK"))
                    except:
                        pass

        print("\n=== Messaging Indexes Fixed & Added! ===")

if __name__ == "__main__":
    migrate()
