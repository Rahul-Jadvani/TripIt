"""
UserVerification Model - For QR Verification System
Links travelers to their QR verification tokens and stores vendor-accessible data.
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class UserVerification(db.Model):
    """UserVerification model - stores QR verification tokens and traveler data for vendor lookup"""

    __tablename__ = 'user_verifications'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    wallet_address = db.Column(db.String(42), nullable=False, index=True)

    # SBT Info
    sbt_token_id = db.Column(db.String(256), nullable=True, index=True)  # Filled after minting

    # QR Verification Token (64-char hex string from secrets.token_hex(32))
    verification_token = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # QR Image IPFS Storage
    qr_ipfs_url = db.Column(db.String(500), nullable=True)  # Full IPFS gateway URL
    qr_ipfs_hash = db.Column(db.String(100), nullable=True)  # IPFS CID/hash

    # Verification Status
    verification_status = db.Column(db.String(20), default='verified')  # verified, pending, revoked

    # Denormalized User Data (for quick vendor lookup - avoids joining to travelers table)
    full_name = db.Column(db.String(200), nullable=True)
    emergency_contact_1_name = db.Column(db.String(100), nullable=True)
    emergency_contact_1_phone = db.Column(db.String(20), nullable=True)
    emergency_contact_2_name = db.Column(db.String(100), nullable=True)
    emergency_contact_2_phone = db.Column(db.String(20), nullable=True)
    blood_group = db.Column(db.String(10), nullable=True)  # A+, B+, O+, AB+, A-, B-, O-, AB-

    # Scan Tracking
    scan_count = db.Column(db.Integer, default=0)
    last_scanned_at = db.Column(db.DateTime, nullable=True)
    last_scanned_by_vendor_id = db.Column(db.String(36), db.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    traveler = db.relationship('Traveler', backref=db.backref('user_verification_record', uselist=False, cascade='all, delete-orphan'))
    last_scanned_by = db.relationship('Vendor', backref='scanned_verifications', foreign_keys=[last_scanned_by_vendor_id])

    def to_dict(self):
        """Convert to dictionary (full data for internal use)"""
        return {
            'id': self.id,
            'traveler_id': self.traveler_id,
            'wallet_address': self.wallet_address,
            'sbt_token_id': self.sbt_token_id,
            'verification_token': self.verification_token,
            'qr_ipfs_url': self.qr_ipfs_url,
            'qr_ipfs_hash': self.qr_ipfs_hash,
            'verification_status': self.verification_status,
            'full_name': self.full_name,
            'emergency_contact_1_name': self.emergency_contact_1_name,
            'emergency_contact_1_phone': self.emergency_contact_1_phone,
            'emergency_contact_2_name': self.emergency_contact_2_name,
            'emergency_contact_2_phone': self.emergency_contact_2_phone,
            'blood_group': self.blood_group,
            'scan_count': self.scan_count,
            'last_scanned_at': self.last_scanned_at.isoformat() if self.last_scanned_at else None,
            'last_scanned_by_vendor_id': self.last_scanned_by_vendor_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_vendor_view(self):
        """Convert to dictionary for vendor verification response (minimal data)"""
        return {
            'full_name': self.full_name,
            'verification_status': self.verification_status,
            'sbt_token_id': self.sbt_token_id,
            'blood_group': self.blood_group,
            'emergency_contact_1_name': self.emergency_contact_1_name,
            'emergency_contact_1_phone': self.emergency_contact_1_phone,
            'emergency_contact_2_name': self.emergency_contact_2_name,
            'emergency_contact_2_phone': self.emergency_contact_2_phone,
            'scan_count': self.scan_count,
        }

    def __repr__(self):
        return f'<UserVerification {self.full_name} ({self.verification_status})>'
