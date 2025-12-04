"""
Pre-fetch API - Loads all critical data for instant navigation
This endpoint is called on feed load to warm user-specific caches
"""
from flask import Blueprint, jsonify
from concurrent.futures import ThreadPoolExecutor
from utils.decorators import token_required, optional_auth
from utils.cache import CacheService
from models.project import Project
from models.itinerary import Itinerary
from models.notification import Notification
from models.direct_message import DirectMessage
from models.user import User
from models.traveler import Traveler
from models.chain import Chain
from models.chain_post import ChainPost
from models.intro_request import IntroRequest
from models.investor_request import InvestorRequest
from extensions import db
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import joinedload
from utils.user_utils import get_user_by_id, get_all_active_users
from utils.content_utils import get_user_content, count_user_content

prefetch_bp = Blueprint('prefetch', __name__)


def fetch_user_stats(user_id):
    """Fetch user statistics"""
    try:
        from models.comment import Comment
        from models.badge import ValidationBadge
        from models.intro import Intro

        # Count content from both tables
        project_count = count_user_content(user_id)

        comment_count = Comment.query.filter_by(user_id=user_id).count()
        badges_awarded = ValidationBadge.query.filter_by(validator_id=user_id).count()
        intros_sent = db.session.query(func.count(Intro.id)).filter(Intro.requester_id == user_id).scalar() or 0
        intros_received = db.session.query(func.count(Intro.id)).filter(Intro.recipient_id == user_id).scalar() or 0

        return {
            'project_count': project_count,
            'comment_count': comment_count,
            'badges_awarded': badges_awarded,
            'intros_sent': intros_sent,
            'intros_received': intros_received
        }
    except Exception as e:
        print(f"Error fetching user stats: {e}")
        return None


def fetch_unread_counts(user_id):
    """Fetch all unread counts"""
    try:
        notifications_unread = Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).count()

        messages_unread = DirectMessage.query.filter_by(
            recipient_id=user_id,
            is_read=False
        ).count()

        return {
            'notifications': notifications_unread,
            'messages': messages_unread,
            'total': notifications_unread + messages_unread
        }
    except Exception as e:
        print(f"Error fetching unread counts: {e}")
        return None


def fetch_my_projects(user_id):
    """Fetch user's content (projects + itineraries)"""
    try:
        # Get content from both tables
        content = get_user_content(user_id, limit=10)

        return [c.to_dict(include_creator=True, user_id=user_id) for c in content]
    except Exception as e:
        print(f"Error fetching my projects: {e}")
        return None


def fetch_recent_notifications(user_id):
    """Fetch recent notifications"""
    try:
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc())\
            .limit(20).all()

        return [n.to_dict(include_relations=True) for n in notifications]
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return None


def fetch_conversations(user_id):
    """Fetch conversation list - check both User and Traveler tables"""
    try:
        # Query conversations from User table
        user_conversations = db.session.query(
            User,
            func.max(DirectMessage.created_at).label('last_message_time'),
            func.count(
                db.case(
                    (and_(DirectMessage.recipient_id == user_id, DirectMessage.is_read == False), 1)
                )
            ).label('unread_count')
        ).join(
            DirectMessage,
            or_(
                and_(DirectMessage.sender_id == User.id, DirectMessage.recipient_id == user_id),
                and_(DirectMessage.recipient_id == User.id, DirectMessage.sender_id == user_id)
            )
        ).filter(
            User.id != user_id
        ).group_by(
            User.id
        ).order_by(
            db.desc('last_message_time')
        ).limit(20).all()

        # Query conversations from Traveler table
        traveler_conversations = db.session.query(
            Traveler,
            func.max(DirectMessage.created_at).label('last_message_time'),
            func.count(
                db.case(
                    (and_(DirectMessage.recipient_id == user_id, DirectMessage.is_read == False), 1)
                )
            ).label('unread_count')
        ).join(
            DirectMessage,
            or_(
                and_(DirectMessage.sender_id == Traveler.id, DirectMessage.recipient_id == user_id),
                and_(DirectMessage.recipient_id == Traveler.id, DirectMessage.sender_id == user_id)
            )
        ).filter(
            Traveler.id != user_id
        ).group_by(
            Traveler.id
        ).order_by(
            db.desc('last_message_time')
        ).limit(20).all()

        # Combine results from both tables
        result = []
        for user, last_time, unread in user_conversations:
            result.append({
                'user': user.to_dict(),
                'last_message_time': last_time.isoformat() if last_time else None,
                'unread_count': unread
            })
        for traveler, last_time, unread in traveler_conversations:
            result.append({
                'user': traveler.to_dict(),
                'last_message_time': last_time.isoformat() if last_time else None,
                'unread_count': unread
            })

        # Sort by last_message_time and limit to 20
        result.sort(key=lambda x: x['last_message_time'] or '', reverse=True)
        return result[:20]
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_trending_chains(user_id):
    """Fetch trending chains"""
    try:
        from models.chain import Chain
        chains = Chain.query.filter_by(is_public=True, is_active=True)\
            .order_by(
                (Chain.project_count * 0.6 + Chain.follower_count * 0.3).desc()
            ).limit(10).all()

        return [c.to_dict(include_creator=True, user_id=user_id) for c in chains]
    except Exception as e:
        print(f"Error fetching trending chains: {e}")
        return None


