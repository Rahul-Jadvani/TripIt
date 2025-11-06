from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from extensions import db
from models.project_update import ProjectUpdate
from models.project import Project
from models.user import User
from utils.helpers import get_pagination_params
from utils.cache import CacheService
import uuid

project_updates_bp = Blueprint('project_updates', __name__)

@project_updates_bp.route('/projects/<project_id>/updates', methods=['POST'])
@jwt_required()
def create_project_update(project_id):
    """Create a new project update"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # Verify project exists
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # Verify user is project owner
        if project.user_id != user_id:
            return jsonify({'status': 'error', 'message': 'You can only post updates to your own projects'}), 403

        # Validate required fields
        if not data.get('title'):
            return jsonify({'status': 'error', 'message': 'Title is required'}), 400

        if not data.get('update_type'):
            return jsonify({'status': 'error', 'message': 'Update type is required'}), 400

        # Create update
        update = ProjectUpdate(
            id=str(uuid.uuid4()),
            project_id=project_id,
            user_id=user_id,
            update_type=data.get('update_type'),
            title=data.get('title'),
            content=data.get('content'),
            metadata=data.get('metadata'),
            color=data.get('color', 'yellow')
        )

        db.session.add(update)
        db.session.commit()

        # Invalidate project updates cache
        CacheService.invalidate_project_updates(project_id)

        return jsonify({
            'status': 'success',
            'message': 'Update posted successfully',
            'data': update.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating project update: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@project_updates_bp.route('/projects/<project_id>/updates', methods=['GET'])
def get_project_updates(project_id):
    """Get all updates for a project with caching and pagination"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20, max_per_page=100)

        # Check cache first (10 minutes TTL)
        cached = CacheService.get_cached_project_updates(project_id, page)
        if cached:
            return jsonify(cached), 200

        # Verify project exists
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # OPTIMIZED: Get updates with pagination, eager load user
        query = ProjectUpdate.query.filter_by(project_id=project_id)\
            .options(joinedload(ProjectUpdate.user))

        total = query.count()
        updates = query.order_by(ProjectUpdate.created_at.desc())\
            .limit(per_page).offset((page - 1) * per_page).all()

        response_data = {
            'status': 'success',
            'data': [update.to_dict() for update in updates],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }

        # Cache the results (10 minutes)
        CacheService.cache_project_updates(project_id, page, response_data, ttl=600)

        return jsonify(response_data), 200

    except Exception as e:
        print(f"Error fetching project updates: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@project_updates_bp.route('/projects/<project_id>/updates/<update_id>', methods=['PUT'])
@jwt_required()
def update_project_update(project_id, update_id):
    """Update an existing project update"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # Get update
        update = ProjectUpdate.query.get(update_id)
        if not update:
            return jsonify({'status': 'error', 'message': 'Update not found'}), 404

        # Verify ownership
        if update.user_id != user_id:
            return jsonify({'status': 'error', 'message': 'You can only edit your own updates'}), 403

        # Update fields
        if 'title' in data:
            update.title = data['title']
        if 'content' in data:
            update.content = data['content']
        if 'update_type' in data:
            update.update_type = data['update_type']
        if 'metadata' in data:
            update.metadata = data['metadata']
        if 'color' in data:
            update.color = data['color']

        db.session.commit()

        # Invalidate project updates cache
        CacheService.invalidate_project_updates(project_id)

        return jsonify({
            'status': 'success',
            'message': 'Update edited successfully',
            'data': update.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating project update: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@project_updates_bp.route('/projects/<project_id>/updates/<update_id>', methods=['DELETE'])
@jwt_required()
def delete_project_update(project_id, update_id):
    """Delete a project update"""
    try:
        user_id = get_jwt_identity()

        # Get update
        update = ProjectUpdate.query.get(update_id)
        if not update:
            return jsonify({'status': 'error', 'message': 'Update not found'}), 404

        # Verify ownership
        if update.user_id != user_id:
            return jsonify({'status': 'error', 'message': 'You can only delete your own updates'}), 403

        db.session.delete(update)
        db.session.commit()

        # Invalidate project updates cache
        CacheService.invalidate_project_updates(project_id)

        return jsonify({
            'status': 'success',
            'message': 'Update deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting project update: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
