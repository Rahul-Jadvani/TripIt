"""
Day Plan Model - for day-by-day itinerary breakdown
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class DayPlan(db.Model):
    """Day Plan model - represents a single day in an itinerary"""

    __tablename__ = 'day_plans'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)

    # Day Details
    day_number = db.Column(db.Integer, nullable=False)  # Day 1, Day 2, etc.
    date = db.Column(db.Date, nullable=True)
    title = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)

    # Distance & Elevation
    distance_km = db.Column(db.Float, nullable=True)
    elevation_gain_m = db.Column(db.Float, nullable=True)
    elevation_loss_m = db.Column(db.Float, nullable=True)

    # Time
    start_point = db.Column(db.String(200), nullable=True)
    end_point = db.Column(db.String(200), nullable=True)
    estimated_duration_hours = db.Column(db.Float, nullable=True)

    # Activities
    activities = db.Column(db.JSON, default=[])  # Array: hiking, camping, sightseeing, etc.

    # Photo Evidence
    photo_ipfs_hashes = db.Column(db.JSON, default=[])

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'day_number': self.day_number,
            'date': self.date.isoformat() if self.date else None,
            'title': self.title,
            'description': self.description,
            'distance_km': self.distance_km,
            'elevation_gain_m': self.elevation_gain_m,
            'start_point': self.start_point,
            'end_point': self.end_point,
            'estimated_duration_hours': self.estimated_duration_hours,
            'activities': self.activities,
        }