@prefetch_bp.route('/bootstrap', methods=['GET'])
@token_required
def bootstrap_data(user_id):
    """
    Pre-fetch all critical data in parallel for instant UX
    Called on app load to warm user-specific caches
    """
    try:
        # Execute all fetches in parallel
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {
                'user_stats': executor.submit(fetch_user_stats, user_id),
                'unread_counts': executor.submit(fetch_unread_counts, user_id),
                'my_projects': executor.submit(fetch_my_projects, user_id),
                'recent_notifications': executor.submit(fetch_recent_notifications, user_id),
                'conversations': executor.submit(fetch_conversations, user_id),
                'trending_chains': executor.submit(fetch_trending_chains, user_id),
            }

            # Collect results as they complete
            results = {}
            for key, future in futures.items():
                try:
                    results[key] = future.result(timeout=5)
                except Exception as e:
                    print(f"Error in {key}: {e}")
                    results[key] = None

        # Cache user profile - check both user tables
        user = get_user_by_id(user_id)
        if user:
            CacheService.set(f"user:{user_id}", user.to_dict(include_email=True), ttl=600)

        return jsonify({
            'status': 'success',
            'message': 'Bootstrap data loaded',
            'data': results,
            'cache_warmed': True
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@prefetch_bp.route('/dashboard-data', methods=['GET'])
@token_required
def fetch_dashboard_data(user_id):
    """
    Fetch dashboard data optimized for different user roles
    Returns: Admin, Investor, or Validator specific dashboard data
    """
    try:
        # Check both user tables
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404

        # Base dashboard data (always needed)
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                'stats': executor.submit(fetch_user_stats, user_id),
                'unread': executor.submit(fetch_unread_counts, user_id),
                'projects': executor.submit(fetch_my_projects, user_id),
            }

            dashboard_data = {}
            for key, future in futures.items():
                dashboard_data[key] = future.result(timeout=5)

        # Role-specific data
        role_data = {}

        if user.is_admin:
            # Admin dashboard data
            try:
                from models.feedback import Feedback
                from models.investor_request import InvestorRequest

                pending_feedback = Feedback.query.filter_by(status='pending').count()
                pending_investors = InvestorRequest.query.filter_by(status='pending').count()

                # Count users from both tables
                total_users = User.query.filter_by(is_active=True).count() + Traveler.query.filter_by(is_active=True).count()

                # Count content from both tables
                total_projects = Project.query.filter_by(is_deleted=False).count() + Itinerary.query.filter_by(is_deleted=False).count()

                role_data['admin'] = {
                    'pending_feedback': pending_feedback,
                    'pending_investor_requests': pending_investors,
                    'total_users': total_users,
                    'total_projects': total_projects
                }
            except Exception as e:
                print(f"Error fetching admin data: {e}")

        if user.is_investor:
            # Investor dashboard data
            try:
                from models.intro_request import IntroRequest

                received_requests = IntroRequest.query.filter_by(
                    builder_id=user_id,
                    status='pending'
                ).count()

                sent_requests = IntroRequest.query.filter_by(
                    investor_id=user_id
                ).count()

                role_data['investor'] = {
                    'received_intro_requests': received_requests,
                    'sent_intro_requests': sent_requests
                }
            except Exception as e:
                print(f"Error fetching investor data: {e}")

        if user.is_validator:
            # Validator dashboard data
            try:
                from models.badge import ValidationBadge

                badges_awarded = ValidationBadge.query.filter_by(
                    validator_id=user_id
                ).count()

                role_data['validator'] = {
                    'badges_awarded': badges_awarded
                }
            except Exception as e:
                print(f"Error fetching validator data: {e}")

        return jsonify({
            'status': 'success',
            'data': {
                **dashboard_data,
                'role_data': role_data,
                'user_roles': {
                    'is_admin': user.is_admin,
                    'is_investor': user.is_investor,
                    'is_validator': user.is_validator
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
