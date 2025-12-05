"""
Snap routes - Instagram Stories-like feature for TripIt
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename
import os

from extensions import db
from models.snap import Snap
from models.traveler import Traveler
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, paginated_response, get_pagination_params
from utils.ipfs import PinataService
from utils.trip_economy import TripEconomy
from flask import current_app

snaps_bp = Blueprint('snaps', __name__)

# Configuration for file uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return error_response(f'File size exceeds {MAX_FILE_SIZE / 1024 / 1024}MB limit', 413)

        # Upload to IPFS via Pinata
        original_filename = secure_filename(file.filename)

        # Save to local directory for AI analysis
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'snaps')
        os.makedirs(upload_folder, exist_ok=True)

        # Generate unique filename for local storage
        from uuid import uuid4
        local_filename = f"{uuid4()}.{original_filename.rsplit('.', 1)[1].lower()}"
        local_path = os.path.join(upload_folder, local_filename)

        # Reset file pointer and save locally
        file.seek(0)
        file.save(local_path)

        # Reset file pointer again for IPFS upload
        file.seek(0)
        result = PinataService.upload_file(file, filename=original_filename)

        if not result['success']:
            # Clean up local file if IPFS upload fails
            try:
                os.remove(local_path)
            except:
                pass
            return error_response(f'IPFS upload failed: {result["error"]}', 500)

        # Use IPFS URL for frontend/feed
        image_url = result['url']  # IPFS gateway URL
        ipfs_hash = result['ipfs_hash']

        # Create snap object
        snap = Snap(
            user_id=user_id,
            caption=caption,
            image_url=image_url,
            image_filename=original_filename,
            ipfs_hash=ipfs_hash,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
            city=city,
            country=country,
            location_accuracy=location_accuracy,
        )

        db.session.add(snap)
        db.session.commit()

        # Trigger AI analysis task with local file path (async with sync fallback)
        try:
            from tasks.ai_analysis_tasks import analyze_snap_ai
            analyze_snap_ai.delay(snap.id, local_filename)
            print(f"[Snaps] ✅ AI analysis task queued for snap {snap.id}")
        except Exception as e:
            print(f"[Snaps] ⚠️ Failed to queue AI analysis task: {e}")
            # Sync fallback: Run AI analysis immediately with local file
            try:
                from services.ai_analyzer import AIAnalyzer
                import base64
                ai_analyzer = AIAnalyzer()
                if ai_analyzer.is_available():
                    print(f"[Snaps] 🔄 Running AI analysis synchronously (fallback)")
                    snap_data = snap.to_dict(include_creator=True)

                    # Convert local file to base64 for AI analysis
                    if os.path.exists(local_path):
                        with open(local_path, 'rb') as img_file:
                            image_data = base64.b64encode(img_file.read()).decode('utf-8')
                        ext = local_filename.rsplit('.', 1)[1].lower()
                        mime_type = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                        snap_data['image_url'] = f"data:{mime_type};base64,{image_data}"

                    alerts = ai_analyzer.analyze_snap(snap_data)
                    print(f"[Snaps] ✅ Sync AI analysis completed: {len(alerts)} alerts")
            except Exception as sync_error:
                print(f"[Snaps] ❌ Sync AI analysis also failed: {sync_error}")

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
