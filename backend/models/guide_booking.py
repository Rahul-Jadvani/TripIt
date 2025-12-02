"""
Guide Booking Model - Bookings for women travel guides
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class GuideBooking(db.Model):
    """Represents a booking with a women travel guide"""

    __tablename__ = 'guide_bookings'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    guide_id = db.Column(db.String(36), db.ForeignKey('women_guides.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True)

    # Trip Details
    destination = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    group_size = db.Column(db.Integer, default=1)
    activity_type = db.Column(db.String(100))  # hiking, cultural tour, food tour, etc.
    special_requirements = db.Column(db.Text, nullable=True)

    # Booking Status
    status = db.Column(db.String(50), default='pending')  # pending, confirmed, cancelled, completed
    confirmation_date = db.Column(db.DateTime, nullable=True)
    cancellation_date = db.Column(db.DateTime, nullable=True)
    cancellation_reason = db.Column(db.Text, nullable=True)

    # Pricing
    total_cost_usd = db.Column(db.Float, nullable=True)
    payment_status = db.Column(db.String(50), default='pending')  # pending, paid, refunded
    paid_at = db.Column(db.DateTime, nullable=True)

    # Safety & Verification
    itinerary_attached = db.Column(db.String(36), db.ForeignKey('itineraries.id'), nullable=True)  # Associated itinerary
    emergency_contacts_shared = db.Column(db.Boolean, default=False)
    insurance_provided = db.Column(db.Boolean, default=False)
    medical_info_shared = db.Column(db.Boolean, default=False)

    # Communication
    notes_from_traveler = db.Column(db.Text, nullable=True)
    notes_from_guide = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    traveler = db.relationship('Traveler', backref='guide_bookings', foreign_keys=[traveler_id])
    itinerary = db.relationship('Itinerary', backref='guide_bookings', foreign_keys=[itinerary_attached])

    def to_dict(self, include_guide=False, include_traveler=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'guide_id': self.guide_id,
            'traveler_id': self.traveler_id,
            'destination': self.destination,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'group_size': self.group_size,
            'activity_type': self.activity_type,
            'status': self.status,
            'total_cost_usd': self.total_cost_usd,
            'payment_status': self.payment_status,
            'confirmation_date': self.confirmation_date.isoformat() if self.confirmation_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

        if include_guide:
            from models.women_guide import WomenGuide
            guide = WomenGuide.query.get(self.guide_id)
            if guide:
                data['guide'] = guide.to_dict()

        if include_traveler and self.traveler:
            data['traveler'] = {
                'id': self.traveler.id,
                'username': self.traveler.username,
                'display_name': self.traveler.display_name,
                'avatar_url': self.traveler.avatar_url,
            }

        return data
