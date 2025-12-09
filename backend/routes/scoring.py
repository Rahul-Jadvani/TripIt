"""
Scoring Routes
Endpoints for checking scoring status and retrying failed scores
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.project import Project
from tasks.scoring_tasks import score_project_task
from utils.helpers import success_response, error_response
from datetime import datetime, timedelta

scoring_bp = Blueprint('scoring', __name__)


@scoring_bp.route('/projects/<project_id>/scoring-status', methods=['GET'])
def get_scoring_status(project_id):
    """
    Get current scoring status for a project

    Returns:
        Scoring status, retry count, last scored time, error (if any)
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        return success_response({
            'project_id': project.id,
            'scoring_status': project.scoring_status,
            'proof_score': project.proof_score,
            'retry_count': project.scoring_retry_count,
            'last_scored_at': project.last_scored_at.isoformat() if project.last_scored_at else None,
            'error': project.scoring_error,
            'score_breakdown': project.score_breakdown
        }, 'Scoring status retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@scoring_bp.route('/projects/<project_id>/retry-scoring', methods=['POST'])
@jwt_required()
def retry_scoring(project_id):
    """
    Retry scoring for a project (user must own the project)

    Returns:
        Task queued confirmation
    """
    try:
        user_id = get_jwt_identity()

        project = Project.query.get(project_id)
        if not project:
            return error_response('Not found', 'Project not found', 404)

        # Check ownership
        if project.user_id != user_id:
            return error_response('Forbidden', 'You can only retry scoring for your own projects', 403)

        # Check if scoring is already in progress
        if project.scoring_status == 'processing':
            return error_response('In progress', 'Scoring is already in progress', 400)

        # Check rate limiting (prevent spam retries)
        if project.last_scored_at:
            time_since_last_score = datetime.utcnow() - project.last_scored_at
            if time_since_last_score < timedelta(minutes=5):
                minutes_remaining = 5 - int(time_since_last_score.total_seconds() / 60)
                return error_response(
                    'Rate limited',
                    f'Please wait {minutes_remaining} minutes before retrying scoring.',
                    429
                )

        # Reset status and queue task
        project.scoring_status = 'pending'
        project.scoring_error = None
        db.session.commit()

        # Queue scoring task
        task = score_project_task.delay(project.id)

        return success_response({
            'project_id': project.id,
            'task_id': task.id,
            'status': 'queued'
        }, 'Scoring retry queued successfully', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
