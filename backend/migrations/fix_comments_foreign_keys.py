"""
Fix comments table foreign keys to reference itineraries and travelers
instead of projects and users
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
conn.autocommit = True
cursor = conn.cursor()

print("Updating comments table foreign keys...")

try:
    # Check if comments table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'comments'
        )
    """)

    if not cursor.fetchone()[0]:
        print("✓ Comments table does not exist, creating fresh...")
        # Create comments table with correct foreign keys
        cursor.execute("""
            CREATE TABLE comments (
                id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
                parent_id VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0,
                is_deleted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX idx_comments_project_id ON comments(project_id);
            CREATE INDEX idx_comments_user_id ON comments(user_id);
            CREATE INDEX idx_comments_created_at ON comments(created_at);
        """)
        print("✓ Created comments table with correct foreign keys")
    else:
        print("Comments table exists, updating foreign keys...")

        # Step 1: Drop old foreign key constraints if they exist
        print("  1. Dropping old foreign key constraints...")
        cursor.execute("""
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'comments'::regclass
            AND contype = 'f'
        """)
        constraints = cursor.fetchall()

        for (constraint_name,) in constraints:
            print(f"     Dropping constraint: {constraint_name}")
            cursor.execute(f"ALTER TABLE comments DROP CONSTRAINT IF EXISTS {constraint_name}")

        # Step 2: Add new foreign keys
        print("  2. Adding new foreign key constraints...")
        cursor.execute("""
            ALTER TABLE comments
            ADD CONSTRAINT comments_project_id_fkey
            FOREIGN KEY (project_id) REFERENCES itineraries(id) ON DELETE CASCADE
        """)
        print("     ✓ Added project_id → itineraries(id)")

        cursor.execute("""
            ALTER TABLE comments
            ADD CONSTRAINT comments_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES travelers(id) ON DELETE CASCADE
        """)
        print("     ✓ Added user_id → travelers(id)")

        cursor.execute("""
            ALTER TABLE comments
            ADD CONSTRAINT comments_parent_id_fkey
            FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
        """)
        print("     ✓ Added parent_id → comments(id)")

    print("\n✅ Migration completed successfully!")
    print("\nComments table now correctly references:")
    print("  - project_id → itineraries.id")
    print("  - user_id → travelers.id")

except Exception as e:
    print(f"\n❌ Error: {e}")
    conn.rollback()

cursor.close()
conn.close()
