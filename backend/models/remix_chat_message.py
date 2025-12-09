"""
Remix Chat Message Model
Stores individual messages in chat sessions
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class RemixChatMessage(db.Model):
    """Individual message in a remix chat session"""

    __tablename__ = 'remix_chat_messages'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id = db.Column(db.String(36), db.ForeignKey('remix_chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)

    # Message Data
    role = db.Column(db.String(10), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    message_metadata = db.Column(db.JSON, nullable=True)  # For storing structured data (itinerary updates, etc.)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'metadata': self.message_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<RemixChatMessage {self.id} - {self.role}>'
