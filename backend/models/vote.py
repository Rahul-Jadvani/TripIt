"""
Vote Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Vote(db.Model):
    """Vote model for upvotes and downvotes"""

    __tablename__ = 'votes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    # Removed FK constraint - project_id can reference either projects.id OR itineraries.id
    project_id = db.Column(db.String(36), nullable=False, index=True)
    vote_type = db.Column(db.String(10), nullable=False)  # 'up' or 'down'

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint: one vote per user per project/itinerary
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='unique_user_project_vote'),)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'vote_type': self.vote_type,
            'created_at': self.created_at.isoformat(),
        }

    def __repr__(self):
        return f'<Vote {self.vote_type} by {self.user_id}>'
