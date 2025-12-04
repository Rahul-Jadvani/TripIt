"""
Snap routes - Instagram Stories-like feature for TripIt
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename
import os
import uuid

from extensions import db
from models.snap import Snap
from models.traveler import Traveler
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params

snaps_bp = Blueprint('snaps', __name__)

# Configuration for file uploads
UPLOAD_FOLDER = 'uploads/snaps'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_upload_folder():
    """Get or create upload folder"""
    upload_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), UPLOAD_FOLDER)
    os.makedirs(upload_path, exist_ok=True)
    return upload_path


@snaps_bp.route('', methods=['POST'])
@token_required
def create_snap(user_id):
    """Create a new snap with image and geolocation"""
    try:
        # Check if image file is in request
        if 'image' not in request.files:
            return error_response('No image file provided', 400)

        file = request.files['image']

        if file.filename == '':
            return error_response('No image file selected', 400)

        if not allowed_file(file.filename):
            return error_response('Invalid file type. Allowed: png, jpg, jpeg, gif, webp', 400)

        # Get form data
        caption = request.form.get('caption', '')
        latitude = request.form.get('latitude', type=float)
        longitude = request.form.get('longitude', type=float)
        location_name = request.form.get('location_name', '')
        city = request.form.get('city', '')
        country = request.form.get('country', '')
        location_accuracy = request.form.get('location_accuracy', type=float)

        # Validate geolocation
        if latitude is None or longitude is None:
            return error_response('Geolocation (latitude and longitude) is required', 400)

        # Validate latitude and longitude ranges
        if not (-90 <= latitude <= 90):
            return error_response('Invalid latitude. Must be between -90 and 90', 400)

        if not (-180 <= longitude <= 180):
            return error_response('Invalid longitude. Must be between -180 and 180', 400)

        # Save the file
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"

        upload_folder = get_upload_folder()
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)

        # Create relative URL for the image
        image_url = f"/uploads/snaps/{unique_filename}"

        # Create snap object
        snap = Snap(
            user_id=user_id,
            caption=caption,
            image_url=image_url,
            image_filename=original_filename,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
            city=city,
            country=country,
            location_accuracy=location_accuracy,
        )

        db.session.add(snap)
        db.session.commit()

        return success_response(
            data=snap.to_dict(include_creator=True),
            message='Snap created successfully!',
            status_code=201
        )

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Failed to create snap: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to create snap: {str(e)}', 500)


@snaps_bp.route('', methods=['GET'])
@optional_auth
def list_snaps(user_id):
    """List snaps with pagination and filtering"""
    try:
        page, per_page = get_pagination_params(request)

        # Filters
        user_filter = request.args.get('user_id', '').strip()
        location = request.args.get('location', '').strip()

        # Build query - only show published snaps
        query = Snap.query.filter_by(is_deleted=False, is_published=True)

        # Filter by user
        if user_filter:
            query = query.filter_by(user_id=user_filter)

        # Filter by location
        if location:
            location_term = f'%{location}%'
            query = query.filter(
                or_(
                    Snap.location_name.ilike(location_term),
                    Snap.city.ilike(location_term),
                    Snap.country.ilike(location_term)
                )
            )

        # Sort by newest first
        query = query.order_by(Snap.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # Convert to dict with creator info
        snaps_data = [snap.to_dict(include_creator=True) for snap in pagination.items]

        return paginated_response(
            snaps_data,
            pagination.total,
            pagination.page,
            pagination.per_page,
            'Snaps retrieved successfully'
        )

    except Exception as e:
        print(f"[ERROR] Failed to list snaps: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to list snaps: {str(e)}', 500)


@snaps_bp.route('/<snap_id>', methods=['GET'])
@optional_auth
def get_snap(user_id, snap_id):
    """Get a single snap by ID"""
    try:
        snap = Snap.query.filter_by(id=snap_id, is_deleted=False).first()

        if not snap:
            return error_response('Snap not found', 404)

        # Increment view count
        snap.view_count += 1
        db.session.commit()

        return success_response(
            data=snap.to_dict(include_creator=True),
            message='Snap retrieved successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Failed to get snap: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to get snap: {str(e)}', 500)


@snaps_bp.route('/<snap_id>', methods=['DELETE'])
@token_required
def delete_snap(user_id, snap_id):
    """Delete a snap (soft delete)"""
    try:
        snap = Snap.query.filter_by(id=snap_id, is_deleted=False).first()

        if not snap:
            return error_response('Snap not found', 404)

        # Check ownership
        if snap.user_id != user_id:
            return error_response('You can only delete your own snaps', 403)

        # Soft delete
        snap.is_deleted = True
        db.session.commit()

        return success_response(
            message='Snap deleted successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Failed to delete snap: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to delete snap: {str(e)}', 500)


@snaps_bp.route('/<snap_id>/like', methods=['POST'])
@token_required
def like_snap(user_id, snap_id):
    """Like a snap"""
    try:
        snap = Snap.query.filter_by(id=snap_id, is_deleted=False).first()

        if not snap:
            return error_response('Snap not found', 404)

        # Increment like count
        snap.like_count += 1
        db.session.commit()

        return success_response(
            data={'like_count': snap.like_count},
            message='Snap liked successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Failed to like snap: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to like snap: {str(e)}', 500)


@snaps_bp.route('/feed', methods=['GET'])
@optional_auth
def get_snap_feed(user_id):
    """Get snap feed - all snaps from users you follow + your own"""
    try:
        page, per_page = get_pagination_params(request)

        # Base query - only show published snaps
        query = Snap.query.filter_by(is_deleted=False, is_published=True)

        # If user is logged in, could filter to following (for now show all)
        # TODO: Add following logic when user following is implemented

        # Sort by newest first
        query = query.order_by(Snap.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # Convert to dict with creator info
        snaps_data = [snap.to_dict(include_creator=True) for snap in pagination.items]

        return paginated_response(
            snaps_data,
            pagination.total,
            pagination.page,
            pagination.per_page,
            'Snap feed retrieved successfully'
        )

    except Exception as e:
        print(f"[ERROR] Failed to get snap feed: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to get snap feed: {str(e)}', 500)


@snaps_bp.route('/user/<user_id>', methods=['GET'])
@optional_auth
def get_user_snaps(current_user_id, user_id):
    """Get all snaps from a specific user"""
    try:
        page, per_page = get_pagination_params(request)

        # Query user's snaps
        query = Snap.query.filter_by(
            user_id=user_id,
            is_deleted=False,
            is_published=True
        ).order_by(Snap.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # Convert to dict with creator info
        snaps_data = [snap.to_dict(include_creator=True) for snap in pagination.items]

        return paginated_response(
            snaps_data,
            pagination.total,
            pagination.page,
            pagination.per_page,
            'User snaps retrieved successfully'
        )

    except Exception as e:
        print(f"[ERROR] Failed to get user snaps: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to get user snaps: {str(e)}', 500)
