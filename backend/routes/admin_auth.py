"""
Admin Authentication Routes - OTP-based email authentication
"""
from flask import Blueprint, request, jsonify, session
from datetime import datetime
from extensions import db
from models.admin_user import AdminUser
from models.admin_otp import AdminOTP
from services.email_service import EmailService

# Make sessions permanent (will use PERMANENT_SESSION_LIFETIME from config)
def make_session_permanent():
    """Mark the current session as permanent"""
    session.permanent = True

admin_auth_bp = Blueprint('admin_auth', __name__, url_prefix='/api/admin')


@admin_auth_bp.route('/request-otp', methods=['POST'])
def request_otp():
    """Request OTP code for admin login"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({
                'status': 'error',
                'message': 'Email is required'
            }), 400

        # Check if email is registered as admin
        admin_user = AdminUser.query.filter_by(email=email, is_active=True).first()
        if not admin_user:
            # Security: Don't reveal if email exists or not
            return jsonify({
                'status': 'success',
                'message': 'If this email is registered as admin, you will receive an OTP code shortly'
            }), 200

        # Invalidate any existing unused OTPs for this email
        old_otps = AdminOTP.query.filter_by(email=email, is_used=False).all()
        for old_otp in old_otps:
            old_otp.mark_used()

        # Create new OTP
        otp = AdminOTP.create_for_email(email, validity_minutes=10)
        db.session.add(otp)
        db.session.commit()

        # Send OTP via email
        try:
            EmailService.send_admin_otp_email(email=email, otp_code=otp.otp_code)
        except Exception as email_error:
            print(f"[AdminAuth] Failed to send OTP email: {email_error}")
            # Don't fail the request if email fails - OTP is still created

        return jsonify({
            'status': 'success',
            'message': 'If this email is registered as admin, you will receive an OTP code shortly'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@admin_auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP code and create admin session"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        otp_code = data.get('otp_code', '').strip()

        if not email or not otp_code:
            return jsonify({
                'status': 'error',
                'message': 'Email and OTP code are required'
            }), 400

        # Check if admin user exists and is active
        admin_user = AdminUser.query.filter_by(email=email, is_active=True).first()
        if not admin_user:
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or OTP code'
            }), 401

        # Find the most recent unused OTP for this email
        otp = AdminOTP.query.filter_by(
            email=email,
            otp_code=otp_code,
            is_used=False
        ).order_by(AdminOTP.created_at.desc()).first()

        if not otp:
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or OTP code'
            }), 401

        # Check if OTP is valid
        if not otp.is_valid():
            return jsonify({
                'status': 'error',
                'message': 'OTP code has expired or already been used'
            }), 401

        # Mark OTP as used
        otp.mark_used()

        # Update last login
        admin_user.last_login = datetime.utcnow()
        db.session.commit()

        # Create admin session with 2-hour expiry
        make_session_permanent()
        session['admin_authenticated'] = True
        session['admin_email'] = email
        session['admin_id'] = admin_user.id
        session['is_root_admin'] = admin_user.is_root

        return jsonify({
            'status': 'success',
            'message': 'Admin authenticated successfully',
            'data': {
                'email': email,
                'is_root': admin_user.is_root
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@admin_auth_bp.route('/logout', methods=['POST'])
def admin_logout():
    """Admin logout endpoint"""
    try:
        # Clear all session data
        session.clear()
        return jsonify({
            'status': 'success',
            'message': 'Logged out successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@admin_auth_bp.route('/check', methods=['GET'])
def check_admin():
    """Check if admin is authenticated"""
    is_authenticated = session.get('admin_authenticated', False)
    admin_email = session.get('admin_email')
    is_root = session.get('is_root_admin', False)

    return jsonify({
        'status': 'success',
        'authenticated': is_authenticated,
        'email': admin_email if is_authenticated else None,
        'is_root': is_root if is_authenticated else False
    }), 200


# ============================================================================
# ADMIN USER MANAGEMENT (Root Admin Only)
# ============================================================================

def root_admin_required(f):
    """Decorator to require root admin privileges"""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_authenticated'):
            return jsonify({
                'status': 'error',
                'message': 'Authentication required'
            }), 401

        if not session.get('is_root_admin'):
            return jsonify({
                'status': 'error',
                'message': 'Root admin privileges required'
            }), 403

        return f(*args, **kwargs)

    return decorated


@admin_auth_bp.route('/admins', methods=['GET'])
@root_admin_required
def list_admins():
    """List all admin users (root admin only)"""
    try:
        admins = AdminUser.query.order_by(AdminUser.created_at.desc()).all()

        return jsonify({
            'status': 'success',
            'data': [admin.to_dict() for admin in admins]
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@admin_auth_bp.route('/admins/add', methods=['POST'])
@root_admin_required
def add_admin():
    """Add a new admin user (root admin only)"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({
                'status': 'error',
                'message': 'Email is required'
            }), 400

        # Check if admin already exists
        existing_admin = AdminUser.query.filter_by(email=email).first()
        if existing_admin:
            if existing_admin.is_active:
                return jsonify({
                    'status': 'error',
                    'message': 'Admin user already exists with this email'
                }), 400
            else:
                # Reactivate if previously deactivated
                existing_admin.is_active = True
                db.session.commit()
                return jsonify({
                    'status': 'success',
                    'message': 'Admin user reactivated',
                    'data': existing_admin.to_dict()
                }), 200

        # Create new admin user
        current_admin_id = session.get('admin_id')
        new_admin = AdminUser(
            email=email,
            is_root=False,  # Only root admin can add other admins, but new admins are not root by default
            is_active=True,
            created_by=current_admin_id
        )

        db.session.add(new_admin)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Admin user added: {email}',
            'data': new_admin.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@admin_auth_bp.route('/admins/<admin_id>', methods=['DELETE'])
@root_admin_required
def remove_admin(admin_id):
    """Remove an admin user (root admin only)"""
    try:
        admin = AdminUser.query.get(admin_id)
        if not admin:
            return jsonify({
                'status': 'error',
                'message': 'Admin user not found'
            }), 404

        # Prevent removing root admin
        if admin.is_root:
            return jsonify({
                'status': 'error',
                'message': 'Cannot remove root admin'
            }), 403

        # Prevent self-removal
        current_admin_id = session.get('admin_id')
        if admin.id == current_admin_id:
            return jsonify({
                'status': 'error',
                'message': 'Cannot remove yourself'
            }), 400

        # Soft delete - just deactivate
        admin.is_active = False
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Admin user removed: {admin.email}'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@admin_auth_bp.route('/admins/<admin_id>/toggle-active', methods=['POST'])
@root_admin_required
def toggle_admin_active(admin_id):
    """Toggle admin active status (root admin only)"""
    try:
        admin = AdminUser.query.get(admin_id)
        if not admin:
            return jsonify({
                'status': 'error',
                'message': 'Admin user not found'
            }), 404

        # Prevent toggling root admin
        if admin.is_root:
            return jsonify({
                'status': 'error',
                'message': 'Cannot modify root admin status'
            }), 403

        admin.is_active = not admin.is_active
        db.session.commit()

        status = 'activated' if admin.is_active else 'deactivated'
        return jsonify({
            'status': 'success',
            'message': f'Admin user {status}: {admin.email}',
            'data': admin.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
