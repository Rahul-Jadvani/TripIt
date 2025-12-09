"""
Celery application configuration for ZER0 AI Scoring System
"""
from celery import Celery
from flask import Flask
from config import config
import os

def make_celery(app=None):
    """Create Celery instance with Flask app context"""

    # If no app provided, create minimal Flask app for config
    if app is None:
        app = Flask(__name__)
        env = os.getenv("FLASK_ENV", "development")
        app.config.from_object(config[env])

        # Initialize database extension for Celery workers
        from extensions import db
        db.init_app(app)

        # Import all models to initialize SQLAlchemy mappers
        with app.app_context():
            import models  # This loads all models from models/__init__.py

    celery = Celery(
        app.import_name,
        broker=app.config["CELERY_BROKER_URL"],
        backend=app.config["CELERY_RESULT_BACKEND"],
        include=["tasks.scoring_tasks", "tasks.vote_tasks", "tasks.feed_cache_tasks", "tasks.ai_analysis_tasks"]
    )
    
    celery.conf.update(
        task_track_started=app.config["CELERY_TASK_TRACK_STARTED"],
        task_time_limit=app.config["CELERY_TASK_TIME_LIMIT"],
        task_soft_time_limit=app.config["CELERY_TASK_SOFT_TIME_LIMIT"],
        task_acks_late=app.config["CELERY_TASK_ACKS_LATE"],
        worker_prefetch_multiplier=app.config["CELERY_WORKER_PREFETCH_MULTIPLIER"],
        broker_use_ssl=app.config.get("CELERY_BROKER_USE_SSL"),
        redis_backend_use_ssl=app.config.get("CELERY_REDIS_BACKEND_USE_SSL"),
        broker_connection_retry=app.config.get("CELERY_BROKER_CONNECTION_RETRY", True),
        broker_connection_retry_on_startup=app.config.get("CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP", True),
        broker_connection_max_retries=app.config.get("CELERY_BROKER_CONNECTION_MAX_RETRIES", 10),
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        # Periodic task schedule (Celery Beat)
        beat_schedule={
            # Sync Redis vote counts to PostgreSQL (NEW ARCHITECTURE)
            'sync-votes-to-db': {
                'task': 'sync_votes_to_db',
                'schedule': 60.0,  # Every 60 seconds
            },
            # Refresh most requested projects cache every hour
            'refresh-most-requested-hourly': {
                'task': 'refresh_most_requested_projects_cache',
                'schedule': 3600.0,  # 1 hour in seconds
            },
            # Refresh recent connections cache every hour
            'refresh-connections-hourly': {
                'task': 'refresh_recent_connections_cache',
                'schedule': 3600.0,  # 1 hour in seconds
            },
            # Refresh featured projects cache every hour
            'refresh-featured-hourly': {
                'task': 'refresh_featured_projects_cache',
                'schedule': 3600.0,  # 1 hour in seconds
            },
            # Refresh category caches every hour
            'refresh-categories-hourly': {
                'task': 'refresh_category_caches',
                'schedule': 3600.0,  # 1 hour in seconds
            },
            # Refresh rising stars cache every hour
            'refresh-rising-stars-hourly': {
                'task': 'refresh_rising_stars_cache',
                'schedule': 3600.0,  # 1 hour in seconds
            },
            # Full feed cache refresh every 24 hours
            'refresh-all-feed-daily': {
                'task': 'refresh_all_feed_caches',
                'schedule': 86400.0,  # 24 hours in seconds
            },
        },
    )
    
    # Add Flask app context to tasks
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

# Create celery instance
celery = make_celery()
