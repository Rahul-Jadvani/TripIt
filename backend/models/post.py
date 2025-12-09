"""
Post Model - Signature-verified content posts with wallet attestation
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class Post(db.Model):
    """Post model - signature-verified content signed by wallet"""

    __tablename__ = 'posts'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    traveler_id = db.Column(
        db.String(36),
        db.ForeignKey('travelers.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # Content
    content_url = db.Column(db.Text, nullable=False)  # IPFS URL or CDN URL
    caption = db.Column(db.Text, nullable=True)
    post_type = db.Column(db.String(20), default='photo')  # photo, video, text, itinerary, snap

    # Signature Verification
    signature = db.Column(db.String(132), nullable=False)  # 0x-prefixed 65-byte signature (130 hex + 0x)
    wallet_address = db.Column(db.String(42), nullable=False, index=True)  # Signer address
    verified = db.Column(db.Boolean, default=False, index=True)  # True if signature verified against traveler wallet

    # Metadata
    location = db.Column(db.String(200), nullable=True)  # City, country
    tags = db.Column(db.JSON, default=list)  # Array of tags: ['sunset', 'beach', 'goa']

    # Engagement
    likes_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    traveler = db.relationship('Traveler', backref='posts', lazy='joined', foreign_keys=[traveler_id])

    def to_dict(self, include_traveler=True):
        """Convert post to dictionary"""
        data = {
            'id': self.id,
            'traveler_id': self.traveler_id,
            'content_url': self.content_url,
            'caption': self.caption,
            'post_type': self.post_type,
            'verified': self.verified,
            'wallet_address': self.wallet_address,
            'location': self.location,
            'tags': self.tags or [],
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_traveler and self.traveler:
            data['traveler'] = {
                'id': self.traveler.id,
                'username': self.traveler.username,
                'display_name': self.traveler.display_name,
                'avatar_url': self.traveler.avatar_url,
                'traveler_reputation_score': self.traveler.traveler_reputation_score,
                'women_guide_certified': self.traveler.women_guide_certified,
            }

        return data

    def __repr__(self):
        return f'<Post {self.id} by {self.traveler_id} verified={self.verified}>'
