"""
Travel Group Model - for group travel formation
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


# Association table for itineraries in travel groups
travel_group_itineraries = db.Table(
    'travel_group_itineraries',
    db.Column('group_id', db.String(36), db.ForeignKey('travel_groups.id', ondelete='CASCADE'), primary_key=True),
    db.Column('itinerary_id', db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), primary_key=True)
)


class TravelGroup(db.Model):
    """Travel Group model - represents a group of travelers"""

    __tablename__ = 'travel_groups'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid4()))
    created_by_traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False)

    # Group Info
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    group_type = db.Column(db.String(50))  # interest_based, safety_focused, women_only, location_based

    # Trip Details
    destination = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    # Group Settings
    max_members = db.Column(db.Integer, default=10)
    current_members_count = db.Column(db.Integer, default=1)
    activity_tags = db.Column(db.JSON, default=[])  # Array: trekking, photography, food, etc.

    # Safety Settings
    is_women_only = db.Column(db.Boolean, default=False)
    min_sbt_reputation_score = db.Column(db.Float, default=0.0)
    require_identity_verification = db.Column(db.Boolean, default=False)
    safety_guidelines_accepted = db.Column(db.Boolean, default=False)

    # Features
    group_chat_room_id = db.Column(db.String(100), nullable=True)
    live_location_sharing_enabled = db.Column(db.Boolean, default=False)
    emergency_alert_enabled = db.Column(db.Boolean, default=True)

    # Status
    is_active = db.Column(db.Boolean, default=True, index=True)
    is_featured = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('Traveler', backref='created_travel_groups', foreign_keys=[created_by_traveler_id])
    itineraries = db.relationship('Itinerary', secondary=travel_group_itineraries, backref='travel_groups')

    def to_dict(self, include_members=False, include_itineraries=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'uuid': self.uuid,
            'name': self.name,
            'description': self.description,
            'group_type': self.group_type,
            'destination': self.destination,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'max_members': self.max_members,
            'current_members_count': self.current_members_count,
            'activity_tags': self.activity_tags,
            'is_women_only': self.is_women_only,
            'group_chat_room_id': self.group_chat_room_id,
            'live_location_sharing_enabled': self.live_location_sharing_enabled,
            'emergency_alert_enabled': self.emergency_alert_enabled,
            'is_active': self.is_active,
            'is_featured': self.is_featured,
            'created_by_traveler_id': self.created_by_traveler_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

        if include_members and self.members:
            data['members'] = [m.to_dict(include_traveler=True) for m in self.members]

        if include_itineraries and self.itineraries:
            data['itineraries'] = [i.to_dict() for i in self.itineraries]

        return data
