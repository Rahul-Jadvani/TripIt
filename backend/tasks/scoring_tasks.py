"""
Celery Tasks for Async Project Scoring
"""
from celery_app import celery
from extensions import db
from models.project import Project
from models.user import User
from services.scoring.score_engine import ScoringEngine
from models.itinerary import Itinerary
from datetime import datetime, timedelta
from flask import current_app
import traceback


@celery.task(bind=True, max_retries=10, default_retry_delay=300)
def score_project_task(self, project_id):
    """
    Async task to score a project

    Args:
        project_id: Project UUID to score

    Returns:
        Dict with scoring results
    """
    try:
        # Load project
        project = Project.query.get(project_id)
        if not project:
            return {'error': 'Project not found', 'project_id': project_id}

        # Update status to processing
        project.scoring_status = 'processing'
        db.session.commit()

        # Get user's GitHub token
        user = User.query.get(project.user_id)
        github_token = user.github_access_token if user else None

        # Get OpenAI API key from config
        openai_key = current_app.config.get('OPENAI_API_KEY')

        # Initialize scoring engine
        engine = ScoringEngine(github_token=github_token, openai_api_key=openai_key)

        # Score the project
        result = engine.score_project(project)

        if result.get('success'):
            # Update project with scores (preserve float precision)
            project.proof_score = result['proof_score']
            project.quality_score = result['quality_score']
            project.verification_score = result['verification_score']
            project.validation_score = result['validation_score']
            project.community_score = result['community_score']
            project.onchain_score = result['onchain_score']
            project.score_breakdown = result['breakdown']
            project.scoring_status = 'completed'
            project.last_scored_at = datetime.utcnow()
            project.scoring_error = None

            db.session.commit()

            # CRITICAL: Invalidate cache after scoring completes
            from utils.cache import CacheService
            CacheService.invalidate_project(project.id)
            CacheService.invalidate_project_feed()  # Feed rankings may change
            CacheService.invalidate_leaderboard()   # Leaderboard may change

            # Publish scoring completion event to Redis pub/sub
            # Flask app will subscribe and emit Socket.IO event for real-time updates
            try:
                import redis
                import json
                import os

                # Get Redis client from REDIS_URL
                redis_client = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379/0'))

                message = {
                    'event': 'project:scored',
                    'project_id': project.id,
                    'proof_score': float(project.proof_score),
                    'quality_score': float(project.quality_score),
                    'verification_score': float(project.verification_score),
                    'validation_score': float(project.validation_score),
                    'community_score': float(project.community_score)
                }
                redis_client.publish('scoring_events', json.dumps(message))
                print(f"[Redis Pub/Sub] Published scoring event for project {project.id}")
            except Exception as pubsub_err:
                print(f"Failed to publish scoring event to Redis: {pubsub_err}")

            return {
                'success': True,
                'project_id': project_id,
                'proof_score': project.proof_score,
                'message': 'Scoring completed successfully'
            }
        else:
            # Scoring failed, retry
            raise Exception(result.get('error', 'Scoring failed'))

    except Exception as e:
        # Log error
        error_msg = str(e)
        error_trace = traceback.format_exc()

        # Update project
        project = Project.query.get(project_id)
        if project:
            project.scoring_retry_count += 1
            project.scoring_error = error_msg[:500]  # Limit error length

            max_retries = current_app.config.get('SCORING_MAX_RETRIES', 10)

            if project.scoring_retry_count >= max_retries:
                # Max retries exceeded
                project.scoring_status = 'failed'
                db.session.commit()

                # Notify admin (TODO: implement notification)
                print(f"SCORING FAILED after {max_retries} retries: {project_id}")
                print(f"Error: {error_msg}")

                return {
                    'success': False,
                    'project_id': project_id,
                    'error': 'Max retries exceeded',
                    'retry_count': project.scoring_retry_count
                }
            else:
                # Retry with exponential backoff
                project.scoring_status = 'retrying'
                db.session.commit()

                # Calculate retry delay: base_delay * (2 ^ retry_count)
                base_delay = current_app.config.get('SCORING_RETRY_BACKOFF', 300)
                retry_delay = base_delay * (2 ** project.scoring_retry_count)

                # Retry the task
        raise self.retry(exc=e, countdown=retry_delay)


