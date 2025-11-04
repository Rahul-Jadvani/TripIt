"""
Chain Schemas for validation and serialization
"""
from marshmallow import Schema, fields, validate, validates, ValidationError


class ChainCreateSchema(Schema):
    """Schema for creating a new chain"""
    name = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    description = fields.Str(required=True, validate=validate.Length(min=10, max=5000))
    banner_url = fields.Str(validate=validate.Length(max=500))
    logo_url = fields.Str(validate=validate.Length(max=500))
    categories = fields.List(fields.Str(validate=validate.Length(max=50)))
    rules = fields.Str(validate=validate.Length(max=5000))
    social_links = fields.Dict()
    is_public = fields.Bool()
    requires_approval = fields.Bool()


class ChainUpdateSchema(Schema):
    """Schema for updating a chain (all fields optional)"""
    name = fields.Str(validate=validate.Length(min=3, max=100))
    description = fields.Str(validate=validate.Length(min=10, max=5000))
    banner_url = fields.Str(validate=validate.Length(max=500), allow_none=True)
    logo_url = fields.Str(validate=validate.Length(max=500), allow_none=True)
    categories = fields.List(fields.Str(validate=validate.Length(max=50)))
    rules = fields.Str(validate=validate.Length(max=5000), allow_none=True)
    social_links = fields.Dict()
    is_public = fields.Bool()
    requires_approval = fields.Bool()


class AddProjectToChainSchema(Schema):
    """Schema for adding a project to a chain"""
    project_id = fields.Str(required=True)
    message = fields.Str(validate=validate.Length(max=500))  # Optional message for approval requests


class ChainFilterSchema(Schema):
    """Schema for chain list filters"""
    page = fields.Int(validate=validate.Range(min=1))
    limit = fields.Int(validate=validate.Range(min=1, max=100))
    sort = fields.Str(validate=validate.OneOf([
        'trending', 'newest', 'most_projects', 'most_followers', 'alphabetical'
    ]))
    search = fields.Str(validate=validate.Length(max=200))
    category = fields.Str(validate=validate.Length(max=50))
    visibility = fields.Str(validate=validate.OneOf(['all', 'public', 'private']))
    featured = fields.Bool()
    creator_id = fields.Str()


class ChainResponseSchema(Schema):
    """Schema for chain response"""
    id = fields.Str()
    name = fields.Str()
    slug = fields.Str()
    description = fields.Str()
    banner_url = fields.Str()
    logo_url = fields.Str()
    categories = fields.List(fields.Str())
    rules = fields.Str()
    social_links = fields.Dict()
    is_public = fields.Bool()
    requires_approval = fields.Bool()
    project_count = fields.Int()
    follower_count = fields.Int()
    view_count = fields.Int()
    is_featured = fields.Bool()
    is_active = fields.Bool()
    is_following = fields.Bool()
    is_owner = fields.Bool()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    creator_id = fields.Str()
    creator = fields.Nested('UserSchema', exclude=('email',))


class ChainProjectResponseSchema(Schema):
    """Schema for chain-project association response"""
    id = fields.Str()
    chain_id = fields.Str()
    project_id = fields.Str()
    added_by_id = fields.Str()
    order_index = fields.Int()
    is_pinned = fields.Bool()
    added_at = fields.DateTime()
    project = fields.Nested('ProjectSchema')
    chain = fields.Nested(ChainResponseSchema)


class ChainProjectRequestSchema(Schema):
    """Schema for chain project request"""
    id = fields.Str()
    chain_id = fields.Str()
    project_id = fields.Str()
    requester_id = fields.Str()
    message = fields.Str()
    status = fields.Str()
    reviewed_by_id = fields.Str()
    reviewed_at = fields.DateTime()
    rejection_reason = fields.Str()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    project = fields.Nested('ProjectSchema')
    chain = fields.Nested(ChainResponseSchema)
    requester = fields.Nested('UserSchema')


class RejectRequestSchema(Schema):
    """Schema for rejecting a chain project request"""
    reason = fields.Str(validate=validate.Length(max=500))


class NotificationSchema(Schema):
    """Schema for notification response"""
    id = fields.Str()
    user_id = fields.Str()
    notification_type = fields.Str()
    title = fields.Str()
    message = fields.Str()
    project_id = fields.Str()
    chain_id = fields.Str()
    actor_id = fields.Str()
    redirect_url = fields.Str()
    is_read = fields.Bool()
    read_at = fields.DateTime()
    created_at = fields.DateTime()
    actor = fields.Nested('UserSchema', exclude=('email',))
    project = fields.Dict()  # Simplified project data
    chain = fields.Dict()    # Simplified chain data
