"""
Add missing performance indexes
"""
from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("Adding missing performance indexes...")

    # Add user_id index on projects (for JOINs)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_projects_user_id
            ON projects(user_id)
        """))
        print("[OK] Added index on projects.user_id")
    except Exception as e:
        print(f"[ERROR] Error adding projects.user_id index: {e}")

    # Add hackathon_name index on projects (for filtering)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_projects_hackathon_name
            ON projects(hackathon_name)
        """))
        print("[OK] Added index on projects.hackathon_name")
    except Exception as e:
        print(f"[ERROR] Error adding projects.hackathon_name index: {e}")

    # Add composite index for trending queries (is_deleted + proof_score + created_at)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_projects_trending_composite
            ON projects(is_deleted, proof_score DESC, created_at DESC)
        """))
        print("[OK] Added composite index for trending queries")
    except Exception as e:
        print(f"[ERROR] Error adding trending composite index: {e}")

    # Add composite index for newest queries (is_deleted + created_at)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_projects_newest_composite
            ON projects(is_deleted, created_at DESC)
        """))
        print("[OK] Added composite index for newest queries")
    except Exception as e:
        print(f"[ERROR] Error adding newest composite index: {e}")

    # Add user_id index on comments (for filtering by user)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_comments_user_id
            ON comments(user_id)
        """))
        print("[OK] Added index on comments.user_id")
    except Exception as e:
        print(f"[ERROR] Error adding comments.user_id index: {e}")

    # Add project_id index on comments (for filtering by project)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_comments_project_id
            ON comments(project_id)
        """))
        print("[OK] Added index on comments.project_id")
    except Exception as e:
        print(f"[ERROR] Error adding comments.project_id index: {e}")

    # Add user_id index on votes (for user vote lookups)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_votes_user_id
            ON votes(user_id)
        """))
        print("[OK] Added index on votes.user_id")
    except Exception as e:
        print(f"[ERROR] Error adding votes.user_id index: {e}")

    # Add project_id index on votes (for project vote lookups)
    try:
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_votes_project_id
            ON votes(project_id)
        """))
        print("[OK] Added index on votes.project_id")
    except Exception as e:
        print(f"[ERROR] Error adding votes.project_id index: {e}")

    db.session.commit()
    print("\n[SUCCESS] All indexes added successfully!")
    print("\nRun check_indexes.py to verify.")