@celery.task(bind=True, max_retries=3, default_retry_delay=300)
def score_itinerary_task(self, itinerary_id):
    """
    Travel-focused scoring for itineraries with proper decimal precision.

    Scoring Components (each 0-20 points, total 0-100):
    - Identity Score: Traveler verification & credibility
    - Travel History: Creator's travel experience
    - Community Score: Engagement metrics (votes, views, comments)
    - Safety Score: Community safety ratings
    - Quality Score: Content richness (photos, descriptions, details)
    """
    try:
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary:
            return {
                'success': False,
                'error': 'Itinerary not found',
                'itinerary_id': itinerary_id
            }

        # === 1. IDENTITY SCORE (0-20) ===
        # Based on traveler verification status
        identity_score = 0.0
        try:
            creator = itinerary.itinerary_creator
            if creator:
                # SBT verification: 10 points
                if getattr(creator, 'sbt_verified', False):
                    identity_score += 10.0

                # Women guide certified: 5 points
                if getattr(creator, 'women_guide_certified', False):
                    identity_score += 5.0

                # Has certifications: 3 points
                certifications = getattr(creator, 'certifications', [])
                # Convert to list if it's a SQLAlchemy relationship
                certifications_list = list(certifications) if certifications is not None else []
                if len(certifications_list) > 0:
                    identity_score += 3.0

                # Profile completeness: 2 points
                if getattr(creator, 'bio', None) and len(getattr(creator, 'bio', '')) > 50:
                    identity_score += 2.0
        except Exception:
            pass  # Creator not available

        # === 2. TRAVEL HISTORY SCORE (0-20) ===
        # Based on creator's travel experience
        travel_history_score = 0.0
        try:
            creator = itinerary.itinerary_creator
            if creator:
                # Number of trips: up to 10 points (1 point per trip, max 10)
                trips_count = getattr(creator, 'total_trips_count', 0) or 0
                travel_history_score += min(10.0, trips_count * 1.0)

                # Destinations visited: up to 5 points (0.5 points per destination)
                destinations = getattr(creator, 'destinations_visited', 0) or 0
                travel_history_score += min(5.0, destinations * 0.5)

                # Total km traveled: up to 5 points (1 point per 1000km, max 5)
                km_traveled = getattr(creator, 'total_km_traveled', 0.0) or 0.0
                travel_history_score += min(5.0, (km_traveled / 1000.0))
        except Exception:
            pass

        # === 3. COMMUNITY SCORE (0-20) - Normalized against top performers ===
        # Get maximum values from top itineraries for normalization
        try:
            from sqlalchemy import func
            max_values = db.session.query(
                func.max(Itinerary.helpful_votes).label('max_votes'),
                func.max(Itinerary.view_count).label('max_views'),
                func.max(Itinerary.comment_count).label('max_comments')
            ).filter(Itinerary.is_deleted == False).first()

            max_helpful_votes = max(max_values.max_votes or 1, 1)  # Avoid division by zero
            max_view_count = max(max_values.max_views or 1, 1)
            max_comment_count = max(max_values.max_comments or 1, 1)
        except Exception:
            # Fallback values if query fails
            max_helpful_votes = 100
            max_view_count = 1000
            max_comment_count = 50

        # Normalize each component against the maximum (0-20 points)
        # Each component gets equal weight
        helpful_votes_normalized = ((itinerary.helpful_votes or 0) / max_helpful_votes) * 7.0
        view_count_normalized = ((itinerary.view_count or 0) / max_view_count) * 7.0
        comment_count_normalized = ((itinerary.comment_count or 0) / max_comment_count) * 6.0

        community_score = round(helpful_votes_normalized + view_count_normalized + comment_count_normalized, 2)

        # === 4. SAFETY SCORE COMPONENT (0-20) ===
        # From community safety ratings (0-5 scale)
        if itinerary.safety_score and itinerary.safety_score > 0:
            # Convert 0-5 scale to 0-20 scale (5.0 rating = 20 points)
            safety_component = round((itinerary.safety_score / 5.0) * 20.0, 2)
        else:
            safety_component = 0.0

        # Bonus for verified safety ratings
        if itinerary.safety_ratings_count and itinerary.safety_ratings_count >= 3:
            safety_component = min(20.0, safety_component + 2.0)

        # === 5. QUALITY SCORE (0-20) ===
        quality_score = 0.0

        # Description quality: up to 5 points
        description_len = len(itinerary.description or '')
        if description_len > 500:
            quality_score += 5.0
        elif description_len > 200:
            quality_score += 3.0
        elif description_len > 50:
            quality_score += 1.0

        # Extended details: 1 point each (max 7 points)
        if itinerary.trip_highlights and len(itinerary.trip_highlights) > 50:
            quality_score += 1.0
        if itinerary.trip_journey and len(itinerary.trip_journey) > 50:
            quality_score += 1.0
        if itinerary.day_by_day_plan and len(itinerary.day_by_day_plan) > 50:
            quality_score += 1.0
        if itinerary.hidden_gems and len(itinerary.hidden_gems) > 50:
            quality_score += 1.0
        if itinerary.unique_highlights and len(itinerary.unique_highlights) > 50:
            quality_score += 1.0
        if itinerary.safety_tips and len(itinerary.safety_tips) > 50:
            quality_score += 1.0
        if itinerary.best_season:
            quality_score += 1.0

        # Photos: up to 5 points (1 point per photo, max 5)
        screenshots_count = len(itinerary.screenshots or [])
        quality_score += min(5.0, screenshots_count * 1.0)

        # Route details: up to 3 points
        if itinerary.route_map_url or itinerary.route_gpx:
            quality_score += 2.0
        if itinerary.starting_point_gps and itinerary.ending_point_gps:
            quality_score += 1.0

        # Update itinerary with rounded scores (2 decimal precision)
        itinerary.identity_score = round(identity_score, 2)
        itinerary.travel_history_score = round(travel_history_score, 2)
        itinerary.community_score = round(community_score, 2)
        itinerary.safety_score_component = round(safety_component, 2)
        itinerary.quality_score = round(quality_score, 2)

        # Recalculate aggregate proof score
        itinerary.calculate_proof_score()
        itinerary.proof_score = round(itinerary.proof_score, 2)

        # Generate detailed explanations for each score component
        explanations = {}

        # Identity Score Explanation
        identity_reasons = []
        if hasattr(itinerary, 'itinerary_creator') and itinerary.itinerary_creator:
            creator = itinerary.itinerary_creator
            if getattr(creator, 'sbt_verified', False):
                identity_reasons.append("✓ SBT Verified (+10.0 pts)")
            else:
                identity_reasons.append("✗ No SBT Verification (0 pts)")

            if getattr(creator, 'women_guide_certified', False):
                identity_reasons.append("✓ Women Guide Certified (+5.0 pts)")
            else:
                identity_reasons.append("✗ No Women Guide Certification (0 pts)")

            certifications = getattr(creator, 'certifications', [])
            certifications_list = list(certifications) if certifications is not None else []
            if len(certifications_list) > 0:
                identity_reasons.append(f"✓ Has {len(certifications_list)} certification(s) (+3.0 pts)")
            else:
                identity_reasons.append("✗ No travel certifications (0 pts)")

            bio = getattr(creator, 'bio', None)
            if bio and len(bio) > 50:
                identity_reasons.append(f"✓ Complete profile with {len(bio)}-char bio (+2.0 pts)")
            else:
                identity_reasons.append("✗ Incomplete profile (0 pts)")
        else:
            identity_reasons.append("✗ No creator profile data available")

        explanations['identity_score'] = {
            'score': identity_score,
            'max': 20.0,
            'percentage': round((identity_score / 20.0) * 100, 1),
            'summary': f'Identity verification and traveler credibility',
            'details': identity_reasons
        }

        # Travel History Explanation
        history_reasons = []
        if hasattr(itinerary, 'itinerary_creator') and itinerary.itinerary_creator:
            creator = itinerary.itinerary_creator
            trips = getattr(creator, 'total_trips_count', 0) or 0
            destinations = getattr(creator, 'destinations_visited', 0) or 0
            km = getattr(creator, 'total_km_traveled', 0.0) or 0.0

            if trips > 0:
                trip_score = min(10.0, trips * 1.0)
                history_reasons.append(f"✓ {trips} trips completed (+{trip_score:.1f}/10.0 pts)")
            else:
                history_reasons.append("✗ No recorded trips (0/10.0 pts)")

            if destinations > 0:
                dest_score = min(5.0, destinations * 0.5)
                history_reasons.append(f"✓ {destinations} destinations visited (+{dest_score:.1f}/5.0 pts)")
            else:
                history_reasons.append("✗ No destinations recorded (0/5.0 pts)")

            if km > 0:
                km_score = min(5.0, km / 1000.0)
                history_reasons.append(f"✓ {km:.0f}km traveled (+{km_score:.1f}/5.0 pts)")
            else:
                history_reasons.append("✗ No distance recorded (0/5.0 pts)")
        else:
            history_reasons.append("✗ No travel history data available")

        explanations['travel_history_score'] = {
            'score': travel_history_score,
            'max': 20.0,
            'percentage': round((travel_history_score / 20.0) * 100, 1),
            'summary': f'Creator\'s travel experience and journey history',
            'details': history_reasons
        }

        # Community Score Explanation
        community_reasons = []
        helpful = itinerary.helpful_votes or 0
        views = itinerary.view_count or 0
        comments = itinerary.comment_count or 0

        community_reasons.append(f"Helpful votes: {helpful} (normalized: +{helpful_votes_normalized:.2f}/7.0 pts)")
        community_reasons.append(f"View count: {views} (normalized: +{view_count_normalized:.2f}/7.0 pts)")
        community_reasons.append(f"Comments: {comments} (normalized: +{comment_count_normalized:.2f}/6.0 pts)")
        community_reasons.append(f"Scoring normalized against top-performing itineraries")
        community_reasons.append(f"Max values in database: {max_helpful_votes} votes, {max_view_count} views, {max_comment_count} comments")

        explanations['community_score'] = {
            'score': community_score,
            'max': 20.0,
            'percentage': round((community_score / 20.0) * 100, 1),
            'summary': f'Community engagement and interaction metrics',
            'details': community_reasons
        }

        # Safety Score Explanation
        safety_reasons = []
        if itinerary.safety_score and itinerary.safety_score > 0:
            safety_reasons.append(f"✓ Community safety rating: {itinerary.safety_score:.1f}/5.0 stars")
            safety_reasons.append(f"✓ Converted to score: +{safety_component:.2f}/20.0 pts")
        else:
            safety_reasons.append("✗ No community safety ratings yet (0/20.0 pts)")

        if itinerary.safety_ratings_count and itinerary.safety_ratings_count >= 3:
            safety_reasons.append(f"✓ Verified: {itinerary.safety_ratings_count} safety ratings (+2.0 bonus)")
        else:
            count = itinerary.safety_ratings_count or 0
            safety_reasons.append(f"⚠ Only {count} safety rating(s) (need 3+ for verification bonus)")

        explanations['safety_score_component'] = {
            'score': safety_component,
            'max': 20.0,
            'percentage': round((safety_component / 20.0) * 100, 1),
            'summary': f'Community safety ratings and traveler feedback',
            'details': safety_reasons
        }

        # Quality Score Explanation
        quality_reasons = []
        desc_len = len(itinerary.description or '')
        if desc_len > 500:
            quality_reasons.append(f"✓ Rich description: {desc_len} chars (+5.0/5.0 pts)")
        elif desc_len > 200:
            quality_reasons.append(f"✓ Good description: {desc_len} chars (+3.0/5.0 pts)")
        elif desc_len > 50:
            quality_reasons.append(f"⚠ Basic description: {desc_len} chars (+1.0/5.0 pts)")
        else:
            quality_reasons.append(f"✗ Minimal description: {desc_len} chars (0/5.0 pts)")

        extended_fields = []
        if itinerary.trip_highlights and len(itinerary.trip_highlights) > 50:
            extended_fields.append("Trip Highlights")
        if itinerary.trip_journey and len(itinerary.trip_journey) > 50:
            extended_fields.append("Trip Journey")
        if itinerary.day_by_day_plan and len(itinerary.day_by_day_plan) > 50:
            extended_fields.append("Day-by-Day Plan")
        if itinerary.hidden_gems and len(itinerary.hidden_gems) > 50:
            extended_fields.append("Hidden Gems")
        if itinerary.unique_highlights and len(itinerary.unique_highlights) > 50:
            extended_fields.append("Unique Highlights")
        if itinerary.safety_tips and len(itinerary.safety_tips) > 50:
            extended_fields.append("Safety Tips")
        if itinerary.best_season:
            extended_fields.append("Best Season")

        if extended_fields:
            quality_reasons.append(f"✓ Extended details: {', '.join(extended_fields)} (+{len(extended_fields)}.0/7.0 pts)")
        else:
            quality_reasons.append("✗ No extended trip details (0/7.0 pts)")

        photo_count = len(itinerary.screenshots or [])
        if photo_count > 0:
            photo_score = min(5.0, photo_count * 1.0)
            quality_reasons.append(f"✓ {photo_count} photo(s) (+{photo_score:.1f}/5.0 pts)")
        else:
            quality_reasons.append("✗ No photos (0/5.0 pts)")

        route_details = []
        if itinerary.route_map_url or itinerary.route_gpx:
            route_details.append("Route map/GPX")
        if itinerary.starting_point_gps and itinerary.ending_point_gps:
            route_details.append("GPS coordinates")

        if route_details:
            quality_reasons.append(f"✓ Route details: {', '.join(route_details)} (+{len(route_details) + 1}.0/3.0 pts)")
        else:
            quality_reasons.append("✗ No route details (0/3.0 pts)")

        explanations['quality_score'] = {
            'score': quality_score,
            'max': 20.0,
            'percentage': round((quality_score / 20.0) * 100, 1),
            'summary': f'Content richness and itinerary completeness',
            'details': quality_reasons
        }

        # Store explanations
        itinerary.score_explanations = explanations

        # Mirror proof_score into travel_credibility_score if that field exists
        try:
            itinerary.travel_credibility_score = itinerary.proof_score
        except Exception:
            pass

        db.session.commit()

        # Cache invalidation
        try:
            from utils.cache import CacheService
            if hasattr(CacheService, 'invalidate_itinerary'):
                CacheService.invalidate_itinerary(itinerary_id)
            if hasattr(CacheService, 'invalidate_itinerary_feed'):
                CacheService.invalidate_itinerary_feed()
            if hasattr(CacheService, 'invalidate_leaderboard'):
                CacheService.invalidate_leaderboard()
        except Exception:
            pass

        return {
            'success': True,
            'itinerary_id': itinerary_id,
            'proof_score': float(itinerary.proof_score),
            'identity_score': float(itinerary.identity_score),
            'travel_history_score': float(itinerary.travel_history_score),
            'community_score': float(itinerary.community_score),
            'safety_component': float(itinerary.safety_score_component),
            'quality_score': float(itinerary.quality_score)
        }

    except Exception as e:
        db.session.rollback()
        error_msg = str(e)

        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)

        return {
            'success': False,
            'error': error_msg,
            'itinerary_id': itinerary_id
        }


