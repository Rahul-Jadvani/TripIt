"""
Feed Cache Refresh Tasks
Periodic tasks to refresh feed data caches
"""
from celery import shared_task
from sqlalchemy.orm import joinedload
from sqlalchemy import func, cast, String, or_
from extensions import db
from models.project import Project
from models.intro_request import IntroRequest
from utils.cache import CacheService
import logging

logger = logging.getLogger(__name__)


@shared_task(name='refresh_most_requested_projects_cache')
def refresh_most_requested_projects_cache():
    """
    Refresh cache for most requested projects (projects with most intro requests)
    Runs every 1 hour
    """
    try:
        logger.info("Starting most requested projects cache refresh")

        limit = 50

        # Get projects with most intro requests
        project_intro_counts = db.session.query(
            Project.id,
            func.count(IntroRequest.id).label('intro_count')
        ).join(
            IntroRequest, Project.id == IntroRequest.project_id
        ).filter(
            Project.is_deleted == False
        ).group_by(
            Project.id
        ).order_by(
            func.count(IntroRequest.id).desc()
        ).limit(limit).all()

        # Get project IDs with intro requests
        project_ids = [p.id for p in project_intro_counts]

        if not project_ids:
            # No projects with intro requests, cache empty result
            response_data = {
                'status': 'success',
                'message': 'Most requested projects retrieved',
                'data': []
            }
            CacheService.set('most_requested_projects', response_data, ttl=3600)
            logger.info("No projects with intro requests found, cached empty result")
            return {'status': 'success', 'cached_projects': 0}

        # Fetch full project details with eager loading
        projects = Project.query.filter(
            Project.id.in_(project_ids)
        ).options(joinedload(Project.creator)).all()

        # Create mapping for project order
        projects_dict = {p.id: p for p in projects}

        # Build response in order of intro count
        data = []
        for p_id, intro_count in project_intro_counts:
            if p_id in projects_dict:
                project_data = projects_dict[p_id].to_dict(include_creator=True, user_id=None)
                project_data['intro_request_count'] = intro_count
                data.append(project_data)

        response_data = {
            'status': 'success',
            'message': 'Most requested projects retrieved',
            'data': data
        }

        # Cache for 1 hour
        CacheService.set('most_requested_projects', response_data, ttl=3600)

        logger.info(f"Successfully cached {len(data)} most requested projects")
        return {'status': 'success', 'cached_projects': len(data)}

    except Exception as e:
        logger.error(f"Error refreshing most requested projects cache: {e}")
        return {'status': 'error', 'error': str(e)}


@shared_task(name='refresh_recent_connections_cache')
def refresh_recent_connections_cache():
    """
    Refresh cache for recent connections (accepted intro requests)
    Runs every 1 hour
    """
    try:
        logger.info("Starting recent connections cache refresh")

        limit = 50

        # Get recent accepted intros with eager loading
        connections = IntroRequest.query.filter_by(status='accepted')\
            .options(
                joinedload(IntroRequest.investor),
                joinedload(IntroRequest.builder),
                joinedload(IntroRequest.project)
            ).order_by(IntroRequest.updated_at.desc())\
            .limit(limit).all()

        data = [conn.to_dict(include_project=True, include_users=True) for conn in connections]

        response_data = {
            'status': 'success',
            'message': 'Recent connections retrieved',
            'data': data
        }

        # Cache for 1 hour
        CacheService.set('recent_connections', response_data, ttl=3600)

        logger.info(f"Successfully cached {len(data)} recent connections")
        return {'status': 'success', 'cached_connections': len(data)}

    except Exception as e:
        logger.error(f"Error refreshing recent connections cache: {e}")
        return {'status': 'error', 'error': str(e)}


@shared_task(name='refresh_featured_projects_cache')
def refresh_featured_projects_cache():
    """
    Refresh cache for featured projects
    Runs every 1 hour
    """
    try:
        logger.info("Starting featured projects cache refresh")

        limit = 50

        # Get featured projects
        projects = Project.query.filter_by(
            is_deleted=False,
            is_featured=True
        ).options(joinedload(Project.creator)).order_by(
            Project.featured_at.desc()
        ).limit(limit).all()

        data = [p.to_dict(include_creator=True, user_id=None) for p in projects]

        response_data = {
            'status': 'success',
            'message': 'Featured projects retrieved',
            'data': data
        }

        # Cache for 1 hour
        CacheService.set('featured_projects', response_data, ttl=3600)

        logger.info(f"Successfully cached {len(data)} featured projects")
        return {'status': 'success', 'cached_projects': len(data)}

    except Exception as e:
        logger.error(f"Error refreshing featured projects cache: {e}")
        return {'status': 'error', 'error': str(e)}


