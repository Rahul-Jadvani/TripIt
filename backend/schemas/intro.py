"""
Intro Schemas
"""
from marshmallow import Schema, fields, validate


class IntroSchema(Schema):
    """Intro response schema"""
    id = fields.Str()
    project_id = fields.Str()
    requester_id = fields.Str()
    recipient_id = fields.Str()
    message = fields.Str()
    status = fields.Str()
    requester_contact = fields.Str()
    accepted_at = fields.DateTime()
    declined_at = fields.DateTime()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    requester = fields.Nested(lambda: UserSchema(partial=True))
    recipient = fields.Nested(lambda: UserSchema(partial=True))
    project = fields.Nested(lambda: ProjectSchema(partial=True))


class IntroCreateSchema(Schema):
    """Intro creation schema"""
    project_id = fields.Str(required=True)
    recipient_id = fields.Str(required=True)
    message = fields.Str(validate=validate.Length(max=1000))
    requester_contact = fields.Email()

    class Meta:
        fields = ('project_id', 'recipient_id', 'message', 'requester_contact')


class IntroUpdateSchema(Schema):
    """Intro update schema (for status changes)"""
    status = fields.Str(required=True, validate=validate.OneOf(['accepted', 'declined']))


# Import to avoid circular imports
from .user import UserSchema
from .project import ProjectSchema
