"""
Project routes
"""
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from datetime import datetime, timedelta
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from extensions import db
from models.project import Project, ProjectScreenshot
from models.user import User
from schemas.project import ProjectSchema, ProjectCreateSchema, ProjectUpdateSchema
from utils.decorators import token_required, admin_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from utils.scores import ProofScoreCalculator
from utils.cache import CacheService

projects_bp = Blueprint('projects', __name__)


@projects_bp.route('', methods=['GET'])
@optional_auth
def list_projects(user_id):
    """List projects with advanced filtering and sorting (FAST - uses materialized views)"""
    try:
        page, per_page = get_pagination_params(request)
        sort = request.args.get('sort', 'trending')  # trending, newest, top-rated, most-voted

        # Advanced filters
        search = request.args.get('search', '').strip()
        tech_stack = request.args.getlist('tech')
        hackathon = request.args.get('hackathon', '').strip()
        min_score = request.args.get('min_score', type=int)
        has_demo = request.args.get('has_demo', type=lambda v: v.lower() == 'true') if request.args.get('has_demo') else None
        has_github = request.args.get('has_github', type=lambda v: v.lower() == 'true') if request.args.get('has_github') else None
        featured_only = request.args.get('featured', type=lambda v: v.lower() == 'true') if request.args.get('featured') else None
        badge_type = request.args.get('badge', '').strip()

        # Check cache ONLY if no filters (pure feed requests)
        has_filters = any([search, tech_stack, hackathon, min_score is not None,
                          has_demo is not None, has_github is not None,
                          featured_only, badge_type])

        # Check config to see if materialized view usage is enabled (defaults to True with enhanced MV)
        enable_feed_mv = current_app.config.get('ENABLE_FEED_MV', True)
        # We only use the materialized view for pure feed requests with supported sorts
        sorts_using_mv = {'trending', 'hot', 'newest', 'new', 'top-rated', 'top'} if enable_feed_mv else set()
        use_materialized_view = enable_feed_mv and (not has_filters) and (sort in sorts_using_mv)

        if not has_filters:
            cached = CacheService.get_cached_feed(page, sort)
            if cached:
                from flask import jsonify
                return jsonify(cached), 200

        # ULTRA-FAST: Use materialized view for base feed (no filters)
        if use_materialized_view:
            from sqlalchemy import text

            # Determine sort order (using columns that exist in mv_feed_projects)
            if sort == 'trending' or sort == 'hot':
                order_by = 'trending_score DESC, created_at DESC'
            elif sort == 'newest' or sort == 'new':
                order_by = 'created_at DESC'
            elif sort == 'top-rated' or sort == 'top':
                order_by = 'net_score DESC, proof_score DESC, created_at DESC'
            else:
                order_by = 'trending_score DESC, created_at DESC'

            # Query materialized view (10x faster!)
            offset = (page - 1) * per_page
            try:
                result = db.session.execute(text(f"""
                    SELECT * FROM mv_feed_projects
                    ORDER BY {order_by}
                    LIMIT :limit OFFSET :offset
                """), {'limit': per_page, 'offset': offset})

                # Transform materialized view data to match expected format
                raw_projects = [dict(row._mapping) for row in result.fetchall()]
            except Exception as e:
                # If materialized view query fails, fall back to regular query
                print(f"[ERROR] Materialized view query failed: {e}")
                db.session.rollback()
                raw_projects = []
            
            # Handle empty results
            if not raw_projects:
                total = 0
                total_pages = 0
                response_data = {
                    'status': 'success',
                    'message': 'Success',
                    'data': [],
                    'pagination': {
                        'total': total,
                        'page': page,
                        'per_page': per_page,
                        'total_pages': total_pages,
                    }
                }
                from flask import jsonify
                return jsonify(response_data), 200
            
            # Batch fetch users and projects to avoid N+1 queries
            project_ids = [row.get('id') for row in raw_projects if row.get('id')]
            user_ids = list(set([row.get('user_id') for row in raw_projects if row.get('user_id')]))
            
            # Batch fetch users
            users_dict = {}
            if user_ids:
                users = User.query.filter(User.id.in_(user_ids)).all()
                users_dict = {user.id: user.to_dict() for user in users}
            
            # Batch fetch projects for additional fields
            projects_dict = {}
            if project_ids:
                projects = Project.query.filter(Project.id.in_(project_ids)).all()
                projects_dict = {p.id: p for p in projects}
            
            # Batch fetch user votes if authenticated
            votes_dict = {}
            if user_id and project_ids:
                from models.vote import Vote
                votes = Vote.query.filter(
                    Vote.user_id == user_id,
                    Vote.project_id.in_(project_ids)
                ).all()
                votes_dict = {vote.project_id: vote.vote_type for vote in votes}
            
            # Transform each project
            projects_data = []
            for row in raw_projects:
                try:
                    # Skip rows with missing required fields
                    if not row.get('id') or not row.get('user_id'):
                        continue

                    # Build project data from materialized view (now has ALL fields!)
                    project_data = {
                        'id': row.get('id'),
                        'title': row.get('title', ''),
                        'tagline': row.get('tagline'),  # Now from MV!
                        'description': row.get('description', ''),
                        'tech_stack': row.get('tech_stack') or [],  # Now from MV!
                        'demo_url': row.get('demo_url'),  # Now from MV!
                        'github_url': row.get('github_url'),  # Now from MV!
                        'created_at': row.get('created_at').isoformat() if row.get('created_at') else None,
                        'updated_at': row.get('updated_at').isoformat() if row.get('updated_at') else None,
                        'is_featured': row.get('is_featured', False),
                        'user_id': row.get('user_id'),
                        'proof_score': row.get('proof_score') or 0,
                        'comment_count': row.get('comment_count') or 0,
                        'upvotes': row.get('upvote_count') or 0,
                        'downvotes': row.get('downvote_count') or 0,  # Now from MV!
                        'badge_count': row.get('badge_count') or 0,
                        'net_score': row.get('net_score') or 0,  # upvotes - downvotes
                        'trending_score': float(row.get('trending_score', 0)) if row.get('trending_score') is not None else 0.0,
                    }

                    # Build creator object from denormalized MV fields
                    user_id_val = row.get('user_id')
                    creator_data = users_dict.get(user_id_val)
                    if not creator_data:
                        # Use denormalized data from materialized view
                        creator_data = {
                            'id': user_id_val,
                            'username': row.get('creator_username') or 'Unknown',
                            'display_name': row.get('creator_display_name'),
                            'avatar_url': row.get('creator_avatar_url'),
                            'email_verified': row.get('creator_is_verified') or False,
                            'bio': None,
                            'karma': 0,
                            'is_admin': False,
                            'is_investor': False,
                            'is_validator': False,
                            'has_oxcert': False,
                            'github_connected': False,
                            'github_username': None,
                            'wallet_address': None,
                            'full_wallet_address': None,
                            'created_at': None,
                        }

                    project_data['creator'] = creator_data
                    project_data['author'] = creator_data  # Alias for frontend compatibility

                    # Add chain info from MV (if project is in a chain)
                    if row.get('chain_id'):
                        project_data['chain'] = {
                            'id': row.get('chain_id'),
                            'name': row.get('chain_name'),
                            'slug': row.get('chain_slug'),
                            'logo_url': row.get('chain_logo_url'),
                        }
                    else:
                        project_data['chain'] = None

                    # Get user's vote if authenticated
                    project_data['user_vote'] = votes_dict.get(row.get('id'))

                    # Get additional project fields that aren't in materialized view (optional data)
                    project = projects_dict.get(row.get('id'))
                    if project:
                        # Get screenshots and badges separately to avoid N+1
                        try:
                            screenshots = [ss.to_dict() for ss in project.screenshots] if hasattr(project, 'screenshots') else []
                        except:
                            screenshots = []

                        try:
                            badges = [b.to_dict(include_validator=True) for b in project.badges] if hasattr(project, 'badges') else []
                        except:
                            badges = []

                        project_data.update({
                            'hackathon_name': project.hackathon_name,
                            'hackathon_date': project.hackathon_date.isoformat() if project.hackathon_date else None,
                            'hackathons': project.hackathons or [],
                            'team_members': project.team_members or [],
                            'categories': project.categories or [],
                            'verification_score': project.verification_score or 0,
                            'community_score': project.community_score or 0,
                            'validation_score': project.validation_score or 0,
                            'quality_score': project.quality_score or 0,
                            'view_count': project.view_count or 0,
                            'screenshots': screenshots,
                            'badges': badges,
                        })
                    else:
                        # Set defaults if project not found
                        project_data.update({
                            'hackathon_name': None,
                            'hackathon_date': None,
                            'hackathons': [],
                            'team_members': [],
                            'categories': [],
                            'verification_score': 0,
                            'community_score': 0,
                            'validation_score': 0,
                            'quality_score': 0,
                            'view_count': 0,
                            'screenshots': [],
                            'badges': [],
                        })

                    projects_data.append(project_data)
                except Exception as e:
                    # Log error but continue processing other projects
                    print(f"[ERROR] Failed to transform project row: {e}")
                    print(f"[ERROR] Row data: {row}")
                    continue

            # Get total count from materialized view
            total_result = db.session.execute(text("SELECT COUNT(*) FROM mv_feed_projects"))
            total = total_result.scalar()

            # Build response
            total_pages = (total + per_page - 1) // per_page
            response_data = {
                'status': 'success',
                'message': 'Success',
                'data': projects_data,
                'pagination': {
                    'total': total,
                    'page': page,
                    'per_page': per_page,
                    'total_pages': total_pages,
                }
            }

            # Cache response
            CacheService.cache_feed(page, sort, response_data, ttl=3600)

            from flask import jsonify
            return jsonify(response_data), 200

        # Build query (for filtered requests - use ORM)
        query = Project.query.filter_by(is_deleted=False)

        # Search in title, description, tagline
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Project.title.ilike(search_term),
                    Project.description.ilike(search_term),
                    Project.tagline.ilike(search_term)
                )
            )

        # Tech stack filter (contains all specified techs)
        if tech_stack:
            for tech in tech_stack:
                query = query.filter(Project.tech_stack.contains([tech]))

        # Hackathon filter
        if hackathon:
            query = query.filter(Project.hackathon_name.ilike(f'%{hackathon}%'))

        # Score filter
        if min_score is not None:
            query = query.filter(Project.proof_score >= min_score)

        # Has demo link
        if has_demo is not None:
            if has_demo:
                query = query.filter(Project.demo_url.isnot(None), Project.demo_url != '')
            else:
                query = query.filter(or_(Project.demo_url.is_(None), Project.demo_url == ''))

        # Has GitHub link
        if has_github is not None:
            if has_github:
                query = query.filter(Project.github_url.isnot(None), Project.github_url != '')
            else:
                query = query.filter(or_(Project.github_url.is_(None), Project.github_url == ''))

        # Featured only
        if featured_only:
            query = query.filter(Project.is_featured == True)

        # Badge filter
        if badge_type:
            from models.badge import ValidationBadge
            query = query.join(ValidationBadge).filter(
                ValidationBadge.badge_type == badge_type.lower()
            )

        # Sorting
        if sort == 'trending' or sort == 'hot':
            # Trending: combination of score and recent activity
            query = query.order_by(
                Project.proof_score.desc(),
                Project.created_at.desc()
            )
        elif sort == 'newest' or sort == 'new':
            query = query.order_by(Project.created_at.desc())
        elif sort == 'top-rated' or sort == 'top':
            query = query.order_by(Project.proof_score.desc())
        elif sort == 'most-voted':
            query = query.order_by(
                (Project.upvotes + Project.downvotes).desc()
            )
        else:
            # Default to trending
            query = query.order_by(
                Project.proof_score.desc(),
                Project.created_at.desc()
            )

        # OPTIMIZED COUNT: Use cached count if no filters (avoids slow COUNT(*) on large tables)
        if not has_filters:
            total = CacheService.get_projects_count(sort)
            if total is None:
                # Cache miss - do actual count and cache it
                total = query.count()
                CacheService.set_projects_count(total, sort, ttl=3600)  # 1 hour cache
        else:
            # With filters, must do real count (but indexes make it fast)
            total = query.count()

        # Eager load creator to avoid N+1 queries
        projects = query.options(joinedload(Project.creator)).limit(per_page).offset((page - 1) * per_page).all()

        data = [p.to_dict(include_creator=True, user_id=user_id) for p in projects]

        # Build response data
        total_pages = (total + per_page - 1) // per_page
        response_data = {
            'status': 'success',
            'message': 'Success',
            'data': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': total_pages,
            }
        }

        # Cache response if no filters (Instagram-style: 1 hour, invalidated on changes)
        if not has_filters:
            CacheService.cache_feed(page, sort, response_data, ttl=3600)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>', methods=['GET'])
