"""
Snap Model - Instagram Stories-like feature for TripIt
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from extensions import db

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


class Snap(db.Model):
    """Snap model - represents a photo snap with geolocation"""

    __tablename__ = 'snaps'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False)

    # Content
    caption = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=False)  # IPFS gateway URL to the image
    image_filename = db.Column(db.String(255), nullable=False)  # Original filename
    ipfs_hash = db.Column(db.String(100), nullable=True)  # IPFS content hash (CID)

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

    # Timestamps - explicitly use UTC
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    expires_at = db.Column(db.DateTime, nullable=True)  # Optional: For stories that expire after 24hrs

    # Relationships
    creator = db.relationship('Traveler', backref='snaps', lazy=True)

    def to_dict(self, include_creator=False):
        """Convert to dictionary with proper UTC timestamps"""
        # Convert naive UTC datetime to ISO string with 'Z' suffix (indicating UTC)
        def to_utc_iso(dt):
            if not dt:
                return None
            # If datetime is naive (no timezone), treat it as UTC and add 'Z' suffix
            if dt.tzinfo is None:
                return dt.isoformat() + 'Z'
            # If it has timezone info, convert to UTC and add 'Z'
            return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

        data = {
            'id': self.id,
            'user_id': self.user_id,
            'caption': self.caption,
            'image_url': self.image_url,
            'image_filename': self.image_filename,
            'ipfs_hash': self.ipfs_hash,
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
            'created_at': to_utc_iso(self.created_at),
            'updated_at': to_utc_iso(self.updated_at),
            'expires_at': to_utc_iso(self.expires_at),
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
