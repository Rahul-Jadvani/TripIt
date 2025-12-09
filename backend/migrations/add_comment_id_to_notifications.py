"""
Add comment_id column to notifications table
Run: python migrations/add_comment_id_to_notifications.py
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("[ERROR] DATABASE_URL environment variable not set")
    print("Please set DATABASE_URL before running migration")
    print("Example: DATABASE_URL=postgresql://user:password@localhost/dbname")
    exit(1)

print("Connecting to database...")
engine = create_engine(DATABASE_URL, poolclass=NullPool)

with engine.connect() as connection:
    print("Adding comment_id column to notifications table...")

    # Check if column already exists
    try:
        result = connection.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'comment_id'
        """))

        column_exists = result.fetchone() is not None

        if column_exists:
            print("[SKIP] comment_id column already exists in notifications table")
        else:
            # Add the comment_id column
            connection.execute(text("""
                ALTER TABLE notifications
                ADD COLUMN comment_id VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE
            """))

            print("[OK] comment_id column added to notifications table")

            # Add index for faster lookups
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_comment
                ON notifications(comment_id)
            """))

            print("[OK] Index created for comment_id column")

        connection.commit()
        print("\n[SUCCESS] Notifications table migration completed!")

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        print("\nMake sure:")
        print("1. PostgreSQL is running")
        print("2. DATABASE_URL is set correctly")
        print("3. The notifications table exists")
        exit(1)
