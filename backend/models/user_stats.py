"""
User dashboard stats model (denormalized metrics)
"""
from datetime import datetime

from extensions import db


class UserDashboardStats(db.Model):
    """Denormalized metrics for each user (maintained via triggers)"""

    __tablename__ = 'user_dashboard_stats'

    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)

    # Project stats
    project_count = db.Column(db.Integer, default=0, nullable=False)
    active_projects = db.Column(db.Integer, default=0, nullable=False)
    total_proof_score = db.Column(db.Integer, default=0, nullable=False)

    # Engagement stats
    comment_count = db.Column(db.Integer, default=0, nullable=False)
    badges_given = db.Column(db.Integer, default=0, nullable=False)
    badges_received = db.Column(db.Integer, default=0, nullable=False)

    # Intro stats
    intros_sent = db.Column(db.Integer, default=0, nullable=False)
    intros_received = db.Column(db.Integer, default=0, nullable=False)
    intro_requests_pending = db.Column(db.Integer, default=0, nullable=False)

    # Karma/score
    karma_score = db.Column(db.Integer, default=0, nullable=False)

    # Inbox stats
    unread_messages = db.Column(db.Integer, default=0, nullable=False)
    unread_notifications = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_updated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', back_populates='dashboard_stats', uselist=False)

    def karma(self) -> int:
        """Convenience accessor for karma score"""
        return self.karma_score or 0

