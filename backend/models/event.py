"""
Event Model - Organizer-based event pages with product listings
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy.dialects.postgresql import ARRAY
from extensions import db


class Event(db.Model):
    """Event model for organizing projects (like subreddits)"""

    __tablename__ = 'events'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    organizer_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Basic Info
    name = db.Column(db.String(200), nullable=False, unique=True, index=True)
    slug = db.Column(db.String(200), nullable=False, unique=True, index=True)  # URL-friendly name
    tagline = db.Column(db.String(300))
    description = db.Column(db.Text, nullable=False)

    # Visual Assets
    banner_url = db.Column(db.Text)
    logo_url = db.Column(db.Text)

    # Event Details
    event_type = db.Column(db.String(50), default='hackathon')  # hackathon, conference, competition, showcase
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    location = db.Column(db.String(300))  # Physical location or "Virtual"
    website_url = db.Column(db.Text)

    # Categories & Tags
    categories = db.Column(ARRAY(db.String(50)), default=[])  # e.g., ['DeFi', 'NFT', 'Gaming']
    prize_pool = db.Column(db.String(100))  # e.g., "$50,000" or "10 ETH"

    # Engagement Metrics
    project_count = db.Column(db.Integer, default=0)
    subscriber_count = db.Column(db.Integer, default=0)  # Users following this event
    view_count = db.Column(db.Integer, default=0)

    # Status & Visibility
    is_active = db.Column(db.Boolean, default=True, index=True)
    is_featured = db.Column(db.Boolean, default=False, index=True)
    is_verified = db.Column(db.Boolean, default=False)  # Official/verified event
    is_public = db.Column(db.Boolean, default=True)  # Public or private event

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    projects = db.relationship('EventProject', backref='event', lazy='dynamic', cascade='all, delete-orphan')
    subscribers = db.relationship('EventSubscriber', backref='event', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_organizer=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'tagline': self.tagline,
            'description': self.description,
            'banner_url': self.banner_url,
            'logo_url': self.logo_url,
            'event_type': self.event_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'location': self.location,
            'website_url': self.website_url,
            'categories': self.categories or [],
            'prize_pool': self.prize_pool,
            'project_count': self.project_count,
            'subscriber_count': self.subscriber_count,
            'view_count': self.view_count,
            'is_active': self.is_active,
            'is_featured': self.is_featured,
            'is_verified': self.is_verified,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'organizer_id': self.organizer_id,
        }
        if include_organizer:
            data['organizer'] = self.organizer.to_dict()
        return data

    def __repr__(self):
        return f'<Event {self.name}>'


class EventProject(db.Model):
    """Junction table linking projects to events with ranking"""

    __tablename__ = 'event_projects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id = db.Column(db.String(36), db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)

    # Event-specific metadata
    rank = db.Column(db.Integer)  # Rank/placement in event (1st, 2nd, etc.)
    prize = db.Column(db.String(100))  # Prize won (e.g., "1st Place", "$10,000")
    track = db.Column(db.String(100))  # Event track (e.g., "DeFi Track", "Best Use of Solidity")
    is_winner = db.Column(db.Boolean, default=False)
    is_finalist = db.Column(db.Boolean, default=False)

    # Timestamps
    added_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Indexes for efficient queries
    __table_args__ = (
        db.Index('idx_event_project', 'event_id', 'project_id', unique=True),
    )

    def to_dict(self, include_project=False, include_event=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'event_id': self.event_id,
            'project_id': self.project_id,
            'rank': self.rank,
            'prize': self.prize,
            'track': self.track,
            'is_winner': self.is_winner,
            'is_finalist': self.is_finalist,
            'added_at': self.added_at.isoformat(),
        }
        if include_project:
            data['project'] = self.project.to_dict(include_creator=True)
        if include_event:
            data['event'] = self.event.to_dict()
        return data

    def __repr__(self):
        return f'<EventProject {self.event_id}:{self.project_id}>'


class EventSubscriber(db.Model):
    """Users subscribing to events for updates"""

    __tablename__ = 'event_subscribers'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id = db.Column(db.String(36), db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    subscribed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Indexes
    __table_args__ = (
        db.Index('idx_event_subscriber', 'event_id', 'user_id', unique=True),
    )

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'event_id': self.event_id,
            'user_id': self.user_id,
            'subscribed_at': self.subscribed_at.isoformat(),
        }

    def __repr__(self):
        return f'<EventSubscriber {self.user_id}:{self.event_id}>'
