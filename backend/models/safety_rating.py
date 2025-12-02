"""
Safety Rating Model - replaces Vote for TripIt
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class SafetyRating(db.Model):
    """Safety Rating model - for rating safety of itineraries"""

    __tablename__ = 'safety_ratings'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_sbt_id = db.Column(db.String(256), nullable=True, index=True)

    # Rating
    overall_safety_score = db.Column(db.Integer, nullable=False)  # 1-5 stars
    experience_date = db.Column(db.Date, nullable=False)
    rating_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Details
    rating_type = db.Column(db.String(50), nullable=False)  # overall, accommodation, route, community, women_safety
    detailed_feedback = db.Column(db.Text)

    # Sub-scores (if rating_type is overall)
    accommodation_safety = db.Column(db.Integer, nullable=True)  # 1-5
    route_safety = db.Column(db.Integer, nullable=True)  # 1-5
    community_safety = db.Column(db.Integer, nullable=True)  # 1-5
    women_safety_score = db.Column(db.Integer, nullable=True)  # 1-5

    # Verification
    verified_traveler = db.Column(db.Boolean, default=False)  # Checked against SBT
    photo_ipfs_hashes = db.Column(db.JSON, default=[])  # Array of IPFS hashes for evidence

    # Engagement
    helpful_votes = db.Column(db.Integer, default=0)
    unhelpful_votes = db.Column(db.Integer, default=0)
    safety_alert_filed = db.Column(db.Boolean, default=False)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'itinerary_id': self.itinerary_id,
            'overall_safety_score': self.overall_safety_score,
            'experience_date': self.experience_date.isoformat() if self.experience_date else None,
            'rating_type': self.rating_type,
            'detailed_feedback': self.detailed_feedback,
            'accommodation_safety': self.accommodation_safety,
            'route_safety': self.route_safety,
            'community_safety': self.community_safety,
            'women_safety_score': self.women_safety_score,
            'verified_traveler': self.verified_traveler,
            'helpful_votes': self.helpful_votes,
            'unhelpful_votes': self.unhelpful_votes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
