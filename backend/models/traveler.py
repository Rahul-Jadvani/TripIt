"""
Traveler Model - Extended User for TripIt (replaces User from Zer0)
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Traveler(db.Model):
    """Traveler model - extends and replaces User for travel-focused platform"""

    __tablename__ = 'travelers'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email_verified = db.Column(db.Boolean, default=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    phone_verified = db.Column(db.Boolean, default=False)

    # Profile
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(100))
    full_name = db.Column(db.String(200), nullable=True)
    avatar_url = db.Column(db.Text)
    bio = db.Column(db.Text)

    # Travel Profile
    travel_style = db.Column(db.String(100))  # solo, group, family, adventure, etc.
    travel_interests = db.Column(db.JSON, default=[])  # Array: trekking, photography, food, cultural, etc.

    # Date of Birth & Demographics
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(20), nullable=True)  # male, female, other, prefer_not_to_say

    # SBT Integration
    sbt_id = db.Column(db.String(256), unique=True, nullable=True, index=True)
    sbt_contract_address = db.Column(db.String(42), nullable=True)
    sbt_status = db.Column(db.String(50), default='not_issued')  # not_issued, issued, verified, suspended, revoked
    sbt_verified_date = db.Column(db.DateTime, nullable=True)
    sbt_blockchain_hash = db.Column(db.String(66), nullable=True)  # Transaction hash

    # Travel History
    destinations_visited = db.Column(db.JSON, default=[])  # Array of destination strings
    total_trips_count = db.Column(db.Integer, default=0)
    total_km_traveled = db.Column(db.Float, default=0.0)
    solo_travel_count = db.Column(db.Integer, default=0)
    group_travel_count = db.Column(db.Integer, default=0)

    # Safety Profile
    safety_score = db.Column(db.Float, default=0.0)  # 0-100
    emergency_contact_1_name = db.Column(db.String(100), nullable=True)
    emergency_contact_1_phone = db.Column(db.String(20), nullable=True)
    emergency_contact_2_name = db.Column(db.String(100), nullable=True)
    emergency_contact_2_phone = db.Column(db.String(20), nullable=True)
    medical_conditions = db.Column(db.Text, nullable=True)  # Encrypted in production
    insurance_provider = db.Column(db.String(100), nullable=True)
    insurance_id = db.Column(db.String(100), nullable=True)

    # Reputation
    traveler_reputation_score = db.Column(db.Float, default=0.0)
    contributions_verified = db.Column(db.Integer, default=0)
    safety_reports_filed = db.Column(db.Integer, default=0)
    emergency_assistance_provided = db.Column(db.Integer, default=0)
    women_guide_certified = db.Column(db.Boolean, default=False)

    # Preferences
    women_only_group_preference = db.Column(db.Boolean, default=False)
    location_sharing_enabled = db.Column(db.Boolean, default=False)

    # TRIP Token
    trip_token_balance = db.Column(db.Float, default=0.0)
    trip_earnings_total = db.Column(db.Float, default=0.0)
    trip_spent_total = db.Column(db.Float, default=0.0)

    # Status & Roles
    is_admin = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    is_suspended = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_verified_date = db.Column(db.DateTime, nullable=True)

    # Relationships
    itineraries = db.relationship('Itinerary', backref='creator', lazy='dynamic', foreign_keys='Itinerary.created_by_traveler_id')
    safety_ratings = db.relationship('SafetyRating', backref='traveler', lazy='dynamic', cascade='all, delete-orphan')
    travel_intel = db.relationship('TravelIntel', backref='traveler', lazy='dynamic', cascade='all, delete-orphan')
    travel_groups = db.relationship('TravelGroup', backref='creator', lazy='dynamic', foreign_keys='TravelGroup.created_by_traveler_id')
    certifications = db.relationship('TravelerCertification', backref='traveler', lazy='dynamic', cascade='all, delete-orphan')
    sbt_verification = db.relationship('SBTVerification', backref='traveler', uselist=False, cascade='all, delete-orphan')

    def to_dict(self, include_sensitive=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'travel_style': self.travel_style,
            'travel_interests': self.travel_interests,
            'total_trips_count': self.total_trips_count,
            'total_km_traveled': self.total_km_traveled,
            'safety_score': self.safety_score,
            'traveler_reputation_score': self.traveler_reputation_score,
            'women_guide_certified': self.women_guide_certified,
            'sbt_id': self.sbt_id,
            'sbt_status': self.sbt_status,
            'trip_token_balance': self.trip_token_balance,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

        if include_sensitive:
            data.update({
                'email': self.email,
                'email_verified': self.email_verified,
                'phone': self.phone,
                'phone_verified': self.phone_verified,
                'full_name': self.full_name,
                'gender': self.gender,
                'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
                'emergency_contact_1_name': self.emergency_contact_1_name,
                'insurance_provider': self.insurance_provider,
            })

        return data
