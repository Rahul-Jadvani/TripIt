"""
0x.ship MVP - Main Flask Application
"""
import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_compress import Compress

from config import config
from extensions import db, jwt, migrate, socketio


def import_models():
    """Import all models - needed for db.create_all()"""
    from models.user import User
    from models.project import Project, ProjectScreenshot
    from models.vote import Vote
    from models.comment import Comment
    from models.badge import ValidationBadge
    from models.intro import Intro
    from models.event import Event, EventProject, EventSubscriber
    from models.investor_request import InvestorRequest
    from models.intro_request import IntroRequest
    from models.direct_message import DirectMessage
    from models.saved_project import SavedProject
    from models.project_view import ProjectView
    from models.validator_permissions import ValidatorPermissions
    from models.project_update import ProjectUpdate
    from models.chain import Chain, ChainProject, ChainProjectRequest, ChainFollower
    from models.chain_post import ChainPost, ChainPostReaction
    from models.notification import Notification
    from models.admin_scoring_config import AdminScoringConfig
    return True


def create_app(config_name=None):
    """Application factory"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # Initialize Socket.IO with proper CORS and configuration
    socketio.init_app(
        app,
        cors_allowed_origins=app.config['CORS_ORIGINS'],
        async_mode='threading',
        logger=False,
        engineio_logger=False,
        ping_timeout=60,
        ping_interval=25
    )

    # Enable compression for all responses
    Compress(app)

    CORS(app,
         origins=app.config['CORS_ORIGINS'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Admin-Password'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'])

    # Register error handlers
    register_error_handlers(app)

    # Register blueprints (this also imports models through routes)
    register_blueprints(app)

    # Import models BEFORE creating tables
    import_models()

    # NOTE: Event listeners disabled - using direct function calls in routes instead
    # This prevents double-counting when routes manually update denormalized fields
    # from models.event_listeners import setup_all_listeners
    # setup_all_listeners()

    # Create database tables
    with app.app_context():
        # Create all tables
        db.create_all()

        # Verify tables were created (only log if there's an issue)
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        if not tables:
            print("WARNING: No database tables found after db.create_all()")
            print("Check that models are properly defined and imported.")

        # Initialize default admins
        from utils.init_admins import init_default_admins
        init_default_admins()

        # PERFORMANCE: Initialize Redis Cache (Instagram-style instant updates)
        try:
            redis_url = os.getenv('REDIS_URL')
            if redis_url:
                from services.redis_cache_service import RedisUserCache
                RedisUserCache.initialize(redis_url)
                print("[App] Redis cache initialized successfully")
            else:
                print("[App] WARNING: REDIS_URL not set in environment")
        except Exception as e:
            print(f"[App] WARNING: Redis initialization error: {e}")

        # PERFORMANCE: Start background cache warmer (sequential, stable)
        # Skip if disabled (e.g., during migrations to avoid deadlocks)
        if not app.config.get('TESTING') and not os.environ.get('DISABLE_CACHE_WARMER'):
            from utils.cache_warmer import CacheWarmer

            # Development mode toggle: skip startup warming for faster dev startup
            in_dev = os.environ.get('IN_DEV', 'false').lower() == 'true'

            if in_dev:
                # 🚀 DEVELOPMENT MODE: Skip startup cache warming
                print("[DEV] IN_DEV=true - Skipping startup cache warming for fast startup")
                print("[DEV] Note: First requests will be slower as data loads on demand")
                # Still start background warmer to keep cache fresh
                CacheWarmer.start_background_warmer(app, interval=300)
                print("[PERFORMANCE] Background cache warmer started - updating every 5 minutes")
            else:
                # ⚡ PRODUCTION MODE: Warm cache immediately on startup
                # This eliminates the 10-60 second first-load delay
                print("[PERFORMANCE] Pre-warming critical caches on startup...")
                try:
                    CacheWarmer.warm_all()
                    print("[PERFORMANCE] Startup cache warming completed!")
                except Exception as e:
                    print(f"[PERFORMANCE] Warning: Startup cache warming failed: {e}")

                # Start background warmer (runs every 5 minutes, sequential to avoid crashes)
                CacheWarmer.start_background_warmer(app, interval=300)
                print("[PERFORMANCE] Background cache warmer started - updating every 5 minutes")

        # PERFORMANCE: Start background MV refresh worker
        # Skip if disabled (e.g., during testing or when running standalone worker)
        if not app.config.get('TESTING') and not os.environ.get('DISABLE_MV_WORKER'):
            from workers.mv_refresh_worker import MVRefreshWorker
            # Start background worker (processes MV refresh queue every 2 seconds)
            MVRefreshWorker.start_background_worker(app, poll_interval=2, max_workers=3)
            print("[PERFORMANCE] MV refresh worker started - processing queue every 2s")

        # PERFORMANCE: Start daily reconciliation scheduler
        # Skip if disabled (e.g., during testing)
        if not app.config.get('TESTING') and not os.environ.get('DISABLE_RECONCILIATION'):
            from workers.reconciliation_scheduler import ReconciliationScheduler
            # Schedule daily reconciliation at 3 AM
            reconciliation_hour = int(os.environ.get('RECONCILIATION_HOUR', '3'))  # Default: 3 AM
            ReconciliationScheduler.start_daily_scheduler(app, hour=reconciliation_hour)
            print(f"[PERFORMANCE] Daily reconciliation scheduled at {reconciliation_hour}:00 AM")

        # AI SCORING: Start Celery worker and beat scheduler
        # Skip if disabled (e.g., during testing or if running Celery separately)
        if not app.config.get('TESTING') and not os.environ.get('DISABLE_CELERY'):
            from tasks.retry_failed_scores import setup_periodic_tasks
            from celery_app import celery
            import threading
            import subprocess
            import sys

            # Setup periodic tasks for Celery Beat
            setup_periodic_tasks(celery)

            def run_celery_worker():
                """Run Celery worker in background thread"""
                try:
                    # Start Celery worker
                    worker = celery.Worker(
                        pool='solo',  # Use solo pool for Windows compatibility
                        loglevel='info',
                        concurrency=2
                    )
                    worker.start()
                except Exception as e:
                    print(f"[AI SCORING] Celery worker error: {e}")

            def run_celery_beat():
                """Run Celery beat scheduler in background thread"""
                try:
                    # Start Celery beat
                    beat = celery.Beat(loglevel='info')
                    beat.run()
                except Exception as e:
                    print(f"[AI SCORING] Celery beat error: {e}")

            # Start Celery worker in background thread
            worker_thread = threading.Thread(target=run_celery_worker, daemon=True)
            worker_thread.start()
            print("[AI SCORING] Celery worker started in background")

            # Start Celery beat in background thread
            beat_thread = threading.Thread(target=run_celery_beat, daemon=True)
            beat_thread.start()
            print("[AI SCORING] Celery beat scheduler started in background")
            print("[AI SCORING] Retry failed scores task scheduled (every 30 minutes)")

    # Health check
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'message': '0x.ship backend is running'}), 200

    # Note: File uploads now handled via Pinata IPFS
    # Files are served directly from IPFS gateway (https://gateway.pinata.cloud/ipfs/...)

    # Socket.IO event handlers for real-time updates
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle Socket.IO connection - authenticate user and join them to room"""
        try:
            from flask_jwt_extended import decode_token
            from models.user import User

            # Get token from auth
            token = auth.get('token') if auth else None

            # Allow connection even without token (for public events)
            # But only join user rooms if authenticated
            if not token or token == '':
                print(f"[Socket.IO] Guest connected (no token)")
                return True

            try:
                # Decode JWT token
                decoded_token = decode_token(token)
                user_id = decoded_token.get('sub')

                # Verify user exists
                user = User.query.get(user_id)
                if not user:
                    print(f"[Socket.IO] Connection warning - user not found: {user_id}, allowing as guest")
                    return True

                # Join user to a room with their user_id (for targeted messaging)
                from flask_socketio import join_room
                join_room(str(user_id))

                print(f"[Socket.IO] User {user_id} connected and joined room")
                return True

            except Exception as e:
                print(f"[Socket.IO] Token decode error: {e}, allowing as guest")
                return True

        except Exception as e:
            print(f"[Socket.IO] Connection error: {e}")
            return True

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle Socket.IO disconnection"""
        print(f"[Socket.IO] User disconnected")

    return app


def register_blueprints(app):
    """Register all route blueprints"""
    from routes.auth import auth_bp
    from routes.projects import projects_bp
    from routes.votes import votes_bp
    from routes.comments import comments_bp
    from routes.badges import badges_bp
    from routes.intros import intros_bp
    from routes.blockchain import blockchain_bp
    from routes.users import users_bp
    from routes.uploads import uploads_bp
    from routes.events import events_bp
    from routes.investor_requests import investor_requests_bp
    from routes.intro_requests import intro_requests_bp
    from routes.direct_messages import direct_messages_bp
    from routes.search import search_bp
    from routes.saved_projects import saved_projects_bp
    from routes.admin import admin_bp
    from routes.validator import validator_bp
    from routes.project_updates import project_updates_bp
    from routes.feedback import feedback_bp
    from routes.chains import chains_bp
    from routes.chain_posts import chain_posts_bp
    from routes.notifications import notifications_bp
    from routes.scoring import scoring_bp

    # PERFORMANCE: Ultra-fast optimized routes
    from routes.prefetch import prefetch_bp
    from routes.fast_leaderboard import fast_leaderboard_bp
    from routes.fast_investor_directory import fast_investor_directory_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(project_updates_bp, url_prefix='/api')
    app.register_blueprint(votes_bp, url_prefix='/api/votes')
    app.register_blueprint(comments_bp, url_prefix='/api/comments')
    app.register_blueprint(badges_bp, url_prefix='/api/badges')
    app.register_blueprint(intros_bp, url_prefix='/api/intros')
    app.register_blueprint(blockchain_bp, url_prefix='/api/blockchain')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(uploads_bp, url_prefix='/api/upload')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(saved_projects_bp)
    app.register_blueprint(investor_requests_bp)
    app.register_blueprint(intro_requests_bp)
    app.register_blueprint(direct_messages_bp)
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(validator_bp, url_prefix='/api/validator')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(chains_bp, url_prefix='/api/chains')
    app.register_blueprint(chain_posts_bp, url_prefix='/api/chains')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(scoring_bp, url_prefix='/api')

    # PERFORMANCE: Ultra-fast optimized endpoints
    app.register_blueprint(prefetch_bp, url_prefix='/api/prefetch')
    app.register_blueprint(fast_leaderboard_bp, url_prefix='/api/leaderboard')
    app.register_blueprint(fast_investor_directory_bp, url_prefix='/api/investors')

    from routes.admin_auth import admin_auth_bp
    app.register_blueprint(admin_auth_bp)


def register_error_handlers(app):
    """Register error handlers"""

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden', 'message': 'You do not have permission'}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500


if __name__ == '__main__':
    app = create_app()
    # Use socketio.run() instead of app.run() for WebSocket support
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)


# Create app instance for gunicorn
app = create_app()
