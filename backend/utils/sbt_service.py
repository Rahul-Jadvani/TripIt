"""
SBT Service - Backend signer for minting Soul-Bound Tokens
Purpose: Backend-controlled wallet mints SBTs on behalf of users
Security: Backend holds private key, signs transactions, pays gas
"""
from web3 import Web3
from flask import current_app
import json
import os
from typing import Optional, Dict, Tuple
from datetime import datetime


class SBTService:
    """Service for SBT minting and management on Base network"""

    # Cache for contract ABI (loaded once)
    _contract_abi = None

    @staticmethod
    def get_web3_instance() -> Web3:
        """
        Get Web3 instance for Base network (Sepolia or Mainnet)
        Returns:
            Web3 instance connected to Base RPC
        """
        network = current_app.config.get('BLOCKCHAIN_NETWORK', 'base_sepolia')

        if network == 'base_mainnet':
            rpc_url = current_app.config['BASE_MAINNET_RPC']
        else:
            rpc_url = current_app.config['BASE_SEPOLIA_RPC']

        w3 = Web3(Web3.HTTPProvider(rpc_url))

        if not w3.is_connected():
            raise ConnectionError(f"Failed to connect to Base network at {rpc_url}")

        return w3

    @staticmethod
    def load_contract_abi() -> list:
        """
        Load TravelSBT contract ABI from compiled artifacts
        Returns:
            ABI list
        """
        if SBTService._contract_abi:
            return SBTService._contract_abi

        # Path to compiled contract ABI
        abi_path = os.path.join(
            os.path.dirname(__file__),
            '../../blockchain/artifacts/contracts/TravelSBT.sol/TravelSBT.json'
        )

        try:
            with open(abi_path, 'r') as f:
                contract_json = json.load(f)
                SBTService._contract_abi = contract_json['abi']
                return SBTService._contract_abi
        except FileNotFoundError:
            raise FileNotFoundError(
                f"TravelSBT.json not found at {abi_path}. "
                "Please compile contracts with: cd blockchain && npx hardhat compile"
            )
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in TravelSBT.json: {e}")

    @staticmethod
    def get_sbt_contract():
        """
        Get TravelSBT contract instance
        Returns:
            Contract instance
        """
        w3 = SBTService.get_web3_instance()
        contract_address = current_app.config['SBT_CONTRACT_ADDRESS']

        if not contract_address or contract_address == '0x0000000000000000000000000000000000000000':
            raise ValueError(
                "SBT_CONTRACT_ADDRESS not configured in .env. "
                "Please deploy contracts and set the address."
            )

        abi = SBTService.load_contract_abi()

        return w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=abi
        )

    @staticmethod
    def get_backend_signer() -> Tuple[str, str]:
        """
        Get backend signer address and private key
        Returns:
            Tuple of (address, private_key)
        """
        backend_address = current_app.config.get('BACKEND_SIGNER_ADDRESS')
        backend_key = current_app.config.get('BACKEND_SIGNER_KEY')

        if not backend_address or not backend_key:
            raise ValueError(
                "Backend signer not configured. "
                "Please set BACKEND_SIGNER_ADDRESS and BACKEND_SIGNER_KEY in .env"
            )

        return backend_address, backend_key

    @staticmethod
    def mint_sbt(
        traveler_wallet: str,
        profile_hash: str,
        reputation_score: float,
        metadata_uri: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Mint SBT to traveler's wallet (backend signs transaction)
        Args:
            traveler_wallet: Traveler's wallet address
            profile_hash: SHA-256 hash of profile data
            reputation_score: Reputation score (0.00 to 100.00)
            metadata_uri: Optional IPFS or HTTP URI for token metadata
        Returns:
            Dict with:
                - success (bool)
                - tx_hash (str): Transaction hash
                - sbt_id (str): Token ID
                - gas_used (int): Gas used
                - error (str): Error message if failed
        """
        try:
            w3 = SBTService.get_web3_instance()
            contract = SBTService.get_sbt_contract()
            backend_address, backend_key = SBTService.get_backend_signer()

            # Validate inputs
            if not Web3.is_address(traveler_wallet):
                return {'success': False, 'error': 'Invalid traveler wallet address'}

            if not profile_hash or len(profile_hash) != 64:
                return {'success': False, 'error': 'Invalid profile hash (must be 64-char hex)'}

            # Convert reputation score to integer (0-10000)
            reputation_int = int(reputation_score * 100)
            if reputation_int < 0 or reputation_int > 10000:
                return {'success': False, 'error': 'Reputation score must be between 0 and 100'}

            # Normalize addresses
            traveler_wallet = Web3.to_checksum_address(traveler_wallet)
            backend_address = Web3.to_checksum_address(backend_address)

            # Get current nonce
            nonce = w3.eth.get_transaction_count(backend_address)

            # Build transaction
            tx = contract.functions.mintSBT(
                traveler_wallet,
                profile_hash,
                reputation_int,
                metadata_uri or ''
            ).build_transaction({
                'from': backend_address,
                'nonce': nonce,
                'gas': 500000,  # Conservative gas limit
                'gasPrice': w3.eth.gas_price,
                'chainId': w3.eth.chain_id
            })

            # Sign transaction
            signed_tx = w3.eth.account.sign_transaction(tx, backend_key)

            # Send transaction
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            # Wait for receipt (with timeout)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt['status'] == 1:
                # Parse Transfer event to get token ID
                transfer_events = contract.events.Transfer().process_receipt(receipt)
                sbt_id = str(transfer_events[0]['args']['tokenId']) if transfer_events else None

                return {
                    'success': True,
                    'tx_hash': tx_hash.hex(),
                    'sbt_id': sbt_id,
                    'gas_used': receipt['gasUsed'],
                    'block_number': receipt['blockNumber']
                }
            else:
                return {
                    'success': False,
                    'error': 'Transaction reverted',
                    'tx_hash': tx_hash.hex()
                }

        except ValueError as e:
            return {'success': False, 'error': f'Value error: {str(e)}'}
        except ConnectionError as e:
            return {'success': False, 'error': f'Connection error: {str(e)}'}
        except Exception as e:
            return {'success': False, 'error': f'Unexpected error: {str(e)}'}

    @staticmethod
    def verify_sbt_ownership(wallet_address: str) -> Dict[str, any]:
        """
        Check if wallet owns a TravelSBT
        Args:
            wallet_address: Wallet address to check
        Returns:
            Dict with:
                - has_sbt (bool)
                - sbt_id (str): Token ID if owned
                - profile_hash (str): Profile hash
                - reputation_score (float): Reputation score (0-100)
                - is_active (bool): Whether SBT is active
                - error (str): Error message if failed
        """
        try:
            w3 = SBTService.get_web3_instance()
            contract = SBTService.get_sbt_contract()

            # Validate and normalize address
            if not Web3.is_address(wallet_address):
                return {'has_sbt': False, 'error': 'Invalid wallet address'}

            wallet_address = Web3.to_checksum_address(wallet_address)

            # Check balance
            balance = contract.functions.balanceOf(wallet_address).call()

            if balance > 0:
                # Get token ID
                result = contract.functions.getTokenIdByWallet(wallet_address).call()
                sbt_id = result[0]

                # Get profile data
                profile = contract.functions.getProfile(sbt_id).call()

                return {
                    'has_sbt': True,
                    'sbt_id': str(sbt_id),
                    'profile_hash': profile[0],  # profileHash
                    'reputation_score': profile[1] / 100.0,  # Convert back to 0-100
                    'minted_at': profile[2],  # timestamp
                    'is_active': profile[3]  # isActive
                }
            else:
                return {'has_sbt': False}

        except ValueError as e:
            return {'has_sbt': False, 'error': f'Value error: {str(e)}'}
        except Exception as e:
            return {'has_sbt': False, 'error': f'Unexpected error: {str(e)}'}

    @staticmethod
    def update_reputation_score(sbt_id: int, new_score: float) -> Dict[str, any]:
        """
        Update reputation score for an SBT
        Args:
            sbt_id: Token ID
            new_score: New reputation score (0-100)
        Returns:
            Dict with success, tx_hash, error
        """
        try:
            w3 = SBTService.get_web3_instance()
            contract = SBTService.get_sbt_contract()
            backend_address, backend_key = SBTService.get_backend_signer()

            # Convert score to integer
            reputation_int = int(new_score * 100)
            if reputation_int < 0 or reputation_int > 10000:
                return {'success': False, 'error': 'Reputation score must be between 0 and 100'}

            # Get nonce
            nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(backend_address))

            # Build transaction
            tx = contract.functions.updateReputationScore(
                sbt_id,
                reputation_int
            ).build_transaction({
                'from': Web3.to_checksum_address(backend_address),
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': w3.eth.gas_price,
                'chainId': w3.eth.chain_id
            })

            # Sign and send
            signed_tx = w3.eth.account.sign_transaction(tx, backend_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            # Wait for receipt
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt['status'] == 1:
                return {
                    'success': True,
                    'tx_hash': tx_hash.hex(),
                    'gas_used': receipt['gasUsed']
                }
            else:
                return {
                    'success': False,
                    'error': 'Transaction reverted',
                    'tx_hash': tx_hash.hex()
                }

        except Exception as e:
            return {'success': False, 'error': f'Error: {str(e)}'}

    @staticmethod
    def update_profile_hash(sbt_id: int, new_profile_hash: str) -> Dict[str, any]:
        """
        Update profile hash for an SBT (e.g., when emergency contacts change)
        Args:
            sbt_id: Token ID
            new_profile_hash: New SHA-256 profile hash
        Returns:
            Dict with success, tx_hash, error
        """
        try:
            w3 = SBTService.get_web3_instance()
            contract = SBTService.get_sbt_contract()
            backend_address, backend_key = SBTService.get_backend_signer()

            # Validate hash
            if not new_profile_hash or len(new_profile_hash) != 64:
                return {'success': False, 'error': 'Invalid profile hash'}

            # Get nonce
            nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(backend_address))

            # Build transaction
            tx = contract.functions.updateProfileHash(
                sbt_id,
                new_profile_hash
            ).build_transaction({
                'from': Web3.to_checksum_address(backend_address),
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': w3.eth.gas_price,
                'chainId': w3.eth.chain_id
            })

            # Sign and send
            signed_tx = w3.eth.account.sign_transaction(tx, backend_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            # Wait for receipt
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt['status'] == 1:
                return {
                    'success': True,
                    'tx_hash': tx_hash.hex(),
                    'gas_used': receipt['gasUsed']
                }
            else:
                return {
                    'success': False,
                    'error': 'Transaction reverted',
                    'tx_hash': tx_hash.hex()
                }

        except Exception as e:
            return {'success': False, 'error': f'Error: {str(e)}'}
