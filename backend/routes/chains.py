"""
Chain routes - Subreddit-style project collections
"""
from flask import Blueprint, request
from marshmallow import ValidationError
from datetime import datetime
from uuid import uuid4

from extensions import db
from models.chain import Chain, ChainProject, ChainProjectRequest, ChainFollower
from models.project import Project
from models.user import User
from schemas.chain import (
    ChainCreateSchema, ChainUpdateSchema, AddProjectToChainSchema,
    RejectRequestSchema, ChainFilterSchema
)
from utils.decorators import token_required, admin_required, optional_auth
from utils.helpers import success_response, error_response, generate_slug, get_pagination_params
from utils.notifications import (
    notify_chain_new_project, notify_project_added_to_chain,
    notify_chain_project_request, notify_chain_request_approved,
    notify_chain_request_rejected, notify_chain_follower,
    notify_project_removed_from_chain, notify_chain_featured
)

chains_bp = Blueprint('chains', __name__)


@chains_bp.route('', methods=['POST'])
@token_required
def create_chain(user_id):
    """Create a new chain"""
    try:
        data = request.get_json()
        schema = ChainCreateSchema()
        validated_data = schema.load(data)

        name = validated_data['name']
        slug = generate_slug(name)

        # Check if name or slug already exists
        if Chain.query.filter_by(name=name).first():
            return error_response('Conflict', 'Chain name already exists', 409)

        if Chain.query.filter_by(slug=slug).first():
            # Add number suffix to make unique
            counter = 1
            while Chain.query.filter_by(slug=f"{slug}-{counter}").first():
                counter += 1
            slug = f"{slug}-{counter}"

        # Create chain
        chain = Chain(
            id=str(uuid4()),
            creator_id=user_id,
            name=name,
            slug=slug,
            description=validated_data['description'],
            banner_url=validated_data.get('banner_url'),
            logo_url=validated_data.get('logo_url'),
            categories=validated_data.get('categories', []),
            rules=validated_data.get('rules'),
            social_links=validated_data.get('social_links', {}),
            is_public=validated_data.get('is_public', True),
            requires_approval=validated_data.get('requires_approval', False)
        )

        db.session.add(chain)
        db.session.commit()

        return success_response(
            chain.to_dict(include_creator=True, user_id=user_id),
            'Chain created successfully',
            201
        )

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('', methods=['GET'])
@optional_auth
def list_chains(user_id=None):
    """List all chains with filters"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Get filter parameters
        sort = request.args.get('sort', 'trending')
        search = request.args.get('search', '').strip()
        category = request.args.get('category', '').strip()
        visibility = request.args.get('visibility', 'public')
        featured = request.args.get('featured', '').lower() == 'true'
        creator_id = request.args.get('creator_id', '').strip()

        # Build query
        query = Chain.query

        # Visibility filter (admins can see all)
        if visibility == 'private':
            if user_id:
                user = User.query.get(user_id)
                if not user or not user.is_admin:
                    query = query.filter(Chain.is_public == False, Chain.creator_id == user_id)
                else:
                    query = query.filter(Chain.is_public == False)
            else:
                return error_response('Unauthorized', 'Login required to view private chains', 401)
        elif visibility == 'public':
            query = query.filter(Chain.is_public == True)
        # visibility == 'all': no filter (admins only)

        # Active chains only
        query = query.filter(Chain.is_active == True)

        # Search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    Chain.name.ilike(search_pattern),
                    Chain.description.ilike(search_pattern)
                )
            )

        # Category filter
        if category:
            query = query.filter(Chain.categories.any(category))

        # Featured filter
        if featured:
            query = query.filter(Chain.is_featured == True)

        # Creator filter
        if creator_id:
            query = query.filter(Chain.creator_id == creator_id)

        # Sorting
        if sort == 'newest':
            query = query.order_by(Chain.created_at.desc())
        elif sort == 'most_projects':
            query = query.order_by(Chain.project_count.desc())
        elif sort == 'most_followers':
            query = query.order_by(Chain.follower_count.desc())
        elif sort == 'alphabetical':
            query = query.order_by(Chain.name.asc())
        else:  # trending (default)
            # Trending score: project_count * 0.6 + follower_count * 0.3 + view_count * 0.1
            query = query.order_by(
                (Chain.project_count * 0.6 + Chain.follower_count * 0.3 + Chain.view_count * 0.1).desc()
            )

        # Paginate
        total = query.count()
        chains = query.offset((page - 1) * per_page).limit(per_page).all()

        # Convert to dict
        chains_data = [chain.to_dict(include_creator=True, user_id=user_id) for chain in chains]

        return success_response({
            'chains': chains_data,
            'pagination': {
                'page': page,
                'limit': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }, 'Chains retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>', methods=['GET'])
@optional_auth
def get_chain(user_id, slug):
    """Get chain details by slug"""
    try:
        chain = Chain.query.filter_by(slug=slug, is_active=True).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check privacy
        if not chain.is_public:
            if not user_id:
                return error_response('Unauthorized', 'Login required', 401)

            # Owner and admins can always view
            if chain.creator_id != user_id:
                user = User.query.get(user_id)
                if not user or not user.is_admin:
                    # Check if user follows the chain
                    is_follower = ChainFollower.query.filter_by(
                        chain_id=chain.id,
                        user_id=user_id
                    ).first() is not None

                    if not is_follower:
                        return error_response('Forbidden', 'Access denied', 403)

        # Increment view count
        chain.view_count += 1
        db.session.commit()

        # Get stats
        total_upvotes = db.session.query(db.func.sum(Project.upvotes)).join(
            ChainProject, ChainProject.project_id == Project.id
        ).filter(ChainProject.chain_id == chain.id).scalar() or 0

        avg_proof_score = db.session.query(db.func.avg(Project.proof_score)).join(
            ChainProject, ChainProject.project_id == Project.id
        ).filter(ChainProject.chain_id == chain.id).scalar() or 0

        stats = {
            'total_views': chain.view_count,
            'total_upvotes': total_upvotes,
            'avg_proof_score': round(float(avg_proof_score), 1) if avg_proof_score else 0
        }

        return success_response({
            'chain': chain.to_dict(include_creator=True, user_id=user_id),
            'stats': stats
        }, 'Chain retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>', methods=['PUT'])
@token_required
def update_chain(user_id, slug):
    """Update chain (owner only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check ownership
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owner can update', 403)

        data = request.get_json()
        schema = ChainUpdateSchema()
        validated_data = schema.load(data)

        # Update name and slug if name changed
        if 'name' in validated_data and validated_data['name'] != chain.name:
            new_name = validated_data['name']
            new_slug = generate_slug(new_name)

            # Check if new name already exists
            if Chain.query.filter(Chain.name == new_name, Chain.id != chain.id).first():
                return error_response('Conflict', 'Chain name already exists', 409)

            chain.name = new_name
            chain.slug = new_slug

        # Update other fields
        if 'description' in validated_data:
            chain.description = validated_data['description']
        if 'banner_url' in validated_data:
            chain.banner_url = validated_data['banner_url']
        if 'logo_url' in validated_data:
            chain.logo_url = validated_data['logo_url']
        if 'categories' in validated_data:
            chain.categories = validated_data['categories']
        if 'rules' in validated_data:
            chain.rules = validated_data['rules']
        if 'social_links' in validated_data:
            chain.social_links = validated_data['social_links']
        if 'is_public' in validated_data:
            chain.is_public = validated_data['is_public']
        if 'requires_approval' in validated_data:
            chain.requires_approval = validated_data['requires_approval']

        chain.updated_at = datetime.utcnow()
        db.session.commit()

        return success_response(
            chain.to_dict(include_creator=True, user_id=user_id),
            'Chain updated successfully',
            200
        )

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>', methods=['DELETE'])
@token_required
def delete_chain(user_id, slug):
    """Delete chain (owner only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check ownership
        if chain.creator_id != user_id:
            user = User.query.get(user_id)
            if not user or not user.is_admin:
                return error_response('Forbidden', 'Only chain owner or admin can delete', 403)

        db.session.delete(chain)
        db.session.commit()

        return success_response(None, 'Chain deleted successfully', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


# ============================================================================
# CHAIN-PROJECT ASSOCIATION ROUTES
# ============================================================================

@chains_bp.route('/<slug>/projects', methods=['POST'])
@token_required
def add_project_to_chain(user_id, slug):
    """Add project to chain"""
    try:
        chain = Chain.query.filter_by(slug=slug, is_active=True).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        data = request.get_json()
        schema = AddProjectToChainSchema()
        validated_data = schema.load(data)

        project_id = validated_data['project_id']
        message = validated_data.get('message')

        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        # Only project owner can add their project
        if project.user_id != user_id:
            return error_response('Forbidden', 'Only project owner can add to chain', 403)

        # Check if already in chain
        if ChainProject.query.filter_by(chain_id=chain.id, project_id=project_id).first():
            return error_response('Conflict', 'Project already in chain', 409)

        # Check max chains limit (5)
        project_chain_count = ChainProject.query.filter_by(project_id=project_id).count()
        if project_chain_count >= 5:
            return error_response('Forbidden', 'Project can only be in 5 chains maximum', 403)

        # Check if private chain and user has access
        if not chain.is_public and chain.creator_id != user_id:
            user = User.query.get(user_id)
            if not user or not user.is_admin:
                is_follower = ChainFollower.query.filter_by(
                    chain_id=chain.id,
                    user_id=user_id
                ).first() is not None

                if not is_follower:
                    return error_response('Forbidden', 'Access denied to private chain', 403)

        # If requires approval, create request
        if chain.requires_approval:
            # Check if request already exists
            existing_request = ChainProjectRequest.query.filter_by(
                chain_id=chain.id,
                project_id=project_id,
                status='pending'
            ).first()

            if existing_request:
                return error_response('Conflict', 'Request already pending', 409)

            request_obj = ChainProjectRequest(
                id=str(uuid4()),
                chain_id=chain.id,
                project_id=project_id,
                requester_id=user_id,
                message=message
            )

            db.session.add(request_obj)
            db.session.commit()

            # Notify chain owner
            requester = User.query.get(user_id)
            notify_chain_project_request(chain.creator_id, chain, project, requester, message)

            return success_response(
                request_obj.to_dict(include_project=True, include_chain=True, include_requester=True),
                'Request submitted for approval',
                202
            )

        # Instant add
        chain_project = ChainProject(
            id=str(uuid4()),
            chain_id=chain.id,
            project_id=project_id,
            added_by_id=user_id
        )

        db.session.add(chain_project)

        # Update chain project count
        chain.project_count += 1

        db.session.commit()

        # Notify chain owner and followers
        actor = User.query.get(user_id)
        notify_project_added_to_chain(chain.creator_id, chain, project, actor)
        notify_chain_new_project(chain, project, actor)

        return success_response(
            chain_project.to_dict(include_project=True, include_chain=True),
            'Project added to chain',
            201
        )

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/projects/<project_id>', methods=['DELETE'])
@token_required
def remove_project_from_chain(user_id, slug, project_id):
    """Remove project from chain"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        chain_project = ChainProject.query.filter_by(
            chain_id=chain.id,
            project_id=project_id
        ).first()

        if not chain_project:
            return error_response('Not found', 'Project not in chain', 404)

        project = Project.query.get(project_id)

        # Check permission: project owner or chain owner can remove
        if project.user_id != user_id and chain.creator_id != user_id:
            return error_response('Forbidden', 'Only project owner or chain owner can remove', 403)

        db.session.delete(chain_project)

        # Update chain project count
        chain.project_count = max(0, chain.project_count - 1)

        db.session.commit()

        # Notify if chain owner removed someone else's project
        if chain.creator_id == user_id and project.user_id != user_id:
            notify_project_removed_from_chain(project.user_id, chain, project, user_id)

        return success_response(None, 'Project removed from chain', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/projects', methods=['GET'])
@optional_auth
def get_chain_projects(user_id, slug):
    """Get projects in chain with filters"""
    try:
        chain = Chain.query.filter_by(slug=slug, is_active=True).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check privacy
        if not chain.is_public:
            if not user_id:
                return error_response('Unauthorized', 'Login required', 401)
            if chain.creator_id != user_id:
                user = User.query.get(user_id)
                if not user or not user.is_admin:
                    is_follower = ChainFollower.query.filter_by(
                        chain_id=chain.id,
                        user_id=user_id
                    ).first() is not None
                    if not is_follower:
                        return error_response('Forbidden', 'Access denied', 403)

        page, per_page = get_pagination_params(request)

        # Get sort and filters
        sort = request.args.get('sort', 'trending')
        tech_stack = request.args.get('tech_stack', '').strip()
        min_proof_score = request.args.get('min_proof_score', 0, type=int)
        pinned_only = request.args.get('pinned_only', '').lower() == 'true'

        # Build query
        query = db.session.query(Project).join(
            ChainProject, ChainProject.project_id == Project.id
        ).filter(
            ChainProject.chain_id == chain.id,
            Project.is_deleted == False
        )

        # Filters
        if tech_stack:
            query = query.filter(Project.tech_stack.any(tech_stack))
        if min_proof_score > 0:
            query = query.filter(Project.proof_score >= min_proof_score)
        if pinned_only:
            query = query.filter(ChainProject.is_pinned == True)

        # Sorting
        if sort == 'newest':
            query = query.order_by(ChainProject.added_at.desc())
        elif sort == 'top_rated':
            query = query.order_by(Project.proof_score.desc())
        elif sort == 'most_voted':
            query = query.order_by(Project.upvotes.desc())
        elif sort == 'pinned_first':
            query = query.order_by(ChainProject.is_pinned.desc(), Project.trending_score.desc())
        else:  # trending (default)
            query = query.order_by(ChainProject.is_pinned.desc(), Project.trending_score.desc())

        # Paginate
        total = query.count()
        projects = query.offset((page - 1) * per_page).limit(per_page).all()

        # Convert to dict with chain metadata
        projects_data = []
        for project in projects:
            project_dict = project.to_dict(include_creator=True, user_id=user_id)

            # Add chain metadata
            chain_project = ChainProject.query.filter_by(
                chain_id=chain.id,
                project_id=project.id
            ).first()

            if chain_project:
                project_dict['chain_metadata'] = {
                    'added_at': chain_project.added_at.isoformat(),
                    'is_pinned': chain_project.is_pinned,
                    'added_by': chain_project.added_by.to_dict() if chain_project.added_by else None
                }

            projects_data.append(project_dict)

        return success_response({
            'projects': projects_data,
            'pagination': {
                'page': page,
                'limit': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }, 'Chain projects retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/projects/<project_id>/pin', methods=['POST'])
@token_required
def pin_project(user_id, slug, project_id):
    """Pin/unpin project in chain (owner only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check ownership
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owner can pin projects', 403)

        chain_project = ChainProject.query.filter_by(
            chain_id=chain.id,
            project_id=project_id
        ).first()

        if not chain_project:
            return error_response('Not found', 'Project not in chain', 404)

        # Toggle pin status
        chain_project.is_pinned = not chain_project.is_pinned

        db.session.commit()

        return success_response(
            {'is_pinned': chain_project.is_pinned},
            f"Project {'pinned' if chain_project.is_pinned else 'unpinned'}",
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


# ============================================================================
# CHAIN PROJECT REQUESTS (APPROVAL WORKFLOW)
# ============================================================================

@chains_bp.route('/<slug>/requests', methods=['GET'])
@token_required
def get_chain_requests(user_id, slug):
    """Get pending requests for chain (owner only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check ownership
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owner can view requests', 403)

        status = request.args.get('status', 'pending')

        requests = ChainProjectRequest.query.filter_by(
            chain_id=chain.id,
            status=status
        ).order_by(ChainProjectRequest.created_at.desc()).all()

        requests_data = [
            req.to_dict(include_project=True, include_chain=False, include_requester=True)
            for req in requests
        ]

        return success_response(
            {'requests': requests_data},
            'Requests retrieved successfully',
            200
        )

    except Exception as e:
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/requests/<request_id>/approve', methods=['POST'])
@token_required
def approve_request(user_id, slug, request_id):
    """Approve project request (owner only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check ownership
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owner can approve requests', 403)

        request_obj = ChainProjectRequest.query.get(request_id)
        if not request_obj or request_obj.chain_id != chain.id:
            return error_response('Not found', 'Request not found', 404)

        if request_obj.status != 'pending':
            return error_response('Conflict', 'Request already processed', 409)

        # Check if project still exists
        project = Project.query.get(request_obj.project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        # Check if already in chain
        if ChainProject.query.filter_by(chain_id=chain.id, project_id=project.id).first():
            return error_response('Conflict', 'Project already in chain', 409)

        # Create chain project
        chain_project = ChainProject(
            id=str(uuid4()),
            chain_id=chain.id,
            project_id=project.id,
            added_by_id=request_obj.requester_id
        )

        db.session.add(chain_project)

        # Update request status
        request_obj.status = 'approved'
        request_obj.reviewed_by_id = user_id
        request_obj.reviewed_at = datetime.utcnow()

        # Update chain project count
        chain.project_count += 1

        db.session.commit()

        # Notify requester and followers
        notify_chain_request_approved(request_obj.requester_id, chain, project)
        requester = User.query.get(request_obj.requester_id)
        notify_chain_new_project(chain, project, requester)

        return success_response(
            chain_project.to_dict(include_project=True, include_chain=True),
            'Request approved, project added to chain',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/requests/<request_id>/reject', methods=['POST'])
@token_required
def reject_request(user_id, slug, request_id):
    """Reject project request (owner only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check ownership
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owner can reject requests', 403)

        request_obj = ChainProjectRequest.query.get(request_id)
        if not request_obj or request_obj.chain_id != chain.id:
            return error_response('Not found', 'Request not found', 404)

        if request_obj.status != 'pending':
            return error_response('Conflict', 'Request already processed', 409)

        data = request.get_json() or {}
        schema = RejectRequestSchema()
        validated_data = schema.load(data)
        reason = validated_data.get('reason')

        # Update request status
        request_obj.status = 'rejected'
        request_obj.reviewed_by_id = user_id
        request_obj.reviewed_at = datetime.utcnow()
        request_obj.rejection_reason = reason

        db.session.commit()

        # Notify requester
        project = Project.query.get(request_obj.project_id)
        if project:
            notify_chain_request_rejected(request_obj.requester_id, chain, project, reason)

        return success_response(None, 'Request rejected', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


# ============================================================================
# CHAIN FOLLOWING
# ============================================================================

@chains_bp.route('/<slug>/follow', methods=['POST'])
@token_required
def follow_chain(user_id, slug):
    """Follow a chain"""
    try:
        chain = Chain.query.filter_by(slug=slug, is_active=True).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Check if private
        if not chain.is_public and chain.creator_id != user_id:
            return error_response('Forbidden', 'Cannot follow private chain', 403)

        # Check if already following
        if ChainFollower.query.filter_by(chain_id=chain.id, user_id=user_id).first():
            return error_response('Conflict', 'Already following', 409)

        follower = ChainFollower(
            id=str(uuid4()),
            chain_id=chain.id,
            user_id=user_id
        )

        db.session.add(follower)

        # Update chain follower count
        chain.follower_count += 1

        db.session.commit()

        # Notify chain owner
        user = User.query.get(user_id)
        notify_chain_follower(chain.creator_id, chain, user)

        return success_response(
            {'follower_count': chain.follower_count},
            'Following chain',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/follow', methods=['DELETE'])
@token_required
def unfollow_chain(user_id, slug):
    """Unfollow a chain"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        follower = ChainFollower.query.filter_by(chain_id=chain.id, user_id=user_id).first()
        if not follower:
            return error_response('Not found', 'Not following', 404)

        db.session.delete(follower)

        # Update chain follower count
        chain.follower_count = max(0, chain.follower_count - 1)

        db.session.commit()

        return success_response(
            {'follower_count': chain.follower_count},
            'Unfollowed chain',
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/followers', methods=['GET'])
@optional_auth
def get_chain_followers(user_id, slug):
    """Get chain followers"""
    try:
        chain = Chain.query.filter_by(slug=slug, is_active=True).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        page, per_page = get_pagination_params(request)

        query = ChainFollower.query.filter_by(chain_id=chain.id).order_by(
            ChainFollower.followed_at.desc()
        )

        total = query.count()
        followers = query.offset((page - 1) * per_page).limit(per_page).all()

        followers_data = [
            {
                'user': follower.user.to_dict(),
                'followed_at': follower.followed_at.isoformat()
            }
            for follower in followers
        ]

        return success_response({
            'followers': followers_data,
            'pagination': {
                'page': page,
                'limit': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }, 'Followers retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@chains_bp.route('/user/<user_id>/following', methods=['GET'])
@optional_auth
def get_user_following_chains(current_user_id, user_id):
    """Get chains that a user is following"""
    try:
        # Pagination
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('limit', 20))

        # Get followed chains
        query = db.session.query(Chain).join(
            ChainFollower, Chain.id == ChainFollower.chain_id
        ).filter(ChainFollower.user_id == user_id)

        # Filter by visibility
        if not current_user_id or current_user_id != user_id:
            # Only show public chains to others
            query = query.filter(Chain.is_public == True)

        # Order by most recently followed
        query = query.order_by(ChainFollower.followed_at.desc())

        # Get total count
        total = query.count()

        # Paginate
        chains = query.offset((page - 1) * per_page).limit(per_page).all()

        # Convert to dict
        chains_data = []
        for chain in chains:
            chain_dict = chain.to_dict()

            # Add is_following flag
            if current_user_id:
                is_following = ChainFollower.query.filter_by(
                    chain_id=chain.id,
                    user_id=current_user_id
                ).first() is not None
                chain_dict['is_following'] = is_following
            else:
                chain_dict['is_following'] = False

            chains_data.append(chain_dict)

        return success_response({
            'chains': chains_data,
            'pagination': {
                'page': page,
                'limit': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }, 'Following chains retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


# ============================================================================
# ADMIN ROUTES
# ============================================================================

@chains_bp.route('/<slug>/feature', methods=['POST'])
@admin_required
def feature_chain(user_id, slug):
    """Feature/unfeature chain (admin only)"""
    try:
        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not found', 'Chain not found', 404)

        # Toggle featured status
        chain.is_featured = not chain.is_featured

        db.session.commit()

        # Notify chain owner if featured
        if chain.is_featured:
            notify_chain_featured(chain.creator_id, chain)

        return success_response(
            {'is_featured': chain.is_featured},
            f"Chain {'featured' if chain.is_featured else 'unfeatured'}",
            200
        )

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@chains_bp.route('/<slug>/analytics', methods=['GET'])
@token_required
def get_chain_analytics(user_id, slug):
    """Get comprehensive analytics for a chain (owner only)"""
    try:
        from datetime import timedelta
        from sqlalchemy import func, cast, Date

        chain = Chain.query.filter_by(slug=slug).first()
        if not chain:
            return error_response('Not Found', 'Chain not found', 404)

        # Check if user is the owner
        if chain.creator_id != user_id:
            return error_response('Forbidden', 'Only chain owner can view analytics', 403)

        # Get date range (last 30 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)

        # 1. Follower Growth Over Time (last 30 days)
        follower_growth = db.session.query(
            cast(ChainFollower.followed_at, Date).label('date'),
            func.count(ChainFollower.id).label('count')
        ).filter(
            ChainFollower.chain_id == chain.id,
            ChainFollower.followed_at >= start_date
        ).group_by(cast(ChainFollower.followed_at, Date)).all()

        follower_growth_data = [
            {'date': str(row.date), 'count': row.count}
            for row in follower_growth
        ]

        # Calculate cumulative followers
        cumulative_followers = []
        total = chain.follower_count
        for i in range(30, -1, -1):
            date = (end_date - timedelta(days=i)).date()
            day_followers = sum(item['count'] for item in follower_growth_data if item['date'] == str(date))
            total_before = total - sum(item['count'] for item in follower_growth_data if item['date'] > str(date))
            cumulative_followers.append({
                'date': str(date),
                'followers': total_before
            })

        # 2. Project Addition Rate (last 30 days)
        projects_added = db.session.query(
            cast(ChainProject.added_at, Date).label('date'),
            func.count(ChainProject.id).label('count')
        ).filter(
            ChainProject.chain_id == chain.id,
            ChainProject.added_at >= start_date
        ).group_by(cast(ChainProject.added_at, Date)).all()

        projects_added_data = [
            {'date': str(row.date), 'count': row.count}
            for row in projects_added
        ]

        # 3. Top Performing Projects in Chain
        top_projects = db.session.query(
            Project, ChainProject
        ).join(
            ChainProject, Project.id == ChainProject.project_id
        ).filter(
            ChainProject.chain_id == chain.id
        ).order_by(
            Project.proof_score.desc()
        ).limit(10).all()

        top_projects_data = [
            {
                'id': project.id,
                'title': project.title,
                'proof_score': project.proof_score,
                'upvotes': project.upvotes,
                'downvotes': project.downvotes,
                'comment_count': project.comment_count,
                'view_count': project.view_count,
                'is_pinned': chain_project.is_pinned,
                'added_at': chain_project.added_at.isoformat()
            }
            for project, chain_project in top_projects
        ]

        # 4. Overall Stats
        total_projects = chain.project_count
        total_followers = chain.follower_count
        total_views = chain.view_count

        # Recent activity (last 7 days)
        recent_date = end_date - timedelta(days=7)
        recent_followers = ChainFollower.query.filter(
            ChainFollower.chain_id == chain.id,
            ChainFollower.followed_at >= recent_date
        ).count()

        recent_projects = ChainProject.query.filter(
            ChainProject.chain_id == chain.id,
            ChainProject.added_at >= recent_date
        ).count()

        # Pending requests
        pending_requests_count = ChainProjectRequest.query.filter_by(
            chain_id=chain.id,
            status='pending'
        ).count()

        # Average project score in chain
        avg_score = db.session.query(
            func.avg(Project.proof_score)
        ).join(
            ChainProject, Project.id == ChainProject.project_id
        ).filter(
            ChainProject.chain_id == chain.id
        ).scalar() or 0

        # 5. Engagement Metrics
        total_upvotes = db.session.query(
            func.sum(Project.upvotes)
        ).join(
            ChainProject, Project.id == ChainProject.project_id
        ).filter(
            ChainProject.chain_id == chain.id
        ).scalar() or 0

        total_comments = db.session.query(
            func.sum(Project.comment_count)
        ).join(
            ChainProject, Project.id == ChainProject.project_id
        ).filter(
            ChainProject.chain_id == chain.id
        ).scalar() or 0

        return success_response({
            'chain': {
                'id': chain.id,
                'name': chain.name,
                'slug': chain.slug,
                'created_at': chain.created_at.isoformat()
            },
            'overview': {
                'total_projects': total_projects,
                'total_followers': total_followers,
                'total_views': total_views,
                'average_project_score': round(float(avg_score), 2),
                'pending_requests': pending_requests_count
            },
            'recent_activity': {
                'followers_last_7_days': recent_followers,
                'projects_last_7_days': recent_projects
            },
            'engagement': {
                'total_upvotes': int(total_upvotes),
                'total_comments': int(total_comments),
                'engagement_rate': round((int(total_upvotes) + int(total_comments)) / max(total_projects, 1), 2)
            },
            'growth': {
                'follower_growth': follower_growth_data,
                'cumulative_followers': cumulative_followers,
                'projects_added': projects_added_data
            },
            'top_projects': top_projects_data
        }, 'Analytics retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@chains_bp.route('/recommendations', methods=['GET'])
@optional_auth
def get_chain_recommendations(user_id):
    """Get chain recommendations based on project categories"""
    try:
        categories = request.args.getlist('categories[]') or request.args.getlist('categories')

        if not categories:
            # Return popular chains if no categories provided
            chains = Chain.query.filter_by(
                is_public=True,
                is_active=True,
                status='active'
            ).order_by(
                Chain.follower_count.desc(),
                Chain.project_count.desc()
            ).limit(6).all()
        else:
            # Find chains that match the categories
            chains = Chain.query.filter(
                Chain.is_public == True,
                Chain.is_active == True,
                Chain.status == 'active',
                Chain.categories.overlap(categories)  # PostgreSQL array overlap operator
            ).order_by(
                Chain.follower_count.desc(),
                Chain.project_count.desc()
            ).limit(6).all()

            # If not enough matches, add popular chains
            if len(chains) < 3:
                additional_chains = Chain.query.filter(
                    Chain.is_public == True,
                    Chain.is_active == True,
                    Chain.status == 'active',
                    Chain.id.notin_([c.id for c in chains])
                ).order_by(
                    Chain.follower_count.desc()
                ).limit(6 - len(chains)).all()
                chains.extend(additional_chains)

        chains_data = []
        for chain in chains:
            chain_dict = chain.to_dict()

            # Add user-specific data if authenticated
            if user_id:
                is_following = ChainFollower.query.filter_by(
                    chain_id=chain.id,
                    user_id=user_id
                ).first() is not None
                chain_dict['is_following'] = is_following
            else:
                chain_dict['is_following'] = False

            chains_data.append(chain_dict)

        return success_response({
            'chains': chains_data,
            'count': len(chains_data)
        }, 'Recommendations retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
