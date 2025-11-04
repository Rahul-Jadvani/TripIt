"""
ChainPost Model - Reddit-style discussion posts within chains
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy.dialects.postgresql import ARRAY
from extensions import db


class ChainPost(db.Model):
    """Discussion posts within chains (Reddit-style threads)"""

    __tablename__ = 'chain_posts'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    parent_id = db.Column(db.String(36), db.ForeignKey('chain_posts.id', ondelete='CASCADE'), nullable=True, index=True)

    # Content
    title = db.Column(db.String(300), nullable=True)  # Null for replies/comments
    content = db.Column(db.Text, nullable=False)  # Supports markdown/rich text
    image_urls = db.Column(ARRAY(db.Text), default=list)  # Multiple images

    # Engagement Metrics
    upvote_count = db.Column(db.Integer, default=0, index=True)
    downvote_count = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0, index=True)  # Direct replies only
    total_replies = db.Column(db.Integer, default=0)  # All nested replies

    # Moderation & Display
    is_pinned = db.Column(db.Boolean, default=False, index=True)  # Chain owner can pin
    is_locked = db.Column(db.Boolean, default=False)  # Prevent new replies
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    is_hidden = db.Column(db.Boolean, default=False)  # Moderator hidden

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # For sorting by activity

    # Relationships
    chain = db.relationship('Chain', backref='posts')
    author = db.relationship('User', backref='chain_posts', foreign_keys=[author_id])
    reactions = db.relationship('ChainPostReaction', backref='post', lazy='dynamic', cascade='all, delete-orphan')

    # Self-referential relationship for nested comments (Reddit-style threading)
    replies = db.relationship(
        'ChainPost',
        backref=db.backref('parent', remote_side=[id]),
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    # Indexes for common queries
    __table_args__ = (
        db.Index('idx_chain_posts_chain_created', 'chain_id', 'created_at'),
        db.Index('idx_chain_posts_chain_activity', 'chain_id', 'last_activity_at'),
        db.Index('idx_chain_posts_chain_upvotes', 'chain_id', 'upvote_count'),
        db.Index('idx_chain_posts_parent', 'parent_id'),
        db.Index('idx_chain_posts_pinned', 'chain_id', 'is_pinned'),
    )

    def to_dict(self, include_author=False, include_chain=False, user_id=None, include_replies=False):
        """Convert to dictionary

        Args:
            include_author: Include author information
            include_chain: Include chain information
            user_id: If provided, includes user's reaction status
            include_replies: Include direct replies (one level deep)
        """
        data = {
            'id': self.id,
            'chain_id': self.chain_id,
            'author_id': self.author_id,
            'parent_id': self.parent_id,
            'title': self.title,
            'content': self.content if not self.is_deleted else '[deleted]',
            'image_urls': self.image_urls or [],
            'upvote_count': self.upvote_count,
            'downvote_count': self.downvote_count,
            'comment_count': self.comment_count,
            'total_replies': self.total_replies,
            'is_pinned': self.is_pinned,
            'is_locked': self.is_locked,
            'is_deleted': self.is_deleted,
            'is_hidden': self.is_hidden,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_activity_at': self.last_activity_at.isoformat(),
        }

        if include_author and not self.is_deleted:
            data['author'] = self.author.to_dict()
        elif self.is_deleted:
            data['author'] = {'username': '[deleted]'}

        if include_chain:
            data['chain'] = self.chain.to_dict()

        # Include user's reaction if user_id provided
        if user_id:
            user_reaction = ChainPostReaction.query.filter_by(
                post_id=self.id,
                user_id=user_id
            ).first()
            data['user_reaction'] = user_reaction.reaction_type if user_reaction else None
            data['is_author'] = (self.author_id == user_id)
        else:
            data['user_reaction'] = None
            data['is_author'] = False

        # Include direct replies if requested (one level only to avoid deep recursion)
        if include_replies and not self.parent_id:  # Only for top-level posts
            replies_query = self.replies.filter_by(is_deleted=False, is_hidden=False).order_by(ChainPost.upvote_count.desc()).limit(5)
            data['replies'] = [reply.to_dict(include_author=True, user_id=user_id) for reply in replies_query]

        return data

    def __repr__(self):
        return f'<ChainPost {self.id[:8]}... in chain {self.chain_id[:8]}...>'


class ChainPostReaction(db.Model):
    """User reactions to chain posts (upvotes/downvotes)"""

    __tablename__ = 'chain_post_reactions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    post_id = db.Column(db.String(36), db.ForeignKey('chain_posts.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Reaction type: 'upvote' or 'downvote'
    # Can be extended to support emoji reactions: '🔥', '💯', '❤️', etc.
    reaction_type = db.Column(db.String(20), nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='chain_post_reactions')

    # Constraints & Indexes
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='uq_chain_post_reaction'),
        db.Index('idx_chain_post_reactions_post', 'post_id'),
        db.Index('idx_chain_post_reactions_user', 'user_id'),
    )

    def to_dict(self, include_user=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'post_id': self.post_id,
            'user_id': self.user_id,
            'reaction_type': self.reaction_type,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_user:
            data['user'] = self.user.to_dict()

        return data

    def __repr__(self):
        return f'<ChainPostReaction {self.reaction_type} by {self.user_id[:8]}...>'
