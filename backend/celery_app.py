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
    
    celery = Celery(
        app.import_name,
        broker=app.config["CELERY_BROKER_URL"],
        backend=app.config["CELERY_RESULT_BACKEND"],
        include=["tasks.scoring_tasks", "tasks.vote_tasks"]
    )
    
    celery.conf.update(
        task_track_started=app.config["CELERY_TASK_TRACK_STARTED"],
        task_time_limit=app.config["CELERY_TASK_TIME_LIMIT"],
        task_soft_time_limit=app.config["CELERY_TASK_SOFT_TIME_LIMIT"],
        task_acks_late=app.config["CELERY_TASK_ACKS_LATE"],
        worker_prefetch_multiplier=app.config["CELERY_WORKER_PREFETCH_MULTIPLIER"],
        broker_use_ssl=app.config.get("CELERY_BROKER_USE_SSL"),
        redis_backend_use_ssl=app.config.get("CELERY_REDIS_BACKEND_USE_SSL"),
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
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
