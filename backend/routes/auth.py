"""
Authentication routes
"""
from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError
from datetime import datetime, timedelta
import requests
from urllib.parse import urlencode
import secrets
import random
import os

from extensions import db
from models.user import User
from schemas.user import UserRegisterSchema, UserLoginSchema
from utils.validators import validate_email, validate_username, validate_password
from utils.helpers import success_response, error_response
from utils.decorators import token_required
from utils.init_admins import check_and_promote_admin

auth_bp = Blueprint('auth', __name__)

# In-memory OTP storage (use Redis in production)
otp_storage = {}

# In-memory OAuth state storage for CSRF protection (use Redis in production)
oauth_state = {}


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        schema = UserRegisterSchema()
        validated_data = schema.load(data)

        # Check if user already exists
        if User.query.filter_by(email=validated_data['email']).first():
            return error_response('User already exists', 'Email is already registered', 409)

        if User.query.filter_by(username=validated_data['username']).first():
            return error_response('Username taken', 'Username is already in use', 409)

        # Validate password strength
        is_valid, msg = validate_password(validated_data['password'])
        if not is_valid:
            return error_response('Weak password', msg, 400)

        # Create user
        user = User(
            email=validated_data['email'],
            username=validated_data['username'],
            display_name=validated_data.get('display_name', validated_data['username']),
            email_verified=True  # Auto-verify for MVP (no email service yet)
        )
        user.set_password(validated_data['password'])

        # Check if email should be auto-promoted to admin
        if check_and_promote_admin(validated_data['email']):
            user.is_admin = True 

        db.session.add(user)
        db.session.commit()

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return success_response({
            'user': user.to_dict(include_email=True),
            'tokens': {
                'access': access_token,
                'refresh': refresh_token
            }
        }, 'User registered successfully', 201)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        db.session.rollback()
        return error_response('Registration failed', str(e), 500)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        schema = UserLoginSchema()
        validated_data = schema.load(data)

        # Find user
        user = User.query.filter_by(email=validated_data['email']).first()
        if not user or not user.check_password(validated_data['password']):
            return error_response('Invalid credentials', 'Email or password is incorrect', 401)

        if not user.is_active:
            return error_response('Account disabled', 'This account has been disabled', 403)

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return success_response({
            'user': user.to_dict(include_email=True),
            'tokens': {
                'access': access_token,
                'refresh': refresh_token
            }
        }, 'Login successful', 200)

    except ValidationError as e:
        return error_response('Validation error', str(e.messages), 400)
    except Exception as e:
        return error_response('Login failed', str(e), 500)


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return error_response('User not found', 'User account not found', 404)

        return success_response(user.to_dict(include_email=True), 'User retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or not user.is_active:
            return error_response('Invalid user', 'User not found or inactive', 401)

        access_token = create_access_token(identity=user.id)

        return success_response({
            'access': access_token
        }, 'Token refreshed successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (token blacklist - implement if needed)"""
    return success_response(None, 'Logged out successfully', 200)


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email address (placeholder)"""
    try:
        data = request.get_json()
        token = data.get('token')

        # TODO: Implement email verification token logic
        # For MVP, just mark email as verified directly
        return success_response(None, 'Email verification not yet implemented', 501)

    except Exception as e:
        return error_response('Error', str(e), 500)


# GitHub OAuth Routes
@auth_bp.route('/github/connect', methods=['GET'])
@jwt_required()
def github_connect():
    """Initiate GitHub OAuth flow for connecting GitHub account"""
    try:
        user_id = get_jwt_identity()

        # Store user_id in state parameter for security
        state = secrets.token_urlsafe(32)
        # In production, store state in Redis with user_id
        # For now, we'll encode user_id in the state (not recommended for production)
        state_with_user = f"{state}:{user_id}"

        github_auth_url = (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={current_app.config['GITHUB_CLIENT_ID']}"
            f"&redirect_uri={current_app.config['GITHUB_REDIRECT_URI']}"
            f"&scope=read:user user:email"
            f"&state={state_with_user}"
        )

        return success_response({
            'auth_url': github_auth_url
        }, 'GitHub authorization URL generated', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


# Google OAuth Routes (Login)
@auth_bp.route('/google/login', methods=['GET'])
def google_login():
    """Initiate Google OAuth flow for user login"""
    try:
        state = secrets.token_urlsafe(32)
        oauth_state[state] = {
            'expires_at': datetime.utcnow() + timedelta(minutes=5)
        }

        params = {
            'client_id': current_app.config.get('GOOGLE_CLIENT_ID'),
            'redirect_uri': current_app.config.get('GOOGLE_REDIRECT_URI'),
            'response_type': 'code',
            'scope': 'openid email profile',
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent',
        }

        google_auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
        return redirect(google_auth_url)

    except Exception as e:
        frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
        return redirect(f"{frontend_url}/login?google_error=init_failed")


@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]

        if error:
            return redirect(f"{frontend_url}/login?google_error={error}")

        if not code or not state:
            return redirect(f"{frontend_url}/login?google_error=missing_code_or_state")

        # Validate state
        stored = oauth_state.get(state)
        if not stored or datetime.utcnow() > stored['expires_at']:
            return redirect(f"{frontend_url}/login?google_error=invalid_state")
        # One-time use
        del oauth_state[state]

        # Exchange code for tokens
        token_response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': current_app.config.get('GOOGLE_CLIENT_ID'),
                'client_secret': current_app.config.get('GOOGLE_CLIENT_SECRET'),
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': current_app.config.get('GOOGLE_REDIRECT_URI'),
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            err = token_data.get('error', 'token_failed')
            return redirect(f"{frontend_url}/login?google_error={err}")

        # Get user info
        userinfo_resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        profile = userinfo_resp.json()

        email = (profile.get('email') or '').lower()
        email_verified = profile.get('email_verified', True)
        name = profile.get('name') or ''
        picture = profile.get('picture')

        if not email:
            return redirect(f"{frontend_url}/login?google_error=no_email")

        # Find or create user
        user = User.query.filter_by(email=email).first()
        if not user:
            # Generate a username from email
            base_username = email.split('@')[0][:20] or 'user'
            candidate = base_username
            suffix = 1
            while User.query.filter_by(username=candidate).first() is not None:
                suffix += 1
                candidate = f"{base_username}{suffix}"

            user = User(
                email=email,
                username=candidate,
                display_name=name or candidate,
                avatar_url=picture,
                email_verified=bool(email_verified)
            )
            # Set random password to satisfy non-null constraint
            user.set_password(secrets.token_urlsafe(32))
            db.session.add(user)
            db.session.commit()

        if not user.is_active:
            return redirect(f"{frontend_url}/login?google_error=account_disabled")

        # Issue JWT tokens
        access = create_access_token(identity=user.id)
        refresh = create_refresh_token(identity=user.id)

        # Redirect to frontend callback to store tokens
        return redirect(f"{frontend_url}/auth/callback?provider=google&access={access}&refresh={refresh}")

    except Exception as e:
        db.session.rollback()
        frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
        return redirect(f"{frontend_url}/login?google_error=callback_failed")


@auth_bp.route('/github/callback', methods=['GET'])
def github_callback():
    """Handle GitHub OAuth callback"""
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        # Handle error from GitHub
        if error:
            frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
            return redirect(f"{frontend_url}/publish?github_error={error}")

        if not code:
            return error_response('Error', 'No authorization code provided', 400)

        # Extract user_id from state
        try:
            state_parts = state.split(':')
            if len(state_parts) == 2:
                user_id = state_parts[1]
            else:
                return error_response('Error', 'Invalid state parameter', 400)
        except:
            return error_response('Error', 'Invalid state parameter', 400)

        # Exchange code for access token
        token_response = requests.post(
            'https://github.com/login/oauth/access_token',
            headers={'Accept': 'application/json'},
            data={
                'client_id': current_app.config['GITHUB_CLIENT_ID'],
                'client_secret': current_app.config['GITHUB_CLIENT_SECRET'],
                'code': code,
            },
        )

        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            # Log the error for debugging
            error_msg = token_data.get('error', 'unknown')
            error_desc = token_data.get('error_description', 'No description')
            print(f"GitHub OAuth Error: {error_msg} - {error_desc}")
            print(f"Full response: {token_data}")
            frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
            return redirect(f"{frontend_url}/publish?github_error=token_failed&details={error_msg}")

        # Get user info from GitHub
        user_response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {access_token}'},
        )
        github_data = user_response.json()
        github_username = github_data.get('login')

        if not github_username:
            frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
            return redirect(f"{frontend_url}/publish?github_error=user_fetch_failed")

        # Update user with GitHub info
        user = User.query.get(user_id)
        if not user:
            return error_response('Error', 'User not found', 404)

        user.github_username = github_username
        user.github_connected = True
        db.session.commit()

        # Redirect back to frontend with success
        frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
        return redirect(f"{frontend_url}/publish?github_success=true&github_username={github_username}")

    except Exception as e:
        db.session.rollback()
        frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
        return redirect(f"{frontend_url}/publish?github_error=connection_failed")


@auth_bp.route('/github/disconnect', methods=['POST'])
@jwt_required()
def github_disconnect():
    """Disconnect GitHub account"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return error_response('Error', 'User not found', 404)

        user.github_username = None
        user.github_connected = False
        db.session.commit()

        return success_response(None, 'GitHub account disconnected', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


# OTP Authentication Routes (for admin/validator login)
@auth_bp.route('/otp/request', methods=['POST'])
def request_otp():
    """Request OTP for email login"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return error_response('Validation error', 'Email is required', 400)

        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            return error_response('User not found', 'No account found with this email', 404)

        # Check if user is admin or validator
        if not (user.is_admin or user.is_validator):
            return error_response('Access denied', 'OTP login is only available for admins and validators', 403)

        # Generate OTP
        is_dev_mode = os.getenv('FLASK_ENV', 'development') == 'development'

        if is_dev_mode:
            # Development mode: use default OTP
            otp = '1234'
        else:
            # Production mode: generate random 6-digit OTP
            otp = str(random.randint(100000, 999999))

        # Store OTP with expiration (5 minutes)
        otp_storage[email] = {
            'otp': otp,
            'expires_at': datetime.utcnow() + timedelta(minutes=5),
            'user_id': user.id
        }

        # In production, send OTP via email (Zoho ZeptoMail)
        # TODO: Implement email sending
        # send_otp_email(email, otp)

        if is_dev_mode:
            # In dev mode, return OTP in response for testing
            return success_response({
                'message': 'OTP sent successfully',
                'dev_otp': otp,  # Only in dev mode!
                'email': email
            }, 'OTP sent successfully (DEV MODE)', 200)
        else:
            return success_response({
                'message': 'OTP sent to your email',
                'email': email
            }, 'OTP sent successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@auth_bp.route('/otp/verify', methods=['POST'])
def verify_otp():
    """Verify OTP and login"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()

        if not email or not otp:
            return error_response('Validation error', 'Email and OTP are required', 400)

        # Check if OTP exists
        if email not in otp_storage:
            return error_response('Invalid OTP', 'OTP not found or expired', 401)

        stored_data = otp_storage[email]

        # Check if OTP expired
        if datetime.utcnow() > stored_data['expires_at']:
            del otp_storage[email]
            return error_response('Expired OTP', 'OTP has expired. Please request a new one.', 401)

        # Verify OTP
        if otp != stored_data['otp']:
            return error_response('Invalid OTP', 'Incorrect OTP', 401)

        # OTP is valid - get user
        user = User.query.get(stored_data['user_id'])
        if not user or not user.is_active:
            del otp_storage[email]
            return error_response('User not found', 'User account not found or inactive', 404)

        # Clear OTP
        del otp_storage[email]

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return success_response({
            'user': user.to_dict(include_email=True),
            'tokens': {
                'access': access_token,
                'refresh': refresh_token
            }
        }, 'Login successful', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
