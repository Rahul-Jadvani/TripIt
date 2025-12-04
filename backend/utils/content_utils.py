"""
Utility functions for content management across Project and Itinerary tables
"""
from models.project import Project
from models.itinerary import Itinerary
from sqlalchemy import or_, and_, func


def get_all_content(user_id=None, limit=None, sort_by='created_at', include_deleted=False):
    """
    Get all content (projects + itineraries) combined

    Args:
        user_id: Optional user ID to get content for specific user viewing context
        limit: Optional limit on total results
        sort_by: Sort field ('created_at', 'score', etc.)
        include_deleted: Include deleted items

    Returns:
        List of projects and itineraries combined
    """
    # Get projects from old system
    project_query = Project.query
    if not include_deleted:
        project_query = project_query.filter_by(is_deleted=False)

    # Get itineraries from new system
    itinerary_query = Itinerary.query
    if not include_deleted:
        itinerary_query = itinerary_query.filter_by(is_deleted=False)

    # Apply limit to each query if specified
    if limit:
        half_limit = limit // 2
        projects = project_query.limit(half_limit).all()
        itineraries = itinerary_query.limit(half_limit).all()
    else:
        projects = project_query.all()
        itineraries = itinerary_query.all()

    # Combine results
    all_content = list(projects) + list(itineraries)

    # Sort combined results
    if sort_by == 'created_at':
        all_content.sort(key=lambda x: x.created_at if x.created_at else '', reverse=True)
    elif sort_by == 'score':
        all_content.sort(key=lambda x: getattr(x, 'proof_score', 0) or 0, reverse=True)

    return all_content if not limit else all_content[:limit]


def search_all_content(query, limit=50, user_id=None):
    """
    Search across both projects and itineraries

    Args:
        query: Search query string
        limit: Maximum number of results
        user_id: Optional user ID for viewing context

    Returns:
        Tuple of (projects, itineraries)
    """
    search_pattern = f'%{query}%'

    # Search projects (old system)
    projects = Project.query.filter(
        Project.is_deleted == False,
        or_(
            Project.title.ilike(search_pattern),
            Project.tagline.ilike(search_pattern),
            Project.description.ilike(search_pattern),
            Project.hackathon_name.ilike(search_pattern)
        )
    ).limit(limit).all()

    # Search itineraries (new system)
    itineraries = Itinerary.query.filter(
        Itinerary.is_deleted == False,
        or_(
            Itinerary.title.ilike(search_pattern),
            Itinerary.description.ilike(search_pattern),
            Itinerary.destination.ilike(search_pattern),
            Itinerary.travel_style.ilike(search_pattern)
        )
    ).limit(limit).all()

    return projects, itineraries


def get_content_by_id(content_id, content_type=None):
    """
    Get content by ID from either projects or itineraries table

    Args:
        content_id: Content ID to search for
        content_type: Optional type hint ('project' or 'itinerary')

    Returns:
        Project or Itinerary object, or None if not found
    """
    if content_type == 'project':
        return Project.query.get(content_id)
    elif content_type == 'itinerary':
        return Itinerary.query.get(content_id)

    # Try both if type not specified
    content = Itinerary.query.get(content_id)
    if content:
        return content

    return Project.query.get(content_id)


def get_user_content(user_id, limit=None):
    """
    Get all content created by a user from both tables

    Args:
        user_id: User or traveler ID
        limit: Optional limit on results

    Returns:
        List of projects and itineraries
    """
    # Get projects from old system (user_id FK)
    projects = Project.query.filter_by(
        user_id=user_id,
        is_deleted=False
    ).all()

    # Get itineraries from new system (created_by_traveler_id FK)
    itineraries = Itinerary.query.filter_by(
        created_by_traveler_id=user_id,
        is_deleted=False
    ).all()

    # Combine and sort by created_at
    all_content = list(projects) + list(itineraries)
    all_content.sort(key=lambda x: x.created_at if x.created_at else '', reverse=True)

    return all_content if not limit else all_content[:limit]


def get_featured_content(limit=10):
    """
    Get featured content from both systems

    Args:
        limit: Maximum number of results

    Returns:
        List of featured projects and itineraries
    """
    # Get featured projects
    featured_projects = Project.query.filter_by(
        is_featured=True,
        is_deleted=False
    ).limit(limit).all()

    # Get featured itineraries
    featured_itineraries = Itinerary.query.filter_by(
        is_featured=True,
        is_deleted=False
    ).limit(limit).all()

    # Combine and limit
    featured = list(featured_projects) + list(featured_itineraries)
    return featured[:limit]


def count_user_content(user_id):
    """
    Count total content created by user across both tables

    Args:
        user_id: User or traveler ID

    Returns:
        Integer count of total content
    """
    project_count = Project.query.filter_by(
        user_id=user_id,
        is_deleted=False
    ).count()

    itinerary_count = Itinerary.query.filter_by(
        created_by_traveler_id=user_id,
        is_deleted=False
    ).count()

    return project_count + itinerary_count
