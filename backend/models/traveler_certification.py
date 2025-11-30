"""
Traveler Certification Model - for badges and certifications
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class TravelerCertification(db.Model):
    """Traveler Certification model - represents certifications and badges"""

    __tablename__ = 'traveler_certifications'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True)

    # Certification
    certification_type = db.Column(db.String(50), nullable=False)  # sbt_verified, women_guide_certified, safety_guardian, verified_contributor, region_expert
    certification_name = db.Column(db.String(200), nullable=False)

    # Details
    issued_date = db.Column(db.DateTime, default=datetime.utcnow)
    expiry_date = db.Column(db.DateTime, nullable=True)
    issued_by_entity = db.Column(db.String(200))  # government, tripit, expert, etc.
    verification_level = db.Column(db.String(50))  # bronze, silver, gold, platinum

    # Proof
    verification_evidence_ipfs = db.Column(db.String(100), nullable=True)
    blockchain_hash = db.Column(db.String(66), nullable=True)
    description = db.Column(db.Text)

    # Status
    is_active = db.Column(db.Boolean, default=True)
    revoked_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'certification_type': self.certification_type,
            'certification_name': self.certification_name,
            'issued_date': self.issued_date.isoformat() if self.issued_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'issued_by_entity': self.issued_by_entity,
            'verification_level': self.verification_level,
            'is_active': self.is_active,
        }
