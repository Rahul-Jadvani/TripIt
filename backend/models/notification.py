"""
Notification Model - System notifications for users
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Notification(db.Model):
    """Notification model for system events and updates"""

    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Notification Types
    # Types: 'chain_new_project', 'chain_request_approved', 'chain_request_rejected',
    #        'project_added_to_chain', 'project_removed_from_chain',
    #        'chain_follower', 'chain_featured', 'chain_project_request',
    #        'vote', 'comment', 'badge', 'intro_request', etc.
    notification_type = db.Column(db.String(50), nullable=False, index=True)

    # Notification Content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)

    # Related Entities (nullable, depends on type)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True)
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=True)
    actor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)  # Who triggered

    # Redirect URL
    redirect_url = db.Column(db.String(500), nullable=True)

    # Status
    is_read = db.Column(db.Boolean, default=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    actor = db.relationship('User', foreign_keys=[actor_id])
    project = db.relationship('Project', foreign_keys=[project_id])
    chain = db.relationship('Chain', foreign_keys=[chain_id])

    # Indexes
    __table_args__ = (
        db.Index('idx_notifications_user_read', 'user_id', 'is_read'),
        db.Index('idx_notifications_created', 'created_at'),
        db.Index('idx_notifications_type', 'notification_type'),
    )

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
            db.session.commit()

    def to_dict(self, include_relations=False):
        """Convert to dictionary

        Args:
            include_relations: Include related entities (user, actor, project, chain)
        """
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'notification_type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'project_id': self.project_id,
            'chain_id': self.chain_id,
            'actor_id': self.actor_id,
            'redirect_url': self.redirect_url,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat(),
        }

        if include_relations:
            if self.actor:
                data['actor'] = self.actor.to_dict()
            if self.project:
                data['project'] = {
                    'id': self.project.id,
                    'title': self.project.title,
                    'tagline': self.project.tagline,
                }
            if self.chain:
                data['chain'] = {
                    'id': self.chain.id,
                    'name': self.chain.name,
                    'slug': self.chain.slug,
                    'logo_url': self.chain.logo_url,
                }

        return data

    def __repr__(self):
        return f'<Notification {self.notification_type}:{self.user_id}>'
