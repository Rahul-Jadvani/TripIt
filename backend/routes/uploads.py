"""
File upload routes - Using Pinata IPFS
"""
import os
from flask import Blueprint, request
from werkzeug.utils import secure_filename

from utils.decorators import token_required
from utils.helpers import success_response, error_response
from utils.ipfs import PinataService

uploads_bp = Blueprint('uploads', __name__)

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
ALLOWED_PDF_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (IPFS can handle larger files)
MAX_PDF_SIZE = 25 * 1024 * 1024  # 25MB for pitch decks


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_pdf(filename):
    """Check if PDF file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PDF_EXTENSIONS


@uploads_bp.route('', methods=['POST'])
@token_required
def upload_file(user_id):
    """Upload screenshot to IPFS via Pinata"""
    try:
        if 'file' not in request.files:
            return error_response('Bad request', 'No file provided', 400)

        file = request.files['file']

        if file.filename == '':
            return error_response('Bad request', 'No file selected', 400)

        if not allowed_file(file.filename):
            return error_response('Bad request', 'File type not allowed. Allowed: png, jpg, jpeg, gif, webp, svg', 400)

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return error_response('Bad request', f'File size exceeds {MAX_FILE_SIZE / 1024 / 1024}MB limit', 413)

        # Upload to IPFS via Pinata
        result = PinataService.upload_file(file)

        if not result['success']:
            return error_response('Upload failed', result['error'], 500)

        return success_response({
            'filename': result['filename'],
            'url': result['url'],  # IPFS gateway URL
            'ipfs_hash': result['ipfs_hash'],
            'pinata_url': result['pinata_url'],
            'size': file_size
        }, 'File uploaded to IPFS successfully', 201)

    except Exception as e:
        return error_response('Upload failed', str(e), 500)


@uploads_bp.route('/pitch-deck', methods=['POST'])
@token_required
def upload_pitch_deck(user_id):
    """Upload pitch deck PDF to IPFS via Pinata"""
    try:
        if 'file' not in request.files:
            return error_response('Bad request', 'No file provided', 400)

        file = request.files['file']

        if file.filename == '':
            return error_response('Bad request', 'No file selected', 400)

        if not allowed_pdf(file.filename):
            return error_response('Bad request', 'Only PDF files are allowed for pitch decks', 400)

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_PDF_SIZE:
            return error_response('Bad request', f'File size exceeds {MAX_PDF_SIZE / 1024 / 1024}MB limit', 413)

        # Upload to IPFS via Pinata
        result = PinataService.upload_file(file)

        if not result['success']:
            return error_response('Upload failed', result['error'], 500)

        return success_response({
            'filename': result['filename'],
            'url': result['url'],  # IPFS gateway URL
            'ipfs_hash': result['ipfs_hash'],
            'pinata_url': result['pinata_url'],
            'size': file_size
        }, 'Pitch deck uploaded to IPFS successfully', 201)

    except Exception as e:
        return error_response('Upload failed', str(e), 500)


@uploads_bp.route('/test', methods=['GET'])
@token_required
def test_pinata(user_id):
    """Test Pinata connection"""
    result = PinataService.test_connection()

    if result['connected']:
        return success_response(result, 'Pinata connection successful', 200)
    else:
        return error_response('Connection failed', result['error'], 500)
