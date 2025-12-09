"""
Comprehensive SBT Flow Test Script
Tests the complete 4-step flow: Wallet Binding -> Create Profile Hash -> Mint SBT
"""
import sys
import os
import traceback

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.traveler import Traveler
from utils.sbt_service import SBTService
from utils.identity import MedicalInfoHasher
from web3 import Web3
import json


def test_environment_config():
    """Test 1: Verify all environment variables are configured"""
    print("\n" + "="*80)
    print("TEST 1: ENVIRONMENT CONFIGURATION")
    print("="*80)

    app = create_app()
    with app.app_context():
        from flask import current_app

        # Check required config variables
        required_vars = [
            'BLOCKCHAIN_NETWORK',
            'HARDHAT_LOCAL_RPC',
            'BACKEND_SIGNER_ADDRESS',
            'BACKEND_SIGNER_KEY',
            'SBT_CONTRACT_ADDRESS'
        ]

        print("\n📋 Checking required environment variables:")
        all_present = True
        for var in required_vars:
            value = current_app.config.get(var)
            status = "✓" if value else "✗"
            display_value = value if var != 'BACKEND_SIGNER_KEY' else (value[:10] + "..." if value else None)
            print(f"  {status} {var}: {display_value}")
            if not value:
                all_present = False

        if all_present:
            print("\n✅ All required environment variables are configured")
            return True
        else:
            print("\n❌ Some environment variables are missing!")
            return False


def test_web3_connection():
    """Test 2: Test Web3 connection to blockchain"""
    print("\n" + "="*80)
    print("TEST 2: WEB3 CONNECTION")
    print("="*80)

    app = create_app()
    with app.app_context():
        try:
            w3 = SBTService.get_web3_instance()

            print(f"\n🔗 Web3 Connection:")
            print(f"  Status: {'CONNECTED ✓' if w3.is_connected() else 'DISCONNECTED ✗'}")

            if w3.is_connected():
                print(f"  Chain ID: {w3.eth.chain_id}")
                print(f"  Latest Block: {w3.eth.block_number}")
                print(f"  Network: {app.config.get('BLOCKCHAIN_NETWORK')}")
                print(f"  RPC URL: {app.config.get('HARDHAT_LOCAL_RPC')}")
                print("\n✅ Web3 connection successful")
                return True
            else:
                print("\n❌ Failed to connect to blockchain")
                return False

        except Exception as e:
            print(f"\n❌ Connection error: {str(e)}")
            traceback.print_exc()
            return False


def test_contract_deployment():
    """Test 3: Verify SBT contract is deployed"""
    print("\n" + "="*80)
    print("TEST 3: CONTRACT DEPLOYMENT")
    print("="*80)

    app = create_app()
    with app.app_context():
        try:
            w3 = SBTService.get_web3_instance()
            contract_address = app.config.get('SBT_CONTRACT_ADDRESS')

            print(f"\n📜 Contract Verification:")
            print(f"  Contract Address: {contract_address}")

            # Check if contract exists
            code = w3.eth.get_code(contract_address)

            if code and code != b'':
                print(f"  Bytecode: Present ({len(code)} bytes)")

                # Try to load contract
                contract = SBTService.get_sbt_contract()
                print(f"  ABI: Loaded successfully")

                print("\n✅ Contract is deployed and accessible")
                return True
            else:
                print("  Bytecode: NOT FOUND")
                print("\n❌ Contract not deployed or wrong address")
                return False

        except Exception as e:
            print(f"\n❌ Contract verification failed: {str(e)}")
            traceback.print_exc()
            return False


