"""
Migration: Add Remix Chat Tables
Creates tables for persistent chat sessions in the AI Remix feature
"""
from extensions import db
from sqlalchemy import text

def upgrade():
    """Create remix chat tables"""
    print("Creating remix_chat_sessions table...")

    # Create remix_chat_sessions table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS remix_chat_sessions (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            title VARCHAR(200) DEFAULT 'New Remix Chat',
            source_itinerary_ids JSON NOT NULL,
            current_draft_id VARCHAR(36) DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP DEFAULT NULL,
            message_count INT DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES travelers(id) ON DELETE CASCADE,
            FOREIGN KEY (current_draft_id) REFERENCES itineraries(id) ON DELETE SET NULL
        )
    """))

    # Create indexes separately (PostgreSQL syntax)
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON remix_chat_sessions(user_id)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_status ON remix_chat_sessions(status)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON remix_chat_sessions(updated_at)"))

    print("Creating remix_chat_messages table...")

    # Create remix_chat_messages table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS remix_chat_messages (
            id VARCHAR(36) PRIMARY KEY,
            session_id VARCHAR(36) NOT NULL,
            role VARCHAR(10) NOT NULL,
            content TEXT NOT NULL,
            message_metadata JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES remix_chat_sessions(id) ON DELETE CASCADE
        )
    """))

    # Create indexes separately (PostgreSQL syntax)
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_session_id ON remix_chat_messages(session_id)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON remix_chat_messages(created_at)"))

    db.session.commit()
    print("✅ Remix chat tables created successfully!")


def downgrade():
    """Drop remix chat tables"""
    print("Dropping remix chat tables...")

    db.session.execute(text("DROP TABLE IF EXISTS remix_chat_messages"))
    db.session.execute(text("DROP TABLE IF EXISTS remix_chat_sessions"))

    db.session.commit()
    print("✅ Remix chat tables dropped successfully!")


if __name__ == '__main__':
    from app import create_app
    app = create_app()

    with app.app_context():
        print("\n" + "="*60)
        print("REMIX CHAT TABLES MIGRATION")
        print("="*60 + "\n")

        try:
            upgrade()
            print("\n" + "="*60)
            print("MIGRATION COMPLETED SUCCESSFULLY")
            print("="*60 + "\n")
        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            db.session.rollback()
            raise
