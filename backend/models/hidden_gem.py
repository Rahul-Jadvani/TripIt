"""
Hidden Gem Model - for local discoveries in itineraries
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class HiddenGem(db.Model):
    """Hidden Gem model - represents a lesser-known discovery/location"""

    __tablename__ = 'hidden_gems'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)

    # Gem Info
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    gem_type = db.Column(db.String(100))  # viewpoint, restaurant, hiking_spot, cultural_site, etc.

    # Location
    location_gps = db.Column(db.String(50), nullable=True)  # "lat,lon"
    address = db.Column(db.String(300), nullable=True)

    # Access
    how_to_reach = db.Column(db.Text)
    difficulty_level = db.Column(db.String(20))  # Easy, Medium, Hard

    # Best Time
    best_time_to_visit = db.Column(db.String(200))
    entry_fee = db.Column(db.Integer, nullable=True)
    estimated_visit_duration_minutes = db.Column(db.Integer, nullable=True)

    # Media
    photo_ipfs_hashes = db.Column(db.JSON, default=[])

    # Rating
    rating = db.Column(db.Float, nullable=True)  # 1-5

    # Recommended Day
    recommended_day = db.Column(db.Integer, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'gem_type': self.gem_type,
            'location_gps': self.location_gps,
            'address': self.address,
            'how_to_reach': self.how_to_reach,
            'difficulty_level': self.difficulty_level,
            'best_time_to_visit': self.best_time_to_visit,
            'entry_fee': self.entry_fee,
            'estimated_visit_duration_minutes': self.estimated_visit_duration_minutes,
            'rating': self.rating,
            'recommended_day': self.recommended_day,
        }
