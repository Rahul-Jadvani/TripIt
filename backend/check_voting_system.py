"""
Quick script to verify voting system is working
"""
from app import create_app
from extensions import db
from sqlalchemy import text
import redis

app = create_app()

with app.app_context():
    print("\n=== VOTING SYSTEM CHECK ===\n")

    # 1. Check Redis connection
    try:
        from config import config
        import os
        redis_url = config[os.getenv("FLASK_ENV", "development")].REDIS_URL
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()
        print("✓ Redis: Connected")

        # Check if there are any vote-related keys
        vote_keys = r.keys("vote:*")
        changed_posts = r.smembers("changed_posts")
        print(f"  - Vote keys in Redis: {len(vote_keys)}")
        print(f"  - Changed posts pending sync: {len(changed_posts)}")
        if changed_posts:
            print(f"  - Projects to sync: {list(changed_posts)[:5]}")
    except Exception as e:
        print(f"✗ Redis: ERROR - {e}")
        print("  → Start Redis: redis-server")

    # 2. Check database tables
    try:
        # Check votes table
        result = db.session.execute(text("SELECT COUNT(*) FROM votes"))
        vote_count = result.scalar()
        print(f"\n✓ Database: Connected")
        print(f"  - Total votes in DB: {vote_count}")

        # Check vote_events table
        result = db.session.execute(text("SELECT COUNT(*) FROM vote_events"))
        event_count = result.scalar()
        print(f"  - Vote events logged: {event_count}")

        # Check projects table
        result = db.session.execute(text("SELECT COUNT(*) FROM projects WHERE upvotes > 0 OR downvotes > 0"))
        projects_with_votes = result.scalar()
        print(f"  - Projects with votes: {projects_with_votes}")

    except Exception as e:
        print(f"✗ Database: ERROR - {e}")

    # 3. Check specific project (b5d6d2ae-9c33-40ad-8a94-08323877c304)
    project_id = "b5d6d2ae-9c33-40ad-8a94-08323877c304"
    print(f"\n=== Project {project_id[:8]}... ===")

    try:
        # Check DB
        result = db.session.execute(text("""
            SELECT upvotes, downvotes
            FROM projects
            WHERE id = :id
        """), {"id": project_id})
        row = result.fetchone()
        if row:
            print(f"  DB: {row[0]} upvotes, {row[1]} downvotes")
        else:
            print(f"  DB: Project not found")

        # Check Redis
        try:
            key = f"vote:state:{project_id}"
            redis_state = r.hgetall(key)
            if redis_state:
                print(f"  Redis: {redis_state.get('upvotes', 0)} upvotes, {redis_state.get('downvotes', 0)} downvotes")
            else:
                print(f"  Redis: No cached data")
        except:
            pass

        # Check votes table
        result = db.session.execute(text("""
            SELECT vote_type, COUNT(*)
            FROM votes
            WHERE project_id = :id
            GROUP BY vote_type
        """), {"id": project_id})
        votes = dict(result.fetchall())
        upvotes_count = votes.get('up', 0)
        downvotes_count = votes.get('down', 0)
        print(f"  Votes table: {upvotes_count} upvotes, {downvotes_count} downvotes")

    except Exception as e:
        print(f"  Error: {e}")

    print("\n=== RECOMMENDATIONS ===")
    print("1. Make sure Redis is running: redis-server")
    print("2. Restart backend: python app.py")
    print("3. Vote on a project and run this script again")
    print("\n")
