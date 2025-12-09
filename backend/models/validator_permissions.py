"""
Validator Permissions Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class ValidatorPermissions(db.Model):
    """Model for validator permissions and settings"""

    __tablename__ = 'validator_permissions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    validator_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'),
                             nullable=False, unique=True, index=True)

    # Permission settings
    can_validate_all = db.Column(db.Boolean, default=False)
    allowed_badge_types = db.Column(db.JSON, default=list)  # ['stone', 'silver', 'gold', 'platinum', 'demerit']
    allowed_project_ids = db.Column(db.JSON, default=list)  # List of project IDs validator can validate
    allowed_categories = db.Column(db.JSON, default=list)  # Categories this validator can handle ['AI/ML', 'Web3/Blockchain', etc.]

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship (one-to-one: each validator has one permissions record)
    validator = db.relationship('User', backref=db.backref('validator_permissions', uselist=False), foreign_keys=[validator_id])

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'validator_id': self.validator_id,
            'can_validate_all': self.can_validate_all,
            'allowed_badge_types': self.allowed_badge_types or [],
            'allowed_project_ids': self.allowed_project_ids or [],
            'allowed_categories': self.allowed_categories or [],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<ValidatorPermissions validator_id={self.validator_id}>'
