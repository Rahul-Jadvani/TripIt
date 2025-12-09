"""
Admin Scoring Configuration Model
Stores admin-configurable scoring weights and settings
"""
from datetime import datetime
from extensions import db


class AdminScoringConfig(db.Model):
    """Model for admin-configurable scoring settings"""

    __tablename__ = 'admin_scoring_config'

    id = db.Column(db.String(36), primary_key=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    config_value = db.Column(db.JSON, nullable=False)
    updated_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    updated_by_user = db.relationship('User', foreign_keys=[updated_by], backref='scoring_config_updates')

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'config_key': self.config_key,
            'config_value': self.config_value,
            'updated_by': self.updated_by,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @staticmethod
    def get_config(config_key, default=None):
        """Get configuration value by key"""
        config = AdminScoringConfig.query.filter_by(config_key=config_key).first()
        return config.config_value if config else default

    @staticmethod
    def set_config(config_key, config_value, updated_by=None):
        """Set configuration value"""
        config = AdminScoringConfig.query.filter_by(config_key=config_key).first()

        if config:
            config.config_value = config_value
            config.updated_by = updated_by
            config.updated_at = datetime.utcnow()
        else:
            from uuid import uuid4
            config = AdminScoringConfig(
                id=str(uuid4()),
                config_key=config_key,
                config_value=config_value,
                updated_by=updated_by
            )
            db.session.add(config)

        db.session.commit()
        return config

    def __repr__(self):
        return f'<AdminScoringConfig {self.config_key}>'
