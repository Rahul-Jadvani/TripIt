"""
Embedded Business Model - for restaurants, hotels, and services in itineraries
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class EmbeddedBusiness(db.Model):
    """Embedded Business model - represents a business/service mentioned in itinerary"""

    __tablename__ = 'embedded_businesses'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)

    # Business Info
    name = db.Column(db.String(200), nullable=False)
    business_type = db.Column(db.String(100))  # restaurant, hotel, guide_service, adventure_operator, etc.
    description = db.Column(db.Text)

    # Location
    location_gps = db.Column(db.String(50), nullable=True)  # "lat,lon"
    address = db.Column(db.String(300))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    website = db.Column(db.String(500))

    # Details
    operating_hours = db.Column(db.String(200), nullable=True)
    price_range = db.Column(db.String(50))  # budget, moderate, expensive, luxury
    estimated_cost_per_person = db.Column(db.Integer, nullable=True)  # In INR or USD

    # Rating
    rating = db.Column(db.Float, nullable=True)  # 1-5
    review_count = db.Column(db.Integer, default=0)

    # Services Offered
    services = db.Column(db.JSON, default=[])  # Array: lodging, food, guides, transport, etc.
    is_women_safe = db.Column(db.Boolean, default=False)
    accessibility = db.Column(db.JSON, default=[])  # Array: wheelchair_accessible, etc.

    # Media
    photo_url = db.Column(db.Text, nullable=True)
    photo_ipfs_hash = db.Column(db.String(100), nullable=True)

    # Day it appears in itinerary
    recommended_day = db.Column(db.Integer, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'business_type': self.business_type,
            'description': self.description,
            'location_gps': self.location_gps,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            'website': self.website,
            'price_range': self.price_range,
            'estimated_cost_per_person': self.estimated_cost_per_person,
            'rating': self.rating,
            'review_count': self.review_count,
            'services': self.services,
            'is_women_safe': self.is_women_safe,
            'recommended_day': self.recommended_day,
        }
