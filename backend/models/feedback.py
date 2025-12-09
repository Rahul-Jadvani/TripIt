"""
Feedback model - handles suggestions, improvements, contact requests, and reports
"""
from datetime import datetime
from extensions import db
from uuid import uuid4


class Feedback(db.Model):
    __tablename__ = 'feedback'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))

    # Type of feedback
    feedback_type = db.Column(db.String(50), nullable=False)  # 'suggestion', 'improvement', 'contact', 'report'

    # Content
    message = db.Column(db.Text, nullable=False)
    contact_email = db.Column(db.String(255))  # Optional contact email

    # For reports - what's being reported
    reported_project_id = db.Column(db.String(255), db.ForeignKey('projects.id'), nullable=True)
    reported_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    report_reason = db.Column(db.String(100))  # 'spam', 'inappropriate', 'harassment', 'other'

    # Who submitted (nullable for anonymous feedback)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    # Status tracking
    status = db.Column(db.String(20), default='pending')  # 'pending', 'reviewed', 'resolved', 'dismissed'
    admin_notes = db.Column(db.Text)
    reviewed_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    submitter = db.relationship('User', foreign_keys=[user_id], backref='submitted_feedback')
    reported_project = db.relationship('Project', foreign_keys=[reported_project_id])
    reported_user = db.relationship('User', foreign_keys=[reported_user_id])
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def to_dict(self, include_admin=False):
        data = {
            'id': str(self.id),
            'feedback_type': self.feedback_type,
            'message': self.message,
            'contact_email': self.contact_email,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_id': str(self.user_id) if self.user_id else None,
        }

        # Always include submitter info for admins
        if include_admin and self.user_id and self.submitter:
            data['submitter'] = {
                'id': str(self.submitter.id),
                'username': self.submitter.username,
                'email': self.submitter.email,
            }

        if self.feedback_type == 'report':
            data['report_reason'] = self.report_reason
            data['reported_project_id'] = self.reported_project_id
            data['reported_user_id'] = self.reported_user_id
            if self.reported_project_id and self.reported_project:
                data['reported_project'] = {
                    'id': str(self.reported_project.id),
                    'title': self.reported_project.title,
                }
            if self.reported_user_id and self.reported_user:
                data['reported_user'] = {
                    'id': str(self.reported_user.id),
                    'username': self.reported_user.username,
                }

        if include_admin:
            data['admin_notes'] = self.admin_notes
            data['reviewed_at'] = self.reviewed_at.isoformat() if self.reviewed_at else None
            if self.reviewer:
                data['reviewed_by'] = {
                    'id': str(self.reviewer.id),
                    'username': self.reviewer.username,
                }

        return data
