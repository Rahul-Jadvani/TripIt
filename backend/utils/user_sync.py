"""
User-Traveler Sync Utility
Ensures Users and Travelers tables stay in sync automatically
"""
from extensions import db
from models.user import User
from models.traveler import Traveler


def ensure_user_for_traveler(traveler_id: str) -> bool:
    """
    Ensure a User record exists for a Traveler (automatic sync)

    Args:
        traveler_id: ID of the traveler to sync

    Returns:
        bool: True if user was created or already exists, False on error
    """
    try:
        # Check if user already exists
        user = User.query.get(traveler_id)
        if user:
            print(f"[UserSync] User already exists for traveler {traveler_id}")
            return True

        # Get traveler
        traveler = Traveler.query.get(traveler_id)
        if not traveler:
            print(f"[UserSync] ERROR: Traveler {traveler_id} not found")
            return False

        # Create corresponding user record with SAME ID
        user = User(
            id=traveler.id,  # CRITICAL: Use same ID!
            username=traveler.username,
            email=traveler.email,
            email_verified=traveler.email_verified,
            password_hash=traveler.password_hash,
            display_name=traveler.display_name,
            bio=traveler.bio,
            avatar_url=traveler.avatar_url,
            is_admin=traveler.is_admin,
            is_active=traveler.is_active,
            created_at=traveler.created_at,
            updated_at=traveler.updated_at
        )

        db.session.add(user)
        db.session.commit()

        print(f"[UserSync] ✅ Auto-synced traveler → user: {traveler.username} (ID: {traveler_id})")
        return True

    except Exception as e:
        print(f"[UserSync] ❌ Failed to sync traveler {traveler_id}: {e}")
        db.session.rollback()
        return False


def ensure_traveler_for_user(user_id: str) -> bool:
    """
    Ensure a Traveler record exists for a User (reverse sync)

    Args:
        user_id: ID of the user to sync

    Returns:
        bool: True if traveler was created or already exists, False on error
    """
    try:
        # Check if traveler already exists
        traveler = Traveler.query.get(user_id)
        if traveler:
            print(f"[UserSync] Traveler already exists for user {user_id}")
            return True

        # Get user
        user = User.query.get(user_id)
        if not user:
            print(f"[UserSync] ERROR: User {user_id} not found")
            return False

        # Create corresponding traveler record with SAME ID
        traveler = Traveler(
            id=user.id,  # CRITICAL: Use same ID!
            username=user.username,
            email=user.email,
            email_verified=user.email_verified,
            password_hash=user.password_hash,
            display_name=user.display_name,
            bio=user.bio,
            avatar_url=user.avatar_url,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            # Travel-specific defaults
            travel_interests=[],
            total_trips_count=0,
            total_km_traveled=0.0,
            traveler_reputation_score=0.0,
            women_guide_certified=False
        )

        db.session.add(traveler)
        db.session.commit()

        print(f"[UserSync] ✅ Auto-synced user → traveler: {user.username} (ID: {user_id})")
        return True

    except Exception as e:
        print(f"[UserSync] ❌ Failed to sync user {user_id}: {e}")
        db.session.rollback()
        return False