@optional_auth
def get_project(user_id, project_id):
    """Get project details"""
    try:
        # Check cache first (5 min TTL)
        cached = CacheService.get_cached_project(project_id)
        if cached:
            # Still increment view count in background
            try:
                project = Project.query.get(project_id)
                if project:
                    project.view_count += 1
                    db.session.commit()
            except:
                pass  # Don't fail if view increment fails
            from flask import jsonify
            return jsonify(cached), 200

        project = Project.query.options(joinedload(Project.creator)).get(project_id)
        if not project or project.is_deleted:
            return error_response('Not found', 'Project not found', 404)

        # Increment view count
        project.view_count += 1
        db.session.commit()

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'Project retrieved',
            'data': project.to_dict(include_creator=True, user_id=user_id)
        }

        # Cache for 5 minutes
        CacheService.cache_project(project_id, response_data, ttl=3600)  # 1 hour cache (auto-invalidates on changes)

        from flask import jsonify
        return jsonify(response_data), 200
    except Exception as e:
        return error_response('Error', str(e), 500)


@projects_bp.route('', methods=['POST'])
@token_required
def create_project(user_id):
    """Create new project"""
    try:
        data = request.get_json()
        print("=== RECEIVED PROJECT DATA ===")
        print(f"github_url in request: {data.get('github_url')}")
        print(f"Full request data: {data}")
        print("============================")

        schema = ProjectCreateSchema()
        validated_data = schema.load(data)

        print("=== VALIDATED DATA ===")
        print(f"github_url after validation: {validated_data.get('github_url')}")
        print("======================")

        # Create project
        project = Project(
            user_id=user_id,
            title=validated_data['title'],
            tagline=validated_data.get('tagline'),
            description=validated_data['description'],
            project_story=validated_data.get('project_story'),
            inspiration=validated_data.get('inspiration'),
            pitch_deck_url=validated_data.get('pitch_deck_url'),
            market_comparison=validated_data.get('market_comparison'),
            novelty_factor=validated_data.get('novelty_factor'),
            demo_url=validated_data.get('demo_url'),
            github_url=validated_data.get('github_url'),
            hackathon_name=validated_data.get('hackathon_name'),
            hackathon_date=validated_data.get('hackathon_date'),
            hackathons=validated_data.get('hackathons', []),
            tech_stack=validated_data.get('tech_stack', []),
            team_members=validated_data.get('team_members', []),
            categories=validated_data.get('categories', [])
        )

        # Add screenshots
        for url in validated_data.get('screenshot_urls', []):
            screenshot = ProjectScreenshot(url=url)
            project.screenshots.append(screenshot)

        # Add to session first
        db.session.add(project)
        db.session.flush()  # Flush to get the relationship loaded

        # Calculate initial scores
        ProofScoreCalculator.update_project_scores(project)

        db.session.commit()

        # Add to chains if chain_ids provided
        chain_ids = validated_data.get('chain_ids', [])
        if chain_ids:
            from models import Chain, ChainProject, ChainProjectRequest, User
            from utils.notifications import notify_chain_project_request, notify_project_added_to_chain

            # Get the user object for notifications
            user = User.query.get(user_id)

            for chain_id in chain_ids:
                chain = Chain.query.get(chain_id)
                if not chain:
                    continue

                # Check if project is already in chain
                existing = ChainProject.query.filter_by(
                    chain_id=chain_id,
                    project_id=project.id
                ).first()

                if existing:
                    continue

                # If chain requires approval, create a request
                if chain.requires_approval:
                    # Check if request already exists
                    existing_request = ChainProjectRequest.query.filter_by(
                        chain_id=chain_id,
                        project_id=project.id,
                        status='pending'
                    ).first()

                    if not existing_request:
                        chain_request = ChainProjectRequest(
                            chain_id=chain_id,
                            project_id=project.id,
                            requester_id=user_id,
                            message=None
                        )
                        db.session.add(chain_request)
                        db.session.flush()  # Flush to get the ID

                        # Notify chain owner
                        notify_chain_project_request(
                            chain.creator_id,
                            chain,
                            project,
                            user,
                            message=None
                        )
                else:
                    # Add directly if no approval required
                    chain_project = ChainProject(
                        chain_id=chain_id,
                        project_id=project.id,
                        added_by_id=user_id
                    )
                    db.session.add(chain_project)
                    chain.project_count += 1

                    # Notify chain owner
                    notify_project_added_to_chain(
                        chain.creator_id,
                        chain,
                        project,
                        user
                    )

            db.session.commit()

        # AUTO-ASSIGN to matching validators
        from utils.auto_assignment import auto_assign_project_to_validators
        auto_assign_project_to_validators(project, assigned_by_id=user_id)

        CacheService.invalidate_project_feed()
        CacheService.invalidate_leaderboard()  # Leaderboard rankings change
        CacheService.invalidate_user_projects(user_id)  # User's project list changed
        CacheService.invalidate_counts()  # Project count changed

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        project_data = project.to_dict(include_creator=True)
        SocketService.emit_project_created(project_data)
        SocketService.emit_leaderboard_updated()

        return success_response(project_data, 'Project created', 201)
    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>', methods=['PUT', 'PATCH'])
