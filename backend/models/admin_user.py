"""
Admin User Model - OTP-based admin authentication
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class AdminUser(db.Model):
    """Admin users with email-based OTP authentication"""

    __tablename__ = 'admin_users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    is_root = db.Column(db.Boolean, default=False)  # Root admin can manage other admins
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by = db.Column(db.String(36), db.ForeignKey('admin_users.id'), nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'is_root': self.is_root,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }

    def __repr__(self):
        return f'<AdminUser {self.email}>'
