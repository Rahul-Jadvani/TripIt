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
    socketio.init_app(app, cors_allowed_origins=app.config['CORS_ORIGINS'])

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

    # Create database tables
    with app.app_context():
        # Create all tables
        db.create_all()

        # Verify tables were created (only log if there's an issue)
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        if not tables:
            print("⚠️  WARNING: No database tables found after db.create_all()")
            print("   Check that models are properly defined and imported.")

        # Initialize default admins
        from utils.init_admins import init_default_admins
        init_default_admins()

    # Health check
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'message': '0x.ship backend is running'}), 200

    # Note: File uploads now handled via Pinata IPFS
    # Files are served directly from IPFS gateway (https://gateway.pinata.cloud/ipfs/...)

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
