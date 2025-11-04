"""
Create chains and notifications tables
Run: python migrations/create_chains_and_notifications.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Creating chains and notifications tables...")

    # Create chains table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chains (
            id VARCHAR(36) PRIMARY KEY,
            creator_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) UNIQUE NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            banner_url TEXT,
            logo_url TEXT,
            categories TEXT[],
            rules TEXT,
            social_links JSONB DEFAULT '{}',
            is_public BOOLEAN NOT NULL DEFAULT true,
            requires_approval BOOLEAN NOT NULL DEFAULT false,
            project_count INTEGER NOT NULL DEFAULT 0,
            follower_count INTEGER NOT NULL DEFAULT 0,
            view_count INTEGER NOT NULL DEFAULT 0,
            is_featured BOOLEAN NOT NULL DEFAULT false,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_chain_slug ON chains(slug);
        CREATE INDEX IF NOT EXISTS idx_chain_creator ON chains(creator_id);
        CREATE INDEX IF NOT EXISTS idx_chain_name ON chains(name);
        CREATE INDEX IF NOT EXISTS idx_chain_public_active ON chains(is_public, is_active);
        CREATE INDEX IF NOT EXISTS idx_chain_featured ON chains(is_featured) WHERE is_featured = true;
        CREATE INDEX IF NOT EXISTS idx_chain_created ON chains(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chain_project_count ON chains(project_count DESC);
    """))

    print("[OK] Chains table created")

    # Create chain_projects junction table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chain_projects (
            id VARCHAR(36) PRIMARY KEY,
            chain_id VARCHAR(36) NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
            project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            added_by_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            order_index INTEGER NOT NULL DEFAULT 0,
            is_pinned BOOLEAN NOT NULL DEFAULT false,
            added_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_chain_project UNIQUE (chain_id, project_id)
        );

        CREATE INDEX IF NOT EXISTS idx_chain_projects_chain ON chain_projects(chain_id);
        CREATE INDEX IF NOT EXISTS idx_chain_projects_project ON chain_projects(project_id);
        CREATE INDEX IF NOT EXISTS idx_chain_projects_pinned ON chain_projects(chain_id, is_pinned);
        CREATE INDEX IF NOT EXISTS idx_chain_projects_added ON chain_projects(added_at DESC);
    """))

    print("[OK] Chain projects junction table created")

    # Create chain_project_requests table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chain_project_requests (
            id VARCHAR(36) PRIMARY KEY,
            chain_id VARCHAR(36) NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
            project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            requester_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            reviewed_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP,
            rejection_reason TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_chain_requests_status ON chain_project_requests(chain_id, status);
        CREATE INDEX IF NOT EXISTS idx_chain_requests_project ON chain_project_requests(project_id);
        CREATE INDEX IF NOT EXISTS idx_chain_requests_created ON chain_project_requests(created_at DESC);
    """))

    print("[OK] Chain project requests table created")

    # Create chain_followers table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chain_followers (
            id VARCHAR(36) PRIMARY KEY,
            chain_id VARCHAR(36) NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            followed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_chain_follower UNIQUE (chain_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_chain_followers_user ON chain_followers(user_id);
        CREATE INDEX IF NOT EXISTS idx_chain_followers_chain ON chain_followers(chain_id);
        CREATE INDEX IF NOT EXISTS idx_chain_followers_followed ON chain_followers(followed_at DESC);
    """))

    print("[OK] Chain followers table created")

    # Create notifications table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notification_type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
            chain_id VARCHAR(36) REFERENCES chains(id) ON DELETE CASCADE,
            actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            redirect_url VARCHAR(500),
            is_read BOOLEAN NOT NULL DEFAULT false,
            read_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
    """))

    print("[OK] Notifications table created")

    db.session.commit()

    print("\n[SUCCESS] All chains and notifications tables created successfully!")
    print("\nSummary:")
    print("   - chains (subreddit-style project collections)")
    print("   - chain_projects (many-to-many junction)")
    print("   - chain_project_requests (approval workflow)")
    print("   - chain_followers (following system)")
    print("   - notifications (notification system)")
    print("\nDatabase schema is ready for the Chains feature!")
