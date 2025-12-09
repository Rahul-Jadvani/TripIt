"""
Retry Failed Scores - Periodic Task
Run this as a cron job to automatically retry failed scoring attempts
"""
from celery import Celery
from celery.schedules import crontab
from tasks.scoring_tasks import retry_failed_scores


def setup_periodic_tasks(celery_app):
    """
    Setup periodic tasks for Celery Beat

    Args:
        celery_app: Celery application instance
    """

    # Retry failed scores every 30 minutes
    celery_app.conf.beat_schedule = {
        'retry-failed-scores': {
            'task': 'tasks.scoring_tasks.retry_failed_scores',
            'schedule': crontab(minute='*/30'),  # Every 30 minutes
        },
    }

    celery_app.conf.timezone = 'UTC'


# For standalone execution
if __name__ == '__main__':
    from celery_app import celery
    setup_periodic_tasks(celery)
    print("Periodic tasks configured. Run with: celery -A celery_app.celery beat")
