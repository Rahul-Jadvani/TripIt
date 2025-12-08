"""
Database models
"""
# Legacy Zer0 Models
from .user import User
from .project import Project, ProjectScreenshot
from .vote import Vote
from .comment import Comment
from .badge import ValidationBadge
from .intro import Intro
from .feedback import Feedback
from .chain import Chain, ChainProject, ChainProjectRequest, ChainFollower, ChainModerationLog
from .chain_post import ChainPost, ChainPostReaction
from .notification import Notification
from .user_stats import UserDashboardStats
from .admin_user import AdminUser
from .admin_otp import AdminOTP
from .event import Event, EventSubscriber
from .saved_project import SavedProject
from .intro_request import IntroRequest
from .direct_message import DirectMessage
from .project_update import ProjectUpdate
from .project_view import ProjectView
from .validator_assignment import ValidatorAssignment
from .validator_permissions import ValidatorPermissions
from .investor_request import InvestorRequest
from .admin_scoring_config import AdminScoringConfig

# New TripIt Models (Phase 1)
from .traveler import Traveler
from .itinerary import Itinerary
from .itinerary_view import ItineraryView
from .safety_rating import SafetyRating
from .travel_intel import TravelIntel
from .day_plan import DayPlan
from .embedded_business import EmbeddedBusiness
from .hidden_gem import HiddenGem
from .safety_alert import SafetyAlert
from .traveler_certification import TravelerCertification
from .sbt_verification import SBTVerification
from .travel_group import TravelGroup, travel_group_itineraries
from .travel_group_member import TravelGroupMember
from .women_guide import WomenGuide
from .guide_booking import GuideBooking
from .guide_review import GuideReview
from .women_safety_resource import WomenSafetyResource
from .remix_chat_session import RemixChatSession
from .remix_chat_message import RemixChatMessage
from .booking_session import BookingSession

__all__ = [
    # Legacy Zer0 Models
    'User',
    'Project',
    'ProjectScreenshot',
    'Vote',
    'Comment',
    'ValidationBadge',
    'Intro',
    'Feedback',
    'Chain',
    'ChainProject',
    'ChainProjectRequest',
    'ChainFollower',
    'ChainModerationLog',
    'ChainPost',
    'ChainPostReaction',
    'Notification',
    'UserDashboardStats',
    'AdminUser',
    'AdminOTP',
    'Event',
    'EventSubscriber',
    'SavedProject',
    'IntroRequest',
    'DirectMessage',
    'ProjectUpdate',
    'ProjectView',
    'ValidatorAssignment',
    'ValidatorPermissions',
    'InvestorRequest',
    'AdminScoringConfig',
    # New TripIt Models (Phase 1)
    'Traveler',
    'Itinerary',
    'ItineraryView',
    'SafetyRating',
    'TravelIntel',
    'DayPlan',
    'EmbeddedBusiness',
    'HiddenGem',
    'SafetyAlert',
    'TravelerCertification',
    'SBTVerification',
    'TravelGroup',
    'TravelGroupMember',
    'WomenGuide',
    'GuideBooking',
    'GuideReview',
    'WomenSafetyResource',
    'travel_group_itineraries',
    # Remix Chat Models
    'RemixChatSession',
    'RemixChatMessage',
    # Booking Models
    'BookingSession'
]
