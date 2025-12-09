"""
Validation Badge Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class ValidationBadge(db.Model):
    """Validation badge model (Silver, Gold, Platinum)"""

    __tablename__ = 'validation_badges'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    validator_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    badge_type = db.Column(db.String(20), nullable=False)  # 'stone', 'silver', 'gold', 'platinum', 'demerit', 'custom'
    rationale = db.Column(db.Text)
    points = db.Column(db.Integer, nullable=False)  # -10, 5, 10, 15, or 20

    # Custom badge fields (for admin-created badges)
    custom_badge_name = db.Column(db.String(100), nullable=True)
    custom_badge_image_url = db.Column(db.Text, nullable=True)

    is_featured = db.Column(db.Boolean, default=False)  # Featured badge flag

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Badge type validation
    __table_args__ = (
        db.CheckConstraint("badge_type IN ('stone', 'silver', 'gold', 'platinum', 'demerit', 'custom')"),
    )

    BADGE_POINTS = {
        'stone': 5,
        'silver': 10,
        'gold': 15,
        'platinum': 20,
        'demerit': -10,
    }

    def to_dict(self, include_validator=False, include_project=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'validator_id': self.validator_id,  # Always include validator_id for frontend
            'badge_type': self.badge_type,
            'points': self.points,
            'rationale': self.rationale,
            'is_featured': self.is_featured,
            'custom_badge_name': self.custom_badge_name,
            'custom_badge_image_url': self.custom_badge_image_url,
            'created_at': self.created_at.isoformat(),
            'awarded_at': self.created_at.isoformat(),  # Alias for frontend compatibility
        }
        if include_validator and self.validator:
            data['validator'] = self.validator.to_dict()
            data['awarded_by'] = self.validator.to_dict()  # Alias for frontend compatibility
        if include_project and self.project:
            data['project'] = {
                'id': self.project.id,
                'title': self.project.title,
                'tagline': self.project.tagline,
            }
        return data

    def __repr__(self):
        return f'<Badge {self.badge_type.upper()} for {self.project_id[:8]}>'
