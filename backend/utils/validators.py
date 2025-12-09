"""
Input validation utilities
"""
import re
from urllib.parse import urlparse


def validate_email(email: str) -> bool:
    """Validate email address"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_username(username: str) -> bool:
    """Validate username (alphanumeric, underscore, hyphen, 3-100 chars)"""
    pattern = r'^[a-zA-Z0-9_-]{3,100}$'
    return re.match(pattern, username) is not None


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, 'Password must be at least 8 characters'
    if not any(char.isupper() for char in password):
        return False, 'Password must contain at least one uppercase letter'
    if not any(char.isdigit() for char in password):
        return False, 'Password must contain at least one digit'
    return True, 'Valid'


def validate_url(url: str) -> bool:
    """Validate URL format"""
    try:
        result = urlparse(url)
        return all([result.scheme in ['http', 'https'], result.netloc])
    except Exception:
        return False


def validate_ethereum_address(address: str) -> bool:
    """Validate Ethereum/Kaia address format"""
    pattern = r'^0x[a-fA-F0-9]{40}$'
    return re.match(pattern, address) is not None


def validate_project_title(title: str) -> bool:
    """Validate project title (5-200 chars)"""
    return 5 <= len(title) <= 200


def validate_project_description(description: str) -> bool:
    """Validate project description (50+ chars)"""
    return len(description) >= 50


def sanitize_input(text: str) -> str:
    """Basic input sanitization to prevent XSS"""
    # Remove potentially harmful HTML tags
    dangerous_chars = ['<', '>', '"', "'"]
    for char in dangerous_chars:
        text = text.replace(char, '')
    return text.strip()
