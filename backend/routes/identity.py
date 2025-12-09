"""
Identity Routes - Blockchain identity management
Endpoints: wallet binding, profile hashing, SBT minting
"""
from flask import Blueprint, request, current_app
from extensions import db
from models.traveler import Traveler
from utils.decorators import token_required
from utils.helpers import success_response, error_response
from utils.identity import IdentityHasher, EmergencyContactHasher, MedicalInfoHasher
from utils.sbt_service import SBTService
from web3 import Web3
from eth_account.messages import encode_defunct
from datetime import datetime

identity_bp = Blueprint('identity', __name__)


@identity_bp.route('/bind-wallet', methods=['POST'])
@token_required
def bind_wallet(user_id):
    """
    Bind wallet to traveler account (ONE-TIME, IMMUTABLE)

    Request Body:
        wallet_address (str): Ethereum address (0x...)
        signature (str): Signature of bind message

    Returns:
        200: Wallet bound successfully
        400: Invalid input or wallet already bound
        409: Wallet already bound to another account
    """
    data = request.get_json()
    wallet_address = data.get('wallet_address')
    signature = data.get('signature')

    # Validate inputs
    if not wallet_address or not signature:
        return error_response('Missing wallet_address or signature', status_code=400)

    # Normalize address
    try:
        wallet_address = Web3.to_checksum_address(wallet_address)
    except ValueError:
        return error_response('Invalid wallet address format', status_code=400)

    # Get traveler
    traveler = Traveler.query.get(user_id)
    if not traveler:
        return error_response('Traveler not found', status_code=404)

    # CRITICAL: Check if wallet already bound to THIS traveler
    if traveler.wallet_address:
        if traveler.wallet_address.lower() == wallet_address.lower():
            return success_response(
                {
                    'wallet_address': traveler.wallet_address,
                    'bound_at': traveler.wallet_bound_at.isoformat() if traveler.wallet_bound_at else None
                },
                message='Wallet already bound to this account'
            )
        else:
            return error_response(
                'Wallet already bound. Cannot change. Wallet binding is permanent for identity integrity.',
                status_code=400
            )

    # Check if wallet bound to ANOTHER account
    existing = Traveler.query.filter_by(wallet_address=wallet_address).first()
    if existing:
        return error_response(
            'Wallet already bound to another account',
            status_code=409
        )

    # Verify signature
    message = f"Bind wallet {wallet_address} to TripIt account {traveler.email}"
    w3 = Web3()
    message_hash = encode_defunct(text=message)

    try:
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        if recovered_address.lower() != wallet_address.lower():
            return error_response('Invalid signature', status_code=400)
    except Exception as e:
        return error_response(f'Signature verification failed: {str(e)}', status_code=400)

    # Bind wallet (IMMUTABLE)
    try:
        current_app.logger.info(f"[BIND_WALLET] User ID: {user_id}")
        current_app.logger.info(f"[BIND_WALLET] Traveler ID: {traveler.id}")
        current_app.logger.info(f"[BIND_WALLET] Before assignment - wallet_address: {traveler.wallet_address}")

        traveler.wallet_address = wallet_address
        traveler.wallet_bound_at = datetime.utcnow()

        current_app.logger.info(f"[BIND_WALLET] After assignment - wallet_address: {traveler.wallet_address}")
        current_app.logger.info(f"[BIND_WALLET] After assignment - wallet_bound_at: {traveler.wallet_bound_at}")

        # Check if object is in session
        current_app.logger.info(f"[BIND_WALLET] Is traveler in session: {traveler in db.session}")
        current_app.logger.info(f"[BIND_WALLET] Session dirty objects: {db.session.dirty}")
        current_app.logger.info(f"[BIND_WALLET] Session new objects: {db.session.new}")

        db.session.commit()
        current_app.logger.info(f"[BIND_WALLET] Commit completed successfully")

        # Verify the commit
        db.session.refresh(traveler)
        current_app.logger.info(f"[BIND_WALLET] After refresh - wallet_address: {traveler.wallet_address}")
        current_app.logger.info(f"[BIND_WALLET] After refresh - wallet_bound_at: {traveler.wallet_bound_at}")

        # Double-check with a fresh query
        fresh_traveler = Traveler.query.get(user_id)
        current_app.logger.info(f"[BIND_WALLET] Fresh query - wallet_address: {fresh_traveler.wallet_address}")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[BIND_WALLET] ERROR during commit: {str(e)}")
        import traceback
        current_app.logger.error(f"[BIND_WALLET] Traceback: {traceback.format_exc()}")
        return error_response(f'Failed to bind wallet: {str(e)}', status_code=500)

    return success_response(
        {
            'wallet_address': wallet_address,
            'bound_at': traveler.wallet_bound_at.isoformat()
        },
        message='Wallet bound successfully. This action is permanent.'
    )


