"""
Migration: Add indexes for messages, intros, and related tables
Run this with: python migrations/add_messaging_indexes.py
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
        print("=== Adding Messaging & Intros Indexes ===\n")

        with db.engine.connect() as conn:
            indexes = [
                # Direct Messages indexes
                ("idx_dm_sender_recipient", """
                    CREATE INDEX IF NOT EXISTS idx_dm_sender_recipient 
                    ON direct_messages(sender_id, recipient_id, created_at DESC)
                """),
                ("idx_dm_recipient_unread", """
                    CREATE INDEX IF NOT EXISTS idx_dm_recipient_unread 
                    ON direct_messages(recipient_id, is_read, created_at DESC)
                """),
                ("idx_dm_conversation", """
                    CREATE INDEX IF NOT EXISTS idx_dm_conversation 
                    ON direct_messages(
                        LEAST(sender_id, recipient_id),
                        GREATEST(sender_id, recipient_id),
                        created_at DESC
                    )
                """),
                
                # Intro Requests indexes
                ("idx_intro_requests_to_user", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_to_user 
                    ON intro_requests(to_user_id, status, created_at DESC)
                """),
                ("idx_intro_requests_from_user", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_from_user 
                    ON intro_requests(from_user_id, status, created_at DESC)
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
                
                # Project Views indexes (for analytics)
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

        print("\n=== Messaging Indexes Added! ===")
        print("Optimized tables:")
        print("  - direct_messages (conversations, unread)")
        print("  - intro_requests (to/from user, project)")
        print("  - saved_projects (user, project)")
        print("  - project_views (analytics)")
        print("  - investor_requests (status)")

if __name__ == "__main__":
    migrate()