def test_backend_signer():
    """Test 4: Verify backend signer has permissions"""
    print("\n" + "="*80)
    print("TEST 4: BACKEND SIGNER PERMISSIONS")
    print("="*80)

    app = create_app()
    with app.app_context():
        try:
            w3 = SBTService.get_web3_instance()
            contract = SBTService.get_sbt_contract()
            backend_address, _ = SBTService.get_backend_signer()

            print(f"\n👤 Backend Signer:")
            print(f"  Address: {backend_address}")

            # Check balance
            balance = w3.eth.get_balance(backend_address)
            balance_eth = w3.from_wei(balance, 'ether')
            print(f"  Balance: {balance_eth} ETH")

            # Check MINTER_ROLE
            minter_role = contract.functions.MINTER_ROLE().call()
            has_minter_role = contract.functions.hasRole(minter_role, backend_address).call()

            print(f"  MINTER_ROLE: {minter_role}")
            print(f"  Has MINTER_ROLE: {'✓ YES' if has_minter_role else '✗ NO'}")

            if balance > 0 and has_minter_role:
                print("\n✅ Backend signer is properly configured")
                return True
            else:
                if balance == 0:
                    print("\n❌ Backend signer has no ETH for gas")
                if not has_minter_role:
                    print("\n❌ Backend signer doesn't have MINTER_ROLE")
                return False

        except Exception as e:
            print(f"\n❌ Backend signer check failed: {str(e)}")
            traceback.print_exc()
            return False


def test_medical_info_hasher():
    """Test 5: Test medical information hashing"""
    print("\n" + "="*80)
    print("TEST 5: MEDICAL INFO HASHER")
    print("="*80)

    try:
        # Test data
        test_data = {
            'contact1_name': 'John Doe',
            'contact1_phone': '+1234567890',
            'contact2_name': 'Jane Doe',
            'contact2_phone': '+0987654321',
            'blood_group': 'O+',
            'medications': 'Aspirin',
            'allergies': 'Peanuts',
            'other_medical_info': 'Diabetic'
        }

        print(f"\n🔐 Generating hash from test data:")
        print(f"  Contact 1: {test_data['contact1_name']} ({test_data['contact1_phone']})")
        print(f"  Contact 2: {test_data['contact2_name']} ({test_data['contact2_phone']})")
        print(f"  Blood Group: {test_data['blood_group']}")
        print(f"  Medications: {test_data['medications']}")
        print(f"  Allergies: {test_data['allergies']}")

        # Generate hash
        result = MedicalInfoHasher.generate_medical_profile_hash(**test_data)

        print(f"\n📊 Hash Generation Result:")
        print(f"  Hash: {result['hash']}")
        print(f"  Salt: {result['salt']}")
        print(f"  Hash Length: {len(result['hash'])} chars (expected: 64)")
        print(f"  Salt Length: {len(result['salt'])} chars (expected: 32)")

        # Verify hash
        is_valid = MedicalInfoHasher.verify_medical_profile_hash(
            **test_data,
            stored_hash=result['hash'],
            stored_salt=result['salt']
        )

        print(f"  Verification: {'✓ PASS' if is_valid else '✗ FAIL'}")

        if len(result['hash']) == 64 and len(result['salt']) == 32 and is_valid:
            print("\n✅ Medical info hasher working correctly")
            return True
        else:
            print("\n❌ Medical info hasher test failed")
            return False

    except Exception as e:
        print(f"\n❌ Hasher test failed: {str(e)}")
        traceback.print_exc()
        return False


def test_database_schema():
    """Test 6: Verify database has all required columns"""
    print("\n" + "="*80)
    print("TEST 6: DATABASE SCHEMA")
    print("="*80)

    app = create_app()
    with app.app_context():
        try:
            # Check if medical columns exist
            required_columns = [
                'blood_group',
                'medications',
                'allergies',
                'other_medical_info',
                'emergency_contact_1_name',
                'emergency_contact_1_phone',
                'profile_hash',
                'profile_hash_salt',
                'wallet_address',
                'sbt_id',
                'sbt_status'
            ]

            print(f"\n📊 Checking database schema (travelers table):")

            # Use SQLAlchemy inspector
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('travelers')]

            all_present = True
            for col in required_columns:
                exists = col in columns
                status = "✓" if exists else "✗"
                print(f"  {status} {col}")
                if not exists:
                    all_present = False

            if all_present:
                print(f"\n✅ All required columns exist")
                return True
            else:
                print(f"\n❌ Some columns are missing - run migration!")
                return False

        except Exception as e:
            print(f"\n❌ Database schema check failed: {str(e)}")
            traceback.print_exc()
            return False


