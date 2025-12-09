"""
Comment Schemas
"""
from marshmallow import Schema, fields, validate


class CommentSchema(Schema):
    """Comment response schema"""
    id = fields.Str()
    project_id = fields.Str()
    user_id = fields.Str()
    parent_id = fields.Str()
    content = fields.Str()
    upvotes = fields.Int()
    downvotes = fields.Int()
    is_deleted = fields.Bool()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    reply_count = fields.Int()
    author = fields.Nested(lambda: UserSchema(partial=True))


class CommentCreateSchema(Schema):
    """Comment creation schema"""
    project_id = fields.Str(required=True)
    content = fields.Str(required=True, validate=validate.Length(min=1, max=5000))
    parent_id = fields.Str()

    class Meta:
        fields = ('project_id', 'content', 'parent_id')


class CommentUpdateSchema(Schema):
    """Comment update schema"""
    content = fields.Str(required=True, validate=validate.Length(min=1, max=5000))


# Import after defining CommentSchema to avoid circular imports
from .user import UserSchema
