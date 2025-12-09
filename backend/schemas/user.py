"""
User Schemas
"""
from marshmallow import Schema, fields, validate, ValidationError


class UserSchema(Schema):
    """User response schema"""
    id = fields.Str()
    username = fields.Str()
    email = fields.Str()
    display_name = fields.Str()
    avatar_url = fields.Str()
    bio = fields.Str()
    karma = fields.Int()
    is_admin = fields.Bool()
    email_verified = fields.Bool()
    has_oxcert = fields.Bool()
    github_connected = fields.Bool()
    wallet_address = fields.Str()
    created_at = fields.DateTime()


class UserRegisterSchema(Schema):
    """User registration schema"""
    email = fields.Email(required=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    password = fields.Str(required=True, validate=validate.Length(min=8))
    display_name = fields.Str(validate=validate.Length(max=100))

    class Meta:
        fields = ('email', 'username', 'password', 'display_name')


class UserLoginSchema(Schema):
    """User login schema"""
    email = fields.Email(required=True)
    password = fields.Str(required=True)

    class Meta:
        fields = ('email', 'password')


class UserProfileUpdateSchema(Schema):
    """User profile update schema"""
    display_name = fields.Str(validate=validate.Length(max=100))
    avatar_url = fields.Str()
    bio = fields.Str(validate=validate.Length(max=500))

    class Meta:
        fields = ('display_name', 'avatar_url', 'bio')
