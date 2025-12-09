"""
Validator Assignment Model - Maps validators to projects for review
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class ValidatorAssignment(db.Model):
    """Validator-Project Assignment Model"""

    __tablename__ = 'validator_assignments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    validator_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False)  # Now references itineraries

    # Assignment details
    assigned_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)  # Admin who assigned
    category_filter = db.Column(db.String(100))  # Category/domain filter used for assignment

    # Status tracking
    status = db.Column(db.String(50), default='pending')  # pending, in_review, validated, rejected
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent

    # Review tracking
    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_notes = db.Column(db.Text, nullable=True)
    validated_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)  # Who actually validated

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    validator = db.relationship('User', foreign_keys=[validator_id], backref='validator_assignments')
    itinerary = db.relationship('Itinerary', backref='validator_assignments', foreign_keys=[project_id])
    assigner = db.relationship('User', foreign_keys=[assigned_by])

    # Unique constraint - one validator per project
    __table_args__ = (
        db.UniqueConstraint('validator_id', 'project_id', name='unique_validator_project'),
    )

    def to_dict(self, include_itinerary=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'validator_id': self.validator_id,
            'project_id': self.project_id,  # Keep for backward compatibility
            'itinerary_id': self.project_id,  # Also expose as itinerary_id
            'assigned_by': self.assigned_by,
            'category_filter': self.category_filter,
            'status': self.status,
            'priority': self.priority,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'review_notes': self.review_notes,
            'validated_by': self.validated_by,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_itinerary and self.itinerary:
            data['itinerary'] = self.itinerary.to_dict(include_creator=True)

        return data

    def __repr__(self):
        return f'<ValidatorAssignment {self.validator_id} -> {self.project_id}>'
