"""
QR Code Generation Service for SBT Verification
Generates secure verification tokens and QR codes for traveler identity verification.
"""
import secrets
import json
from io import BytesIO

import qrcode
from qrcode.constants import ERROR_CORRECT_H

from utils.ipfs import PinataService


def generate_verification_token(traveler_id: str, wallet_address: str) -> str:
    """
    Generate a secure 64-character verification token.

    Args:
        traveler_id: UUID of the traveler
        wallet_address: Ethereum wallet address

    Returns:
        64-character hex string token
    """
    # Generate cryptographically secure random token
    # secrets.token_hex(32) produces 64 hex characters
    return secrets.token_hex(32)


def generate_qr_code(verification_token: str, user_name: str) -> BytesIO:
    """
    Generate a QR code encoding verification data.

    Args:
        verification_token: The 64-char verification token
        user_name: User's display name (for QR metadata)

    Returns:
        BytesIO buffer containing PNG image
    """
    # Create QR data payload
    qr_data = {
        "type": "tripit_sbt_verification",
        "token": verification_token,
        "version": "1.0",
        "name": user_name
    }

    # Convert to JSON string
    qr_json = json.dumps(qr_data, separators=(',', ':'))  # Compact JSON

    # Create QR code instance with high error correction
    qr = qrcode.QRCode(
        version=None,  # Auto-determine size
        error_correction=ERROR_CORRECT_H,  # High error correction (~30%)
        box_size=10,
        border=4,
    )

    # Add data to QR code
    qr.add_data(qr_json)
    qr.make(fit=True)

    # Create image
    img = qr.make_image(fill_color="black", back_color="white")

    # Save to BytesIO buffer
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    return buffer


def upload_qr_to_ipfs(qr_buffer: BytesIO, filename: str) -> dict:
    """
    Upload QR code image to IPFS via Pinata.

    Args:
        qr_buffer: BytesIO buffer containing QR PNG image
        filename: Filename for the upload

    Returns:
        dict: {
            'success': bool,
            'ipfs_hash': str or None,
            'ipfs_url': str or None,
            'error': str or None
        }
    """
    import requests
    import json as json_module
    from flask import current_app

    try:
        # Get Pinata credentials
        jwt_token = current_app.config.get('PINATA_JWT')

        if jwt_token:
            headers = {'Authorization': f'Bearer {jwt_token}'}
        else:
            headers = {
                'pinata_api_key': current_app.config.get('PINATA_API_KEY'),
                'pinata_secret_api_key': current_app.config.get('PINATA_SECRET_API_KEY')
            }

        # Prepare file for upload
        qr_buffer.seek(0)
        files = {
            'file': (filename, qr_buffer, 'image/png')
        }

        # Metadata for Pinata
        metadata = {
            'name': filename,
            'keyvalues': {
                'project': 'TripIt',
                'type': 'sbt-qr-code'
            }
        }

        data = {
            'pinataMetadata': json_module.dumps(metadata),
            'pinataOptions': json_module.dumps({"cidVersion": 1})
        }

        # Upload to Pinata
        response = requests.post(
            f"{PinataService.PINATA_API_URL}/pinning/pinFileToIPFS",
            files=files,
            data=data,
            headers=headers,
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            ipfs_hash = result['IpfsHash']

            return {
                'success': True,
                'ipfs_hash': ipfs_hash,
                'ipfs_url': f"{PinataService.PINATA_GATEWAY}/{ipfs_hash}",
                'error': None
            }
        else:
            return {
                'success': False,
                'ipfs_hash': None,
                'ipfs_url': None,
                'error': f"Pinata upload failed: {response.text}"
            }

    except Exception as e:
        return {
            'success': False,
            'ipfs_hash': None,
            'ipfs_url': None,
            'error': f"QR upload error: {str(e)}"
        }


def generate_and_upload_qr(traveler_id: str, wallet_address: str, user_name: str) -> dict:
    """
    Generate verification token, create QR code, and upload to IPFS.

    This is the main entry point for QR generation during SBT minting.

    Args:
        traveler_id: UUID of the traveler
        wallet_address: Ethereum wallet address
        user_name: User's display name

    Returns:
        dict: {
            'success': bool,
            'token': str or None,           # 64-char verification token
            'qr_ipfs_url': str or None,     # Full IPFS gateway URL
            'qr_ipfs_hash': str or None,    # IPFS CID
            'error': str or None
        }
    """
    try:
        # Step 1: Generate verification token
        verification_token = generate_verification_token(traveler_id, wallet_address)

        # Step 2: Generate QR code image
        qr_buffer = generate_qr_code(verification_token, user_name)

        # Step 3: Upload to IPFS
        filename = f"tripit_sbt_qr_{traveler_id[:8]}.png"
        upload_result = upload_qr_to_ipfs(qr_buffer, filename)

        if not upload_result['success']:
            return {
                'success': False,
                'token': None,
                'qr_ipfs_url': None,
                'qr_ipfs_hash': None,
                'error': upload_result['error']
            }

        return {
            'success': True,
            'token': verification_token,
            'qr_ipfs_url': upload_result['ipfs_url'],
            'qr_ipfs_hash': upload_result['ipfs_hash'],
            'error': None
        }

    except Exception as e:
        return {
            'success': False,
            'token': None,
            'qr_ipfs_url': None,
            'qr_ipfs_hash': None,
            'error': f"QR generation failed: {str(e)}"
        }


def decode_qr_data(json_string: str) -> dict:
    """
    Parse and validate QR code JSON data.

    Args:
        json_string: JSON string scanned from QR code

    Returns:
        dict: Parsed QR data with 'type', 'token', 'version', 'name'

    Raises:
        ValueError: If JSON is invalid or missing required fields
    """
    try:
        data = json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in QR code: {str(e)}")

    # Validate required fields
    required_fields = ['type', 'token', 'version']
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field in QR data: {field}")

    # Validate type
    if data['type'] != 'tripit_sbt_verification':
        raise ValueError(f"Invalid QR type: {data['type']}")

    # Validate token format (64 hex characters)
    token = data['token']
    if not isinstance(token, str) or len(token) != 64:
        raise ValueError(f"Invalid token length: expected 64, got {len(token) if isinstance(token, str) else 'non-string'}")

    try:
        int(token, 16)  # Validate hex format
    except ValueError:
        raise ValueError("Token is not valid hexadecimal")

    return data


def validate_verification_token(token: str) -> bool:
    """
    Validate verification token format.

    Args:
        token: The verification token to validate

    Returns:
        bool: True if valid format, False otherwise
    """
    if not isinstance(token, str):
        return False

    if len(token) != 64:
        return False

    try:
        int(token, 16)  # Check if valid hex
        return True
    except ValueError:
        return False
