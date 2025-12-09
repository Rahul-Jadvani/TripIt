"""
Travel Group Member Model - tracking group membership and roles
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class TravelGroupMember(db.Model):
    """Represents a member of a travel group"""

    __tablename__ = 'travel_group_members'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    group_id = db.Column(db.String(36), db.ForeignKey('travel_groups.id', ondelete='CASCADE'), nullable=False, index=True)
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True)

    # Role & Status
    role = db.Column(db.String(50), default='member')  # member, organizer, moderator, guest
    join_status = db.Column(db.String(50), default='accepted')  # pending, accepted, rejected, left, blocked
    joined_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Reputation at Join Time (snapshot)
    traveler_reputation_at_join = db.Column(db.Float, default=0.0)
    traveler_safety_score_at_join = db.Column(db.Float, default=0.0)

    # Preferences
    has_shared_location = db.Column(db.Boolean, default=False)
    notifications_enabled = db.Column(db.Boolean, default=True)
    is_starred_by_organizer = db.Column(db.Boolean, default=False)

    # Metadata
    left_date = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    traveler = db.relationship('Traveler', backref='group_memberships', foreign_keys=[traveler_id])
    group = db.relationship('TravelGroup', backref='members', foreign_keys=[group_id])

    def to_dict(self, include_traveler=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'group_id': self.group_id,
            'traveler_id': self.traveler_id,
            'role': self.role,
            'join_status': self.join_status,
            'joined_date': self.joined_date.isoformat() if self.joined_date else None,
            'traveler_reputation_at_join': self.traveler_reputation_at_join,
            'has_shared_location': self.has_shared_location,
            'notifications_enabled': self.notifications_enabled,
            'is_active': self.is_active,
        }

        if include_traveler and self.traveler:
            data['traveler'] = {
                'id': self.traveler.id,
                'username': self.traveler.username,
                'display_name': self.traveler.display_name,
                'avatar_url': self.traveler.avatar_url,
                'traveler_reputation_score': self.traveler.traveler_reputation_score,
                'safety_score': self.traveler.safety_score,
                'women_guide_certified': self.traveler.women_guide_certified,
            }

        return data
