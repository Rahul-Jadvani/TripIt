"""
SBT Verification Model - for blockchain verification tracking
"""
from datetime import datetime
from uuid import uuid4
from extensions import db


class SBTVerification(db.Model):
    """SBT Verification model - tracks blockchain verification state"""

    __tablename__ = 'sbt_verifications'

    # Identity
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    traveler_id = db.Column(db.String(36), db.ForeignKey('travelers.id', ondelete='CASCADE'), nullable=False, index=True, unique=True)

    # Blockchain Info
    sbt_id = db.Column(db.String(256), unique=True, nullable=False)
    sbt_contract_address = db.Column(db.String(42), nullable=False)
    blockchain_network = db.Column(db.String(50), default='base_sepolia')  # base_sepolia, base_mainnet, etc.

    # Verification Data (Encrypted in production)
    passport_hash = db.Column(db.String(256), nullable=True)  # SHA-256 of passport
    aadhaar_hash = db.Column(db.String(256), nullable=True)  # SHA-256 of Aadhaar (India)
    dob_hash = db.Column(db.String(256), nullable=True)  # SHA-256 of DOB

    # Dates
    entry_date = db.Column(db.Date, nullable=True)
    exit_date = db.Column(db.Date, nullable=True)

    # Blockchain Sync
    is_blockchain_synced = db.Column(db.Boolean, default=False)
    last_blockchain_sync = db.Column(db.DateTime, nullable=True)
    sync_error_message = db.Column(db.Text, nullable=True)

    # Transaction Hashes
    issuance_tx_hash = db.Column(db.String(66), nullable=True)
    verification_tx_hash = db.Column(db.String(66), nullable=True)
    merkle_proof_ipfs = db.Column(db.String(100), nullable=True)

    # Status
    verification_status = db.Column(db.String(50), default='pending')  # pending, verified, expired, revoked
    verified_by_authority = db.Column(db.String(200), nullable=True)  # Government authority name
    verified_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary (exclude hashes for privacy)"""
        return {
            'id': self.id,
            'sbt_id': self.sbt_id,
            'blockchain_network': self.blockchain_network,
            'is_blockchain_synced': self.is_blockchain_synced,
            'verification_status': self.verification_status,
            'verified_by_authority': self.verified_by_authority,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
