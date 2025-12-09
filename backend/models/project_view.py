"""
Project View Model - Track unique project views
"""
from datetime import datetime
from extensions import db


class ProjectView(db.Model):
    """
    Track unique views per project
    - For logged-in users: tracked by user_id
    - For anonymous users: tracked by session_id/fingerprint
    """
    __tablename__ = 'project_views'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    session_id = db.Column(db.String(128), nullable=True, index=True)  # For anonymous users
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 compatible
    user_agent = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Composite unique constraint - one view per user/session per project
    __table_args__ = (
        db.Index('idx_project_user_view', 'project_id', 'user_id'),
        db.Index('idx_project_session_view', 'project_id', 'session_id'),
        # Unique constraints to prevent duplicate views (race condition protection)
        db.UniqueConstraint('project_id', 'user_id', name='uq_project_user_view'),
        db.UniqueConstraint('project_id', 'session_id', name='uq_project_session_view'),
    )

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat(),
        }
