"""
Investor Request Model
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class InvestorRequest(db.Model):
    """Model for tracking investor account applications"""

    __tablename__ = 'investor_requests'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Basic Info
    plan_type = db.Column(db.String(20), nullable=False)  # free, professional, enterprise
    investor_type = db.Column(db.String(20), nullable=False, default='individual')  # individual, organization
    name = db.Column(db.String(200))  # Full name of the investor
    company_name = db.Column(db.String(200))
    position_title = db.Column(db.String(200))
    linkedin_url = db.Column(db.Text)
    website_url = db.Column(db.Text)
    location = db.Column(db.String(200))  # City, Country
    years_experience = db.Column(db.String(20))  # "0-2", "3-5", "6-10", "10+"

    # Investment Focus
    investment_stages = db.Column(db.JSON, default=list)  # ["Pre-seed", "Seed", etc.]
    industries = db.Column(db.JSON, default=list)  # ["AI/ML", "Web3", etc.]
    ticket_size_min = db.Column(db.BigInteger)  # USD (supports up to 9 quintillion)
    ticket_size_max = db.Column(db.BigInteger)  # USD (supports up to 9 quintillion)
    geographic_focus = db.Column(db.JSON, default=list)  # ["North America", "Europe", etc.]

    # About
    reason = db.Column(db.Text)  # Keep for backward compatibility
    bio = db.Column(db.Text)
    investment_thesis = db.Column(db.Text)

    # Track Record (Optional)
    num_investments = db.Column(db.String(20))  # "0-5", "6-15", "16-30", "30+"
    notable_investments = db.Column(db.JSON, default=list)  # [{"company": "X", "stage": "Seed", "year": "2020"}]
    portfolio_highlights = db.Column(db.Text)

    # Value Add (Optional)
    value_adds = db.Column(db.JSON, default=list)  # ["Mentorship", "Network", etc.]
    expertise_areas = db.Column(db.Text)

    # Visibility Settings
    is_public = db.Column(db.Boolean, default=False)  # Show in public directory
    open_to_requests = db.Column(db.Boolean, default=False)  # Accept intro requests

    # Contact (Optional)
    twitter_url = db.Column(db.Text)
    calendar_link = db.Column(db.Text)

    # Organization-specific (if investor_type == "organization")
    fund_size = db.Column(db.String(50))  # "Under $10M", "$10M-$50M", etc.

    # Admin Review
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    reviewed_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    admin_notes = db.Column(db.Text)  # Admin can add notes during review

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='investor_request')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    __table_args__ = (
        db.CheckConstraint("plan_type IN ('free', 'professional', 'enterprise')"),
        db.CheckConstraint("investor_type IN ('individual', 'organization')"),
        db.CheckConstraint("status IN ('pending', 'approved', 'rejected')"),
        db.UniqueConstraint('user_id'),
    )

    def to_dict(self, include_user=True):
        """Convert to dictionary"""
        from models.user import User

        data = {
            'id': self.id,
            'user_id': self.user_id,
            # Basic Info
            'plan_type': self.plan_type,
            'investor_type': self.investor_type,
            'name': self.name,
            'company_name': self.company_name,
            'position_title': self.position_title,
            'linkedin_url': self.linkedin_url,
            'website_url': self.website_url,
            'location': self.location,
            'years_experience': self.years_experience,
            # Investment Focus
            'investment_stages': self.investment_stages or [],
            'industries': self.industries or [],
            'ticket_size_min': self.ticket_size_min,
            'ticket_size_max': self.ticket_size_max,
            'geographic_focus': self.geographic_focus or [],
            # About
            'reason': self.reason,
            'bio': self.bio,
            'investment_thesis': self.investment_thesis,
            # Track Record
            'num_investments': self.num_investments,
            'notable_investments': self.notable_investments or [],
            'portfolio_highlights': self.portfolio_highlights,
            # Value Add
            'value_adds': self.value_adds or [],
            'expertise_areas': self.expertise_areas,
            # Visibility
            'is_public': self.is_public,
            'open_to_requests': self.open_to_requests,
            # Contact
            'twitter_url': self.twitter_url,
            'calendar_link': self.calendar_link,
            # Organization
            'fund_size': self.fund_size,
            # Admin
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'admin_notes': self.admin_notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_user:
            try:
                user = User.query.get(self.user_id)
                if user:
                    data['user'] = user.to_dict()
            except:
                data['user'] = None

        if self.reviewed_by:
            try:
                reviewer = User.query.get(self.reviewed_by)
                if reviewer:
                    data['reviewer'] = {
                        'id': reviewer.id,
                        'username': reviewer.username,
                    }
            except:
                data['reviewer'] = None

        return data

    def __repr__(self):
        return f'<InvestorRequest {self.id} - {self.status}>'
