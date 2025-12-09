"""
Women Safety Resource Model - Safety tips, guides, and resources
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class WomenSafetyResource(db.Model):
    """Safety tips, guides, and emergency resources for women travelers"""

    __tablename__ = 'women_safety_resources'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))

    # Content
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False, index=True)  # tips, emergency, legal, health, packing, cultural, navigation

    # Targeting
    target_region = db.Column(db.String(100), nullable=True)  # Global, Asia, India, etc.
    target_countries = db.Column(db.JSON, default=[])  # Array of country codes
    applies_to_travel_types = db.Column(db.JSON, default=[])  # solo, group, budget, luxury, adventure

    # Resource Links
    external_links = db.Column(db.JSON, default=[])  # Array of {title, url, source}
    helpline_numbers = db.Column(db.JSON, default=[])  # Array of {country, service, number}
    organization_resources = db.Column(db.JSON, default=[])  # Links to safety organizations

    # Content Details
    urgency_level = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    is_featured = db.Column(db.Boolean, default=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)

    # Metadata
    created_by_admin = db.Column(db.String(36), nullable=True)  # Admin user ID
    view_count = db.Column(db.Integer, default=0)
    helpful_count = db.Column(db.Integer, default=0)
    unhelpful_count = db.Column(db.Integer, default=0)

    # Translations
    language = db.Column(db.String(10), default='en')  # en, hi, es, fr, etc.
    available_languages = db.Column(db.JSON, default=['en'])  # Array of language codes

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'content': self.content,
            'category': self.category,
            'target_region': self.target_region,
            'target_countries': self.target_countries,
            'urgency_level': self.urgency_level,
            'is_featured': self.is_featured,
            'is_pinned': self.is_pinned,
            'external_links': self.external_links,
            'helpline_numbers': self.helpline_numbers,
            'view_count': self.view_count,
            'helpful_count': self.helpful_count,
            'language': self.language,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
