#!/usr/bin/env python3
"""Quick script to test rescoring with minimal memory usage"""
import os
os.environ.setdefault('FLASK_ENV', 'development')

from celery_app import celery

# Queue scoring task directly
task = celery.send_task(
    'tasks.scoring_tasks.score_project_task',
    args=['2bf8c904-6f41-49d2-bc80-b647a677e0e0']
)
print(f'✓ Rescore task queued: {task.id}')
print('Watch Celery worker logs for: [Redis Pub/Sub] Published scoring event')
print('Watch Backend logs for: [ScoringEvents] ✅ Project ... scored')
