"""
Pinata IPFS Integration for File Storage
"""
import os
import requests
from flask import current_app
from werkzeug.utils import secure_filename


class PinataService:
    """Service for uploading files to IPFS via Pinata"""

    PINATA_API_URL = "https://api.pinata.cloud"
    PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"

    @staticmethod
    def get_headers():
        """Get Pinata API headers"""
        jwt_token = current_app.config.get('PINATA_JWT')
        if jwt_token:
            return {
                'Authorization': f'Bearer {jwt_token}'
            }
        else:
            # Fallback to API keys
            return {
                'pinata_api_key': current_app.config.get('PINATA_API_KEY'),
                'pinata_secret_api_key': current_app.config.get('PINATA_SECRET_API_KEY')
            }

    @staticmethod
    def upload_file(file, filename=None):
        """
        Upload file to IPFS via Pinata

        Args:
            file: FileStorage object from Flask request
            filename: Optional custom filename

        Returns:
            dict: {
                'success': bool,
                'ipfs_hash': str,
                'url': str,
                'error': str or None
            }
        """
        try:
            # Secure filename
            if filename:
                safe_filename = secure_filename(filename)
            else:
                safe_filename = secure_filename(file.filename)

            # Prepare file for upload
            files = {
                'file': (safe_filename, file.stream, file.content_type)
            }

            # Optional metadata (as JSON string)
            import json
            metadata = {
                'name': safe_filename,
                'keyvalues': {
                    'project': '0x.ship',
                    'type': 'project-screenshot'
                }
            }

            # Prepare request data
            data = {
                'pinataMetadata': json.dumps(metadata),
                'pinataOptions': json.dumps({"cidVersion": 1})
            }

            # Upload to Pinata
            headers = PinataService.get_headers()
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
                    'url': f"{PinataService.PINATA_GATEWAY}/{ipfs_hash}",
                    'pinata_url': f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}",
                    'filename': safe_filename,
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'ipfs_hash': None,
                    'url': None,
                    'error': f"Pinata upload failed: {response.text}"
                }

        except Exception as e:
            return {
                'success': False,
                'ipfs_hash': None,
                'url': None,
                'error': f"Upload error: {str(e)}"
            }

    @staticmethod
    def test_connection():
        """Test Pinata API connection"""
        try:
            headers = PinataService.get_headers()
            response = requests.get(
                f"{PinataService.PINATA_API_URL}/data/testAuthentication",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                return {
                    'connected': True,
                    'message': 'Pinata API authenticated successfully',
                    'error': None
                }
            else:
                return {
                    'connected': False,
                    'message': None,
                    'error': f"Authentication failed: {response.text}"
                }

        except Exception as e:
            return {
                'connected': False,
                'message': None,
                'error': f"Connection error: {str(e)}"
            }

    @staticmethod
    def get_pinned_files(limit=10):
        """Get list of pinned files"""
        try:
            headers = PinataService.get_headers()
            params = {
                'status': 'pinned',
                'pageLimit': limit
            }

            response = requests.get(
                f"{PinataService.PINATA_API_URL}/data/pinList",
                headers=headers,
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'files': result.get('rows', []),
                    'count': result.get('count', 0),
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'files': [],
                    'count': 0,
                    'error': f"Failed to fetch files: {response.text}"
                }

        except Exception as e:
            return {
                'success': False,
                'files': [],
                'count': 0,
                'error': f"Error: {str(e)}"
            }

    @staticmethod
    def unpin_file(ipfs_hash):
        """Unpin file from IPFS (delete)"""
        try:
            headers = PinataService.get_headers()
            response = requests.delete(
                f"{PinataService.PINATA_API_URL}/pinning/unpin/{ipfs_hash}",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'error': f"Unpin failed: {response.text}"
                }

        except Exception as e:
            return {
                'success': False,
                'error': f"Error: {str(e)}"
            }
