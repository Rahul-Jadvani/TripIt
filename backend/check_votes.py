from app import app
from extensions import db
from models.vote import Vote

with app.app_context():
    vote_count = Vote.query.count()
    print(f'=== VOTE DATABASE CHECK ===')
    print(f'Total votes in database: {vote_count}')

    if vote_count > 0:
        recent_votes = Vote.query.order_by(Vote.created_at.desc()).limit(5).all()
        print('\nMost recent 5 votes:')
        for v in recent_votes:
            print(f'  {v.vote_type.upper()} on itinerary {v.project_id[:12]}... by user {v.user_id[:12]}...')
            print(f'    Created: {v.created_at}')
    else:
        print('\n❌ NO VOTES FOUND IN DATABASE!')
        print('This confirms votes are NOT being created.')
        print('The migration may not have worked, or there is an error when voting.')
