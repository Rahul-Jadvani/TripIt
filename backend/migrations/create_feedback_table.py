"""
Create feedback table
Run: python migrations/create_feedback_table.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Create feedback table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS feedback (
            id VARCHAR(36) PRIMARY KEY,
            feedback_type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            contact_email VARCHAR(255),
            reported_project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
            reported_user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
            report_reason VARCHAR(100),
            user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'pending',
            admin_notes TEXT,
            reviewed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);
        CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
        CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
        CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
    """))
    db.session.commit()

    print("✅ Feedback table created successfully!")
