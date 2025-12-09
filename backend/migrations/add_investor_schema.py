"""
Add investor role schema and communication tables
"""
from sqlalchemy import text
from extensions import db
from app import create_app


def add_investor_schema():
    """Add investor role, investor requests, intro requests, and DM tables"""
    app = create_app()

    with app.app_context():
        print("Adding investor schema...")

        # 1. Add is_investor column to users table
        try:
            db.session.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_investor BOOLEAN DEFAULT FALSE;
            """))
            print("Added is_investor column to users table")
        except Exception as e:
            print(f"  is_investor column might already exist")

        # 2. Create investor_requests table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS investor_requests (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('free', 'professional', 'enterprise')),
                company_name VARCHAR(200),
                linkedin_url TEXT,
                reason TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                reviewed_by VARCHAR(36) REFERENCES users(id),
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id)
            );
        """))
        print("Created investor_requests table")

        # 3. Create intro_requests table (for investors requesting intros to projects)
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS intro_requests (
                id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
                investor_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                builder_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                message TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))
        print("Created intro_requests table")

        # 4. Create direct_messages table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS direct_messages (
                id VARCHAR(36) PRIMARY KEY,
                sender_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                recipient_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))
        print("Created direct_messages table")

        # 5. Create indexes for performance
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_investor_requests_user_id
            ON investor_requests(user_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_investor_requests_status
            ON investor_requests(status);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_intro_requests_project_id
            ON intro_requests(project_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_intro_requests_investor_id
            ON intro_requests(investor_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_intro_requests_builder_id
            ON intro_requests(builder_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id
            ON direct_messages(sender_id);
        """))
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id
            ON direct_messages(recipient_id);
        """))
        print("Created all indexes")

        db.session.commit()
        print("\n SUCCESS Investor schema added successfully!")
        print("   - is_investor column added to users")
        print("   - investor_requests table created")
        print("   - intro_requests table created")
        print("   - direct_messages table created")
        print("   - All indexes created")


if __name__ == '__main__':
    add_investor_schema()
