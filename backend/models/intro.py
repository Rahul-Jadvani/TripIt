"""
Intro Request Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Intro(db.Model):
    """Intro request model for builder-to-investor introductions"""

    __tablename__ = 'intros'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    requester_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    recipient_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    message = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted', 'declined'

    requester_contact = db.Column(db.String(255))  # Email or Twitter handle
    accepted_at = db.Column(db.DateTime)
    declined_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Status validation
    __table_args__ = (
        db.CheckConstraint("status IN ('pending', 'accepted', 'declined')"),
    )

    # Relationships
    # requester, recipient, and project are all created via backrefs from User and Project models
    # See: User model lines 53-56 for requester/recipient backrefs
    # See: Project model line 88 for project backref

    def to_dict(self, include_users=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'requester_id': self.requester_id,
            'recipient_id': self.recipient_id,
            'message': self.message,
            'status': self.status,
            'requester_contact': self.requester_contact,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'declined_at': self.declined_at.isoformat() if self.declined_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        if include_users:
            data['requester'] = self.requester.to_dict()
            data['recipient'] = self.recipient.to_dict()
            data['project'] = self.project.to_dict()
        return data

    def __repr__(self):
        return f'<Intro {self.status} for {self.project_id[:8]}>'
