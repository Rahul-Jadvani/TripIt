"""
Remix Chat Session Model
Stores persistent chat sessions for AI Remix feature
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class RemixChatSession(db.Model):
    """Chat session for AI remix conversations"""

    __tablename__ = 'remix_chat_sessions'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False)

    # Session Info
    title = db.Column(db.String(200), default='New Remix Chat')
    source_itinerary_ids = db.Column(db.JSON, nullable=False)  # Array of 1-3 itinerary IDs
    current_draft_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(20), default='active')  # active, finalized, archived

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    last_message_at = db.Column(db.DateTime, nullable=True)
    message_count = db.Column(db.Integer, default=0)

    # Relationships
    messages = db.relationship('RemixChatMessage', backref='session', lazy='dynamic', cascade='all, delete-orphan', order_by='RemixChatMessage.created_at')
    user = db.relationship('Traveler', backref='remix_chat_sessions')
    current_draft = db.relationship('Itinerary', foreign_keys=[current_draft_id])

    def to_dict(self, include_messages=False, include_draft=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'source_itinerary_ids': self.source_itinerary_ids or [],
            'current_draft_id': self.current_draft_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'message_count': self.message_count or 0
        }

        if include_messages:
            data['messages'] = [msg.to_dict() for msg in self.messages.all()]

        if include_draft and self.current_draft:
            data['current_draft'] = self.current_draft.to_dict()

        return data

    def __repr__(self):
        return f'<RemixChatSession {self.id} - {self.title}>'
