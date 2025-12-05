"""
Identity Hashing Utilities
Purpose: Generate salted SHA-256 hashes of traveler profile data for on-chain storage
Security: Protects PII while allowing profile verification
"""
import hashlib
import secrets
import json
from datetime import date
from typing import Optional, Dict


class IdentityHasher:
    """Generate and verify salted profile hashes"""

    @staticmethod
    def generate_salt(bytes_length: int = 16) -> str:
        """
        Generate random salt for hashing
        Args:
            bytes_length: Number of random bytes (default: 16)
        Returns:
            Hex-encoded salt string (32 chars for 16 bytes)
        """
        return secrets.token_hex(bytes_length)

    @staticmethod
    def normalize_string(value: str) -> str:
        """
        Normalize string for consistent hashing
        Args:
            value: Input string
        Returns:
            Lowercased, whitespace-stripped string
        """
        if not value:
            return ""
        # Lowercase, strip, and collapse multiple spaces
        return ' '.join(value.lower().strip().split())

    @staticmethod
    def normalize_phone(phone: Optional[str]) -> str:
        """
        Normalize phone number (remove non-digits)
        Args:
            phone: Phone number string
        Returns:
            Digits-only string
        """
        if not phone:
            return ""
        return ''.join(c for c in phone if c.isdigit())

    @staticmethod
    def normalize_profile_data(
        full_name: str,
        date_of_birth: date,
        email: str,
        phone: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Normalize profile data for consistent hashing
        Args:
            full_name: Traveler's full name
            date_of_birth: Date of birth
            email: Email address
            phone: Phone number (optional)
        Returns:
            Dictionary with normalized fields
        """
        return {
            'full_name': IdentityHasher.normalize_string(full_name),
            'date_of_birth': date_of_birth.isoformat(),  # YYYY-MM-DD
            'email': email.lower().strip(),
            'phone': IdentityHasher.normalize_phone(phone),
        }

    @staticmethod
    def generate_profile_hash(
        full_name: str,
        date_of_birth: date,
        email: str,
        phone: Optional[str] = None,
        salt: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate salted SHA-256 hash of profile data
        Args:
            full_name: Traveler's full name
            date_of_birth: Date of birth
            email: Email address
            phone: Phone number (optional)
            salt: Salt (auto-generated if not provided)
        Returns:
            Dictionary with 'hash' and 'salt' keys
        """
        # Generate salt if not provided
        if not salt:
            salt = IdentityHasher.generate_salt()

        # Normalize profile data
        normalized = IdentityHasher.normalize_profile_data(
            full_name, date_of_birth, email, phone
        )

        # Create canonical JSON string (sorted keys for determinism)
        canonical_data = json.dumps(normalized, sort_keys=True, separators=(',', ':'))

        # Hash with salt
        salted_data = f"{canonical_data}|{salt}"
        hash_value = hashlib.sha256(salted_data.encode('utf-8')).hexdigest()

        return {
            'hash': hash_value,
            'salt': salt
        }

    @staticmethod
    def verify_profile_hash(
        full_name: str,
        date_of_birth: date,
        email: str,
        stored_hash: str,
        stored_salt: str,
        phone: Optional[str] = None
    ) -> bool:
        """
        Verify profile data matches stored hash
        Args:
            full_name: Traveler's full name
            date_of_birth: Date of birth
            email: Email address
            stored_hash: Hash stored in database
            stored_salt: Salt stored in database
            phone: Phone number (optional)
        Returns:
            True if hash matches, False otherwise
        """
        result = IdentityHasher.generate_profile_hash(
            full_name, date_of_birth, email, phone, salt=stored_salt
        )
        return result['hash'] == stored_hash


class EmergencyContactHasher:
    """Hash emergency contacts for privacy"""

    @staticmethod
    def normalize_contact(name: Optional[str], phone: Optional[str]) -> str:
        """
        Normalize a single emergency contact
        Args:
            name: Contact name
            phone: Contact phone
        Returns:
            Normalized concatenated string
        """
        normalized_name = IdentityHasher.normalize_string(name or "")
        normalized_phone = IdentityHasher.normalize_phone(phone or "")
        return f"{normalized_name}|{normalized_phone}"

    @staticmethod
    def generate_emergency_hash(
        contact1_name: Optional[str],
        contact1_phone: Optional[str],
        contact2_name: Optional[str],
        contact2_phone: Optional[str]
    ) -> Optional[str]:
        """
        Generate SHA-256 hash of concatenated emergency contacts
        Args:
            contact1_name: First contact name
            contact1_phone: First contact phone
            contact2_name: Second contact name
            contact2_phone: Second contact phone
        Returns:
            SHA-256 hash (hex) or None if no contacts
        """
        # If no contacts provided, return None
        if not any([contact1_name, contact1_phone, contact2_name, contact2_phone]):
            return None

        # Normalize both contacts
        contact1 = EmergencyContactHasher.normalize_contact(contact1_name, contact1_phone)
        contact2 = EmergencyContactHasher.normalize_contact(contact2_name, contact2_phone)

        # Concatenate with delimiter
        data = f"{contact1}||{contact2}"

        # Hash
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    @staticmethod
    def verify_emergency_hash(
        contact1_name: Optional[str],
        contact1_phone: Optional[str],
        contact2_name: Optional[str],
        contact2_phone: Optional[str],
        stored_hash: str
    ) -> bool:
        """
        Verify emergency contacts match stored hash
        Args:
            contact1_name: First contact name
            contact1_phone: First contact phone
            contact2_name: Second contact name
            contact2_phone: Second contact phone
            stored_hash: Hash stored in database
        Returns:
            True if hash matches, False otherwise
        """
        computed_hash = EmergencyContactHasher.generate_emergency_hash(
            contact1_name, contact1_phone, contact2_name, contact2_phone
        )
        return computed_hash == stored_hash if computed_hash else False
