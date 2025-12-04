"""
Snap Model - Instagram Stories-like feature for TripIt
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Snap(db.Model):
    """Snap model - represents a photo snap with geolocation"""

    __tablename__ = 'snaps'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False)

    # Content
    caption = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=False)  # URL to the uploaded image
    image_filename = db.Column(db.String(255), nullable=False)  # Original filename

    # Geolocation - Real-time location where pic was clicked
    latitude = db.Column(db.Float, nullable=True)  # GPS latitude
    longitude = db.Column(db.Float, nullable=True)  # GPS longitude
    location_name = db.Column(db.String(200), nullable=True)  # Human-readable location name
    city = db.Column(db.String(100), nullable=True)  # City
    country = db.Column(db.String(100), nullable=True)  # Country
    location_accuracy = db.Column(db.Float, nullable=True)  # GPS accuracy in meters

    # Engagement Metrics
    view_count = db.Column(db.Integer, default=0)
    like_count = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0)

    # Status
    is_published = db.Column(db.Boolean, default=True, index=True)
    is_deleted = db.Column(db.Boolean, default=False, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)  # Optional: For stories that expire after 24hrs

    # Relationships
    creator = db.relationship('Traveler', backref='snaps', lazy=True)

    def to_dict(self, include_creator=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'caption': self.caption,
            'image_url': self.image_url,
            'image_filename': self.image_filename,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'location_name': self.location_name,
            'city': self.city,
            'country': self.country,
            'location_accuracy': self.location_accuracy,
            'view_count': self.view_count,
            'like_count': self.like_count,
            'comment_count': self.comment_count,
            'is_published': self.is_published,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }

        # Include creator info if requested
        if include_creator and self.creator:
            data['creator'] = {
                'id': self.creator.id,
                'username': self.creator.username,
                'display_name': self.creator.display_name,
                'avatar_url': self.creator.avatar_url,
            }

        return data

    def __repr__(self):
        return f'<Snap {self.id} by {self.user_id}>'
