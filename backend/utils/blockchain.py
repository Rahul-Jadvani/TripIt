"""
Blockchain utilities for 0xCerts verification
"""
from web3 import Web3
from flask import current_app
import json
import requests
from typing import Optional


class BlockchainService:
    """Service for blockchain interactions"""

    # 0xCerts ABI (Extended ERC721 interface with metadata)
    ERC721_ABI = json.loads('''
    [
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{"name": "_tokenId", "type": "uint256"}],
            "name": "ownerOf",
            "outputs": [{"name": "owner", "type": "address"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}, {"name": "_index", "type": "uint256"}],
            "name": "tokenOfOwnerByIndex",
            "outputs": [{"name": "tokenId", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{"name": "_tokenId", "type": "uint256"}],
            "name": "tokenURI",
            "outputs": [{"name": "", "type": "string"}],
            "type": "function"
        }
    ]
    ''')

    @staticmethod
    def get_web3_instance():
        """Get Web3 instance"""
        rpc_url = current_app.config['KAIA_TESTNET_RPC']
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        return w3

    @staticmethod
    def is_valid_address(address: str) -> bool:
        """Validate Ethereum address"""
        if not address or not address.startswith('0x'):
            return False
        return Web3.is_address(address)

    @staticmethod
    def normalize_address(address: str) -> str:
        """Normalize address to checksum format"""
        return Web3.to_checksum_address(address)

    @staticmethod
    def fetch_nft_metadata(token_uri: str) -> Optional[dict]:
        """
        Fetch NFT metadata from token URI
        """
        try:
            # Handle IPFS URIs
            if token_uri.startswith('ipfs://'):
                token_uri = token_uri.replace('ipfs://', 'https://ipfs.io/ipfs/')

            response = requests.get(token_uri, timeout=10)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error fetching NFT metadata: {str(e)}")
            return None

    @staticmethod
    def get_nft_details(wallet_address: str, contract_address: str, token_id: int) -> dict:
        """
        Get detailed NFT information including metadata and transaction
        """
        try:
            w3 = BlockchainService.get_web3_instance()
            contract = w3.eth.contract(
                address=BlockchainService.normalize_address(contract_address),
                abi=BlockchainService.ERC721_ABI
            )

            # Get token URI
            try:
                token_uri = contract.functions.tokenURI(token_id).call()
                metadata = BlockchainService.fetch_nft_metadata(token_uri)
            except Exception:
                token_uri = None
                metadata = None

            # Try to find the most recent transfer event for this token
            # This is a simplified approach - in production you might want to use event logs
            tx_hash = None
            try:
                # Get recent blocks to search for transfer events
                current_block = w3.eth.block_number
                # Search last 1000 blocks (adjust based on your needs)
                from_block = max(0, current_block - 1000)

                # This is a placeholder - actual implementation would query Transfer events
                # For now, we'll return None and let frontend handle it
                tx_hash = None
            except Exception:
                tx_hash = None

            return {
                'token_id': token_id,
                'token_uri': token_uri,
                'metadata': metadata,
                'tx_hash': tx_hash,
                'explorer_url': f"https://kairos.kaiascan.io/token/{contract_address}?a={token_id}"
            }

        except Exception as e:
            print(f"Error getting NFT details: {str(e)}")
            return {
                'token_id': token_id,
                'token_uri': None,
                'metadata': None,
                'tx_hash': None,
                'explorer_url': f"https://kairos.kaiascan.io/token/{contract_address}?a={token_id}"
            }

    @staticmethod
    def check_oxcert_ownership(wallet_address: str) -> dict:
        """
        Check if address owns 0xCert NFT
        Returns: {
            'has_cert': bool,
            'balance': int,
            'token_id': int or None,
            'nft_details': dict or None,
            'error': str or None
        }
        """
        try:
            if not BlockchainService.is_valid_address(wallet_address):
                return {
                    'has_cert': False,
                    'balance': 0,
                    'token_id': None,
                    'nft_details': None,
                    'error': 'Invalid wallet address'
                }

            w3 = BlockchainService.get_web3_instance()
            contract_address = current_app.config['OXCERTS_CONTRACT_ADDRESS']

            if not BlockchainService.is_valid_address(contract_address):
                return {
                    'has_cert': False,
                    'balance': 0,
                    'token_id': None,
                    'nft_details': None,
                    'error': 'Invalid contract address configured'
                }

            # Create contract instance
            contract = w3.eth.contract(
                address=BlockchainService.normalize_address(contract_address),
                abi=BlockchainService.ERC721_ABI
            )

            # Check balance
            normalized_address = BlockchainService.normalize_address(wallet_address)
            balance = contract.functions.balanceOf(normalized_address).call()

            token_id = None
            nft_details = None

            # If user has at least one NFT, get the first one's details
            if balance > 0:
                try:
                    # Get first token ID owned by this address
                    token_id = contract.functions.tokenOfOwnerByIndex(normalized_address, 0).call()
                    nft_details = BlockchainService.get_nft_details(
                        wallet_address,
                        contract_address,
                        token_id
                    )
                except Exception as e:
                    print(f"Error getting token details: {str(e)}")
                    # If enumeration not supported, create basic details
                    token_id = None
                    nft_details = {
                        'token_id': None,
                        'token_uri': None,
                        'metadata': {
                            'name': '0xCert NFT',
                            'description': f'Verified 0xCert holder with {balance} NFT(s)',
                            'image': None,
                            'attributes': [
                                {'trait_type': 'Balance', 'value': balance},
                                {'trait_type': 'Verified', 'value': 'Yes'}
                            ]
                        },
                        'tx_hash': None,
                        'explorer_url': f"https://kairos.kaiascan.io/account/{wallet_address}"
                    }

            return {
                'has_cert': balance > 0,
                'balance': balance,
                'token_id': token_id,
                'nft_details': nft_details,
                'error': None
            }

        except Exception as e:
            return {
                'has_cert': False,
                'balance': 0,
                'token_id': None,
                'nft_details': None,
                'error': f'Blockchain check failed: {str(e)}'
            }

    @staticmethod
    def get_network_status() -> dict:
        """Get blockchain network status"""
        try:
            w3 = BlockchainService.get_web3_instance()
            is_connected = w3.is_connected()
            block_number = w3.eth.block_number if is_connected else None

            return {
                'connected': is_connected,
                'block_number': block_number,
                'network': 'Kaia Testnet (Kairos)',
            }
        except Exception as e:
            return {
                'connected': False,
                'block_number': None,
                'error': str(e)
            }
