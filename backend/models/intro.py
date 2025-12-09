"""
Intro Request Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Intro(db.Model):
    """Universal intro request model - for travelers connecting with each other"""

    __tablename__ = 'intros'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    # Content reference - can be project_id OR itinerary_id (flexible string reference)
    project_id = db.Column(db.String(36), nullable=True)  # References projects.id OR itineraries.id
    # User references - can be users.id OR travelers.id (flexible string reference)
    requester_id = db.Column(db.String(36), nullable=False, index=True)  # String reference to either table
    recipient_id = db.Column(db.String(36), nullable=False, index=True)  # String reference to either table

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

    # Relationships removed - we now dynamically fetch from either User or Traveler tables
    # This allows flexibility for both old users and new travelers system

    def get_user(self, user_id):
        """Helper to get user from either User or Traveler table"""
        from models.user import User
        from models.traveler import Traveler

        # Try Traveler first (new system)
        user = Traveler.query.get(user_id)
        if user:
            return user

        # Fallback to User (old system)
        return User.query.get(user_id)

    def get_content(self):
        """Helper to get content (Project or Itinerary)"""
        if not self.project_id:
            return None

        from models.project import Project
        from models.itinerary import Itinerary

        # Try Itinerary first (new system)
        content = Itinerary.query.get(self.project_id)
        if content:
            return content

        # Fallback to Project (old system)
        return Project.query.get(self.project_id)

    def to_dict(self, include_users=False, include_content=True):
        """Convert to dictionary - flexibly handles both user types"""
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
            requester = self.get_user(self.requester_id)
            recipient = self.get_user(self.recipient_id)

            if requester:
                user_dict = requester.to_dict()
                # Ensure consistent format
                requester_data = {
                    'id': user_dict.get('id'),
                    'username': user_dict.get('username'),
                    'display_name': user_dict.get('display_name'),
                    'avatar_url': user_dict.get('avatar_url'),
                    'email_verified': user_dict.get('email_verified', False)
                }
                data['requester'] = requester_data
                data['investor'] = requester_data  # Alias for backward compatibility

            if recipient:
                user_dict = recipient.to_dict()
                recipient_data = {
                    'id': user_dict.get('id'),
                    'username': user_dict.get('username'),
                    'display_name': user_dict.get('display_name'),
                    'avatar_url': user_dict.get('avatar_url'),
                    'email_verified': user_dict.get('email_verified', False)
                }
                data['recipient'] = recipient_data
                data['builder'] = recipient_data  # Alias for backward compatibility

        if include_content and self.project_id:
            content = self.get_content()
            if content:
                content_data = {
                    'id': content.id,
                    'title': content.title,
                    'tagline': getattr(content, 'tagline', None),
                    'type': 'itinerary' if hasattr(content, 'destination') else 'project'
                }
                data['content'] = content_data
                data['project'] = content_data  # Alias for backward compatibility

        return data

    def __repr__(self):
        return f'<Intro {self.status} for {self.project_id[:8]}>'
