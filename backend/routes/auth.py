"""
Authentication routes
"""
from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError
from datetime import datetime, timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib.parse import urlencode
import secrets
import random
import os
import time

from extensions import db
from models.traveler import Traveler
from schemas.user import UserRegisterSchema, UserLoginSchema  # Schemas work with any model
from utils.validators import validate_email, validate_username, validate_password
from utils.helpers import success_response, error_response
from utils.decorators import token_required
from utils.cache import CacheService

auth_bp = Blueprint('auth', __name__)

# In-memory OTP storage (use Redis in production)
otp_storage = {}

# OAuth state storage - use Redis for multi-worker environments
def _get_redis_client():
    """Get Redis client for OAuth state storage"""
    from redis import Redis
    from flask import current_app
    redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
    return Redis.from_url(redis_url, decode_responses=True)

def store_oauth_state(state, data, ttl=300):
    """Store OAuth state in Redis with TTL (default 5 minutes)"""
    try:
        import json
        redis = _get_redis_client()
        redis.setex(f"oauth_state:{state}", ttl, json.dumps(data))
    except Exception as e:
        print(f"[OAuth] Error storing state in Redis: {e}")

def get_oauth_state(state):
    """Get and delete OAuth state from Redis"""
    try:
        import json
        redis = _get_redis_client()
        key = f"oauth_state:{state}"
        data = redis.get(key)
        if data:
            redis.delete(key)  # One-time use
            return json.loads(data) if data else None
        return None
    except Exception as e:
        print(f"[OAuth] Error getting state from Redis: {e}")
        return None


