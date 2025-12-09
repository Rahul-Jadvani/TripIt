"""
Direct Message Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class DirectMessage(db.Model):
    """Model for direct messages between users"""

    __tablename__ = 'direct_messages'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    sender_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    recipient_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='messages_sent')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='messages_received')

    def to_dict(self, include_users=True):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_users:
            if self.sender:
                data['sender'] = {
                    'id': self.sender.id,
                    'username': self.sender.username,
                    'display_name': self.sender.display_name,
                    'avatar_url': self.sender.avatar_url,
                }
            if self.recipient:
                data['recipient'] = {
                    'id': self.recipient.id,
                    'username': self.recipient.username,
                    'display_name': self.recipient.display_name,
                    'avatar_url': self.recipient.avatar_url,
                }

        return data

    def __repr__(self):
        return f'<DirectMessage {self.id}>'