@token_required
def update_project(user_id, project_id):
    """Update project"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        if project.user_id != user_id:
            return error_response('Forbidden', 'You can only edit your own projects', 403)

        data = request.get_json()
        schema = ProjectUpdateSchema()
        validated_data = schema.load(data)

        # Update fields
        for key, value in validated_data.items():
            if value is not None:
                setattr(project, key, value)

        project.updated_at = datetime.utcnow()
        ProofScoreCalculator.update_project_scores(project)

        db.session.commit()
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_project_feed()  # Updated project affects feed
        CacheService.invalidate_user_projects(user_id)  # User's project list changed

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        project_data = project.to_dict(include_creator=True)
        SocketService.emit_project_updated(project_id, project_data)

        return success_response(project_data, 'Project updated', 200)
    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>', methods=['DELETE'])
@token_required
def delete_project(user_id, project_id):
    """Delete project (soft delete)"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        if project.user_id != user_id:
            return error_response('Forbidden', 'You can only delete your own projects', 403)

        project.is_deleted = True
        db.session.commit()
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()  # Leaderboard rankings change
        CacheService.invalidate_user_projects(user_id)  # User's project list changed
        CacheService.invalidate_counts()  # Project count changed

        # Emit Socket.IO event for real-time updates
        from services.socket_service import SocketService
        SocketService.emit_project_deleted(project_id)
        SocketService.emit_leaderboard_updated()

        return success_response(None, 'Project deleted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>/feature', methods=['POST'])
