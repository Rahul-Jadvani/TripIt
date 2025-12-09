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


class MedicalInfoHasher:
    """Generate and verify salted hashes of emergency contacts + medical information"""

    @staticmethod
    def normalize_medical_data(
        contact1_name: Optional[str],
        contact1_phone: Optional[str],
        contact2_name: Optional[str],
        contact2_phone: Optional[str],
        blood_group: Optional[str],
        medications: Optional[str],
        allergies: Optional[str],
        other_medical_info: Optional[str]
    ) -> Dict[str, str]:
        """
        Normalize medical and emergency contact data for consistent hashing
        Args:
            contact1_name: Primary emergency contact name
            contact1_phone: Primary emergency contact phone
            contact2_name: Secondary emergency contact name
            contact2_phone: Secondary emergency contact phone
            blood_group: Blood group (A+, B+, O+, AB+, A-, B-, O-, AB-)
            medications: Current medications
            allergies: Known allergies
            other_medical_info: Additional medical/safety information
        Returns:
            Dictionary with normalized fields
        """
        return {
            'contact1_name': IdentityHasher.normalize_string(contact1_name or ""),
            'contact1_phone': IdentityHasher.normalize_phone(contact1_phone or ""),
            'contact2_name': IdentityHasher.normalize_string(contact2_name or ""),
            'contact2_phone': IdentityHasher.normalize_phone(contact2_phone or ""),
            'blood_group': IdentityHasher.normalize_string(blood_group or ""),
            'medications': IdentityHasher.normalize_string(medications or ""),
            'allergies': IdentityHasher.normalize_string(allergies or ""),
            'other_medical_info': IdentityHasher.normalize_string(other_medical_info or ""),
        }

    @staticmethod
    def generate_medical_profile_hash(
        contact1_name: Optional[str],
        contact1_phone: Optional[str],
        contact2_name: Optional[str] = None,
        contact2_phone: Optional[str] = None,
        blood_group: Optional[str] = None,
        medications: Optional[str] = None,
        allergies: Optional[str] = None,
        other_medical_info: Optional[str] = None,
        salt: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate salted SHA-256 hash of emergency contacts + medical data
        Args:
            contact1_name: Primary emergency contact name (required)
            contact1_phone: Primary emergency contact phone (required)
            contact2_name: Secondary emergency contact name (optional)
            contact2_phone: Secondary emergency contact phone (optional)
            blood_group: Blood group (optional)
            medications: Current medications (optional)
            allergies: Known allergies (optional)
            other_medical_info: Additional medical/safety info (optional)
            salt: Salt (auto-generated if not provided)
        Returns:
            Dictionary with 'hash' and 'salt' keys
        """
        # Generate salt if not provided
        if not salt:
            salt = IdentityHasher.generate_salt()

        # Normalize medical data
        normalized = MedicalInfoHasher.normalize_medical_data(
            contact1_name, contact1_phone,
            contact2_name, contact2_phone,
            blood_group, medications, allergies, other_medical_info
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
    def verify_medical_profile_hash(
        contact1_name: Optional[str],
        contact1_phone: Optional[str],
        contact2_name: Optional[str],
        contact2_phone: Optional[str],
        blood_group: Optional[str],
        medications: Optional[str],
        allergies: Optional[str],
        other_medical_info: Optional[str],
        stored_hash: str,
        stored_salt: str
    ) -> bool:
        """
        Verify medical data matches stored hash
        Args:
            contact1_name: Primary emergency contact name
            contact1_phone: Primary emergency contact phone
            contact2_name: Secondary emergency contact name
            contact2_phone: Secondary emergency contact phone
            blood_group: Blood group
            medications: Current medications
            allergies: Known allergies
            other_medical_info: Additional medical/safety info
            stored_hash: Hash stored in database
            stored_salt: Salt stored in database
        Returns:
            True if hash matches, False otherwise
        """
        result = MedicalInfoHasher.generate_medical_profile_hash(
            contact1_name, contact1_phone,
            contact2_name, contact2_phone,
            blood_group, medications, allergies, other_medical_info,
            salt=stored_salt
        )
        return result['hash'] == stored_hash
