"""
Utility functions for user management across User and Traveler tables
"""
from models.user import User
from models.traveler import Traveler
from sqlalchemy import and_, or_, func


def get_user_by_id(user_id):
    """
    Get user by ID from either User or Traveler table

    Args:
        user_id: User ID to search for

    Returns:
        User or Traveler object, or None if not found
    """
    # Try Traveler table first (Google OAuth users)
    user = Traveler.query.get(user_id)
    if user:
        return user

    # Fallback to User table (email/password users)
    return User.query.get(user_id)


def get_user_by_username_or_email(identifier, case_insensitive=True):
    """
    Get user by username or email from either table

    Args:
        identifier: Username or email to search for
        case_insensitive: If True, search is case-insensitive

    Returns:
        User or Traveler object, or None if not found
    """
    if case_insensitive:
        normalized = identifier.strip().lower()

        # Try Traveler table first
        user = Traveler.query.filter(
            and_(
                Traveler.is_active == True,
                or_(
                    func.lower(Traveler.username) == normalized,
                    func.lower(Traveler.email) == normalized
                )
            )
        ).first()

        if user:
            return user

        # Fallback to User table
        return User.query.filter(
            and_(
                User.is_active == True,
                or_(
                    func.lower(User.username) == normalized,
                    func.lower(User.email) == normalized
                )
            )
        ).first()
    else:
        # Exact match
        user = Traveler.query.filter(
            and_(
                Traveler.is_active == True,
                or_(
                    Traveler.username == identifier,
                    Traveler.email == identifier
                )
            )
        ).first()

        if user:
            return user

        return User.query.filter(
            and_(
                User.is_active == True,
                or_(
                    User.username == identifier,
                    User.email == identifier
                )
            )
        ).first()


def search_users(query, limit=50):
    """
    Search for users across both tables by username, display_name, or email

    Args:
        query: Search query string
        limit: Maximum number of results to return

    Returns:
        List of user objects from both tables
    """
    search_term = f'%{query}%'

    # Search Traveler table
    travelers = Traveler.query.filter(
        and_(
            Traveler.is_active == True,
            or_(
                Traveler.username.ilike(search_term),
                Traveler.display_name.ilike(search_term),
                Traveler.email.ilike(search_term)
            )
        )
    ).limit(limit).all()

    # Search User table
    users = User.query.filter(
        and_(
            User.is_active == True,
            or_(
                User.username.ilike(search_term),
                User.display_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    ).limit(limit).all()

    # Combine and trim to limit
    all_users = list(travelers) + list(users)
    return all_users[:limit]


def get_all_active_users(limit=None):
    """
    Get all active users from both tables

    Args:
        limit: Optional limit on total results

    Returns:
        List of all active user objects
    """
    # Get from Traveler table
    travelers_query = Traveler.query.filter_by(is_active=True)
    if limit:
        travelers_query = travelers_query.limit(limit)
    travelers = travelers_query.all()

    # Get from User table
    users_query = User.query.filter_by(is_active=True)
    if limit:
        remaining = limit - len(travelers)
        if remaining > 0:
            users_query = users_query.limit(remaining)
    users = users_query.all()

    return travelers + users
