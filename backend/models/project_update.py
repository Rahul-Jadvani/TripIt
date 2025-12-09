from extensions import db
from datetime import datetime
import uuid

class ProjectUpdate(db.Model):
    __tablename__ = 'project_updates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Update type: 'investment', 'hackathon_win', 'milestone', 'announcement', 'feature', 'partnership'
    update_type = db.Column(db.String(50), nullable=False)

    # Main content
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)

    # Metadata for specific update types (JSON)
    # For hackathon_win: {hackathon_name, prize, date}
    # For investment: {amount, investor_name, round}
    # For milestone: {metric, value}
    update_metadata = db.Column(db.JSON, nullable=True)

    # Styling for the sticker
    color = db.Column(db.String(20), default='yellow')  # yellow, blue, green, pink, purple

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = db.relationship('Project', backref=db.backref('updates', lazy=True, cascade='all, delete-orphan'))
    creator = db.relationship('User', backref=db.backref('project_updates', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'update_type': self.update_type,
            'title': self.title,
            'content': self.content,
            'metadata': self.update_metadata,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'creator': {
                'id': self.creator.id,
                'username': self.creator.username,
                'display_name': self.creator.display_name,
                'avatar_url': self.creator.avatar_url,
            } if self.creator else None
        }