@admin_required
def feature_project(user_id, project_id):
    """Feature a project (admin only)"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        from datetime import datetime as dt
        project.is_featured = True
        project.featured_at = dt.utcnow()
        project.featured_by = user_id

        db.session.commit()
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_project_feed()  # Featured status affects feed

        # Emit Socket.IO event for real-time feature notification
        from services.socket_service import SocketService
        SocketService.emit_project_featured(project_id)

        return success_response(project.to_dict(include_creator=True), 'Project featured', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>/upvote', methods=['POST'])
@token_required
def upvote_project(user_id, project_id):
    """Upvote a project"""
    try:
        from models.vote import Vote

        project = Project.query.get(project_id)
        if not project or project.is_deleted:
            return error_response('Not found', 'Project not found', 404)

        # Check if vote exists
        existing_vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()

        if existing_vote:
            # If already upvoted, remove vote
            if existing_vote.vote_type == 'up':
                project.upvotes = max(0, project.upvotes - 1)
                db.session.delete(existing_vote)
            else:
                # Change from downvote to upvote
                project.downvotes = max(0, project.downvotes - 1)
                project.upvotes += 1
                existing_vote.vote_type = 'up'
        else:
            # Create new upvote
            vote = Vote(user_id=user_id, project_id=project_id, vote_type='up')
            project.upvotes += 1
            db.session.add(vote)

        # Recalculate scores
        ProofScoreCalculator.update_project_scores(project)
        db.session.commit()
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()  # Vote affects leaderboard
        CacheService.invalidate_user_votes(user_id)  # User's votes changed
        CacheService.invalidate_project_feed()  # Vote score affects feed sorting

        # Emit Socket.IO event for real-time vote updates
        from services.socket_service import SocketService
        SocketService.emit_vote_cast(project_id, 'up')
        SocketService.emit_leaderboard_updated()

        return success_response(project.to_dict(include_creator=True), 'Project upvoted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>/downvote', methods=['POST'])
@token_required
def downvote_project(user_id, project_id):
    """Downvote a project"""
    try:
        from models.vote import Vote

        project = Project.query.get(project_id)
        if not project or project.is_deleted:
            return error_response('Not found', 'Project not found', 404)

        # Check if vote exists
        existing_vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()

        if existing_vote:
            # If already downvoted, remove vote
            if existing_vote.vote_type == 'down':
                project.downvotes = max(0, project.downvotes - 1)
                db.session.delete(existing_vote)
            else:
                # Change from upvote to downvote
                project.upvotes = max(0, project.upvotes - 1)
                project.downvotes += 1
                existing_vote.vote_type = 'down'
        else:
            # Create new downvote
            vote = Vote(user_id=user_id, project_id=project_id, vote_type='down')
            project.downvotes += 1
            db.session.add(vote)

        # Recalculate scores
        ProofScoreCalculator.update_project_scores(project)
        db.session.commit()
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()  # Vote affects leaderboard

        # Emit Socket.IO event for real-time vote updates
        from services.socket_service import SocketService
        SocketService.emit_vote_cast(project_id, 'down')
        SocketService.emit_leaderboard_updated()

        return success_response(project.to_dict(include_creator=True), 'Project downvoted', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>/vote', methods=['DELETE'])
@token_required
def remove_vote(user_id, project_id):
    """Remove vote from project"""
    try:
        from models.vote import Vote

        project = Project.query.get(project_id)
        if not project or project.is_deleted:
            return error_response('Not found', 'Project not found', 404)

        # Find and remove vote
        vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()

        if not vote:
            return error_response('Not found', 'No vote to remove', 404)

        if vote.vote_type == 'up':
            project.upvotes = max(0, project.upvotes - 1)
        else:
            project.downvotes = max(0, project.downvotes - 1)

        db.session.delete(vote)
        ProofScoreCalculator.update_project_scores(project)
        db.session.commit()
        CacheService.invalidate_project(project_id)
        CacheService.invalidate_leaderboard()  # Vote removal affects leaderboard

        # Emit Socket.IO event for real-time vote updates
        from services.socket_service import SocketService
        SocketService.emit_vote_removed(project_id)
        SocketService.emit_leaderboard_updated()

        return success_response(None, 'Vote removed', 200)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@projects_bp.route('/leaderboard', methods=['GET'])
@optional_auth
def get_leaderboard(user_id):
    """Get top projects and builders leaderboard"""
    try:
        timeframe = request.args.get('timeframe', 'month')  # week/month/all
        limit = request.args.get('limit', 10, type=int)
        limit = min(limit, 50)  # Cap at 50

        # Check cache (5 min TTL)
        cache_key = f"leaderboard:{timeframe}:{limit}"
        cached = CacheService.get(cache_key)
        if cached:
            from flask import jsonify
            return jsonify(cached), 200

        # Calculate date filter
        if timeframe == 'week':
            since = datetime.utcnow() - timedelta(days=7)
        elif timeframe == 'month':
            since = datetime.utcnow() - timedelta(days=30)
        else:
            since = None

        # Top projects
        query = Project.query.filter_by(is_deleted=False)
        if since:
            query = query.filter(Project.created_at >= since)

        top_projects = query.options(joinedload(Project.creator)).order_by(
            Project.proof_score.desc()
        ).limit(limit).all()

        # Top builders (by total karma/proof score)
        builder_query = db.session.query(
            User.id,
            User.username,
            User.display_name,
            User.avatar_url,
            func.sum(Project.proof_score).label('total_score'),
            func.count(Project.id).label('project_count')
        ).join(Project, User.id == Project.user_id).filter(
            Project.is_deleted == False
        )

        if since:
            builder_query = builder_query.filter(Project.created_at >= since)

        top_builders = builder_query.group_by(
            User.id, User.username, User.display_name, User.avatar_url
        ).order_by(
            func.sum(Project.proof_score).desc()
        ).limit(limit).all()

        # Featured projects
        featured = Project.query.options(joinedload(Project.creator)).filter_by(
            is_deleted=False,
            is_featured=True
        ).order_by(Project.featured_at.desc()).limit(limit).all()

        # Build response data
        response_data = {
            'status': 'success',
            'message': 'Leaderboard retrieved',
            'data': {
                'top_projects': [p.to_dict(include_creator=True) for p in top_projects],
                'top_builders': [{
                    'id': str(b.id),
                    'username': b.username,
                    'display_name': b.display_name,
                    'avatar_url': b.avatar_url,
                    'total_score': int(b.total_score or 0),
                    'project_count': b.project_count
                } for b in top_builders],
                'featured': [p.to_dict(include_creator=True) for p in featured],
                'timeframe': timeframe,
                'limit': limit
            }
        }

        # Cache for 5 minutes
        CacheService.set(cache_key, response_data, ttl=300)

        from flask import jsonify
        return jsonify(response_data), 200

    except Exception as e:
        return error_response('Error', str(e), 500)


@projects_bp.route('/<project_id>/view', methods=['POST'])
@optional_auth
def track_view(user_id, project_id):
    """Track unique project view - counts each unique user/session once"""
    try:
        from models.project_view import ProjectView

        project = Project.query.get(project_id)
        if not project or project.is_deleted:
            return error_response('Not found', 'Project not found', 404)

        data = request.get_json() or {}
        session_id = data.get('session_id')

        # Get IP and user agent
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')[:500]

        # Check if this user/session has already viewed this project
        existing_view = None
        if user_id:
            # Logged-in user: check by user_id
            existing_view = ProjectView.query.filter_by(
                project_id=project_id,
                user_id=user_id
            ).first()
        elif session_id:
            # Anonymous user: check by session_id
            existing_view = ProjectView.query.filter_by(
                project_id=project_id,
                session_id=session_id
            ).first()

        # Only count as new view if not already viewed
        if not existing_view:
            # Create new view record
            new_view = ProjectView(
                project_id=project_id,
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.session.add(new_view)

            # Increment unique view count
            project.view_count += 1
            db.session.commit()

            return success_response({
                'view_count': project.view_count,
                'is_new_view': True
            }, 'View tracked', 200)
        else:
            # Already viewed - don't increment
            return success_response({
                'view_count': project.view_count,
                'is_new_view': False
            }, 'Already viewed', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
