"""
Add chain moderation fields and moderation log table
Run: python migrations/add_chain_moderation.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Adding chain moderation fields and tables...")

    # Add moderation fields to chains table
    db.session.execute(text("""
        ALTER TABLE chains
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS banned_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS ban_reason TEXT,
        ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_chains_status ON chains(status);
        CREATE INDEX IF NOT EXISTS idx_chains_suspended_until ON chains(suspended_until);
    """))

    print("[OK] Chain moderation fields added")

    # Create chain_moderation_logs table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chain_moderation_logs (
            id VARCHAR(36) PRIMARY KEY,
            chain_id VARCHAR(36) NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
            admin_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(20) NOT NULL,
            reason TEXT,
            meta_data JSONB DEFAULT '{}',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_moderation_logs_chain ON chain_moderation_logs(chain_id);
        CREATE INDEX IF NOT EXISTS idx_moderation_logs_admin ON chain_moderation_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_moderation_logs_action ON chain_moderation_logs(action);
        CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON chain_moderation_logs(created_at DESC);
    """))

    print("[OK] Chain moderation logs table created")

    db.session.commit()

    print("\n[SUCCESS] Chain moderation features added successfully!")
    print("\nSummary:")
    print("   - Added status, banned_at, banned_by_id, ban_reason, suspended_until to chains")
    print("   - Created chain_moderation_logs table for audit trail")
    print("\nDatabase schema is ready for chain moderation!")
