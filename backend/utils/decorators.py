"""
Custom decorators for authentication and authorization
"""
from functools import wraps
from flask import jsonify, session, request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import jwt
from models.user import User
from models.traveler import Traveler
from extensions import db


def get_user_from_either_table(user_id):
    """Helper to get user from either User or Traveler table"""
    # Try Traveler table first (Google OAuth users)
    user = Traveler.query.get(user_id)
    if user:
        return user
    # Fallback to User table (email/password users)
    return User.query.get(user_id)


def token_required(f):
    """Decorator to require JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = get_user_from_either_table(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

        return f(user_id, *args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = get_user_from_either_table(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403
        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

        return f(user_id, *args, **kwargs)

    return decorated


def validator_required(f):
    """Decorator to require validator role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = get_user_from_either_table(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if not (hasattr(user, 'is_validator') and user.is_validator):
                return jsonify({'error': 'Validator access required'}), 403
        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

        return f(user_id, *args, **kwargs)

    return decorated


def admin_or_validator_required(f):
    """Decorator to require either admin or validator role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = get_user_from_either_table(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            is_validator = hasattr(user, 'is_validator') and user.is_validator
            if not (user.is_admin or is_validator):
                return jsonify({'error': 'Admin or Validator access required'}), 403
        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

        return f(user_id, *args, **kwargs)

    return decorated


def optional_auth(f):
    """Decorator for optional authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = None
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = get_user_from_either_table(user_id)
            if user and not user.is_active:
                user_id = None
        except Exception:
            pass

        return f(user_id, *args, **kwargs)

    return decorated


def admin_or_session_required(f):
    """Decorator that accepts both JWT admin token OR session-based admin auth (OTP-verified)"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check for session-based admin authentication (OTP-verified)
        if session.get('admin_authenticated'):
            # Return the admin ID from session
            admin_id = session.get('admin_id', 'admin_session')
            return f(admin_id, *args, **kwargs)

        # If no session, check for JWT token
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = get_user_from_either_table(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403
            return f(user_id, *args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

    return decorated


def vendor_token_required(f):
    """
    Decorator to require vendor JWT authentication.

    Validates vendor JWT token from Authorization header.
    Sets g.vendor to the authenticated Vendor object.
    Uses separate VENDOR_JWT_SECRET_KEY for vendor tokens.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import current_app
        from models.vendor import Vendor

        # Get Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header required'}), 401

        # Extract token from "Bearer <token>" format
        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({'error': 'Invalid authorization header format'}), 401
            token = parts[1]
        except Exception:
            return jsonify({'error': 'Invalid authorization header'}), 401

        # Decode and validate JWT
        try:
            # Use VENDOR_JWT_SECRET_KEY, fallback to JWT_SECRET_KEY
            secret_key = current_app.config.get('VENDOR_JWT_SECRET_KEY') or current_app.config.get('JWT_SECRET_KEY')

            payload = jwt.decode(
                token,
                secret_key,
                algorithms=['HS256']
            )

            vendor_id = payload.get('vendor_id')
            if not vendor_id:
                return jsonify({'error': 'Invalid token: missing vendor_id'}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401

        # Fetch vendor from database
        vendor = Vendor.query.get(vendor_id)
        if not vendor:
            return jsonify({'error': 'Vendor not found'}), 401

        # Check if vendor is active
        if not vendor.is_active:
            return jsonify({'error': 'Vendor account is inactive'}), 401

        # Set vendor on Flask's g object for access in route handlers
        g.vendor = vendor

        return f(*args, **kwargs)

    return decorated
