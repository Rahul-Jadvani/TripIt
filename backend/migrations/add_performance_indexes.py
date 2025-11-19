"""
Migration: Add performance indexes for faster queries
Run this with: python migrations/add_performance_indexes.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    """Add performance indexes to database"""
    app = create_app()

    with app.app_context():
        print("=== Adding Performance Indexes ===\n")

        with db.engine.connect() as conn:
            indexes = [
                # ===== PROJECT INDEXES =====
                ("idx_projects_trending", """
                    CREATE INDEX IF NOT EXISTS idx_projects_trending
                    ON projects(proof_score DESC, created_at DESC)
                    WHERE is_deleted=false
                """),
                ("idx_projects_created_at", """
                    CREATE INDEX IF NOT EXISTS idx_projects_created_at
                    ON projects(created_at DESC)
                    WHERE is_deleted=false
                """),
                ("idx_projects_proof_score", """
                    CREATE INDEX IF NOT EXISTS idx_projects_proof_score
                    ON projects(proof_score DESC)
                    WHERE is_deleted=false
                """),
                ("idx_projects_featured", """
                    CREATE INDEX IF NOT EXISTS idx_projects_featured
                    ON projects(is_featured)
                    WHERE is_deleted=false
                """),
                ("idx_projects_user_id", """
                    CREATE INDEX IF NOT EXISTS idx_projects_user_id
                    ON projects(user_id, created_at DESC)
                    WHERE is_deleted=false
                """),

                # ===== USER INDEXES =====
                ("idx_users_username", """
                    CREATE INDEX IF NOT EXISTS idx_users_username
                    ON users(username)
                """),
                ("idx_users_email", """
                    CREATE INDEX IF NOT EXISTS idx_users_email
                    ON users(email)
                """),
                ("idx_users_active", """
                    CREATE INDEX IF NOT EXISTS idx_users_active
                    ON users(is_active, created_at DESC)
                """),

                # ===== VOTES INDEXES =====
                ("idx_votes_project_user", """
                    CREATE INDEX IF NOT EXISTS idx_votes_project_user
                    ON votes(project_id, user_id)
                """),
                ("idx_votes_user_created", """
                    CREATE INDEX IF NOT EXISTS idx_votes_user_created
                    ON votes(user_id, created_at DESC)
                """),

                # ===== BADGES INDEXES =====
                ("idx_badges_project_id", """
                    CREATE INDEX IF NOT EXISTS idx_badges_project_id
                    ON validation_badges(project_id, created_at DESC)
                """),

                # ===== COMMENTS INDEXES =====
                ("idx_comments_project_id", """
                    CREATE INDEX IF NOT EXISTS idx_comments_project_id
                    ON comments(project_id, created_at DESC)
                    WHERE is_deleted=false
                """),

                # ===== INTRO REQUESTS INDEXES =====
                ("idx_intro_requests_investor", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_investor
                    ON intro_requests(investor_id, status, created_at DESC)
                """),
                ("idx_intro_requests_builder", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_builder
                    ON intro_requests(builder_id, status, created_at DESC)
                """),
                ("idx_intro_requests_status", """
                    CREATE INDEX IF NOT EXISTS idx_intro_requests_status
                    ON intro_requests(status, created_at DESC)
                """),

                # ===== INVESTOR REQUESTS INDEXES =====
                ("idx_investor_requests_user", """
                    CREATE INDEX IF NOT EXISTS idx_investor_requests_user
                    ON investor_requests(user_id)
                """),
                ("idx_investor_requests_status", """
                    CREATE INDEX IF NOT EXISTS idx_investor_requests_status
                    ON investor_requests(status, created_at DESC)
                """),
                ("idx_investor_requests_approved_public", """
                    CREATE INDEX IF NOT EXISTS idx_investor_requests_approved_public
                    ON investor_requests(status, is_public, updated_at DESC)
                    WHERE status='approved'
                """),

                # ===== PROJECT UPDATES INDEXES =====
                ("idx_project_updates_project", """
                    CREATE INDEX IF NOT EXISTS idx_project_updates_project
                    ON project_updates(project_id, created_at DESC)
                """),
                ("idx_project_updates_user", """
                    CREATE INDEX IF NOT EXISTS idx_project_updates_user
                    ON project_updates(user_id, created_at DESC)
                """),

                # ===== CHAIN POSTS INDEXES =====
                ("idx_chain_posts_chain_parent", """
                    CREATE INDEX IF NOT EXISTS idx_chain_posts_chain_parent
                    ON chain_posts(chain_id, parent_id, created_at DESC)
                    WHERE is_deleted=false AND is_hidden=false
                """),
                ("idx_chain_posts_chain_top_hot", """
                    CREATE INDEX IF NOT EXISTS idx_chain_posts_chain_top_hot
                    ON chain_posts(chain_id, is_pinned DESC, upvote_count DESC, created_at DESC)
                    WHERE parent_id IS NULL AND is_deleted=false AND is_hidden=false
                """),
                ("idx_chain_posts_parent_replies", """
                    CREATE INDEX IF NOT EXISTS idx_chain_posts_parent_replies
                    ON chain_posts(parent_id, upvote_count DESC, created_at DESC)
                    WHERE is_deleted=false AND is_hidden=false
                """),
                ("idx_chain_posts_author", """
                    CREATE INDEX IF NOT EXISTS idx_chain_posts_author
                    ON chain_posts(author_id, created_at DESC)
                """),

                # ===== CHAINS INDEXES =====
                ("idx_chains_slug", """
                    CREATE INDEX IF NOT EXISTS idx_chains_slug
                    ON chains(slug)
                    WHERE is_active=true
                """),
                ("idx_chains_creator", """
                    CREATE INDEX IF NOT EXISTS idx_chains_creator
                    ON chains(creator_id, created_at DESC)
                """),
                ("idx_chains_trending", """
                    CREATE INDEX IF NOT EXISTS idx_chains_trending
                    ON chains(is_public, is_active, project_count DESC, follower_count DESC)
                    WHERE is_active=true
                """),

                # ===== EVENTS INDEXES =====
                ("idx_events_slug", """
                    CREATE INDEX IF NOT EXISTS idx_events_slug
                    ON events(slug)
                    WHERE is_public=true
                """),
                ("idx_events_active", """
                    CREATE INDEX IF NOT EXISTS idx_events_active
                    ON events(is_active, is_featured DESC, project_count DESC)
                    WHERE is_public=true
                """),

                # ===== NOTIFICATIONS INDEXES =====
                ("idx_notifications_user", """
                    CREATE INDEX IF NOT EXISTS idx_notifications_user
                    ON notifications(user_id, is_read, created_at DESC)
                """),
                ("idx_notifications_unread", """
                    CREATE INDEX IF NOT EXISTS idx_notifications_unread
                    ON notifications(user_id)
                    WHERE is_read=false
                """),

                # ===== DIRECT MESSAGES INDEXES =====
                ("idx_direct_messages_conversation", """
                    CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation
                    ON direct_messages(sender_id, recipient_id, created_at DESC)
                """),
                ("idx_direct_messages_unread", """
                    CREATE INDEX IF NOT EXISTS idx_direct_messages_unread
                    ON direct_messages(recipient_id)
                    WHERE is_read=false
                """),

                # ===== SAVED PROJECTS INDEXES =====
                ("idx_saved_projects_user", """
                    CREATE INDEX IF NOT EXISTS idx_saved_projects_user
                    ON saved_projects(user_id, created_at DESC)
                """),

                # ===== FEEDBACK INDEXES =====
                ("idx_feedback_status", """
                    CREATE INDEX IF NOT EXISTS idx_feedback_status
                    ON feedback(status, created_at DESC)
                """),
            ]

            for idx_name, idx_sql in indexes:
                try:
                    conn.execute(text(idx_sql))
                    conn.commit()
                    print(f"   [SUCCESS] {idx_name}")
                except Exception as e:
                    print(f"   [INFO] {idx_name}: {str(e)[:50]}")

        print("\n=== Indexes Added! ===")

if __name__ == "__main__":
    migrate()
