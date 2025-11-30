"""
Safety Alert Model - for warnings and incidents on routes
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class SafetyAlert(db.Model):
    """Safety Alert model - represents a safety concern or alert on a route"""

    __tablename__ = 'safety_alerts'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id', ondelete='CASCADE'), nullable=False, index=True)

    # Alert Info
    alert_type = db.Column(db.String(50), nullable=False)  # weather, terrain, wildlife, theft, accident, medical, etc.
    severity_level = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)

    # Location
    location_gps = db.Column(db.String(50), nullable=True)  # "lat,lon"
    location_name = db.Column(db.String(200), nullable=True)

    # When it occurred/reported
    incident_date = db.Column(db.DateTime, nullable=True)
    reported_date = db.Column(db.DateTime, default=datetime.utcnow)

    # Recommendation
    recommended_action = db.Column(db.Text)
    alternative_route = db.Column(db.String(500), nullable=True)

    # Status
    status = db.Column(db.String(50), default='active')  # active, resolved, archived
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Photo Evidence
    photo_ipfs_hashes = db.Column(db.JSON, default=[])

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'severity_level': self.severity_level,
            'title': self.title,
            'description': self.description,
            'location_gps': self.location_gps,
            'location_name': self.location_name,
            'incident_date': self.incident_date.isoformat() if self.incident_date else None,
            'recommended_action': self.recommended_action,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
