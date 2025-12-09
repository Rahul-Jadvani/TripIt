"""
Women Guide Model - Female travel guides network for women-safe travel
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class WomenGuide(db.Model):
    """Verified female travel guide profile"""

    __tablename__ = 'women_guides'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Certification
    is_verified = db.Column(db.Boolean, default=False, index=True)
    verification_date = db.Column(db.DateTime, nullable=True)
    verification_level = db.Column(db.String(50))  # bronze, silver, gold, platinum

    # Experience
    years_of_experience = db.Column(db.Integer, default=0)
    languages_spoken = db.Column(db.JSON, default=[])  # Array: ['English', 'Hindi', 'Spanish']
    specializations = db.Column(db.JSON, default=[])  # Array: ['women_safety', 'budget_travel', 'adventure', 'cultural']
    favorite_destinations = db.Column(db.JSON, default=[])  # Array of regions/countries

    # Verification Details
    background_check_completed = db.Column(db.Boolean, default=False)
    background_check_date = db.Column(db.DateTime, nullable=True)
    certifications_documentation_url = db.Column(db.Text, nullable=True)  # IPFS link
    emergency_response_training = db.Column(db.Boolean, default=False)
    first_aid_certified = db.Column(db.Boolean, default=False)

    # Ratings & Reputation
    average_rating = db.Column(db.Float, default=0.0)  # 1-5 stars
    total_reviews = db.Column(db.Integer, default=0)
    women_travelers_guided = db.Column(db.Integer, default=0)
    successful_trips_count = db.Column(db.Integer, default=0)

    # Service Details
    hourly_rate_usd = db.Column(db.Float, nullable=True)
    availability_status = db.Column(db.String(50), default='available')  # available, unavailable, on_leave
    service_locations = db.Column(db.JSON, default=[])  # Array of cities/regions where guide operates
    max_group_size = db.Column(db.Integer, default=10)
    offers_accommodation = db.Column(db.Boolean, default=False)
    offers_meals = db.Column(db.Boolean, default=False)

    # Contact & Policies
    contact_email = db.Column(db.String(255), nullable=True)
    phone_for_bookings = db.Column(db.String(20), nullable=True)
    cancellation_policy = db.Column(db.Text, nullable=True)
    safety_protocols = db.Column(db.Text, nullable=True)

    # Status & Metadata
    is_active = db.Column(db.Boolean, default=True, index=True)
    is_featured = db.Column(db.Boolean, default=False)
    suspension_reason = db.Column(db.Text, nullable=True)
    suspension_until = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    traveler = db.relationship('Traveler', backref='women_guide_profile', foreign_keys=[traveler_id])
    bookings = db.relationship('GuideBooking', backref='guide', cascade='all, delete-orphan')
    reviews = db.relationship('GuideReview', backref='guide', cascade='all, delete-orphan')

    def to_dict(self, include_reviews=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'traveler_id': self.traveler_id,
            'is_verified': self.is_verified,
            'verification_level': self.verification_level,
            'years_of_experience': self.years_of_experience,
            'languages_spoken': self.languages_spoken,
            'specializations': self.specializations,
            'favorite_destinations': self.favorite_destinations,
            'average_rating': self.average_rating,
            'total_reviews': self.total_reviews,
            'women_travelers_guided': self.women_travelers_guided,
            'successful_trips_count': self.successful_trips_count,
            'hourly_rate_usd': self.hourly_rate_usd,
            'availability_status': self.availability_status,
            'service_locations': self.service_locations,
            'is_active': self.is_active,
            'is_featured': self.is_featured,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

        if self.traveler:
            data['traveler'] = {
                'id': self.traveler.id,
                'username': self.traveler.username,
                'display_name': self.traveler.display_name,
                'avatar_url': self.traveler.avatar_url,
                'bio': self.traveler.bio,
            }

        if include_reviews and self.reviews:
            data['reviews'] = [r.to_dict() for r in self.reviews[:10]]

        return data
