# Database Seeds

This directory contains seed scripts for populating the database with test/demo data.

## Available Seeds

### 1. Test Vendors (`create_test_vendors.py`)

Creates 5 test vendor accounts for testing the QR verification system.

#### Usage

```bash
# From the backend directory
cd backend

# Create test vendors
python seeds/create_test_vendors.py

# Delete test vendors
python seeds/create_test_vendors.py --delete
```

#### Test Vendor Credentials

| Type | Email | Password | Status |
|------|-------|----------|--------|
| Hotel | `test.hotel@tripit.demo` | `TestVendor123!` | Active |
| Transport | `test.transport@tripit.demo` | `TestVendor123!` | Active |
| Hospital | `test.hospital@tripit.demo` | `TestVendor123!` | Active |
| Police | `test.police@tripit.demo` | `TestVendor123!` | Active |
| Other | `test.inactive@tripit.demo` | `TestVendor123!` | **Inactive** |

#### Vendor Details

1. **Hotel Vendor**
   - Name: Test Hotel - Taj Palace
   - Organization: Test Hotels Group
   - Location: Mumbai, Maharashtra, India

2. **Transport Vendor**
   - Name: Test Transport - Mumbai Cabs
   - Organization: Test Transport Services
   - Location: Mumbai, Maharashtra, India

3. **Hospital Vendor**
   - Name: Test Hospital - City General
   - Organization: Test Medical Group
   - Location: Bangalore, Karnataka, India

4. **Police Vendor**
   - Name: Test Police - Central Station
   - Organization: Test Police Department
   - Location: Delhi, India

5. **Inactive Vendor** (for testing inactive account rejection)
   - Name: Test Inactive Vendor
   - Organization: Deactivated Services
   - Location: Chennai, Tamil Nadu, India
   - **Note:** This vendor is intentionally inactive for testing the login rejection flow.

### 2. Demo Data (`demo_data.py`)

Creates demo users, projects, and other data for general platform testing.

```bash
python seeds/demo_data.py
```

## Notes

- All test vendors use the same password: `TestVendor123!`
- The seed scripts are idempotent - running them multiple times won't create duplicates
- Test vendor emails end with `@tripit.demo` to distinguish them from real accounts
- The inactive vendor can be used to test that inactive accounts cannot log in

## Security Warning

**These credentials are for development/testing only.**

Never use these test accounts in production. The credentials are publicly documented and should only be used in local development or staging environments.
