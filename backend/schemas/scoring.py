"""
Scoring Schemas for Validation
"""
from marshmallow import Schema, fields, validate, ValidationError


class ScoringWeightsSchema(Schema):
    """Schema for main scoring weights (must sum to 100)"""
    quality_score = fields.Integer(required=True, validate=validate.Range(min=0, max=100))
    verification_score = fields.Integer(required=True, validate=validate.Range(min=0, max=100))
    validation_score = fields.Integer(required=True, validate=validate.Range(min=0, max=100))
    community_score = fields.Integer(required=True, validate=validate.Range(min=0, max=100))

    def validate_sum(self, data):
        """Ensure weights sum to 100"""
        total = sum([
            data.get('quality_score', 0),
            data.get('verification_score', 0),
            data.get('validation_score', 0),
            data.get('community_score', 0)
        ])
        if total != 100:
            raise ValidationError(f'Scoring weights must sum to 100 (current sum: {total})')


class LLMWeightsSchema(Schema):
    """Schema for LLM sub-weights (must sum to 1.0)"""
    competitive = fields.Float(required=True, validate=validate.Range(min=0, max=1))
    market_fit = fields.Float(required=True, validate=validate.Range(min=0, max=1))
    success_criteria = fields.Float(required=True, validate=validate.Range(min=0, max=1))
    evaluation = fields.Float(required=True, validate=validate.Range(min=0, max=1))

    def validate_sum(self, data):
        """Ensure weights sum to 1.0"""
        total = sum([
            data.get('competitive', 0),
            data.get('market_fit', 0),
            data.get('success_criteria', 0),
            data.get('evaluation', 0)
        ])
        if not (0.99 <= total <= 1.01):  # Allow small floating point error
            raise ValidationError(f'LLM weights must sum to 1.0 (current sum: {total})')


class ScoringConfigSchema(Schema):
    """Schema for general scoring configuration"""
    llm_model = fields.String(required=True, validate=validate.OneOf(['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']))
    max_retries = fields.Integer(required=True, validate=validate.Range(min=1, max=20))
    retry_backoff_seconds = fields.Integer(required=True, validate=validate.Range(min=60, max=600))
    rate_limit_hours = fields.Integer(required=True, validate=validate.Range(min=1, max=24))
    github_cache_days = fields.Integer(required=True, validate=validate.Range(min=1, max=30))
    enable_scoring = fields.Boolean(required=True)


class UpdateConfigSchema(Schema):
    """Schema for updating admin scoring configuration"""
    config_key = fields.String(required=True, validate=validate.OneOf([
        'scoring_weights',
        'llm_weights',
        'github_weights',
        'code_quality_weights',
        'scoring_config'
    ]))
    config_value = fields.Dict(required=True)


class RescoreProjectSchema(Schema):
    """Schema for manual project rescoring"""
    project_id = fields.String(required=True)
    force = fields.Boolean(missing=False)  # Force rescore even if recently scored
