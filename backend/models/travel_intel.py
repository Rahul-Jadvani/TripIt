"""
Travel Intel Model - replaces Comment for TripIt
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class TravelIntel(db.Model):
    """Travel Intel model - for Q&A, updates, warnings, and local insights"""

    __tablename__ = 'travel_intel'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_sbt_id = db.Column(db.String(256), nullable=True, index=True)

    # Content
    intel_type = db.Column(db.String(50), nullable=False, index=True)  # question, update, warning, recommendation, local_insight
    title = db.Column(db.String(200), nullable=True)
    content = db.Column(db.Text, nullable=False)

    # Location
    location_gps = db.Column(db.String(50), nullable=True)  # "lat,lon"
    location_name = db.Column(db.String(200), nullable=True)

    # Evidence
    photo_ipfs_hashes = db.Column(db.JSON, default=[])  # Array of IPFS hashes
    observation_timestamp = db.Column(db.DateTime, nullable=True)
    verified_at_location = db.Column(db.Boolean, default=False)

    # Threading (for Q&A structure)
    parent_intel_id = db.Column(db.String(36), db.ForeignKey('travel_intel.id'), nullable=True)
    thread_depth = db.Column(db.Integer, default=0)

    # Engagement
    helpful_votes = db.Column(db.Integer, default=0)
    unhelpful_votes = db.Column(db.Integer, default=0)
    urgent_flag = db.Column(db.Boolean, default=False)

    # Safety Context
    safety_related = db.Column(db.Boolean, default=False, index=True)
    severity_level = db.Column(db.String(20))  # low, medium, high, critical
    status = db.Column(db.String(50), default='open', index=True)  # open, resolved, verified, closed

    # Response Tracking
    responder_sbt_id = db.Column(db.String(256), nullable=True)  # Who verified/responded
    response_status = db.Column(db.String(50), default='open')  # open, awaiting_response, resolved, verified

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    replies = db.relationship('TravelIntel', backref=db.backref('parent', remote_side=[id]), lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'itinerary_id': self.itinerary_id,
            'intel_type': self.intel_type,
            'title': self.title,
            'content': self.content,
            'location_gps': self.location_gps,
            'location_name': self.location_name,
            'observation_timestamp': self.observation_timestamp.isoformat() if self.observation_timestamp else None,
            'verified_at_location': self.verified_at_location,
            'helpful_votes': self.helpful_votes,
            'unhelpful_votes': self.unhelpful_votes,
            'helpful_count': self.helpful_votes,
            'unhelpful_count': self.unhelpful_votes,
            'safety_related': self.safety_related,
            'severity_level': self.severity_level,
            'status': self.status,
            'response_status': self.response_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
