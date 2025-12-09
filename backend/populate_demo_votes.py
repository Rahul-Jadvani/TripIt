"""
Populate demo votes for itineraries
"""
from app import app
from extensions import db
from models.vote import Vote
from models.itinerary import Itinerary
from models.user import User
import random
from uuid import uuid4
from datetime import datetime, timedelta

with app.app_context():
    print("=== POPULATING DEMO VOTES ===\n")

    # Get all itineraries
    itineraries = Itinerary.query.limit(50).all()
    print(f"Found {len(itineraries)} itineraries")

    # Get all users
    users = User.query.limit(100).all()
    print(f"Found {len(users)} users\n")

    if not users:
        print("❌ No users found - cannot create votes")
        exit(1)

    vote_count = 0

    for itinerary in itineraries:
        # Random number of votes for each itinerary (5-30)
        num_votes = random.randint(5, 30)

        # Random upvote ratio (60%-95%)
        upvote_ratio = random.uniform(0.6, 0.95)
        num_upvotes = int(num_votes * upvote_ratio)
        num_downvotes = num_votes - num_upvotes

        # Select random users for voting
        voters = random.sample(users, min(num_votes, len(users)))

        # Create upvotes
        for i in range(num_upvotes):
            if i >= len(voters):
                break

            # Check if vote already exists
            existing = Vote.query.filter_by(
                user_id=voters[i].id,
                project_id=itinerary.id
            ).first()

            if not existing:
                vote = Vote(
                    id=str(uuid4()),
                    user_id=voters[i].id,
                    project_id=itinerary.id,
                    vote_type='up',
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                )
                db.session.add(vote)
                vote_count += 1

        # Create downvotes
        for i in range(num_upvotes, num_upvotes + num_downvotes):
            if i >= len(voters):
                break

            existing = Vote.query.filter_by(
                user_id=voters[i].id,
                project_id=itinerary.id
            ).first()

            if not existing:
                vote = Vote(
                    id=str(uuid4()),
                    user_id=voters[i].id,
                    project_id=itinerary.id,
                    vote_type='down',
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                )
                db.session.add(vote)
                vote_count += 1

        # Update itinerary vote counts
        upvotes_count = Vote.query.filter_by(project_id=itinerary.id, vote_type='up').count()
        downvotes_count = Vote.query.filter_by(project_id=itinerary.id, vote_type='down').count()

        itinerary.upvotes = upvotes_count
        itinerary.downvotes = downvotes_count

        print(f"✅ {itinerary.title[:50]}... - {upvotes_count} up, {downvotes_count} down")

    # Commit all votes
    db.session.commit()

    print(f"\n✅ Created {vote_count} demo votes across {len(itineraries)} itineraries!")
    print(f"Total votes in database: {Vote.query.count()}")
