"""
Project Model
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy.dialects.postgresql import ARRAY
from extensions import db


class Project(db.Model):
    """Project model"""

    __tablename__ = 'projects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Basic Info
    title = db.Column(db.String(200), nullable=False, index=True)
    tagline = db.Column(db.String(300))
    description = db.Column(db.Text, nullable=False)

    # NEW: Extended Project Information
    project_story = db.Column(db.Text)  # Journey, how it started
    inspiration = db.Column(db.Text)  # What inspired this project
    pitch_deck_url = db.Column(db.Text)  # PDF pitch deck on IPFS
    market_comparison = db.Column(db.Text)  # Similar products and differences
    novelty_factor = db.Column(db.Text)  # What makes this unique/novel

    # Links
    demo_url = db.Column(db.Text)
    github_url = db.Column(db.Text)

    # Hackathon Info
    hackathon_name = db.Column(db.String(200))
    hackathon_date = db.Column(db.Date)
    hackathons = db.Column(db.JSON, default=list)  # Array of hackathons: [{name, date, prize}, ...]

    # Categories/Domains for validator assignment (multiple allowed)
    categories = db.Column(db.JSON, default=list)  # ['AI/ML', 'Web3', etc.]

    # Tech Stack (Array)
    tech_stack = db.Column(ARRAY(db.String(50)), default=[])

    # Team Members (Array of JSON objects with name and role)
    team_members = db.Column(db.JSON, default=[])

    # Proof Score Components
    proof_score = db.Column(db.Float, default=0.0, index=True)
    verification_score = db.Column(db.Float, default=0.0)
    community_score = db.Column(db.Float, default=0.0)
    onchain_score = db.Column(db.Float, default=0.0)
    validation_score = db.Column(db.Float, default=0.0)
    quality_score = db.Column(db.Float, default=0.0)
    trending_score = db.Column(db.Float, default=0.0, index=True)  # Reddit-style hot score

    # AI Scoring Metadata
    score_breakdown = db.Column(db.JSON, default=dict)  # Detailed scoring breakdown
    scoring_status = db.Column(db.String(20), default='pending', index=True)  # pending, processing, completed, failed, retrying
    scoring_retry_count = db.Column(db.Integer, default=0)  # Number of retry attempts
    last_scored_at = db.Column(db.DateTime, nullable=True, index=True)  # Last successful scoring
    scoring_error = db.Column(db.Text, nullable=True)  # Error message from last failed attempt

    # Engagement Metrics
    upvotes = db.Column(db.Integer, default=0, index=True)
    downvotes = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    share_count = db.Column(db.Integer, default=0)

    # Status
    is_featured = db.Column(db.Boolean, default=False, index=True)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    featured_at = db.Column(db.DateTime)
    featured_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    screenshots = db.relationship('ProjectScreenshot', backref='project', lazy='dynamic',
                                   cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    badges = db.relationship('ValidationBadge', backref='project', lazy='dynamic',
                              cascade='all, delete-orphan')
    intros = db.relationship('Intro', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    event_associations = db.relationship('EventProject', backref='project', lazy='dynamic',
                                          cascade='all, delete-orphan')

    def calculate_proof_score(self):
        """Recalculate proof score from components"""
        self.proof_score = (
            self.verification_score +
            self.community_score +
            self.validation_score +
            self.quality_score +
            self.onchain_score
        )
        return self.proof_score

    def get_upvote_ratio(self):
        """Calculate upvote ratio as percentage"""
        total_votes = self.upvotes + self.downvotes
        if total_votes == 0:
            return 0
        return (self.upvotes / total_votes) * 100

    def to_dict(self, include_creator=False, user_id=None, include_chains=True):
        """Convert to dictionary

        Args:
            include_creator: Include creator/author information
            user_id: If provided, includes user's vote on this project
            include_chains: Include chains this project belongs to (default: True)
        """
        data = {
            'id': self.id,
            'title': self.title,
            'tagline': self.tagline,
            'description': self.description,
            'project_story': self.project_story,
            'inspiration': self.inspiration,
            'pitch_deck_url': self.pitch_deck_url,
            'market_comparison': self.market_comparison,
            'novelty_factor': self.novelty_factor,
            'demo_url': self.demo_url,
            'github_url': self.github_url,
            'hackathon_name': self.hackathon_name,
            'hackathon_date': self.hackathon_date.isoformat() if self.hackathon_date else None,
            'hackathons': self.hackathons or [],
            'categories': self.categories or [],
            'tech_stack': self.tech_stack or [],
            'team_members': self.team_members or [],
            'proof_score': self.proof_score,
            'verification_score': self.verification_score,
            'community_score': self.community_score,
            'onchain_score': self.onchain_score,
            'validation_score': self.validation_score,
            'quality_score': self.quality_score,
            'trending_score': self.trending_score,
            # AI Scoring fields
            'scoring_status': self.scoring_status,
            'score_breakdown': self.score_breakdown,
            'scoring_retry_count': self.scoring_retry_count,
            'last_scored_at': self.last_scored_at.isoformat() if self.last_scored_at else None,
            'scoring_error': self.scoring_error,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'upvote_ratio': round(self.get_upvote_ratio(), 2),
            'comment_count': self.comment_count,
            'view_count': self.view_count,
            'share_count': self.share_count,
            'is_featured': self.is_featured,
            'is_deleted': self.is_deleted,
            'featured_at': self.featured_at.isoformat() if self.featured_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id,
            'screenshots': [ss.to_dict() for ss in self.screenshots],
            'badge_count': self.badges.count(),
            'badges': [b.to_dict(include_validator=True) for b in self.badges],
        }

        if include_creator:
            creator_data = self.creator.to_dict() if self.creator else None
            data['creator'] = creator_data
            data['author'] = creator_data  # Alias for frontend compatibility

        # Include user's vote if user_id is provided
        if user_id:
            from models.vote import Vote
            vote = Vote.query.filter_by(user_id=user_id, project_id=self.id).first()
            data['user_vote'] = vote.vote_type if vote else None
        else:
            data['user_vote'] = None

        # Include chains this project belongs to
        if include_chains:
            chains = []
            for chain_project in self.chain_memberships:
                chains.append({
                    'id': chain_project.chain.id,
                    'name': chain_project.chain.name,
                    'slug': chain_project.chain.slug,
                    'logo_url': chain_project.chain.logo_url,
                    'is_pinned': chain_project.is_pinned,
                    'added_at': chain_project.added_at.isoformat(),
                })
            data['chains'] = chains
            data['chain_count'] = len(chains)

        return data

    def __repr__(self):
        return f'<Project {self.title}>'


class ProjectScreenshot(db.Model):
    """Project screenshot model"""

    __tablename__ = 'project_screenshots'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    url = db.Column(db.Text, nullable=False)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'url': self.url,
            'order_index': self.order_index,
        }

    def __repr__(self):
        return f'<Screenshot {self.id}>'
