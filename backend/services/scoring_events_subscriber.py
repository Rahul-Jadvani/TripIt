"""
Redis Pub/Sub subscriber for Celery scoring events
Bridges Celery worker + Redis + Flask + Socket.IO for real-time score updates
"""
import json
import threading
import redis as redis_lib
from extensions import socketio


class ScoringEventsSubscriber:
    """Subscribe to Redis pub/sub channel and emit Socket.IO events"""

    @staticmethod
    def start_subscriber(app):
        """Start Redis pub/sub listener in background thread"""
        def listen_for_scoring_events():
            with app.app_context():
                import os
                # Initialize Redis client from REDIS_URL
                redis_client = redis_lib.from_url(os.getenv('REDIS_URL', 'redis://redis:6379/0'))
                pubsub = redis_client.pubsub()
                pubsub.subscribe('scoring_events')

                print("[ScoringEvents] Listening for scoring completion events...")

                for message in pubsub.listen():
                    try:
                        if message['type'] == 'message':
                            data = json.loads(message['data'])

                            if data.get('event') == 'project:scored':
                                project_id = data.get('project_id')

                                print(f"[ScoringEvents] Project {project_id} scored - emitting Socket.IO event")

                                # Emit Socket.IO event for real-time frontend update
                                socketio.emit('project:scored', {
                                    'project_id': project_id,
                                    'proof_score': data.get('proof_score'),
                                    'quality_score': data.get('quality_score'),
                                    'verification_score': data.get('verification_score'),
                                    'validation_score': data.get('validation_score'),
                                    'community_score': data.get('community_score')
                                })

                    except Exception as e:
                        print(f"[ScoringEvents] Error processing scoring event: {e}")
                        continue

        # Start listener in background thread
        listener_thread = threading.Thread(target=listen_for_scoring_events, daemon=True)
        listener_thread.start()
        print("[ScoringEvents] Background subscriber started")
