"""
Saved Project Model - Bookmarking/Saving projects
"""
from datetime import datetime
from extensions import db


class SavedProject(db.Model):
    """
    Many-to-many relationship between users and projects for bookmarking
    """
    __tablename__ = 'saved_projects'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    project = db.relationship('Project', foreign_keys=[project_id], lazy='joined')

    # Composite unique constraint - user can only save a project once
    __table_args__ = (
        db.UniqueConstraint('user_id', 'project_id', name='unique_user_project_save'),
        db.Index('idx_user_saved', 'user_id', 'created_at'),
    )

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'created_at': self.created_at.isoformat(),
        }
