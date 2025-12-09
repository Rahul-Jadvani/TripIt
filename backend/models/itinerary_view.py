"""
Itinerary View Model - Track unique itinerary views (TripIt migration)
"""
from datetime import datetime
from extensions import db


class ItineraryView(db.Model):
    """
    Track unique views per itinerary
    - For logged-in travelers: tracked by traveler_id
    - For anonymous users: tracked by session_id
    """
    __tablename__ = 'itinerary_views'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='SET NULL'), nullable=True, index=True)
    session_id = db.Column(db.String(128), nullable=True, index=True)  # For anonymous users
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 compatible
    user_agent = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Composite unique constraint - one view per traveler/session per itinerary
    __table_args__ = (
        db.Index('idx_itinerary_traveler_view', 'itinerary_id', 'traveler_id'),
        db.Index('idx_itinerary_session_view', 'itinerary_id', 'session_id'),
        # Unique constraints to prevent duplicate views (race condition protection)
        db.UniqueConstraint('itinerary_id', 'traveler_id', name='uq_itinerary_traveler_view'),
        db.UniqueConstraint('itinerary_id', 'session_id', name='uq_itinerary_session_view'),
    )

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'itinerary_id': self.itinerary_id,
            'traveler_id': self.traveler_id,
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat(),
        }
