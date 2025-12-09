"""
Intro Request Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class IntroRequest(db.Model):
    """Model for intro requests from investors to project builders"""

    __tablename__ = 'intro_requests'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    investor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    builder_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, declined
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = db.relationship('Project', backref='intro_requests')
    investor = db.relationship('User', foreign_keys=[investor_id], backref='intro_requests_sent')
    builder = db.relationship('User', foreign_keys=[builder_id], backref='intro_requests_received')

    __table_args__ = (
        db.CheckConstraint("status IN ('pending', 'accepted', 'declined')"),
    )

    def to_dict(self, include_project=False, include_users=True):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'investor_id': self.investor_id,
            'builder_id': self.builder_id,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_project and self.project:
            data['project'] = {
                'id': self.project.id,
                'title': self.project.title,
                'tagline': self.project.tagline,
            }

        if include_users:
            if self.investor:
                data['investor'] = {
                    'id': self.investor.id,
                    'username': self.investor.username,
                    'display_name': self.investor.display_name,
                    'avatar_url': self.investor.avatar_url,
                }
            if self.builder:
                data['builder'] = {
                    'id': self.builder.id,
                    'username': self.builder.username,
                    'display_name': self.builder.display_name,
                    'avatar_url': self.builder.avatar_url,
                }

        return data

    def __repr__(self):
        return f'<IntroRequest {self.id} - {self.status}>'
