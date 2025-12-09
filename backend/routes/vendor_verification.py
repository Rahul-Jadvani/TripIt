"""
Vendor Verification Routes - QR Code Scanning and User Verification
Endpoints for vendors to verify traveler SBT QR codes.
"""
from flask import Blueprint, request, current_app, g
from datetime import datetime

from extensions import db
from models.vendor import Vendor
from models.user_verification import UserVerification
from utils.helpers import success_response, error_response, paginated_response
from utils.decorators import vendor_token_required
from utils.qr_service import validate_verification_token

vendor_verification_bp = Blueprint('vendor_verification', __name__)


@vendor_verification_bp.route('/verify-token', methods=['POST'])
@vendor_token_required
def verify_user_token():
    """
    Verify a traveler's QR token and retrieve their verification data.
    Increments scan count and updates timestamps.

    Requires: Authorization: Bearer <vendor_token>

    Request Body:
        verification_token (str, required): 64-character hex token from QR code

    Returns:
        200: User verification data
        400: Invalid token format
        404: Token not found
        403: User verification revoked
    """
    data = request.get_json()
    verification_token = data.get('verification_token', '').strip()

    # Validate token format
    if not verification_token:
        return error_response('verification_token is required', status_code=400)

    if not validate_verification_token(verification_token):
        return error_response(
            'Invalid token format. Expected 64-character hexadecimal string.',
            status_code=400
        )

    # Look up verification record
    verification = UserVerification.query.filter_by(verification_token=verification_token).first()

    if not verification:
        current_app.logger.warning(f"[VERIFY_TOKEN] Token not found: {verification_token[:16]}...")
        return error_response('Verification token not found', status_code=404)

    # Check if revoked
    if verification.verification_status == 'revoked':
        current_app.logger.warning(f"[VERIFY_TOKEN] Attempted scan of revoked token: {verification_token[:16]}...")
        return error_response(
            'This user verification has been revoked',
            status_code=403
        )

    vendor = g.vendor

    try:
        # Update scan statistics for verification record
        verification.scan_count += 1
        verification.last_scanned_at = datetime.utcnow()
        verification.last_scanned_by_vendor_id = vendor.id

        # Update vendor scan statistics
        vendor.total_scans += 1
        vendor.last_scan_at = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(
            f"[VERIFY_TOKEN] Scan successful - Vendor: {vendor.vendor_name}, "
            f"User: {verification.full_name}, Scan #{verification.scan_count}"
        )

        return success_response(
            verification.to_vendor_view(),
            message='Verification successful'
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[VERIFY_TOKEN] Error: {str(e)}")
        return error_response(f'Verification failed: {str(e)}', status_code=500)


@vendor_verification_bp.route('/check-token', methods=['POST'])
@vendor_token_required
def check_token():
    """
    Pre-validate a token without incrementing scan count.
    Use this to check if a token exists before full verification.

    Requires: Authorization: Bearer <vendor_token>

    Request Body:
        verification_token (str, required): 64-character hex token

    Returns:
        200: Token status
        400: Invalid token format
    """
    data = request.get_json()
    verification_token = data.get('verification_token', '').strip()

    # Validate token format
    if not verification_token:
        return error_response('verification_token is required', status_code=400)

    if not validate_verification_token(verification_token):
        return error_response(
            'Invalid token format. Expected 64-character hexadecimal string.',
            status_code=400
        )

    # Look up verification record
    verification = UserVerification.query.filter_by(verification_token=verification_token).first()

    if not verification:
        return success_response(
            {
                'exists': False,
                'verification_status': None
            },
            message='Token not found'
        )

    return success_response(
        {
            'exists': True,
            'verification_status': verification.verification_status
        },
        message='Token found'
    )


@vendor_verification_bp.route('/scan-history', methods=['GET'])
@vendor_token_required
def get_scan_history():
    """
    Get vendor's scan history (users they have verified).

    Requires: Authorization: Bearer <vendor_token>

    Query Parameters:
        limit (int, optional): Number of records (default: 20, max: 100)
        offset (int, optional): Offset for pagination (default: 0)

    Returns:
        200: List of scanned verifications
    """
    vendor = g.vendor

    # Pagination params
    try:
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return error_response('Invalid limit or offset parameter', status_code=400)

    # Query verifications scanned by this vendor
    query = UserVerification.query.filter_by(
        last_scanned_by_vendor_id=vendor.id
    ).order_by(
        UserVerification.last_scanned_at.desc()
    )

    # Get total count
    total = query.count()

    # Apply pagination
    verifications = query.offset(offset).limit(limit).all()

    # Format results
    items = []
    for v in verifications:
        items.append({
            'full_name': v.full_name,
            'verification_status': v.verification_status,
            'sbt_token_id': v.sbt_token_id,
            'blood_group': v.blood_group,
            'scan_count': v.scan_count,
            'last_scanned_at': v.last_scanned_at.isoformat() if v.last_scanned_at else None,
        })

    return success_response(
        {
            'items': items,
            'total': total,
            'limit': limit,
            'offset': offset,
            'has_more': offset + len(items) < total
        },
        message='Scan history retrieved'
    )


@vendor_verification_bp.route('/stats', methods=['GET'])
@vendor_token_required
def get_vendor_stats():
    """
    Get vendor's verification statistics.

    Requires: Authorization: Bearer <vendor_token>

    Returns:
        200: Vendor statistics
    """
    vendor = g.vendor

    # Get unique users scanned count
    unique_users = db.session.query(UserVerification).filter_by(
        last_scanned_by_vendor_id=vendor.id
    ).count()

    return success_response(
        {
            'total_scans': vendor.total_scans,
            'unique_users_verified': unique_users,
            'last_scan_at': vendor.last_scan_at.isoformat() if vendor.last_scan_at else None,
            'vendor_since': vendor.created_at.isoformat() if vendor.created_at else None,
        },
        message='Statistics retrieved'
    )
