"""
Custom decorators for authentication and authorization
"""
from functools import wraps
from flask import jsonify, session, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.user import User
from extensions import db


def token_required(f):
    """Decorator to require JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
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
            user = User.query.get(user_id)
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
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if not user.is_validator:
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
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if not (user.is_admin or user.is_validator):
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
            user = User.query.get(user_id)
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
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403
            return f(user_id, *args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

    return decorated
