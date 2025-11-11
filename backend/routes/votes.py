"""
Vote routes
"""
from flask import Blueprint, request
from sqlalchemy.orm import joinedload

from extensions import db
from models.vote import Vote
from models.project import Project
from schemas.vote import VoteCreateSchema
from utils.decorators import token_required
from utils.helpers import success_response, error_response, get_pagination_params, paginated_response
from utils.scores import ProofScoreCalculator
from utils.cache import CacheService
from marshmallow import ValidationError

votes_bp = Blueprint('votes', __name__)


@votes_bp.route('', methods=['POST'])
@token_required
def cast_vote(user_id):
    """Cast or remove vote (FAST - uses Redis cache)"""
    from sqlalchemy.exc import OperationalError
    import time

    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            data = request.get_json()
            schema = VoteCreateSchema()
            validated_data = schema.load(data)

            project_id = validated_data['project_id']
            vote_type = validated_data['vote_type']

            # Use row-level locking to prevent deadlocks
            # This locks the project row for the duration of this transaction
            project = db.session.query(Project).with_for_update().get(project_id)
            if not project:
                return error_response('Not found', 'Project not found', 404)

            # ULTRA-FAST: Check Redis cache first for instant response
            from services.redis_cache_service import RedisUserCache
            has_upvoted_in_cache = RedisUserCache.has_upvoted(user_id, project_id)

            # Check database for ground truth
            existing_vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()

            # DEBUG: Log vote lookup
            print(f"[VOTE_DEBUG] Attempt {attempt + 1}/{max_retries}: User {user_id} voting on project {project_id}")
            print(f"[VOTE_DEBUG] Request vote_type: {vote_type}")
            print(f"[VOTE_DEBUG] Existing vote in DB: {existing_vote.vote_type if existing_vote else 'None'}")
            if existing_vote:
                print(f"[VOTE_DEBUG] → Action: {'REMOVE' if existing_vote.vote_type == vote_type else 'CHANGE'}")
            else:
                print(f"[VOTE_DEBUG] → Action: CREATE")

            if existing_vote:
                # If same type, remove vote
                if existing_vote.vote_type == vote_type:
                    if vote_type == 'up':
                        project.upvotes = max(0, project.upvotes - 1)
                        # Update Redis cache instantly
                        RedisUserCache.remove_upvote(user_id, project_id, sync_db=False)
                    else:
                        project.downvotes = max(0, project.downvotes - 1)

                    db.session.delete(existing_vote)
                    db.session.commit()

                    # Queue materialized view refresh (debounced to 5 seconds)
                    try:
                        from sqlalchemy import text
                        db.session.execute(text("SELECT queue_mv_refresh('mv_feed_projects', 'vote_removed')"))
                        db.session.commit()
                    except Exception as e:
                        # Don't fail vote if MV refresh queue fails
                        print(f"[WARNING] Failed to queue MV refresh: {e}")

                    CacheService.invalidate_project(project_id)
                    CacheService.invalidate_project_feed()  # Invalidate feed cache (user votes changed)
                    CacheService.invalidate_leaderboard()  # Vote removal affects leaderboard
                    CacheService.invalidate_user_votes(user_id)  # Invalidate user votes cache

                    # Emit Socket.IO event for real-time vote removal
                    from services.socket_service import SocketService
                    SocketService.emit_vote_removed(project_id)
                    SocketService.emit_leaderboard_updated()

                    return success_response(project.to_dict(include_creator=False, user_id=user_id), 'Vote removed', 200)
                else:
                    # Change vote type
                    if existing_vote.vote_type == 'up':
                        project.upvotes = max(0, project.upvotes - 1)
                        RedisUserCache.remove_upvote(user_id, project_id, sync_db=False)
                    else:
                        project.downvotes = max(0, project.downvotes - 1)

                    existing_vote.vote_type = vote_type

                    if vote_type == 'up':
                        project.upvotes += 1
                        # Add to Redis cache
                        RedisUserCache.add_upvote(user_id, project_id, sync_db=False)
                    else:
                        project.downvotes += 1
            else:
                # Create new vote
                vote = Vote(user_id=user_id, project_id=project_id, vote_type=vote_type)

                if vote_type == 'up':
                    project.upvotes += 1
                    # Add to Redis cache instantly
                    RedisUserCache.add_upvote(user_id, project_id, sync_db=False)
                else:
                    project.downvotes += 1

                db.session.add(vote)

            # Recalculate scores
            ProofScoreCalculator.update_project_scores(project)

            db.session.commit()

            # DEBUG: Verify vote was saved
            print(f"[VOTE_SAVED] Project {project_id}: upvotes={project.upvotes}, downvotes={project.downvotes}")

            # Verify the vote exists in database
            saved_vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()
            if saved_vote:
                print(f"[VOTE_VERIFIED] Vote found: {saved_vote.vote_type}")
            else:
                print(f"[VOTE_ERROR] Vote NOT found in DB after commit!")

            # Queue materialized view refresh (debounced to 5 seconds)
            try:
                from sqlalchemy import text
                db.session.execute(text("SELECT queue_mv_refresh('mv_feed_projects', 'vote_cast')"))
                db.session.commit()
            except Exception as e:
                # Don't fail vote if MV refresh queue fails
                print(f"[WARNING] Failed to queue MV refresh: {e}")

            CacheService.invalidate_project(project_id)
            CacheService.invalidate_project_feed()  # Invalidate feed cache (user votes changed)
            CacheService.invalidate_leaderboard()  # Vote affects leaderboard
            CacheService.invalidate_user_votes(user_id)  # Invalidate user votes cache

            # Emit Socket.IO event for real-time vote updates
            from services.socket_service import SocketService
            new_score = project.upvotes - project.downvotes
            SocketService.emit_vote_cast(project_id, vote_type, new_score)
            SocketService.emit_leaderboard_updated()

            # DEBUG: Show response data
            response_data = project.to_dict(include_creator=False, user_id=user_id)
            print(f"[VOTE_RESPONSE] Returning project {project_id}:")
            print(f"  upvotes={response_data.get('upvotes')}, downvotes={response_data.get('downvotes')}")
            print(f"  user_vote={response_data.get('user_vote')}")
            print(f"  voteCount={response_data.get('upvotes', 0) - response_data.get('downvotes', 0)}")

            return success_response(response_data, 'Vote recorded', 200)

        except ValidationError as e:
            return error_response('Validation error', str(e.messages), 400)
        except OperationalError as e:
            # Deadlock detected - retry with exponential backoff
            if 'deadlock' in str(e).lower() and attempt < max_retries - 1:
                print(f"[DEADLOCK] Retry attempt {attempt + 1}/{max_retries} after deadlock: {e}")
                db.session.rollback()
                time.sleep(0.1 * (attempt + 1))  # Exponential backoff: 0.1s, 0.2s, etc.
                last_error = e
                continue
            else:
                db.session.rollback()
                print(f"[DEADLOCK_FAILED] Max retries exceeded or non-deadlock error: {e}")
                return error_response('Error', f'Database deadlock after {max_retries} retries', 503)
        except Exception as e:
            db.session.rollback()
            print(f"[ERROR] Vote failed: {e}")
            return error_response('Error', str(e), 500)

    # Should not reach here, but handle just in case
    db.session.rollback()
    return error_response('Error', f'Vote failed after {max_retries} retries', 503)


@votes_bp.route('/user', methods=['GET'])
@token_required
def get_user_votes(user_id):
    """Get user's votes with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Check cache first
        cached = CacheService.get_cached_user_votes(user_id, page)
        if cached:
            return success_response(cached, 'User votes retrieved', 200)

        # OPTIMIZED: Eager load project to prevent N+1 queries
        query = Vote.query.filter_by(user_id=user_id)\
            .options(joinedload(Vote.project))

        total = query.count()
        votes = query.order_by(Vote.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'votes': [v.to_dict() for v in votes],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (10 minutes)
        CacheService.cache_user_votes(user_id, page, response_data, ttl=600)

        return success_response(response_data, 'User votes retrieved', 200)
    except Exception as e:
        return error_response('Error', str(e), 500)