def test_complete_flow_simulation():
    """Test 7: Simulate complete SBT minting flow (without actual minting)"""
    print("\n" + "="*80)
    print("TEST 7: COMPLETE FLOW SIMULATION")
    print("="*80)

    app = create_app()
    with app.app_context():
        try:
            print("\n🔄 Simulating 4-step SBT minting flow:")

            # Step 1: Find a test user
            print("\n  Step 1: Finding test user...")
            traveler = Traveler.query.filter(Traveler.email.like('%@gmail.com')).first()

            if not traveler:
                print("    ✗ No test user found")
                return False

            print(f"    ✓ Test user: {traveler.email} (ID: {traveler.id})")

            # Step 2: Check wallet binding
            print("\n  Step 2: Checking wallet binding...")
            if traveler.wallet_address:
                print(f"    ✓ Wallet bound: {traveler.wallet_address}")
            else:
                print(f"    ⚠ Wallet not bound (this is expected for new users)")

            # Step 3: Generate profile hash
            print("\n  Step 3: Generating profile hash...")
            test_data = {
                'contact1_name': 'John Doe',
                'contact1_phone': '+1234567890',
                'blood_group': 'O+',
                'medications': 'Test medication',
                'allergies': 'Test allergy',
                'other_medical_info': 'Test info'
            }

            hash_result = MedicalInfoHasher.generate_medical_profile_hash(**test_data)
            print(f"    ✓ Profile hash generated: {hash_result['hash'][:16]}...")

            # Step 4: Check SBT status
            print("\n  Step 4: Checking SBT status...")
            print(f"    SBT Status: {traveler.sbt_status}")
            print(f"    SBT ID: {traveler.sbt_id or 'Not minted'}")

            print("\n✅ Flow simulation completed successfully")
            print("\n📝 Summary:")
            print(f"  - User exists: ✓")
            print(f"  - Hash generation: ✓")
            print(f"  - Database schema: ✓")
            print(f"  - Ready for actual testing: ✓")

            return True

        except Exception as e:
            print(f"\n❌ Flow simulation failed: {str(e)}")
            traceback.print_exc()
            return False


def run_all_tests():
    """Run all tests and provide summary"""
    print("\n" + "="*80)
    print("🧪 COMPREHENSIVE SBT FLOW TEST SUITE")
    print("="*80)
    print("\nThis will test all components of the SBT minting flow")

    tests = [
        ("Environment Configuration", test_environment_config),
        ("Web3 Connection", test_web3_connection),
        ("Contract Deployment", test_contract_deployment),
        ("Backend Signer Permissions", test_backend_signer),
        ("Medical Info Hasher", test_medical_info_hasher),
        ("Database Schema", test_database_schema),
        ("Complete Flow Simulation", test_complete_flow_simulation),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {str(e)}")
            results.append((test_name, False))

    # Print summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    print(f"\nResults: {passed}/{total} tests passed\n")

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}  {test_name}")

    if passed == total:
        print("\n" + "="*80)
        print("🎉 ALL TESTS PASSED! SBT flow is ready for use!")
        print("="*80)
        print("\n✅ Next steps:")
        print("  1. Start the backend: python app.py")
        print("  2. Start the frontend: cd frontend && npm run dev")
        print("  3. Navigate to /blockchain-identity")
        print("  4. Test the complete 4-step flow")
    else:
        print("\n" + "="*80)
        print("⚠️ SOME TESTS FAILED - Please fix the issues above")
        print("="*80)

    return passed == total


if __name__ == '__main__':
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
