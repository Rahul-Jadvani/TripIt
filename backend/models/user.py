"""
User Model
"""
from datetime import datetime
from uuid import uuid4
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    """User model for authentication and profile"""

    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email_verified = db.Column(db.Boolean, default=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Wallet & Blockchain
    wallet_address = db.Column(db.String(42), unique=True, nullable=True)
    has_oxcert = db.Column(db.Boolean, default=False)
    oxcert_tx_hash = db.Column(db.String(66), nullable=True)  # NFT mint/transfer transaction hash
    oxcert_token_id = db.Column(db.String(100), nullable=True)  # NFT token ID
    oxcert_metadata = db.Column(db.JSON, nullable=True)  # NFT metadata (name, image, attributes)

    # GitHub
    github_username = db.Column(db.String(255), nullable=True)
    github_connected = db.Column(db.Boolean, default=False)
    github_access_token = db.Column(db.Text, nullable=True)  # For AI scoring GitHub API calls

    # Profile
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(100))
    avatar_url = db.Column(db.Text)
    bio = db.Column(db.Text)

    # Status & Roles
    karma = db.Column(db.Integer, default=0)
    is_admin = db.Column(db.Boolean, default=False)
    is_investor = db.Column(db.Boolean, default=False)
    is_validator = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)

    # Validator approval tracking
    validator_approved_at = db.Column(db.DateTime, nullable=True)
    validator_approved_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    projects = db.relationship('Project', backref='creator', lazy='dynamic', foreign_keys='Project.user_id')
    votes = db.relationship('Vote', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    badges_awarded = db.relationship('ValidationBadge', backref='validator', lazy='dynamic',
                                      foreign_keys='ValidationBadge.validator_id')
    intros_sent = db.relationship('Intro', backref='requester', lazy='dynamic',
                                    foreign_keys='Intro.requester_id')
    intros_received = db.relationship('Intro', backref='recipient', lazy='dynamic',
                                        foreign_keys='Intro.recipient_id')
    organized_events = db.relationship('Event', backref='organizer', lazy='dynamic',
                                        foreign_keys='Event.organizer_id')
    event_subscriptions = db.relationship('EventSubscriber', backref='subscriber', lazy='dynamic',
                                          foreign_keys='EventSubscriber.user_id', cascade='all, delete-orphan')
    saved_projects = db.relationship('SavedProject', backref='user', lazy='dynamic',
                                     foreign_keys='SavedProject.user_id', cascade='all, delete-orphan')

    def set_password(self, password: str):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Check if password matches hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_email=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'karma': self.karma,
            'is_admin': self.is_admin,
            'is_investor': self.is_investor,
            'is_validator': self.is_validator,
            'is_active': self.is_active,  # Added for ban/unban functionality
            'email_verified': self.email_verified,
            'has_oxcert': self.has_oxcert,
            'oxcert_tx_hash': self.oxcert_tx_hash,
            'oxcert_token_id': self.oxcert_token_id,
            'oxcert_metadata': self.oxcert_metadata,
            'github_connected': self.github_connected,
            'github_username': self.github_username,
            'wallet_address': self.wallet_address[:6] + '...' + self.wallet_address[-4:] if self.wallet_address else None,
            'full_wallet_address': self.wallet_address,  # Full address for explorer links
            'created_at': self.created_at.isoformat(),
        }
        if include_email:
            data['email'] = self.email
        return data

    def __repr__(self):
        return f'<User {self.username}>'
