"""
Chain Model - User-created collections for organizing projects (like subreddits)
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy.dialects.postgresql import ARRAY
from extensions import db


class Chain(db.Model):
    """Chain model for organizing projects into themed collections"""

    __tablename__ = 'chains'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    creator_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Core Properties (MANDATORY)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)  # URL-friendly name
    description = db.Column(db.Text, nullable=False)

    # Optional Properties
    banner_url = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.Text, nullable=True)
    categories = db.Column(ARRAY(db.String(50)), default=[])  # e.g., ['AI', 'DeFi', 'Hackathon']
    rules = db.Column(db.Text, nullable=True)  # Chain guidelines/rules
    social_links = db.Column(db.JSON, default=dict)  # {twitter: '', website: '', discord: ''}

    # Privacy & Moderation Settings
    is_public = db.Column(db.Boolean, default=True, nullable=False, index=True)
    requires_approval = db.Column(db.Boolean, default=False, nullable=False)

    # Stats & Counts
    project_count = db.Column(db.Integer, default=0, index=True)
    follower_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)

    # Platform Flags
    is_featured = db.Column(db.Boolean, default=False, index=True)  # Admin-set
    is_active = db.Column(db.Boolean, default=True, index=True)

    # Moderation Fields
    status = db.Column(db.String(20), default='active', index=True)  # active, banned, suspended
    banned_at = db.Column(db.DateTime, nullable=True)
    banned_by_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    ban_reason = db.Column(db.Text, nullable=True)
    suspended_until = db.Column(db.DateTime, nullable=True, index=True)  # For temporary suspensions

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', backref='created_chains', foreign_keys=[creator_id])
    banned_by = db.relationship('User', foreign_keys=[banned_by_id])
    chain_projects = db.relationship('ChainProject', backref='chain', lazy='dynamic',
                                      cascade='all, delete-orphan')
    followers = db.relationship('ChainFollower', backref='chain', lazy='dynamic',
                                 cascade='all, delete-orphan')
    pending_requests = db.relationship('ChainProjectRequest', backref='chain', lazy='dynamic',
                                        cascade='all, delete-orphan')

    def to_dict(self, include_creator=False, user_id=None):
        """Convert to dictionary

        Args:
            include_creator: Include creator information
            user_id: If provided, includes user's following status and ownership
        """
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'banner_url': self.banner_url,
            'logo_url': self.logo_url,
            'categories': self.categories or [],
            'rules': self.rules,
            'social_links': self.social_links or {},
            'is_public': self.is_public,
            'requires_approval': self.requires_approval,
            'project_count': self.project_count,
            'follower_count': self.follower_count,
            'view_count': self.view_count,
            'is_featured': self.is_featured,
            'is_active': self.is_active,
            'status': self.status,
            'banned_at': self.banned_at.isoformat() if self.banned_at else None,
            'banned_by_id': self.banned_by_id,
            'ban_reason': self.ban_reason,
            'suspended_until': self.suspended_until.isoformat() if self.suspended_until else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'creator_id': self.creator_id,
        }

        if include_creator:
            data['creator'] = self.creator.to_dict()

        # Include user-specific data if user_id is provided
        if user_id:
            from models.chain import ChainFollower
            is_following = ChainFollower.query.filter_by(
                chain_id=self.id,
                user_id=user_id
            ).first() is not None
            data['is_following'] = is_following
            data['is_owner'] = (self.creator_id == user_id)
        else:
            data['is_following'] = False
            data['is_owner'] = False

        return data

    def __repr__(self):
        return f'<Chain {self.name}>'


class ChainProject(db.Model):
    """Junction table linking projects to chains"""

    __tablename__ = 'chain_projects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    added_by_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Metadata
    order_index = db.Column(db.Integer, default=0)  # For custom ordering
    is_pinned = db.Column(db.Boolean, default=False, index=True)  # Chain owner can pin
    added_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    project = db.relationship('Project', backref='chain_memberships')
    added_by = db.relationship('User', foreign_keys=[added_by_id])

    # Indexes
    __table_args__ = (
        db.UniqueConstraint('chain_id', 'project_id', name='uq_chain_project'),
        db.Index('idx_chain_projects_chain', 'chain_id'),
        db.Index('idx_chain_projects_project', 'project_id'),
        db.Index('idx_chain_projects_pinned', 'chain_id', 'is_pinned'),
    )

    def to_dict(self, include_project=False, include_chain=False, include_added_by=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'chain_id': self.chain_id,
            'project_id': self.project_id,
            'added_by_id': self.added_by_id,
            'order_index': self.order_index,
            'is_pinned': self.is_pinned,
            'added_at': self.added_at.isoformat(),
        }

        if include_project:
            data['project'] = self.project.to_dict(include_creator=True)

        if include_chain:
            data['chain'] = self.chain.to_dict(include_creator=True)

        if include_added_by:
            data['added_by'] = self.added_by.to_dict()

        return data

    def __repr__(self):
        return f'<ChainProject {self.chain_id}:{self.project_id}>'


class ChainProjectRequest(db.Model):
    """Requests to add projects to approval-required chains"""

    __tablename__ = 'chain_project_requests'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    requester_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Request Details
    message = db.Column(db.Text, nullable=True)  # Optional message to chain owner
    status = db.Column(db.String(20), default='pending', index=True)  # pending, approved, rejected

    # Review Details
    reviewed_by_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = db.relationship('Project')
    requester = db.relationship('User', foreign_keys=[requester_id])
    reviewed_by = db.relationship('User', foreign_keys=[reviewed_by_id])

    # Indexes
    __table_args__ = (
        db.Index('idx_chain_requests_status', 'chain_id', 'status'),
        db.Index('idx_chain_requests_project', 'project_id'),
    )

    def to_dict(self, include_project=False, include_chain=False, include_requester=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'chain_id': self.chain_id,
            'project_id': self.project_id,
            'requester_id': self.requester_id,
            'message': self.message,
            'status': self.status,
            'reviewed_by_id': self.reviewed_by_id,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'rejection_reason': self.rejection_reason,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_project:
            data['project'] = self.project.to_dict(include_creator=True)

        if include_chain:
            data['chain'] = self.chain.to_dict(include_creator=True)

        if include_requester:
            data['requester'] = self.requester.to_dict()
            if self.reviewed_by:
                data['reviewed_by'] = self.reviewed_by.to_dict()

        return data

    def __repr__(self):
        return f'<ChainProjectRequest {self.id}:{self.status}>'


class ChainFollower(db.Model):
    """Users following chains for updates"""

    __tablename__ = 'chain_followers'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Metadata
    followed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = db.relationship('User', backref='followed_chains')

    # Indexes
    __table_args__ = (
        db.UniqueConstraint('chain_id', 'user_id', name='uq_chain_follower'),
        db.Index('idx_chain_followers_user', 'user_id'),
        db.Index('idx_chain_followers_chain', 'chain_id'),
    )

    def to_dict(self, include_user=False, include_chain=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'chain_id': self.chain_id,
            'user_id': self.user_id,
            'followed_at': self.followed_at.isoformat(),
        }

        if include_user:
            data['user'] = self.user.to_dict()

        if include_chain:
            data['chain'] = self.chain.to_dict()

        return data

    def __repr__(self):
        return f'<ChainFollower {self.user_id}:{self.chain_id}>'


class ChainModerationLog(db.Model):
    """Audit log for chain moderation actions"""

    __tablename__ = 'chain_moderation_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False)
    admin_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Action Details
    action = db.Column(db.String(20), nullable=False, index=True)  # ban, suspend, unban, delete, feature
    reason = db.Column(db.Text, nullable=True)
    meta_data = db.Column(db.JSON, default=dict)  # Additional data like suspended_until date

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    chain = db.relationship('Chain', backref='moderation_logs')
    admin = db.relationship('User', foreign_keys=[admin_id])

    # Indexes
    __table_args__ = (
        db.Index('idx_moderation_logs_chain', 'chain_id'),
        db.Index('idx_moderation_logs_admin', 'admin_id'),
        db.Index('idx_moderation_logs_action', 'action'),
    )

    def to_dict(self, include_chain=False, include_admin=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'chain_id': self.chain_id,
            'admin_id': self.admin_id,
            'action': self.action,
            'reason': self.reason,
            'meta_data': self.meta_data or {},
            'created_at': self.created_at.isoformat(),
        }

        if include_chain:
            data['chain'] = self.chain.to_dict()

        if include_admin and self.admin:
            data['admin'] = self.admin.to_dict()

        return data

    def __repr__(self):
        return f'<ChainModerationLog {self.action}:{self.chain_id}>'
