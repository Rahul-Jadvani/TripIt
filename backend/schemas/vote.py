"""
Vote Schemas
"""
from marshmallow import Schema, fields, validate


class VoteSchema(Schema):
    """Vote schema"""
    id = fields.Str()
    user_id = fields.Str()
    project_id = fields.Str()
    vote_type = fields.Str(validate=validate.OneOf(['up', 'down']))
    created_at = fields.DateTime()


class VoteCreateSchema(Schema):
    """Vote creation schema"""
    project_id = fields.Str(required=True)
    vote_type = fields.Str(required=True, validate=validate.OneOf(['up', 'down']))

    class Meta:
        fields = ('project_id', 'vote_type')
