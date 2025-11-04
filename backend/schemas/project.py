"""
Project Schemas
"""
from marshmallow import Schema, fields, validate


class ProjectScreenshotSchema(Schema):
    """Project screenshot schema"""
    id = fields.Str()
    url = fields.Str()
    order_index = fields.Int()


class TeamMemberSchema(Schema):
    """Team member schema"""
    user_id = fields.Str()  # ID of registered user (if selected from search)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    role = fields.Str(validate=validate.Length(max=100))
    username = fields.Str()  # Username of registered user (for display)
    avatar_url = fields.Str()  # Avatar URL of registered user (for display)


class ProjectSchema(Schema):
    """Project response schema"""
    id = fields.Str()
    title = fields.Str()
    tagline = fields.Str()
    description = fields.Str()
    demo_url = fields.Str()
    github_url = fields.Str()
    hackathon_name = fields.Str()
    hackathon_date = fields.Date()
    tech_stack = fields.List(fields.Str())
    team_members = fields.List(fields.Nested(TeamMemberSchema))
    proof_score = fields.Int()
    verification_score = fields.Int()
    community_score = fields.Int()
    validation_score = fields.Int()
    quality_score = fields.Int()
    upvotes = fields.Int()
    downvotes = fields.Int()
    upvote_ratio = fields.Float()
    comment_count = fields.Int()
    view_count = fields.Int()
    share_count = fields.Int()
    is_featured = fields.Bool()
    is_deleted = fields.Bool()
    featured_at = fields.DateTime()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    user_id = fields.Str()
    creator = fields.Nested(lambda: UserSchema(partial=True))
    screenshots = fields.List(fields.Nested(ProjectScreenshotSchema))
    badge_count = fields.Int()


class ProjectCreateSchema(Schema):
    """Project creation schema"""
    title = fields.Str(required=True, validate=validate.Length(min=5, max=200))
    tagline = fields.Str(validate=validate.Length(max=300))
    description = fields.Str(required=True, validate=validate.Length(min=50))
    project_story = fields.Str()  # Journey, how it started
    inspiration = fields.Str()  # What inspired the project
    pitch_deck_url = fields.Url()  # IPFS URL to pitch deck PDF
    market_comparison = fields.Str()  # Similar products and how this differs
    novelty_factor = fields.Str()  # What makes this unique
    demo_url = fields.Url()
    github_url = fields.Url()
    hackathon_name = fields.Str(validate=validate.Length(max=200))
    hackathon_date = fields.Date()
    hackathons = fields.List(fields.Dict())  # Array of hackathons: [{name, date, prize}, ...]
    categories = fields.List(fields.Str())  # Multiple categories for the project
    tech_stack = fields.List(fields.Str())
    screenshot_urls = fields.List(fields.Url())
    team_members = fields.List(fields.Nested(TeamMemberSchema))
    chain_ids = fields.List(fields.Str())  # IDs of chains to add project to

    class Meta:
        fields = (
            'title', 'tagline', 'description', 'project_story', 'inspiration',
            'pitch_deck_url', 'market_comparison', 'novelty_factor',
            'demo_url', 'github_url', 'hackathon_name', 'hackathon_date', 'hackathons',
            'categories', 'tech_stack', 'screenshot_urls', 'team_members', 'chain_ids'
        )


class ProjectUpdateSchema(Schema):
    """Project update schema"""
    title = fields.Str(validate=validate.Length(min=5, max=200))
    tagline = fields.Str(validate=validate.Length(max=300))
    description = fields.Str(validate=validate.Length(min=50))
    project_story = fields.Str()
    inspiration = fields.Str()
    pitch_deck_url = fields.Url()
    market_comparison = fields.Str()
    novelty_factor = fields.Str()
    demo_url = fields.Url()
    github_url = fields.Url()
    hackathon_name = fields.Str(validate=validate.Length(max=200))
    hackathon_date = fields.Date()
    hackathons = fields.List(fields.Dict())  # Array of hackathons: [{name, date, prize}, ...]
    categories = fields.List(fields.Str())
    tech_stack = fields.List(fields.Str())
    team_members = fields.List(fields.Nested(TeamMemberSchema))


# Import after defining ProjectSchema to avoid circular imports
from .user import UserSchema
