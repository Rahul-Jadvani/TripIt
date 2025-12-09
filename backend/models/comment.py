"""
Comment Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Comment(db.Model):
    """Comment model for itinerary discussions"""

    __tablename__ = 'comments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False)  # Still named project_id for compatibility
    user_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False)  # Still named user_id for compatibility
    parent_id = db.Column(db.String(36), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)

    content = db.Column(db.Text, nullable=False)

    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)

    is_deleted = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Self-referential relationship for nested comments
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]),
                               cascade='all, delete-orphan')

    def to_dict(self, include_author=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'parent_id': self.parent_id,
            'content': self.content,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'reply_count': len(self.replies),
        }
        if include_author:
            data['author'] = self.author.to_dict()
        return data

    def __repr__(self):
        return f'<Comment {self.id[:8]}...>'