@identity_bp.route('/create-profile-hash', methods=['POST'])
@token_required
def create_profile_hash(user_id):
    """
    Generate profile hash from emergency contacts + medical information for SBT minting

    Request Body:
        contact1_name (str): Primary emergency contact name (required)
        contact1_phone (str): Primary emergency contact phone (required)
        contact2_name (str, optional): Secondary emergency contact name
        contact2_phone (str, optional): Secondary emergency contact phone
        blood_group (str, optional): Blood group (A+, B+, O+, AB+, A-, B-, O-, AB-)
        medications (str, optional): Current medications
        allergies (str, optional): Known allergies
        other_medical_info (str, optional): Additional medical/safety information

    Returns:
        200: Profile hash created
        400: Invalid input
    """
    data = request.get_json()
    contact1_name = data.get('contact1_name')
    contact1_phone = data.get('contact1_phone')
    contact2_name = data.get('contact2_name')
    contact2_phone = data.get('contact2_phone')
    blood_group = data.get('blood_group')
    medications = data.get('medications')
    allergies = data.get('allergies')
    other_medical_info = data.get('other_medical_info')

    # Validate required inputs
    if not contact1_name or not contact1_phone:
        return error_response('Missing required fields: contact1_name, contact1_phone', status_code=400)

    # Get traveler
    traveler = Traveler.query.get(user_id)
    if not traveler:
        return error_response('Traveler not found', status_code=404)

    # Generate medical profile hash using MedicalInfoHasher
    result = MedicalInfoHasher.generate_medical_profile_hash(
        contact1_name=contact1_name,
        contact1_phone=contact1_phone,
        contact2_name=contact2_name,
        contact2_phone=contact2_phone,
        blood_group=blood_group,
        medications=medications,
        allergies=allergies,
        other_medical_info=other_medical_info
    )

    # Update traveler
    try:
        current_app.logger.info(f"[CREATE_HASH] User ID: {user_id}")
        current_app.logger.info(f"[CREATE_HASH] Traveler ID: {traveler.id}")
        current_app.logger.info(f"[CREATE_HASH] Before assignment - profile_hash: {traveler.profile_hash}")

        # Update profile hash
        traveler.profile_hash = result['hash']
        traveler.profile_hash_salt = result['salt']
        traveler.profile_hash_updated_at = datetime.utcnow()

        # Update emergency contacts
        traveler.emergency_contact_1_name = contact1_name
        traveler.emergency_contact_1_phone = contact1_phone
        traveler.emergency_contact_2_name = contact2_name
        traveler.emergency_contact_2_phone = contact2_phone

        # Update medical information
        traveler.blood_group = blood_group
        traveler.medications = medications
        traveler.allergies = allergies
        traveler.other_medical_info = other_medical_info

        # Generate emergency contacts hash for backward compatibility
        emergency_hash = EmergencyContactHasher.generate_emergency_hash(
            contact1_name, contact1_phone, contact2_name, contact2_phone
        )
        traveler.emergency_contacts_hash = emergency_hash

        current_app.logger.info(f"[CREATE_HASH] After assignment - profile_hash: {traveler.profile_hash}")
        current_app.logger.info(f"[CREATE_HASH] After assignment - profile_hash_salt: {traveler.profile_hash_salt}")
        current_app.logger.info(f"[CREATE_HASH] Emergency contacts hash: {emergency_hash}")
        current_app.logger.info(f"[CREATE_HASH] Medical data stored successfully")

        # Check session state
        current_app.logger.info(f"[CREATE_HASH] Is traveler in session: {traveler in db.session}")
        current_app.logger.info(f"[CREATE_HASH] Session dirty objects: {db.session.dirty}")

        db.session.commit()
        current_app.logger.info(f"[CREATE_HASH] Commit completed successfully")

        # Verify the commit
        db.session.refresh(traveler)
        current_app.logger.info(f"[CREATE_HASH] After refresh - profile_hash: {traveler.profile_hash}")
        current_app.logger.info(f"[CREATE_HASH] After refresh - contact1_name: {traveler.emergency_contact_1_name}")

        # Double-check with fresh query
        fresh_traveler = Traveler.query.get(user_id)
        current_app.logger.info(f"[CREATE_HASH] Fresh query - profile_hash: {fresh_traveler.profile_hash}")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[CREATE_HASH] ERROR during commit: {str(e)}")
        import traceback
        current_app.logger.error(f"[CREATE_HASH] Traceback: {traceback.format_exc()}")
        return error_response(f'Failed to create profile hash: {str(e)}', status_code=500)

    return success_response(
        {
            'profile_hash': result['hash'],
            'emergency_contacts_hash': emergency_hash,
            'updated_at': traveler.profile_hash_updated_at.isoformat()
        },
        message='Profile hash created successfully from emergency contacts and medical information'
    )


