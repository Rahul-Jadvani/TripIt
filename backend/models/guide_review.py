"""
Guide Review Model - Reviews for women travel guides
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class GuideReview(db.Model):
    """Review for a women travel guide"""

    __tablename__ = 'guide_reviews'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    guide_id = db.Column(db.String(36), db.ForeignKey('women_guides.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True)
    booking_id = db.Column(db.String(36), db.ForeignKey('guide_bookings.id', ondelete='SET NULL'), nullable=True)

    # Review Content
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    review_title = db.Column(db.String(200), nullable=True)
    review_text = db.Column(db.Text)

    # Rating Breakdown
    safety_rating = db.Column(db.Integer)  # 1-5
    knowledge_rating = db.Column(db.Integer)  # 1-5
    communication_rating = db.Column(db.Integer)  # 1-5
    professionalism_rating = db.Column(db.Integer)  # 1-5
    value_for_money_rating = db.Column(db.Integer)  # 1-5

    # Review Details
    verified_traveler = db.Column(db.Boolean, default=False)  # Verified they booked
    tour_date = db.Column(db.Date, nullable=True)
    tour_type = db.Column(db.String(100), nullable=True)
    group_size_on_tour = db.Column(db.Integer, nullable=True)

    # Engagement
    helpful_count = db.Column(db.Integer, default=0)
    unhelpful_count = db.Column(db.Integer, default=0)

    # Moderation
    is_approved = db.Column(db.Boolean, default=True)
    is_flagged = db.Column(db.Boolean, default=False)
    flag_reason = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    traveler = db.relationship('Traveler', backref='guide_reviews', foreign_keys=[traveler_id])

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'guide_id': self.guide_id,
            'rating': self.rating,
            'review_title': self.review_title,
            'review_text': self.review_text,
            'safety_rating': self.safety_rating,
            'knowledge_rating': self.knowledge_rating,
            'communication_rating': self.communication_rating,
            'professionalism_rating': self.professionalism_rating,
            'value_for_money_rating': self.value_for_money_rating,
            'verified_traveler': self.verified_traveler,
            'tour_type': self.tour_type,
            'helpful_count': self.helpful_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'traveler': {
                'username': self.traveler.username,
                'avatar_url': self.traveler.avatar_url,
            } if self.traveler else None,
        }
