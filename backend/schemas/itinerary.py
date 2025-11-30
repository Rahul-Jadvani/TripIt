"""
Itinerary Schemas - Travel-focused (TripIt migration)
"""
from marshmallow import Schema, fields, validate


class TravelCompanionSchema(Schema):
    """Travel companion schema"""
    traveler_id = fields.Str()
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    role = fields.Str(validate=validate.Length(max=100))
    username = fields.Str()
    avatar_url = fields.Str()


class ItinerarySchema(Schema):
    """Itinerary response schema"""
    id = fields.Str()
    title = fields.Str()
    description = fields.Str()
    destination = fields.Str()
    regions = fields.List(fields.Str())
    start_date = fields.Date()
    end_date = fields.Date()
    duration_days = fields.Int()
    difficulty_level = fields.Str()
    budget_amount = fields.Float()
    budget_currency = fields.Str()
    travel_style = fields.Str()
    activity_tags = fields.List(fields.Str())
    travel_companions = fields.List(fields.Nested(TravelCompanionSchema))
    route_gpx = fields.Str()
    route_waypoints = fields.List(fields.Dict())
    route_map_url = fields.Str()
    starting_point_gps = fields.Str()
    ending_point_gps = fields.Str()
    best_season = fields.Str()
    women_safe_certified = fields.Bool()
    safety_score = fields.Float()
    safety_ratings_count = fields.Int()
    travel_credibility_score = fields.Float()
    identity_score = fields.Float()
    travel_history_score = fields.Float()
    community_score = fields.Float()
    safety_score_component = fields.Float()
    quality_score = fields.Float()
    helpful_count = fields.Int()
    unhelpful_count = fields.Int()
    view_count = fields.Int()
    is_featured = fields.Bool()
    is_deleted = fields.Bool()
    featured_at = fields.DateTime()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    traveler_id = fields.Str()
    creator = fields.Nested(lambda: TravelerSchema(partial=True))


class ItineraryCreateSchema(Schema):
    """Itinerary creation schema"""
    title = fields.Str(required=True, validate=validate.Length(min=5, max=200))
    description = fields.Str(required=True, validate=validate.Length(min=50))
    destination = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    regions = fields.List(fields.Str())
    start_date = fields.Date()
    end_date = fields.Date()
    duration_days = fields.Int()
    difficulty_level = fields.Str(validate=validate.OneOf(['easy', 'moderate', 'difficult', 'expert']))
    budget_amount = fields.Float()
    budget_currency = fields.Str(validate=validate.Length(max=3))
    travel_style = fields.Str(validate=validate.Length(max=50))
    activity_tags = fields.List(fields.Str())
    travel_companions = fields.List(fields.Nested(TravelCompanionSchema))
    route_gpx = fields.Str()  # GPX file as string
    route_waypoints = fields.List(fields.Dict())
    route_map_url = fields.Url()
    starting_point_gps = fields.Str()
    ending_point_gps = fields.Str()
    best_season = fields.Str()
    women_safe_certified = fields.Bool()

    class Meta:
        fields = (
            'title', 'description', 'destination', 'regions', 'start_date', 'end_date',
            'duration_days', 'difficulty_level', 'budget_amount', 'budget_currency',
            'travel_style', 'activity_tags', 'travel_companions', 'route_gpx',
            'route_waypoints', 'route_map_url', 'starting_point_gps', 'ending_point_gps',
            'best_season', 'women_safe_certified'
        )


class ItineraryUpdateSchema(Schema):
    """Itinerary update schema"""
    title = fields.Str(validate=validate.Length(min=5, max=200))
    description = fields.Str(validate=validate.Length(min=50))
    destination = fields.Str(validate=validate.Length(min=1, max=200))
    regions = fields.List(fields.Str())
    start_date = fields.Date()
    end_date = fields.Date()
    duration_days = fields.Int()
    difficulty_level = fields.Str(validate=validate.OneOf(['easy', 'moderate', 'difficult', 'expert']))
    budget_amount = fields.Float()
    budget_currency = fields.Str(validate=validate.Length(max=3))
    travel_style = fields.Str(validate=validate.Length(max=50))
    activity_tags = fields.List(fields.Str())
    travel_companions = fields.List(fields.Nested(TravelCompanionSchema))
    route_gpx = fields.Str()
    route_waypoints = fields.List(fields.Dict())
    route_map_url = fields.Url()
    starting_point_gps = fields.Str()
    ending_point_gps = fields.Str()
    best_season = fields.Str()
    women_safe_certified = fields.Bool()


class SafetyRatingSchema(Schema):
    """Safety rating response schema"""
    id = fields.Str()
    itinerary_id = fields.Str()
    traveler_sbt_id = fields.Str()
    overall_safety_score = fields.Int(validate=validate.Range(min=1, max=5))
    rating_type = fields.Str(validate=validate.OneOf(['overall', 'accommodation', 'route', 'community', 'women_safety']))
    detailed_feedback = fields.Str()
    accommodation_safety = fields.Int(validate=validate.Range(min=1, max=5))
    route_safety = fields.Int(validate=validate.Range(min=1, max=5))
    community_safety = fields.Int(validate=validate.Range(min=1, max=5))
    women_safety_score = fields.Int(validate=validate.Range(min=1, max=5))
    photo_ipfs_hashes = fields.List(fields.Str())
    helpful_count = fields.Int()
    unhelpful_count = fields.Int()
    verified_traveler = fields.Bool()
    experience_date = fields.Date()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class TravelIntelSchema(Schema):
    """Travel intel response schema"""
    id = fields.Str()
    itinerary_id = fields.Str()
    intel_type = fields.Str(validate=validate.OneOf(['question', 'update', 'warning', 'recommendation', 'local_insight']))
    title = fields.Str()
    content = fields.Str()
    location_gps = fields.Str()
    severity_level = fields.Str(validate=validate.OneOf(['low', 'medium', 'high', 'critical']))
    safety_related = fields.Bool()
    status = fields.Str(validate=validate.OneOf(['open', 'in_progress', 'resolved', 'archived']))
    traveler_sbt_id = fields.Str()
    responder_sbt_id = fields.Str()
    response_status = fields.Str()
    photo_ipfs_hashes = fields.List(fields.Str())
    helpful_count = fields.Int()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


# Import after defining schemas to avoid circular imports
from .user import UserSchema


# Alias for Traveler schema (temporarily use User schema structure)
class TravelerSchema(UserSchema):
    """Traveler schema (extends user schema with travel-specific fields)"""
    sbt_id = fields.Str()
    sbt_verified = fields.Bool()
    destinations_visited = fields.Int()
    total_trips_count = fields.Int()
    total_km_traveled = fields.Float()
    traveler_reputation_score = fields.Float()
    certifications = fields.List(fields.Str())
    women_guide_certified = fields.Bool()