@identity_bp.route('/mint-sbt', methods=['POST'])
@token_required
def mint_sbt(user_id):
    """
    Mint TravelSBT to user's wallet (backend-signed transaction)

    Prerequisites:
        - wallet_address must be bound
        - profile_hash must be created

    Returns:
        200: SBT minted successfully
        400: Missing prerequisites
        409: SBT already issued
        500: Blockchain error
    """
    # Get traveler
    traveler = Traveler.query.get(user_id)
    if not traveler:
        return error_response('Traveler not found', status_code=404)

    # Check prerequisites
    if not traveler.wallet_address:
        return error_response(
            'Wallet not bound. Please bind your wallet first.',
            status_code=400
        )

    if not traveler.profile_hash:
        return error_response(
            'Profile hash not created. Please create your profile hash first.',
            status_code=400
        )

    # Check if SBT already issued
    if traveler.sbt_status in ['issued', 'verified']:
        return error_response(
            f'SBT already issued. Token ID: {traveler.sbt_id}',
            status_code=409
        )

    # Use reputation_score if available, otherwise use traveler_reputation_score
    reputation = traveler.reputation_score if traveler.reputation_score else (traveler.traveler_reputation_score or 0.0)

    # Mint SBT via backend signer
    try:
        current_app.logger.info(f"[MINT_SBT] Starting SBT minting for user {user_id}")
        current_app.logger.info(f"[MINT_SBT] Wallet: {traveler.wallet_address}")
        current_app.logger.info(f"[MINT_SBT] Profile Hash: {traveler.profile_hash}")
        current_app.logger.info(f"[MINT_SBT] Reputation: {reputation}")

        result = SBTService.mint_sbt(
            traveler_wallet=traveler.wallet_address,
            profile_hash=traveler.profile_hash,
            reputation_score=reputation,
            metadata_uri=None  # TODO: Upload metadata to IPFS
        )

        current_app.logger.info(f"[MINT_SBT] Result: {result}")
    except Exception as e:
        current_app.logger.error(f"[MINT_SBT] Exception: {str(e)}")
        import traceback
        current_app.logger.error(f"[MINT_SBT] Traceback: {traceback.format_exc()}")
        return error_response(f'SBT minting failed: {str(e)}', status_code=500)

    if result['success']:
        # Update traveler
        traveler.sbt_id = result['sbt_id']
        traveler.sbt_blockchain_hash = result['tx_hash']
        traveler.sbt_status = 'issued'
        traveler.sbt_verified_date = datetime.utcnow()
        db.session.commit()

        # Determine network
        network = current_app.config.get('BLOCKCHAIN_NETWORK', 'base_sepolia')
        explorer_base = 'https://sepolia.basescan.org' if network == 'base_sepolia' else 'https://basescan.org'

        return success_response(
            {
                'sbt_id': result['sbt_id'],
                'tx_hash': result['tx_hash'],
                'gas_used': result['gas_used'],
                'explorer_url': f"{explorer_base}/tx/{result['tx_hash']}",
                'token_url': f"{explorer_base}/nft/{current_app.config['SBT_CONTRACT_ADDRESS']}/{result['sbt_id']}"
            },
            message='SBT minted successfully!'
        )
    else:
        return error_response(
            f"SBT minting failed: {result.get('error', 'Unknown error')}",
            status_code=500
        )