@shared_task(name='refresh_category_caches')
def refresh_category_caches():
    """
    Refresh caches for all major categories
    Runs every 1 hour
    """
    try:
        logger.info("Starting category caches refresh")

        categories = ['DeFi', 'AI/ML', 'Gaming', 'SaaS', 'Web3', 'FinTech']
        results = {}

        for category in categories:
            try:
                cache_key = f'category_projects_{category}'
                limit = 50

                # Get projects by category using JSON contains operator
                projects = Project.query.filter(
                    Project.is_deleted == False,
                    or_(
                        # Match if categories JSON contains the category string
                        cast(Project.categories, String).like(f'%"{category}"%'),
                        # Also match variations like "AI/ML" matching "AI"
                        cast(Project.categories, String).ilike(f'%{category}%')
                    )
                ).options(joinedload(Project.creator)).order_by(
                    Project.proof_score.desc()
                ).limit(limit).all()

                data = [p.to_dict(include_creator=True, user_id=None) for p in projects]

                response_data = {
                    'status': 'success',
                    'message': f'{category} projects retrieved',
                    'data': data
                }

                # Cache for 1 hour
                CacheService.set(cache_key, response_data, ttl=3600)

                results[category] = len(data)
                logger.info(f"Cached {len(data)} projects for category: {category}")

            except Exception as e:
                logger.error(f"Error caching category {category}: {e}")
                results[category] = f"error: {str(e)}"

        logger.info(f"Successfully refreshed category caches: {results}")
        return {'status': 'success', 'categories': results}

    except Exception as e:
        logger.error(f"Error refreshing category caches: {e}")
        return {'status': 'error', 'error': str(e)}


@shared_task(name='refresh_rising_stars_cache')
def refresh_rising_stars_cache():
    """
    Refresh cache for rising star projects
    Runs every 1 hour
    """
    try:
        logger.info("Starting rising stars cache refresh")

        from datetime import datetime, timedelta
        limit = 50

        # Get projects created in last 30 days with high engagement
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        projects = Project.query.filter(
            Project.is_deleted == False,
            Project.created_at >= thirty_days_ago
        ).options(joinedload(Project.creator)).order_by(
            (Project.upvotes + Project.comment_count + Project.view_count).desc()
        ).limit(limit).all()

        data = [p.to_dict(include_creator=True, user_id=None) for p in projects]

        response_data = {
            'status': 'success',
            'message': 'Rising star projects retrieved',
            'data': data
        }

        # Cache for 1 hour
        CacheService.set('rising_stars', response_data, ttl=3600)

        logger.info(f"Successfully cached {len(data)} rising star projects")
        return {'status': 'success', 'cached_projects': len(data)}

    except Exception as e:
        logger.error(f"Error refreshing rising stars cache: {e}")
        return {'status': 'error', 'error': str(e)}


@shared_task(name='refresh_all_feed_caches')
def refresh_all_feed_caches():
    """
    Refresh all feed caches at once
    Runs every 24 hours as a master refresh task
    """
    try:
        logger.info("Starting full feed cache refresh")

        # Refresh most requested projects
        most_requested_result = refresh_most_requested_projects_cache()

        # Refresh recent connections
        connections_result = refresh_recent_connections_cache()

        # Refresh featured projects
        featured_result = refresh_featured_projects_cache()

        # Refresh category caches
        categories_result = refresh_category_caches()

        # Refresh rising stars
        rising_stars_result = refresh_rising_stars_cache()

        # Invalidate project feed cache to force fresh data
        CacheService.invalidate_project_feed()

        logger.info("Successfully refreshed all feed caches")
        return {
            'status': 'success',
            'most_requested': most_requested_result,
            'connections': connections_result,
            'featured': featured_result,
            'categories': categories_result,
            'rising_stars': rising_stars_result
        }

    except Exception as e:
        logger.error(f"Error refreshing all feed caches: {e}")
        return {'status': 'error', 'error': str(e)}
