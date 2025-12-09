"""
Upstash Redis Pub/Sub subscriber for Celery scoring events
Bridges Celery worker + Upstash Redis + Flask + Socket.IO for real-time score updates
"""
import json
import threading
from upstash_redis import Redis
from extensions import socketio


class ScoringEventsSubscriber:
    """Subscribe to Upstash Redis pub/sub channel and emit Socket.IO events"""

    @staticmethod
    def start_subscriber(app):
        """Start Upstash Redis pub/sub listener in background thread"""
        def listen_for_scoring_events():
            try:
                with app.app_context():
                    import os
                    # Initialize Upstash Redis client
                    upstash_url = os.getenv('UPSTASH_REDIS_URL')
                    upstash_token = os.getenv('UPSTASH_REDIS_TOKEN')

                    if not upstash_url or not upstash_token:
                        print("[ScoringEvents] WARNING: Upstash Redis credentials not configured")
                        print("[ScoringEvents] Real-time scoring events disabled")
                        return

                    # Note: Upstash Redis pub/sub works differently than standard Redis
                    # Upstash uses HTTP-based REST API, not traditional Redis protocol
                    # For real-time updates, we rely on:
                    # 1. Celery task callbacks
                    # 2. WebSocket polling
                    # 3. Frontend refresh mechanisms
                    print("[ScoringEvents] Note: Upstash Redis pub/sub requires different implementation")
                    print("[ScoringEvents] Real-time scoring events disabled (using alternative update mechanisms)")
                    return

                    # The code below is kept for reference but won't execute
                    # Traditional Redis pub/sub doesn't work with Upstash's HTTP-based API
                    redis_client = Redis(url=upstash_url, token=upstash_token)
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

            except Exception as e:
                print(f"[ScoringEvents] ERROR: Failed to initialize subscriber: {e}")

        # Start listener in background thread
        try:
            listener_thread = threading.Thread(target=listen_for_scoring_events, daemon=True)
            listener_thread.start()
            print("[ScoringEvents] Background subscriber started")
        except Exception as e:
            print(f"[ScoringEvents] ERROR: Failed to start background thread: {e}")