def get_retry_session(retries=3, backoff_factor=0.5, status_forcelist=(500, 502, 503, 504)):
    """
    Create a requests session with retry logic for handling DNS and network issues.

    Args:
        retries: Number of retry attempts
        backoff_factor: Multiplier for exponential backoff (0.5 = 0.5s, 1s, 2s delays)
        status_forcelist: HTTP status codes to retry on

    Returns:
        requests.Session configured with retry adapter
    """
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=["GET", "POST"],  # Retry on both GET and POST
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        schema = UserRegisterSchema()
        validated_data = schema.load(data)

        # Check if user already exists
        existing_user = Traveler.query.filter_by(email=validated_data['email']).first()
        if existing_user:
            # Check if this is an OAuth account without a password
            # OAuth accounts have a random token as password, we'll allow them to set a real password
            try:
                # Try to authenticate with the stored password - OAuth accounts will have random tokens
                # that won't match any user input, so we can safely check if they need to set a password

                # If user has logged in via OAuth (has avatar_url or github_connected)
                # and the username matches, allow them to set a password
                if (existing_user.avatar_url or existing_user.github_connected) and \
                   existing_user.username == validated_data['username']:
                    # This is an OAuth user trying to set a password - allow it
                    print(f"[Auth] OAuth user {existing_user.email} setting password for first time")
                    existing_user.set_password(validated_data['password'])
                    db.session.commit()

                    # Generate tokens
                    access_token = create_access_token(identity=existing_user.id)
                    refresh_token = create_refresh_token(identity=existing_user.id)

                    return success_response({
                        'user': existing_user.to_dict(include_sensitive=True),
                        'tokens': {
                            'access': access_token,
                            'refresh': refresh_token
                        }
                    }, 'Password set successfully! You can now sign in with email and password.', 200)

                # Otherwise, user already exists with different username or is a regular account
                error_msg = 'This email is already registered.'
                if existing_user.avatar_url or existing_user.github_connected:
                    # OAuth user with different username
                    error_msg += ' If you signed up with Google or GitHub, please use that method to sign in, or use the same username to set a password.'
                else:
                    error_msg += ' Please use the login page to sign in.'
                return error_response('User already exists', error_msg, 409)
            except Exception as e:
                print(f"[Auth] Error checking existing user: {e}")
                return error_response('User already exists', 'This email is already registered. Please sign in.', 409)

        if Traveler.query.filter_by(username=validated_data['username']).first():
            return error_response('Username taken', 'Username is already in use', 409)

        # Validate password strength
        is_valid, msg = validate_password(validated_data['password'])
        if not is_valid:
            return error_response('Weak password', msg, 400)

        # Create user
        user = Traveler(
            email=validated_data['email'],
            username=validated_data['username'],
            display_name=validated_data.get('display_name', validated_data['username']),
            email_verified=True  # Auto-verify for MVP (no email service yet)
        )
        user.set_password(validated_data['password'])

        db.session.add(user)
        db.session.commit()

        # Invalidate search cache when a new user is created
        CacheService.invalidate_search_results()

        # Send welcome email
        try:
            from services.email_service import EmailService
            EmailService.send_welcome_email(user=user)
        except Exception as email_err:
            print(f"[Auth] Warning: failed to send welcome email: {email_err}")

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return success_response({
            'user': user.to_dict(include_sensitive=True),
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
        user = Traveler.query.filter_by(email=validated_data['email']).first()
        if not user or not user.check_password(validated_data['password']):
            return error_response('Invalid credentials', 'Email or password is incorrect', 401)

        if not user.is_active:
            return error_response('Account disabled', 'This account has been disabled', 403)

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return success_response({
            'user': user.to_dict(include_sensitive=True),
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
        user = Traveler.query.get(user_id)

        if not user:
            return error_response('User not found', 'User account not found', 404)

        return success_response(user.to_dict(include_sensitive=True), 'User retrieved successfully', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token"""
    try:
        user_id = get_jwt_identity()
        user = Traveler.query.get(user_id)

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


# Google OAuth Routes (Login)
@auth_bp.route('/google/login', methods=['GET'])
def google_login():
    """Initiate Google OAuth flow for user login"""
    try:
        state = secrets.token_urlsafe(32)
        store_oauth_state(state, {'created_at': datetime.utcnow().isoformat()})

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
            print(f"[Google OAuth] Error from Google: {error}")
            return redirect(f"{frontend_url}/login?google_error={error}")

        if not code or not state:
            print(f"[Google OAuth] Missing code or state: code={bool(code)}, state={bool(state)}")
            return redirect(f"{frontend_url}/login?google_error=missing_code_or_state")

        # Validate state (get_oauth_state deletes it automatically)
        stored = get_oauth_state(state)
        if not stored:
            print(f"[Google OAuth] Invalid state token")
            return redirect(f"{frontend_url}/login?google_error=invalid_state")

        # Exchange code for tokens
        print(f"[Google OAuth] Exchanging code for tokens...")
        session = get_retry_session(retries=3, backoff_factor=1.0)
        token_response = session.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': current_app.config.get('GOOGLE_CLIENT_ID'),
                'client_secret': current_app.config.get('GOOGLE_CLIENT_SECRET'),
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': current_app.config.get('GOOGLE_REDIRECT_URI'),
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30
        )

        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            err = token_data.get('error', 'token_failed')
            print(f"[Google OAuth] Failed to get access token: {err}")
            print(f"[Google OAuth] Token response: {token_data}")
            return redirect(f"{frontend_url}/login?google_error={err}")

        print(f"[Google OAuth] Successfully got access token, fetching user info...")

        # Get user info
        userinfo_resp = session.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=30
        )
        profile = userinfo_resp.json()

        email = (profile.get('email') or '').lower()
        email_verified = profile.get('email_verified', True)
        name = profile.get('name') or ''
        picture = profile.get('picture')

        if not email:
            print(f"[Google OAuth] No email in user profile")
            return redirect(f"{frontend_url}/login?google_error=no_email")

        print(f"[Google OAuth] Got user email: {email}")

        # Find or create user
        user = Traveler.query.filter_by(email=email).first()
        if not user:
            print(f"[Google OAuth] Creating new user for {email}")
            # Generate a username from email
            base_username = email.split('@')[0][:20] or 'user'
            candidate = base_username
            suffix = 1
            while Traveler.query.filter_by(username=candidate).first() is not None:
                suffix += 1
                candidate = f"{base_username}{suffix}"

            user = Traveler(
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

            print(f"[Google OAuth] New user created: {candidate}")

            # Invalidate search cache when a new user is created via OAuth
            CacheService.invalidate_search_results()

            # Send welcome email for new OAuth users
            try:
                from services.email_service import EmailService
                EmailService.send_welcome_email(user=user)
            except Exception as email_err:
                print(f"[Auth] Warning: failed to send welcome email for Google OAuth: {email_err}")
        else:
            print(f"[Google OAuth] Existing user found: {user.username}")

        if not user.is_active:
            print(f"[Google OAuth] User account is disabled: {user.username}")
            return redirect(f"{frontend_url}/login?google_error=account_disabled")

        # Issue JWT tokens
        print(f"[Google OAuth] Creating JWT tokens for user: {user.id}")
        access = create_access_token(identity=user.id)
        refresh = create_refresh_token(identity=user.id)

        print(f"[Google OAuth] Successfully completed OAuth flow for {email}")
        # Redirect to frontend callback to store tokens
        return redirect(f"{frontend_url}/auth/callback?provider=google&access={access}&refresh={refresh}")

    except Exception as e:
        import traceback
        db.session.rollback()
        error_traceback = traceback.format_exc()
        print(f"[Google OAuth] Exception occurred: {str(e)}")
        print(f"[Google OAuth] Traceback:\n{error_traceback}")
        frontend_url = current_app.config.get('CORS_ORIGINS', ['http://localhost:8080'])[0]
        return redirect(f"{frontend_url}/login?google_error=callback_failed")


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
        user = Traveler.query.filter_by(email=email).first()
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
        user = Traveler.query.get(stored_data['user_id'])
        if not user or not user.is_active:
            del otp_storage[email]
            return error_response('User not found', 'User account not found or inactive', 404)

        # Clear OTP
        del otp_storage[email]

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return success_response({
            'user': user.to_dict(include_sensitive=True),
            'tokens': {
                'access': access_token,
                'refresh': refresh_token
            }
        }, 'Login successful', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
