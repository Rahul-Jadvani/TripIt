"""
Saved Projects Routes - Bookmarking functionality (supports both Projects and Itineraries)
"""
from flask import Blueprint, request, jsonify
from extensions import db
from models.saved_project import SavedProject
from models.project import Project
from models.itinerary import Itinerary
from utils.decorators import token_required
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from utils.cache import CacheService

saved_projects_bp = Blueprint('saved_projects', __name__, url_prefix='/api/saved')


@saved_projects_bp.route('/save/<project_id>', methods=['POST'])
@token_required
def save_project(user_id, project_id):
    """Save/bookmark a project or itinerary"""
    try:
        # Check if project or itinerary exists
        project = Project.query.get(project_id)
        if not project:
            # Try checking if it's an itinerary
            project = Itinerary.query.get(project_id)

        if not project or project.is_deleted:
            return error_response('Not found', 'Project not found', 404)

        # Check if already saved
        existing = SavedProject.query.filter_by(
            user_id=user_id,
            project_id=project_id
        ).first()

        if existing:
            return error_response('Error', 'Project already saved', 400)

        # Save project
        saved = SavedProject(user_id=user_id, project_id=project_id)
        db.session.add(saved)

        # Increment save count
        project.share_count += 1  # Using share_count field for saves as well

        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_user(user_id)

        # Emit Socket.IO event (optional)
        from services.socket_service import SocketService
        SocketService.emit_project_updated(project_id, project.to_dict(include_creator=True))

        return success_response({
            'saved': True,
            'project_id': project_id
        }, 'Project saved successfully', 201)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@saved_projects_bp.route('/unsave/<project_id>', methods=['DELETE'])
@token_required
def unsave_project(user_id, project_id):
    """Remove project/itinerary from saved/bookmarks"""
    try:
        saved = SavedProject.query.filter_by(
            user_id=user_id,
            project_id=project_id
        ).first()

        if not saved:
            return error_response('Not found', 'Project not in saved list', 404)

        db.session.delete(saved)

        # Decrement save count - try Project first, then Itinerary
        project = Project.query.get(project_id)
        if not project:
            project = Itinerary.query.get(project_id)

        if project and project.share_count > 0:
            project.share_count -= 1

        db.session.commit()

        # Invalidate cache
        CacheService.invalidate_user(user_id)

        # Emit Socket.IO event (optional)
        if project:
            from services.socket_service import SocketService
            SocketService.emit_project_updated(project_id, project.to_dict(include_creator=True))

        return success_response({
            'saved': False,
            'project_id': project_id
        }, 'Project removed from saved', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@saved_projects_bp.route('/itineraries', methods=['GET'])
@saved_projects_bp.route('/my-saved', methods=['GET'])
@token_required
def get_my_saved_projects(user_id):
    """Get user's saved/bookmarked projects/itineraries"""
    try:
        page, per_page = get_pagination_params(request)

        # Get all saved items for this user
        query = SavedProject.query.filter_by(user_id=user_id)\
            .order_by(SavedProject.created_at.desc())

        total = query.count()
        saved_items = query.limit(per_page).offset((page - 1) * per_page).all()

        # Load the actual project/itinerary for each saved item
        projects = []
        for saved in saved_items:
            # Try to load as Project first
            item = Project.query.get(saved.project_id)

            # If not found as Project, try as Itinerary
            if not item:
                item = Itinerary.query.get(saved.project_id)

            # Skip if not found or deleted
            if not item or item.is_deleted:
                continue

            # Convert to dict with creator info
            project_dict = item.to_dict(include_creator=True, user_id=user_id)
            project_dict['saved_at'] = saved.created_at.isoformat()
            projects.append(project_dict)

        return paginated_response(projects, total, page, per_page, 'Saved itineraries retrieved')

    except Exception as e:
        return error_response('Error', str(e), 500)


@saved_projects_bp.route('/check/<project_id>', methods=['GET'])
@token_required
def check_if_saved(user_id, project_id):
    """Check if user has saved a specific project"""
    try:
        saved = SavedProject.query.filter_by(
            user_id=user_id,
            project_id=project_id
        ).first()

        return success_response({
            'saved': saved is not None,
            'project_id': project_id
        }, 'Check completed', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