@celery.task
def batch_score_projects(project_ids):
    """
    Score multiple projects in batch

    Args:
        project_ids: List of project UUIDs

    Returns:
        Dict with batch results
    """
    results = {
        'total': len(project_ids),
        'queued': 0,
        'failed': 0
    }

    for project_id in project_ids:
        try:
            score_project_task.delay(project_id)
            results['queued'] += 1
        except Exception as e:
            results['failed'] += 1
            print(f"Failed to queue project {project_id}: {e}")

    return results


@celery.task
def retry_failed_scores():
    """
    Retry all projects with failed scoring status
    Runs as a periodic task (cron job)

    Returns:
        Dict with retry results
    """
    try:
        # Find all failed projects that haven't exceeded max retries
        max_retries = current_app.config.get('SCORING_MAX_RETRIES', 10)

        failed_projects = Project.query.filter(
            Project.scoring_status == 'failed',
            Project.scoring_retry_count < max_retries
        ).all()

        results = {
            'total_failed': len(failed_projects),
            'queued_for_retry': 0
        }

        for project in failed_projects:
            # Reset status and queue for scoring
            project.scoring_status = 'pending'
            project.scoring_error = None
            db.session.commit()

            # Queue scoring task
            score_project_task.delay(project.id)
            results['queued_for_retry'] += 1

        return results

    except Exception as e:
        return {'error': str(e)}


@celery.task
def check_rate_limit(user_id):
    """
    Check if user can submit a new project (rate limiting)

    Args:
        user_id: User UUID

    Returns:
        Dict with can_submit (bool) and minutes_remaining (int)
    """
    try:
        rate_limit_hours = current_app.config.get('SCORING_RATE_LIMIT_HOURS', 1)

        # Get user's last project submission
        last_project = Project.query.filter_by(user_id=user_id)\
            .order_by(Project.created_at.desc())\
            .first()

        if not last_project:
            return {'can_submit': True, 'minutes_remaining': 0}

        # Calculate time since last submission
        time_since = datetime.utcnow() - last_project.created_at
        hours_since = time_since.total_seconds() / 3600

        if hours_since >= rate_limit_hours:
            return {'can_submit': True, 'minutes_remaining': 0}
        else:
            hours_remaining = rate_limit_hours - hours_since
            minutes_remaining = int(hours_remaining * 60)
            return {
                'can_submit': False,
                'minutes_remaining': minutes_remaining,
                'message': f'Please wait {minutes_remaining} minutes before submitting another project.'
            }

    except Exception as e:
        return {'can_submit': True, 'error': str(e)}