@identity_bp.route('/profile', methods=['GET'])
@token_required
def get_identity_profile(user_id):
    """
    Get identity profile with blockchain status

    Returns:
        200: Identity profile
        404: Traveler not found
    """
    traveler = Traveler.query.get(user_id)
    if not traveler:
        return error_response('Traveler not found', status_code=404)

    # Mask wallet address (show first 6 and last 4 chars)
    masked_wallet = None
    if traveler.wallet_address:
        masked_wallet = f"{traveler.wallet_address[:6]}...{traveler.wallet_address[-4:]}"

    return success_response({
        'wallet_address': masked_wallet,
        'full_wallet_address': traveler.wallet_address,  # For explorer links
        'wallet_bound': bool(traveler.wallet_address),
        'wallet_bound_at': traveler.wallet_bound_at.isoformat() if traveler.wallet_bound_at else None,
        'profile_hash_created': bool(traveler.profile_hash),
        'profile_hash_updated_at': traveler.profile_hash_updated_at.isoformat() if traveler.profile_hash_updated_at else None,
        'sbt_status': traveler.sbt_status,
        'sbt_id': traveler.sbt_id,
        'sbt_verified_date': traveler.sbt_verified_date.isoformat() if traveler.sbt_verified_date else None,
        'reputation_score': traveler.reputation_score or traveler.traveler_reputation_score or 0.0,
        'emergency_contacts_configured': bool(traveler.emergency_contact_1_name or traveler.emergency_contact_2_name),
    })


@identity_bp.route('/update-emergency-contacts', methods=['PUT'])
@token_required
def update_emergency_contacts(user_id):
    """
    Update emergency contacts and refresh profile hash

    Request Body:
        contact1_name (str)
        contact1_phone (str)
        contact2_name (str, optional)
        contact2_phone (str, optional)

    Returns:
        200: Emergency contacts updated
        400: Invalid input
    """
    data = request.get_json()
    current_app.logger.info(f"[EMERGENCY_CONTACTS] 🔄 Update request for user {user_id}")
    current_app.logger.info(f"[EMERGENCY_CONTACTS] Data: {data}")

    traveler = Traveler.query.get(user_id)
    if not traveler:
        current_app.logger.error(f"[EMERGENCY_CONTACTS] ❌ Traveler not found: {user_id}")
        return error_response('Traveler not found', status_code=404)

    # Update emergency contacts
    traveler.emergency_contact_1_name = data.get('contact1_name')
    traveler.emergency_contact_1_phone = data.get('contact1_phone')
    traveler.emergency_contact_2_name = data.get('contact2_name')
    traveler.emergency_contact_2_phone = data.get('contact2_phone')
    current_app.logger.info(f"[EMERGENCY_CONTACTS] Set contact 1: {traveler.emergency_contact_1_name}")

    # Generate new emergency contacts hash
    emergency_hash = EmergencyContactHasher.generate_emergency_hash(
        traveler.emergency_contact_1_name,
        traveler.emergency_contact_1_phone,
        traveler.emergency_contact_2_name,
        traveler.emergency_contact_2_phone
    )
    traveler.emergency_contacts_hash = emergency_hash

    # Regenerate profile hash if profile exists
    if traveler.profile_hash and traveler.full_name and traveler.date_of_birth:
        result = IdentityHasher.generate_profile_hash(
            full_name=traveler.full_name,
            date_of_birth=traveler.date_of_birth,
            email=traveler.email,
            phone=traveler.phone,
            salt=traveler.profile_hash_salt  # Reuse existing salt
        )
        traveler.profile_hash = result['hash']
        traveler.profile_hash_updated_at = datetime.utcnow()

        # Update on-chain profile hash if SBT exists
        if traveler.sbt_id:
            sbt_result = SBTService.update_profile_hash(
                int(traveler.sbt_id),
                result['hash']
            )
            if not sbt_result['success']:
                return error_response(
                    f"Failed to update on-chain profile hash: {sbt_result.get('error')}",
                    status_code=500
                )

    db.session.commit()
    current_app.logger.info(f"[EMERGENCY_CONTACTS] ✅ Successfully updated for user {user_id}")
    current_app.logger.info(f"[EMERGENCY_CONTACTS] Emergency hash: {emergency_hash}")
    current_app.logger.info(f"[EMERGENCY_CONTACTS] Profile hash: {traveler.profile_hash}")

    return success_response(
        {
            'emergency_contacts_hash': emergency_hash,
            'profile_hash': traveler.profile_hash,
            'updated_at': traveler.profile_hash_updated_at.isoformat() if traveler.profile_hash_updated_at else None
        },
        message='Emergency contacts updated successfully'
    )
