"""
Itinerary Model - replaces Project for TripIt
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Itinerary(db.Model):
    """Itinerary model - represents a travel plan/experience"""

    __tablename__ = 'itineraries'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid4()))
    created_by_traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False)

    # Content
    title = db.Column(db.String(200), nullable=False, index=True)
    tagline = db.Column(db.String(300))
    description = db.Column(db.Text, nullable=False)

    # Location
    destination = db.Column(db.String(200), nullable=False, index=True)  # Primary location (e.g., "Himalayas")
    regions = db.Column(db.JSON, default=[])  # Array of regions covered
    country = db.Column(db.String(100), nullable=True)
    state_province = db.Column(db.String(100), nullable=True)

    # Travel Details
    start_date = db.Column(db.Date, nullable=True, index=True)
    end_date = db.Column(db.Date, nullable=True)
    duration_days = db.Column(db.Integer, nullable=True)  # Calculated from dates
    difficulty_level = db.Column(db.String(20))  # Easy, Medium, Hard, Expert
    travel_type = db.Column(db.String(50))  # Solo, Group, Family, etc.

    # Budget
    estimated_budget_min = db.Column(db.Integer, nullable=True)  # In INR or USD
    estimated_budget_max = db.Column(db.Integer, nullable=True)
    actual_budget_spent = db.Column(db.Integer, nullable=True)
    budget_amount = db.Column(db.Float, nullable=True)  # For schema compatibility
    budget_currency = db.Column(db.String(3), nullable=True, default='USD')

    # Route & GPS
    route_gpx = db.Column(db.Text, nullable=True)  # GPX format for route
    route_map_url = db.Column(db.String(500), nullable=True)  # URL to map
    route_waypoints = db.Column(db.JSON, default=[])  # Array of GPS points: [{lat, lon, name, elevation}, ...]
    starting_point_gps = db.Column(db.String(50), nullable=True)  # "lat,lon"
    ending_point_gps = db.Column(db.String(50), nullable=True)
    best_season = db.Column(db.String(100), nullable=True)  # Best time to visit

    # Community Content
    day_plans_count = db.Column(db.Integer, default=0)
    embedded_businesses_count = db.Column(db.Integer, default=0)
    hidden_gems_count = db.Column(db.Integer, default=0)
    safety_alerts_count = db.Column(db.Integer, default=0)
    community_tags = db.Column(db.JSON, default=[])  # Array of user-defined tags
    activity_tags = db.Column(db.JSON, default=[])  # Activity/safety tags
    travel_style = db.Column(db.String(100), nullable=True)  # Solo, Group, etc.
    travel_companions = db.Column(db.JSON, default=[])  # Array of travel companions

    # Safety & Verification
    photo_evidence_ipfs_hashes = db.Column(db.JSON, default=[])  # Array of IPFS hashes
    gps_waypoints_verified = db.Column(db.Boolean, default=False)
    safety_score = db.Column(db.Float, default=0.0)  # 0-100
    women_safe_certified = db.Column(db.Boolean, default=False)

    # Engagement Metrics
    safety_ratings_count = db.Column(db.Integer, default=0)
    safety_ratings_avg = db.Column(db.Float, default=0.0)
    helpful_votes = db.Column(db.Integer, default=0)
    share_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0)

    # Proof Scoring (adapted from Project)
    proof_score = db.Column(db.Float, default=0.0, index=True)
    identity_score = db.Column(db.Float, default=0.0)  # From SBT verification
    travel_history_score = db.Column(db.Float, default=0.0)  # From creator's history
    community_score = db.Column(db.Float, default=0.0)  # From ratings & comments
    safety_score_component = db.Column(db.Float, default=0.0)  # Safety metrics
    quality_score = db.Column(db.Float, default=0.0)  # Photos, description quality

    # Status
    is_published = db.Column(db.Boolean, default=False, index=True)
    is_featured = db.Column(db.Boolean, default=False, index=True)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    featured_at = db.Column(db.DateTime)
    featured_by = db.Column(db.String(36), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_verified_date = db.Column(db.DateTime, nullable=True)

    # Relationships
    # creator relationship is defined in Traveler model with backref='creator'
    day_plans = db.relationship('DayPlan', backref='itinerary', lazy='dynamic', cascade='all, delete-orphan')
    embedded_businesses = db.relationship('EmbeddedBusiness', backref='itinerary', lazy='dynamic', cascade='all, delete-orphan')
    hidden_gems = db.relationship('HiddenGem', backref='itinerary', lazy='dynamic', cascade='all, delete-orphan')
    safety_alerts = db.relationship('SafetyAlert', backref='itinerary', lazy='dynamic', cascade='all, delete-orphan')
    safety_ratings = db.relationship('SafetyRating', backref='itinerary', lazy='dynamic', cascade='all, delete-orphan')
    travel_intel = db.relationship('TravelIntel', backref='itinerary', lazy='dynamic', cascade='all, delete-orphan')
    # travel_groups relationship defined in TravelGroup model with backref

    def calculate_proof_score(self):
        """Recalculate proof score from components"""
        self.proof_score = (
            self.identity_score +
            self.travel_history_score +
            self.community_score +
            self.safety_score_component +
            self.quality_score
        )

    def to_dict(self, include_creator=False, user_id=None):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'uuid': self.uuid,
            'title': self.title,
            'tagline': self.tagline,
            'description': self.description,
            'destination': self.destination,
            'regions': self.regions,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'duration_days': self.duration_days,
            'difficulty_level': self.difficulty_level,
            'travel_type': self.travel_type,
            'travel_style': self.travel_style,
            'estimated_budget_min': self.estimated_budget_min,
            'estimated_budget_max': self.estimated_budget_max,
            'budget_amount': self.budget_amount,
            'budget_currency': self.budget_currency,
            'route_gpx': self.route_gpx,
            'route_map_url': self.route_map_url,
            'best_season': self.best_season,
            'activity_tags': self.activity_tags or [],
            'travel_companions': self.travel_companions or [],
            'community_tags': self.community_tags or [],
            'safety_score': self.safety_score,
            'women_safe_certified': self.women_safe_certified,
            'safety_ratings_count': self.safety_ratings_count,
            'safety_ratings_avg': self.safety_ratings_avg,
            'proof_score': self.proof_score,
            'is_published': self.is_published,
            'is_featured': self.is_featured,
            'view_count': self.view_count,
            'helpful_votes': self.helpful_votes,
            'comment_count': self.comment_count,
            'created_by_traveler_id': self.created_by_traveler_id,
            'user_id': self.created_by_traveler_id,  # Alias for compatibility
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        # Include creator info if requested
        if include_creator and self.creator:
            data['creator'] = self.creator.to_dict()

        return data
