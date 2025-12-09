"""
Admin OTP Model - One-time passwords for admin authentication
"""
from datetime import datetime, timedelta
from uuid import uuid4
import secrets
from extensions import db


class AdminOTP(db.Model):
    """OTP codes for admin email verification"""

    __tablename__ = 'admin_otps'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    email = db.Column(db.String(255), nullable=False, index=True)
    otp_code = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    used_at = db.Column(db.DateTime, nullable=True)

    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit OTP code"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    @staticmethod
    def create_for_email(email: str, validity_minutes: int = 10) -> 'AdminOTP':
        """Create a new OTP for an email address"""
        otp = AdminOTP(
            email=email.lower().strip(),
            otp_code=AdminOTP.generate_otp(),
            expires_at=datetime.utcnow() + timedelta(minutes=validity_minutes)
        )
        return otp

    def is_valid(self) -> bool:
        """Check if OTP is still valid"""
        return not self.is_used and datetime.utcnow() < self.expires_at

    def mark_used(self):
        """Mark OTP as used"""
        self.is_used = True
        self.used_at = datetime.utcnow()

    def __repr__(self):
        return f'<AdminOTP {self.email} expires={self.expires_at}>'
