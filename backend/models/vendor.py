"""
Vendor Model - For QR Verification System
Vendors can scan traveler QR codes to verify identity and access emergency contacts.
"""
from datetime import datetime
from uuid import uuid4
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class Vendor(db.Model):
    """Vendor model - businesses/authorities that verify traveler SBT QR codes"""

    __tablename__ = 'vendors'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    vendor_name = db.Column(db.String(200), nullable=False)
    organization = db.Column(db.String(200), nullable=True)
    contact_email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # Vendor Type
    vendor_type = db.Column(db.String(50), nullable=False)  # hotel, transport, police, hospital, other

    # Location
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), default='India')
    address = db.Column(db.Text, nullable=True)

    # Status
    is_active = db.Column(db.Boolean, default=True)

    # Scan Statistics
    total_scans = db.Column(db.Integer, default=0)
    last_scan_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert to dictionary (excludes password_hash for security)"""
        return {
            'id': self.id,
            'vendor_name': self.vendor_name,
            'organization': self.organization,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'vendor_type': self.vendor_type,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'address': self.address,
            'is_active': self.is_active,
            'total_scans': self.total_scans,
            'last_scan_at': self.last_scan_at.isoformat() if self.last_scan_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Vendor {self.vendor_name} ({self.vendor_type})>'
