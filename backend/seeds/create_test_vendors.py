"""
Create Test Vendors for QR Verification System
===============================================
TEST VENDORS - FOR DEMO/TESTING ONLY

This script creates 5 test vendor accounts for testing the QR verification system.

Test Vendor Credentials:
------------------------
1. Hotel Vendor
   Email: test.hotel@tripit.demo
   Password: TestVendor123!
   Type: hotel

2. Transport Vendor
   Email: test.transport@tripit.demo
   Password: TestVendor123!
   Type: transport

3. Hospital Vendor
   Email: test.hospital@tripit.demo
   Password: TestVendor123!
   Type: hospital

4. Police Vendor
   Email: test.police@tripit.demo
   Password: TestVendor123!
   Type: police

5. Inactive Vendor (for testing inactive state)
   Email: test.inactive@tripit.demo
   Password: TestVendor123!
   Type: other
   Status: INACTIVE

Usage:
------
cd backend
python seeds/create_test_vendors.py

To delete test vendors:
python seeds/create_test_vendors.py --delete
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from models.vendor import Vendor


# Test vendor data
TEST_VENDORS = [
    {
        'vendor_name': 'Test Hotel - Taj Palace',
        'organization': 'Test Hotels Group',
        'contact_email': 'test.hotel@tripit.demo',
        'contact_phone': '+91 22 1234 5678',
        'password': 'TestVendor123!',
        'vendor_type': 'hotel',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'country': 'India',
        'address': '123 Test Street, Colaba, Mumbai 400001',
        'is_active': True,
    },
    {
        'vendor_name': 'Test Transport - Mumbai Cabs',
        'organization': 'Test Transport Services',
        'contact_email': 'test.transport@tripit.demo',
        'contact_phone': '+91 22 9876 5432',
        'password': 'TestVendor123!',
        'vendor_type': 'transport',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'country': 'India',
        'address': 'Transport Hub, Andheri East, Mumbai 400069',
        'is_active': True,
    },
    {
        'vendor_name': 'Test Hospital - City General',
        'organization': 'Test Medical Group',
        'contact_email': 'test.hospital@tripit.demo',
        'contact_phone': '+91 80 4567 8901',
        'password': 'TestVendor123!',
        'vendor_type': 'hospital',
        'city': 'Bangalore',
        'state': 'Karnataka',
        'country': 'India',
        'address': '456 Health Avenue, Koramangala, Bangalore 560034',
        'is_active': True,
    },
    {
        'vendor_name': 'Test Police - Central Station',
        'organization': 'Test Police Department',
        'contact_email': 'test.police@tripit.demo',
        'contact_phone': '+91 11 2345 6789',
        'password': 'TestVendor123!',
        'vendor_type': 'police',
        'city': 'Delhi',
        'state': 'Delhi',
        'country': 'India',
        'address': 'Police Headquarters, Connaught Place, New Delhi 110001',
        'is_active': True,
    },
    {
        'vendor_name': 'Test Inactive Vendor',
        'organization': 'Deactivated Services',
        'contact_email': 'test.inactive@tripit.demo',
        'contact_phone': '+91 44 5678 9012',
        'password': 'TestVendor123!',
        'vendor_type': 'other',
        'city': 'Chennai',
        'state': 'Tamil Nadu',
        'country': 'India',
        'address': '789 Inactive Lane, T. Nagar, Chennai 600017',
        'is_active': False,  # INACTIVE for testing
    },
]


def create_test_vendors():
    """Create test vendor accounts"""
    app = create_app()

    with app.app_context():
        print()
        print("=" * 60)
        print("CREATING TEST VENDORS FOR QR VERIFICATION")
        print("=" * 60)
        print()

        created_count = 0
        skipped_count = 0

        for vendor_data in TEST_VENDORS:
            email = vendor_data['contact_email']

            # Check if vendor already exists
            existing = Vendor.query.filter_by(contact_email=email).first()
            if existing:
                print(f"  [SKIP] {email} - already exists")
                skipped_count += 1
                continue

            # Create vendor
            vendor = Vendor(
                vendor_name=vendor_data['vendor_name'],
                organization=vendor_data['organization'],
                contact_email=vendor_data['contact_email'],
                contact_phone=vendor_data['contact_phone'],
                vendor_type=vendor_data['vendor_type'],
                city=vendor_data['city'],
                state=vendor_data['state'],
                country=vendor_data['country'],
                address=vendor_data['address'],
                is_active=vendor_data['is_active'],
            )
            vendor.set_password(vendor_data['password'])

            db.session.add(vendor)
            status = "ACTIVE" if vendor_data['is_active'] else "INACTIVE"
            print(f"  [CREATE] {email} ({vendor_data['vendor_type']}) - {status}")
            created_count += 1

        db.session.commit()

        print()
        print("-" * 60)
        print(f"Created: {created_count} vendors")
        print(f"Skipped: {skipped_count} vendors (already exist)")
        print("-" * 60)
        print()

        # Print credentials for testing
        print("TEST VENDOR CREDENTIALS:")
        print("-" * 60)
        for vendor_data in TEST_VENDORS:
            status = "ACTIVE" if vendor_data['is_active'] else "INACTIVE"
            print(f"  {vendor_data['vendor_type'].upper():10} | {vendor_data['contact_email']}")
            print(f"             Password: {vendor_data['password']}")
            print(f"             Status: {status}")
            print()
        print("=" * 60)
        print()


def delete_test_vendors():
    """Delete all test vendor accounts"""
    app = create_app()

    with app.app_context():
        print()
        print("=" * 60)
        print("DELETING TEST VENDORS")
        print("=" * 60)
        print()

        deleted_count = 0

        for vendor_data in TEST_VENDORS:
            email = vendor_data['contact_email']
            vendor = Vendor.query.filter_by(contact_email=email).first()

            if vendor:
                db.session.delete(vendor)
                print(f"  [DELETE] {email}")
                deleted_count += 1
            else:
                print(f"  [SKIP] {email} - not found")

        db.session.commit()

        print()
        print("-" * 60)
        print(f"Deleted: {deleted_count} test vendors")
        print("=" * 60)
        print()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--delete':
        delete_test_vendors()
    else:
        create_test_vendors()
