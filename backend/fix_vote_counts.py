"""
Fix vote counts - Clear Redis cache and rebuild from database
Run this to fix any incorrect vote counts
"""
import redis
from config import config
import os
from models.project import Project
from models.vote import Vote
from extensions import db
from app import create_app

# Create Flask app context
app = create_app()

with app.app_context():
    # Connect to Redis
    env = os.getenv("FLASK_ENV", "development")
    redis_url = config[env].REDIS_URL
    r = redis.from_url(redis_url, decode_responses=True)

    print("=" * 60)
    print("FIXING VOTE COUNTS")
    print("=" * 60)

    # Step 1: Clear all vote-related cache
    print("\n[1/3] Clearing Redis vote cache...")
    cursor = 0
    cleared = 0

    patterns = [
        "user:*:upvotes",
        "user:*:downvotes",
        "vote:state:*",
        "vote:request:*"
    ]

    for pattern in patterns:
        cursor = 0
        while True:
            cursor, keys = r.scan(cursor, match=pattern, count=100)
            if keys:
                r.delete(*keys)
                cleared += len(keys)
            if cursor == 0:
                break

    print(f"   Cleared {cleared} Redis keys")

    # Step 2: Recalculate vote counts from database
    print("\n[2/3] Recalculating vote counts from database...")

    projects = Project.query.all()
    fixed = 0

    for project in projects:
        # Count actual votes from database
        upvotes = Vote.query.filter_by(project_id=project.id, vote_type='up').count()
        downvotes = Vote.query.filter_by(project_id=project.id, vote_type='down').count()

        # Update if different
        if project.upvotes != upvotes or project.downvotes != downvotes:
            print(f"   Fixing {project.title[:50]}...")
            print(f"      Old: {project.upvotes} up, {project.downvotes} down")
            print(f"      New: {upvotes} up, {downvotes} down")

            project.upvotes = upvotes
            project.downvotes = downvotes
            fixed += 1

    # Commit all changes
    db.session.commit()
    print(f"\n   Fixed {fixed} projects")

    # Step 3: Clear application cache
    print("\n[3/3] Clearing application cache...")
    from utils.cache import CacheService
    CacheService.invalidate_project_feed()
    CacheService.invalidate_leaderboard()
    print("   Application cache cleared")

    print("\n" + "=" * 60)
    print("DONE! Vote counts fixed.")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Refresh your browser")
    print("2. Vote counts should now be correct")
    print("3. New votes will work properly")
