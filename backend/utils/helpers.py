"""
Helper utilities
"""
from datetime import datetime
from flask import jsonify


def success_response(data=None, message='Success', status_code=200):
    """Create a standardized success response"""
    response = {'status': 'success', 'message': message}
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code


def error_response(error, message=None, status_code=400):
    """Create a standardized error response"""
    response = {
        'status': 'error',
        'error': error,
    }
    if message:
        response['message'] = message
    return jsonify(response), status_code


def paginated_response(items, total, page, per_page, message='Success'):
    """Create a paginated response"""
    total_pages = (total + per_page - 1) // per_page
    return jsonify({
        'status': 'success',
        'message': message,
        'data': items,
        'pagination': {
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
        }
    }), 200


def get_pagination_params(request, default_per_page=20, max_per_page=100):
    """Extract and validate pagination params from request"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', default_per_page))

        if page < 1:
            page = 1
        if per_page < 1:
            per_page = default_per_page
        if per_page > max_per_page:
            per_page = max_per_page

        return page, per_page
    except (ValueError, TypeError):
        return 1, default_per_page


def format_datetime(dt):
    """Format datetime to ISO format string"""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt


def calculate_pagination_offset(page: int, per_page: int) -> int:
    """Calculate offset from page number"""
    return (page - 1) * per_page


def generate_slug(text: str) -> str:
    """Generate URL-friendly slug from text"""
    import re
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


def truncate_text(text: str, max_length: int = 100) -> str:
    """Truncate text to max length with ellipsis"""
    if len(text) > max_length:
        return text[:max_length] + '...'
    return text
