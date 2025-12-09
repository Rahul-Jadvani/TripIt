"""
Vendor Authentication Routes - Login, Registration, Profile Management
Endpoints for vendor portal authentication.
"""
from flask import Blueprint, request, current_app, g
from datetime import datetime, timedelta
import jwt

from extensions import db
from models.vendor import Vendor
from utils.helpers import success_response, error_response
from utils.decorators import vendor_token_required

vendor_auth_bp = Blueprint('vendor_auth', __name__)


def generate_vendor_token(vendor_id: str) -> str:
    """
    Generate JWT token for vendor authentication.

    Args:
        vendor_id: UUID of the vendor

    Returns:
        JWT token string
    """
    secret_key = current_app.config.get('VENDOR_JWT_SECRET_KEY') or current_app.config.get('JWT_SECRET_KEY')
    expiration_days = current_app.config.get('VENDOR_JWT_EXPIRATION_DAYS', 7)

    payload = {
        'vendor_id': vendor_id,
        'exp': datetime.utcnow() + timedelta(days=expiration_days),
        'iat': datetime.utcnow(),
        'type': 'vendor'
    }

    return jwt.encode(payload, secret_key, algorithm='HS256')


@vendor_auth_bp.route('/register', methods=['POST'])
def vendor_register():
    """
    Register a new vendor account (no admin approval required).

    Request Body:
        vendor_name (str, required): Name of the vendor
        organization (str, optional): Organization name
        contact_email (str, required): Unique email address
        contact_phone (str, optional): Phone number
        password (str, required): Password (min 8 characters)
        vendor_type (str, required): hotel, transport, police, hospital, other
        city (str, optional): City
        state (str, optional): State
        country (str, optional): Country (default: India)
        address (str, optional): Full address

    Returns:
        201: Vendor registered successfully
        400: Missing required fields or invalid input
        409: Email already registered
    """
    data = request.get_json()

    # Validate required fields
    required_fields = ['vendor_name', 'contact_email', 'password', 'vendor_type']
    for field in required_fields:
        if not data.get(field):
            return error_response(f'Missing required field: {field}', status_code=400)

    vendor_name = data.get('vendor_name').strip()
    contact_email = data.get('contact_email').strip().lower()
    password = data.get('password')
    vendor_type = data.get('vendor_type').strip().lower()

    # Validate vendor_type
    valid_types = ['hotel', 'transport', 'police', 'hospital', 'other']
    if vendor_type not in valid_types:
        return error_response(f'Invalid vendor_type. Must be one of: {", ".join(valid_types)}', status_code=400)

    # Validate password length
    if len(password) < 8:
        return error_response('Password must be at least 8 characters', status_code=400)

    # Check if email already exists
    existing = Vendor.query.filter_by(contact_email=contact_email).first()
    if existing:
        return error_response('Email already registered', status_code=409)

    # Create vendor
    try:
        vendor = Vendor(
            vendor_name=vendor_name,
            organization=data.get('organization', '').strip() or None,
            contact_email=contact_email,
            contact_phone=data.get('contact_phone', '').strip() or None,
            vendor_type=vendor_type,
            city=data.get('city', '').strip() or None,
            state=data.get('state', '').strip() or None,
            country=data.get('country', 'India').strip(),
            address=data.get('address', '').strip() or None,
            is_active=True  # No approval required
        )
        vendor.set_password(password)

        db.session.add(vendor)
        db.session.commit()

        current_app.logger.info(f"[VENDOR_REGISTER] New vendor registered: {contact_email}")

        return success_response(
            {
                'vendor_id': vendor.id,
                'vendor_name': vendor.vendor_name,
                'contact_email': vendor.contact_email
            },
            message='Vendor registered successfully',
            status_code=201
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[VENDOR_REGISTER] Error: {str(e)}")
        return error_response(f'Registration failed: {str(e)}', status_code=500)


@vendor_auth_bp.route('/login', methods=['POST'])
def vendor_login():
    """
    Authenticate vendor and return JWT token.

    Request Body:
        contact_email (str, required): Email address
        password (str, required): Password

    Returns:
        200: Login successful with token
        400: Missing credentials
        401: Invalid credentials or inactive account
    """
    data = request.get_json()

    contact_email = data.get('contact_email', '').strip().lower()
    password = data.get('password', '')

    if not contact_email or not password:
        return error_response('Email and password are required', status_code=400)

    # Find vendor
    vendor = Vendor.query.filter_by(contact_email=contact_email).first()

    if not vendor:
        return error_response('Invalid email or password', status_code=401)

    # Check password
    if not vendor.check_password(password):
        return error_response('Invalid email or password', status_code=401)

    # Check if active
    if not vendor.is_active:
        return error_response('Account is inactive. Please contact support.', status_code=401)

    # Generate token
    token = generate_vendor_token(vendor.id)

    current_app.logger.info(f"[VENDOR_LOGIN] Vendor logged in: {contact_email}")

    return success_response(
        {
            'token': token,
            'vendor': vendor.to_dict()
        },
        message='Login successful'
    )


@vendor_auth_bp.route('/profile', methods=['GET'])
@vendor_token_required
def get_vendor_profile():
    """
    Get authenticated vendor's profile.

    Requires: Authorization: Bearer <vendor_token>

    Returns:
        200: Vendor profile data
        401: Unauthorized
    """
    return success_response(
        g.vendor.to_dict(),
        message='Profile retrieved successfully'
    )


@vendor_auth_bp.route('/update-profile', methods=['PUT'])
@vendor_token_required
def update_vendor_profile():
    """
    Update vendor profile (email cannot be changed).

    Requires: Authorization: Bearer <vendor_token>

    Request Body:
        vendor_name (str, optional)
        organization (str, optional)
        contact_phone (str, optional)
        city (str, optional)
        state (str, optional)
        country (str, optional)
        address (str, optional)

    Returns:
        200: Profile updated
        400: Invalid input
    """
    data = request.get_json()
    vendor = g.vendor

    # Update allowed fields only
    if 'vendor_name' in data and data['vendor_name']:
        vendor.vendor_name = data['vendor_name'].strip()

    if 'organization' in data:
        vendor.organization = data['organization'].strip() if data['organization'] else None

    if 'contact_phone' in data:
        vendor.contact_phone = data['contact_phone'].strip() if data['contact_phone'] else None

    if 'city' in data:
        vendor.city = data['city'].strip() if data['city'] else None

    if 'state' in data:
        vendor.state = data['state'].strip() if data['state'] else None

    if 'country' in data:
        vendor.country = data['country'].strip() if data['country'] else 'India'

    if 'address' in data:
        vendor.address = data['address'].strip() if data['address'] else None

    try:
        db.session.commit()
        current_app.logger.info(f"[VENDOR_UPDATE] Profile updated: {vendor.contact_email}")

        return success_response(
            vendor.to_dict(),
            message='Profile updated successfully'
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[VENDOR_UPDATE] Error: {str(e)}")
        return error_response(f'Update failed: {str(e)}', status_code=500)


@vendor_auth_bp.route('/change-password', methods=['POST'])
@vendor_token_required
def change_vendor_password():
    """
    Change vendor password.

    Requires: Authorization: Bearer <vendor_token>

    Request Body:
        current_password (str, required): Current password
        new_password (str, required): New password (min 8 characters)

    Returns:
        200: Password changed successfully
        400: Invalid input
        401: Wrong current password
    """
    data = request.get_json()
    vendor = g.vendor

    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return error_response('Current password and new password are required', status_code=400)

    if len(new_password) < 8:
        return error_response('New password must be at least 8 characters', status_code=400)

    # Verify current password
    if not vendor.check_password(current_password):
        return error_response('Current password is incorrect', status_code=401)

    # Update password
    try:
        vendor.set_password(new_password)
        db.session.commit()
        current_app.logger.info(f"[VENDOR_PASSWORD] Password changed: {vendor.contact_email}")

        return success_response(
            message='Password changed successfully'
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[VENDOR_PASSWORD] Error: {str(e)}")
        return error_response(f'Password change failed: {str(e)}', status_code=500)
