"""
Celery Tasks for Async Project Scoring
"""
from celery import Task
from celery_app import celery
from extensions import db
from models.project import Project
from models.user import User
from services.scoring.score_engine import ScoringEngine
from datetime import datetime, timedelta
from flask import current_app
import traceback


class CallbackTask(Task):
    """Base task with Flask app context - reuses existing app instance"""
    def __call__(self, *args, **kwargs):
        from app import app  # Import existing app instance instead of creating new one
        with app.app_context():
            return self.run(*args, **kwargs)


@celery.task(bind=True, base=CallbackTask, max_retries=10, default_retry_delay=300)
def score_project_task(self, project_id):
    """
    Async task to score a project

    Args:
        project_id: Project UUID to score

    Returns:
        Dict with scoring results
    """
    try:
        # Load project
        project = Project.query.get(project_id)
        if not project:
            return {'error': 'Project not found', 'project_id': project_id}

        # Update status to processing
        project.scoring_status = 'processing'
        db.session.commit()

        # Get user's GitHub token
        user = User.query.get(project.user_id)
        github_token = user.github_access_token if user else None

        # Get OpenAI API key from config
        openai_key = current_app.config.get('OPENAI_API_KEY')

        # Initialize scoring engine
        engine = ScoringEngine(github_token=github_token, openai_api_key=openai_key)

        # Score the project
        result = engine.score_project(project)

        if result.get('success'):
            # Update project with scores (preserve float precision)
            project.proof_score = result['proof_score']
            project.quality_score = result['quality_score']
            project.verification_score = result['verification_score']
            project.validation_score = result['validation_score']
            project.community_score = result['community_score']
            project.onchain_score = result['onchain_score']
            project.score_breakdown = result['breakdown']
            project.scoring_status = 'completed'
            project.last_scored_at = datetime.utcnow()
            project.scoring_error = None

            db.session.commit()

            # CRITICAL: Invalidate cache after scoring completes
            from utils.cache import CacheService
            CacheService.invalidate_project(project.id)
            CacheService.invalidate_project_feed()  # Feed rankings may change
            CacheService.invalidate_leaderboard()   # Leaderboard may change

            return {
                'success': True,
                'project_id': project_id,
                'proof_score': project.proof_score,
                'message': 'Scoring completed successfully'
            }
        else:
            # Scoring failed, retry
            raise Exception(result.get('error', 'Scoring failed'))

    except Exception as e:
        # Log error
        error_msg = str(e)
        error_trace = traceback.format_exc()

        # Update project
        project = Project.query.get(project_id)
        if project:
            project.scoring_retry_count += 1
            project.scoring_error = error_msg[:500]  # Limit error length

            max_retries = current_app.config.get('SCORING_MAX_RETRIES', 10)

            if project.scoring_retry_count >= max_retries:
                # Max retries exceeded
                project.scoring_status = 'failed'
                db.session.commit()

                # Notify admin (TODO: implement notification)
                print(f"SCORING FAILED after {max_retries} retries: {project_id}")
                print(f"Error: {error_msg}")

                return {
                    'success': False,
                    'project_id': project_id,
                    'error': 'Max retries exceeded',
                    'retry_count': project.scoring_retry_count
                }
            else:
                # Retry with exponential backoff
                project.scoring_status = 'retrying'
                db.session.commit()

                # Calculate retry delay: base_delay * (2 ^ retry_count)
                base_delay = current_app.config.get('SCORING_RETRY_BACKOFF', 300)
                retry_delay = base_delay * (2 ** project.scoring_retry_count)

                # Retry the task
                raise self.retry(exc=e, countdown=retry_delay)


@celery.task(base=CallbackTask)
def batch_score_projects(project_ids):
    """
    Score multiple projects in batch

    Args:
        project_ids: List of project UUIDs

    Returns:
        Dict with batch results
    """
    results = {
        'total': len(project_ids),
        'queued': 0,
        'failed': 0
    }

    for project_id in project_ids:
        try:
            score_project_task.delay(project_id)
            results['queued'] += 1
        except Exception as e:
            results['failed'] += 1
            print(f"Failed to queue project {project_id}: {e}")

    return results


@celery.task(base=CallbackTask)
def retry_failed_scores():
    """
    Retry all projects with failed scoring status
    Runs as a periodic task (cron job)

    Returns:
        Dict with retry results
    """
    try:
        # Find all failed projects that haven't exceeded max retries
        max_retries = current_app.config.get('SCORING_MAX_RETRIES', 10)

        failed_projects = Project.query.filter(
            Project.scoring_status == 'failed',
            Project.scoring_retry_count < max_retries
        ).all()

        results = {
            'total_failed': len(failed_projects),
            'queued_for_retry': 0
        }

        for project in failed_projects:
            # Reset status and queue for scoring
            project.scoring_status = 'pending'
            project.scoring_error = None
            db.session.commit()

            # Queue scoring task
            score_project_task.delay(project.id)
            results['queued_for_retry'] += 1

        return results

    except Exception as e:
        return {'error': str(e)}


@celery.task(base=CallbackTask)
def check_rate_limit(user_id):
    """
    Check if user can submit a new project (rate limiting)

    Args:
        user_id: User UUID

    Returns:
        Dict with can_submit (bool) and minutes_remaining (int)
    """
    try:
        rate_limit_hours = current_app.config.get('SCORING_RATE_LIMIT_HOURS', 1)

        # Get user's last project submission
        last_project = Project.query.filter_by(user_id=user_id)\
            .order_by(Project.created_at.desc())\
            .first()

        if not last_project:
            return {'can_submit': True, 'minutes_remaining': 0}

        # Calculate time since last submission
        time_since = datetime.utcnow() - last_project.created_at
        hours_since = time_since.total_seconds() / 3600

        if hours_since >= rate_limit_hours:
            return {'can_submit': True, 'minutes_remaining': 0}
        else:
            hours_remaining = rate_limit_hours - hours_since
            minutes_remaining = int(hours_remaining * 60)
            return {
                'can_submit': False,
                'minutes_remaining': minutes_remaining,
                'message': f'Please wait {minutes_remaining} minutes before submitting another project.'
            }

    except Exception as e:
        return {'can_submit': True, 'error': str(e)}
