# QR Verification System - Complete Testing Guide

## Overview
This guide provides step-by-step instructions for testing the complete SBT QR verification flow from user registration to vendor scanning.

---

## System Architecture Summary

### Backend Components
- **Models**: Traveler, Vendor, UserVerification, SBTVerification
- **Services**: QRService (QR generation + IPFS upload), SBTService (blockchain minting), PinataService (IPFS)
- **Routes**:
  - `/api/identity/*` - User SBT minting and profile management
  - `/api/vendor/*` - Vendor authentication and verification scanning

### Frontend Components
- **User Pages**: BlockchainIdentity (4-step SBT minting flow)
- **Vendor Pages**: VendorLogin, VendorDashboard, VendorScanQR
- **Protected Routes**: VendorRoute wrapper for vendor-only pages

### Blockchain Integration
- **Smart Contract**: TravelSBT.sol (non-transferable SBT with profile hash, reputation, metadata URI)
- **Network**: Local Hardhat node (default) or Base Sepolia testnet
- **Backend Signer**: Server-side minting (users pay no gas fees)

---

## Prerequisites

### 1. Environment Setup
Ensure the following are configured in `backend/.env`:

```bash
# Blockchain
BLOCKCHAIN_NETWORK=base_sepolia  # or 'local' for Hardhat
PRIVATE_KEY=your_deployer_private_key_here
SBT_CONTRACT_ADDRESS=deployed_contract_address_here
RPC_URL=http://localhost:8545  # or Base Sepolia RPC

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt_token_here
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tripit_db

# Flask
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here
```

### 2. Database Migration
Run database migrations to create new tables:

```bash
cd backend
flask db upgrade
```

If you need to create a new migration for the Vendor and UserVerification tables:

```bash
  flask db migrate -m "Add Vendor and UserVerification tables"
  flask db upgrade
```

### 3. Start Services

#### Terminal 1: Blockchain (if using local Hardhat)
```bash
cd blockchain
npx hardhat node
```

#### Terminal 2: Backend
```bash
cd backend
python app.py
```

#### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

---

## Testing Flow

### PHASE 1: User SBT Minting (4-Step Process)

#### Step 1: User Registration & Login
1. Navigate to: `http://localhost:5173/register`
2. Create a new account:
   - Email: `testuser@example.com`
   - Password: `Test123456`
   - Username: `testuser`
3. Login with credentials
4. Verify you're logged in (check profile icon in navbar)

#### Step 2: Navigate to Blockchain Identity
1. Go to: `http://localhost:5173/blockchain-identity`
2. You should see the 4-step SBT minting interface

#### Step 3: Bind Wallet (Step 1)
1. Click "Connect Wallet" button
2. Connect your MetaMask wallet
3. Click "Sign & Bind Wallet"
4. Approve the signature request in MetaMask
5. **Expected Result**:
   - ✅ Success toast: "Wallet bound successfully"
   - Step 1 card turns green with checkmark
   - Step 2 card appears (emergency contacts form)

#### Step 4: Create Profile Hash (Steps 2 & 3)
1. Fill out emergency contacts:
   - Contact 1 Name: `John Doe`
   - Contact 1 Phone: `+1 (555) 123-4567`
   - Contact 2 Name: `Jane Smith`
   - Contact 2 Phone: `+1 (555) 987-6543`

2. Fill out medical information (optional):
   - Blood Group: `A+`
   - Medications: `Aspirin`
   - Allergies: `Peanuts`
   - Other Info: `Type 1 Diabetes`

3. Click "Create Transaction Hash"
4. **Expected Result**:
   - ✅ Success toast: "Profile hash created successfully"
   - Steps 2 & 3 turn green
   - Step 4 card appears (Mint SBT button)

#### Step 5: Mint SBT (Step 4)
1. Click "Mint Travel SBT" button
2. Wait for the transaction (may take 10-30 seconds)
3. **Expected Result**:
   - ✅ Success toast: "✓ Travel SBT minted successfully!"
   - Green success card appears showing:
     - Token ID (e.g., #1)
     - Status: ISSUED
     - Reputation Score: 0/100
     - Minted Date
   - **QR Code Section** appears below blockchain link:
     - QR code image displayed (white background, black QR)
     - Text: "Your Verification QR Code"
     - Subtext: "Vendors can scan this QR code to verify your identity..."
     - Link: "View on IPFS" (clickable, opens in new tab)

#### Step 6: Verify QR Code Generation
1. **Check QR Image**:
   - QR should be visible as a PNG image (approximately 250x250px)
   - Should be readable (not blurry)

2. **Verify IPFS Storage**:
   - Click "View on IPFS" link
   - Should open IPFS gateway URL: `https://gateway.pinata.cloud/ipfs/{CID}`
   - QR image should load in browser

3. **Backend Verification**:
   - Check backend logs for:
     ```
     [MINT_SBT] Generating QR code for user {user_id}
     [QR_SERVICE] Generated verification token: {token[:16]}...
     [QR_SERVICE] Generated QR code image
     [QR_SERVICE] Successfully uploaded QR to IPFS: {ipfs_hash}
     [MINT_SBT] QR generated successfully
     ```

4. **Database Verification**:
   ```sql
   -- Connect to database
   SELECT * FROM user_verifications WHERE traveler_id = '{user_id}';
   ```
   Should show:
   - `verification_token` (64-character hex string)
   - `qr_ipfs_url` (Pinata gateway URL)
   - `qr_ipfs_hash` (IPFS CID)
   - `sbt_token_id` (matches SBT token ID)
   - `verification_status` = 'verified'
   - `full_name`, `blood_group`, `emergency_contact_1_name`, etc.

---

### PHASE 2: Vendor Registration & Approval

#### Step 1: Create Vendor Account
1. Navigate to: `http://localhost:5173/vendor/login`
2. Click "Contact Support" link (or directly register via API)

**Option A: Via API (Postman/cURL)**
```bash
curl -X POST http://localhost:5000/api/vendor/register \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_name": "Grand Hotel Mumbai",
    "organization": "Taj Hotels Group",
    "contact_email": "security@grandhotel.com",
    "contact_phone": "+91 22 1234 5678",
    "password": "VendorPass123",
    "vendor_type": "hotel",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Vendor registration successful. Pending admin verification.",
  "data": {
    "vendor_id": "uuid-here",
    "vendor_name": "Grand Hotel Mumbai",
    "is_verified": false
  }
}
```

#### Step 2: Admin Approval (CRITICAL!)
Vendors cannot log in until approved by an admin.

**Database Method** (Quick for testing):
```sql
UPDATE vendors
SET is_verified = true,
    verified_at = NOW()
WHERE contact_email = 'security@grandhotel.com';
```

**API Method** (Requires admin JWT):
```bash
# First, login as admin to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tripit.com",
    "password": "admin_password"
  }'

# Then approve vendor
curl -X POST http://localhost:5000/api/vendor/admin/verify-vendor/{vendor_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_jwt_token}"
```

---

### PHASE 3: Vendor Login & Dashboard

#### Step 1: Vendor Login
1. Go to: `http://localhost:5173/vendor/login`
2. Enter credentials:
   - Email: `security@grandhotel.com`
   - Password: `VendorPass123`
3. Click "Login to Vendor Portal"
4. **Expected Result**:
   - ✅ Success toast: "Login successful!"
   - Redirect to `/vendor/dashboard`
   - Vendor JWT token stored in `localStorage` (key: `vendor_token`)

#### Step 2: Vendor Dashboard Verification
1. Dashboard should display:
   - **Vendor Info Card**:
     - Vendor Name: "Grand Hotel Mumbai"
     - Organization: "Taj Hotels Group"
     - Badge: "Verified" (green)
     - Email: `security@grandhotel.com`
     - Phone: `+91 22 1234 5678`
     - Location: Mumbai, Maharashtra
     - Total Scans: 0

   - **Quick Actions**:
     - "Scan SBT QR Code" card (clickable)
     - "Scan History" card (clickable)

   - **Recent Verifications**:
     - "No verifications yet" message
     - "Scan Your First QR Code" button

2. Click "Scan SBT QR Code" → should navigate to `/vendor/scan-qr`

---

### PHASE 4: QR Code Scanning & Verification

#### Step 1: Access QR Scanner
1. From vendor dashboard, click "Scan SBT QR Code"
2. Or directly navigate to: `http://localhost:5173/vendor/scan-qr`
3. **Expected UI**:
   - Header: "Scan SBT QR Code"
   - QR Scanner Card (camera view or file upload area)
   - Manual Token Entry Card (text input for 64-char token)

#### Step 2A: Camera Scanning (Recommended)
1. **Allow camera access** when prompted
2. Camera feed should appear in the QR Scanner card
3. Show the user's QR code to the camera:
   - Can display from another device
   - Or take a screenshot and show on phone
4. **Expected Result**:
   - Camera detects QR code automatically
   - Decodes JSON: `{"type": "tripit_sbt_verification", "token": "...", "version": "1.0"}`
   - Calls `/api/vendor/verify-token` API
   - Success response displays verification card

#### Step 2B: Manual Token Entry (Alternative)
1. Get the verification token from database:
   ```sql
   SELECT verification_token FROM user_verifications WHERE traveler_id = '{user_id}';
   ```
2. Copy the 64-character token
3. Paste into "Manual Token Entry" input field
4. Click "Verify Token"
5. Same verification flow as camera scanning

#### Step 3: Verification Success Display
After successful verification, the following card should appear:

**Identity Verified Card** (Green border):
- **Header**:
  - Green checkmark icon
  - "Identity Verified"
  - Badge: "VERIFIED" (green)

- **Traveler Information Section**:
  - Full Name: `{user's name or username}`
  - SBT Token ID: `#{token_id}`
  - Verified On: `{date}`
  - Total Scans: `{scan_count}` (increments with each scan)

- **Medical Information Section** (Red-themed):
  - Blood Group: `A+` (large, bold red text)

- **Emergency Contacts Section** (Orange-themed):
  - Primary Contact:
    - Name: `John Doe`
    - Phone: `+1 (555) 123-4567` (clickable tel: link)
  - Secondary Contact:
    - Name: `Jane Smith`
    - Phone: `+1 (555) 987-6543` (clickable tel: link)

- **Actions**:
  - "Scan Another QR Code" button (resets scanner)

#### Step 4: Backend Verification
**Check Backend Logs**:
```
[VENDOR_VERIFY] Vendor Grand Hotel Mumbai ({vendor_id}) verified user {traveler_id}
```

**Database Updates**:
```sql
-- UserVerification table
SELECT scan_count, last_scanned_at, last_scanned_by_vendor_id
FROM user_verifications
WHERE traveler_id = '{user_id}';
-- scan_count should increment
-- last_scanned_at should update
-- last_scanned_by_vendor_id should be vendor's ID

-- Vendor table
SELECT total_scans, last_scan_at
FROM vendors
WHERE id = '{vendor_id}';
-- total_scans should increment
-- last_scan_at should update
```

---

### PHASE 5: Scan History

#### Step 1: View Scan History
1. Go to vendor dashboard: `http://localhost:5173/vendor/dashboard`
2. **Recent Verifications** section should now show:
   - User's name
   - SBT Token ID
   - Verification status badge
   - Scan date

3. Click "Scan History" card (future feature - may redirect to same page)

#### Step 2: API Testing
```bash
curl -X GET http://localhost:5000/api/vendor/scan-history \
  -H "Authorization: Bearer {vendor_jwt_token}"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "scans": [
      {
        "user_name": "testuser",
        "verification_status": "verified",
        "scanned_at": "2025-12-09T10:30:00",
        "sbt_token_id": "1"
      }
    ],
    "count": 1,
    "vendor_stats": {
      "total_scans": 1,
      "last_scan_at": "2025-12-09T10:30:00"
    }
  }
}
```

---

## Edge Cases & Error Testing

### 1. Invalid QR Code
**Test**: Scan a random QR code (not from TripIt)
**Expected**:
- Error toast: "Invalid QR code format"
- Red alert box in scanner

### 2. Revoked Verification
**Setup**:
```sql
UPDATE user_verifications
SET verification_status = 'revoked'
WHERE traveler_id = '{user_id}';
```
**Test**: Scan user's QR code
**Expected**:
- HTTP 403 error
- Error message: "User verification has been revoked"

### 3. Suspended Verification
**Setup**:
```sql
UPDATE user_verifications
SET verification_status = 'suspended'
WHERE traveler_id = '{user_id}';
```
**Test**: Scan user's QR code
**Expected**:
- HTTP 403 error
- Error message: "User verification is suspended"

### 4. Vendor Not Verified
**Setup**:
```sql
UPDATE vendors
SET is_verified = false
WHERE id = '{vendor_id}';
```
**Test**: Try to login as vendor
**Expected**:
- HTTP 403 error
- Error message: "Account pending admin verification"

### 5. Vendor Inactive
**Setup**:
```sql
UPDATE vendors
SET is_active = false
WHERE id = '{vendor_id}';
```
**Test**: Try to login as vendor
**Expected**:
- HTTP 403 error
- Error message: "Account is inactive"

### 6. Invalid Token Length
**Test**: Enter manual token with < 64 characters
**Expected**:
- "Verify Token" button disabled
- Character counter shows: "X/64 characters"

### 7. Expired JWT Token
**Setup**: Wait for JWT to expire (7 days for vendors)
**Test**: Try to scan QR code
**Expected**:
- HTTP 401 error
- Automatic redirect to `/vendor/login`
- Vendor token cleared from localStorage

---

## Privacy & Security Testing

### 1. Verify Privacy Controls
**Test**: User can hide medical info from vendors

**Setup**:
```sql
UPDATE user_verifications
SET show_medical_info = false
WHERE traveler_id = '{user_id}';
```
**Expected**: Blood group not shown in verification card

**Setup**:
```sql
UPDATE user_verifications
SET show_emergency_contacts = false
WHERE traveler_id = '{user_id}';
```
**Expected**: Emergency contacts not shown in verification card

### 2. Verify Profile Hash Security
**Test**: Check that only hash goes on-chain
```sql
SELECT profile_hash, medications, allergies
FROM travelers
WHERE id = '{user_id}';
```
- `profile_hash` should be 64-char hex string (SHA-256)
- Sensitive data (`medications`, `allergies`) should NOT be in profile_hash

### 3. QR Token Uniqueness
**Test**: Verify each user has unique token
```sql
SELECT COUNT(DISTINCT verification_token)
FROM user_verifications;
```
Should equal total number of records (no duplicates)

### 4. IPFS QR Security
**Test**: QR image should be publicly accessible on IPFS
- Open `qr_ipfs_url` in incognito browser
- QR image should load without authentication
- QR data should only contain verification token (not personal info)

---

## Performance Testing

### 1. QR Generation Speed
**Test**: Time the minting process
- Start timer when clicking "Mint Travel SBT"
- End timer when success card appears
**Target**: < 15 seconds total (including IPFS upload)

### 2. QR Scanning Speed
**Test**: Time the verification process
- Start timer when QR is scanned
- End timer when verification card appears
**Target**: < 2 seconds

### 3. IPFS Upload Reliability
**Test**: Mint 5 SBTs in a row
**Expected**: All 5 should have valid `qr_ipfs_url` and be accessible

### 4. Concurrent Vendor Scans
**Test**: Have 2-3 vendors scan the same QR simultaneously
**Expected**:
- All scans succeed
- `scan_count` increments correctly (no race conditions)
- Each vendor's `total_scans` increments

---

## Blockchain Testing

### 1. Verify On-Chain Data
**Test**: Check SBT on blockchain

**Using Hardhat Console** (if local):
```javascript
const TravelSBT = await ethers.getContractAt("TravelSBT", "{contract_address}");
const tokenId = 1;

const profileHash = await TravelSBT.getProfileHash(tokenId);
const reputation = await TravelSBT.getReputation(tokenId);
const tokenURI = await TravelSBT.tokenURI(tokenId);
const owner = await TravelSBT.ownerOf(tokenId);

console.log("Profile Hash:", profileHash);
console.log("Reputation:", reputation.toString());
console.log("Token URI (QR IPFS URL):", tokenURI);
console.log("Owner:", owner);
```

**Expected**:
- `profileHash` matches database `profile_hash`
- `reputation` is 0 (or user's score)
- `tokenURI` matches `qr_ipfs_url`
- `owner` matches user's `wallet_address`

### 2. Verify Non-Transferability
**Test**: Try to transfer SBT to another wallet
```javascript
const TravelSBT = await ethers.getContractAt("TravelSBT", "{contract_address}");
await TravelSBT.transferFrom(user1.address, user2.address, 1);
```
**Expected**: Transaction reverts with "Soulbound tokens cannot be transferred"

### 3. Verify Backend Signer
**Test**: Check that user didn't pay gas
- User wallet balance should NOT decrease during minting
- Backend signer wallet balance should decrease (paid gas fees)

---

## API Endpoints Reference

### User/Traveler Endpoints
- `POST /api/identity/bind-wallet` - Bind wallet to account
- `POST /api/identity/create-profile-hash` - Generate profile hash
- `POST /api/identity/mint-sbt` - Mint SBT with QR
- `GET /api/identity/profile` - Get identity profile (includes `qr_ipfs_url`)

### Vendor Auth Endpoints
- `POST /api/vendor/register` - Register vendor (requires admin approval)
- `POST /api/vendor/login` - Vendor login (returns JWT)
- `GET /api/vendor/profile` - Get vendor profile
- `PUT /api/vendor/update-profile` - Update vendor details
- `POST /api/vendor/change-password` - Change password

### Vendor Verification Endpoints
- `POST /api/vendor/verify-token` - Verify user by token (increments scan count)
- `POST /api/vendor/check-token` - Check token validity (no increment)
- `GET /api/vendor/scan-history` - Get vendor's scan history

### Admin Endpoints (require admin JWT)
- `GET /api/vendor/admin/pending-vendors` - List pending vendors
- `POST /api/vendor/admin/verify-vendor/{vendor_id}` - Approve vendor
- `POST /api/vendor/admin/reject-vendor/{vendor_id}` - Reject/deactivate vendor

---

## Common Issues & Troubleshooting

### Issue 1: QR Code Not Displayed
**Symptoms**: Success card appears but no QR section
**Causes**:
- IPFS upload failed
- `qr_ipfs_url` is null in database
**Fix**:
1. Check backend logs for IPFS errors
2. Verify Pinata JWT is valid: `curl -X GET https://api.pinata.cloud/data/testAuthentication -H "Authorization: Bearer {PINATA_JWT}"`
3. Check `user_verifications` table for `qr_ipfs_url`

### Issue 2: QR Scan Shows "Invalid Token"
**Causes**:
- Token not in database
- QR data corrupted
**Fix**:
1. Verify QR encodes valid JSON: Scan with phone's native QR scanner, check data
2. Check `verification_token` in database matches QR content

### Issue 3: Vendor Cannot Login
**Causes**:
- `is_verified = false`
- `is_active = false`
- Wrong password
**Fix**:
1. Check vendor status: `SELECT is_active, is_verified FROM vendors WHERE contact_email = '...'`
2. Approve vendor (see Phase 2, Step 2)

### Issue 4: Camera Not Working
**Causes**:
- HTTPS required for camera API (localhost is exempt)
- Browser permissions denied
**Fix**:
1. Check browser console for errors
2. Ensure `getUserMedia` is supported
3. Use manual token entry as fallback

### Issue 5: IPFS Image Not Loading
**Causes**:
- Pinata rate limit
- CORS issues
- Invalid CID
**Fix**:
1. Try alternative gateway: Replace `gateway.pinata.cloud` with `ipfs.io` in URL
2. Check Pinata dashboard for file status
3. Verify `qr_ipfs_hash` is valid CID format

---

## Success Criteria Checklist

### User Flow
- [ ] User can register and login
- [ ] User can bind wallet (one-time, immutable)
- [ ] User can create profile hash with emergency contacts + medical info
- [ ] User can mint SBT successfully
- [ ] QR code is generated and displayed after minting
- [ ] QR code is stored on IPFS and accessible via gateway
- [ ] QR code is set as SBT's `tokenURI` on-chain

### Vendor Flow
- [ ] Vendor can register
- [ ] Admin can approve vendor
- [ ] Vendor can login after approval
- [ ] Vendor dashboard shows correct info
- [ ] Vendor can scan QR via camera
- [ ] Vendor can enter token manually
- [ ] Verification card shows all user data correctly
- [ ] Emergency contact phone numbers are clickable (tel: links)
- [ ] Scan count increments on each scan
- [ ] Scan history is tracked

### Security & Privacy
- [ ] Only profile hash is stored on-chain (not raw data)
- [ ] QR token is unique and unpredictable
- [ ] Vendor JWT expires and requires re-login
- [ ] Revoked/suspended users cannot be verified
- [ ] Unverified vendors cannot login
- [ ] Privacy controls work (hide medical info, hide emergency contacts)

### Performance
- [ ] SBT minting completes in < 15 seconds
- [ ] QR scanning completes in < 2 seconds
- [ ] IPFS upload succeeds reliably
- [ ] No race conditions in concurrent scans

### Blockchain
- [ ] SBT is non-transferable
- [ ] Profile hash is stored on-chain
- [ ] QR IPFS URL is stored as tokenURI
- [ ] Backend signer pays gas fees (user pays nothing)
- [ ] Transaction hash is recorded in database

---

## Advanced Testing Scenarios

### Scenario 1: Multiple Vendors Scanning Same User
1. Create 3 vendor accounts
2. Approve all vendors
3. Login as each vendor in different browsers
4. All 3 scan the same user's QR code
5. **Expected**:
   - User's `scan_count` = 3
   - Each vendor's `total_scans` = 1
   - All 3 show in user's scan audit trail

### Scenario 2: User Updates Emergency Contacts After Minting
1. Mint SBT with initial contacts
2. Update contacts via `/api/identity/update-emergency-contacts`
3. Scan QR code
4. **Expected**:
   - Vendor sees UPDATED contacts
   - On-chain profile hash is also updated
   - QR code remains same (token doesn't change)

### Scenario 3: Vendor Scans Revoked User
1. Mint SBT for user
2. Admin revokes user: `UPDATE user_verifications SET verification_status = 'revoked'`
3. Vendor scans QR
4. **Expected**:
   - Error: "User verification has been revoked"
   - No increment to scan_count

### Scenario 4: Lost QR Code
1. User mints SBT
2. User loses access to QR image
3. **Recovery**:
   - User can view QR on BlockchainIdentity page (always displayed after minting)
   - Admin can query database for `qr_ipfs_url`
   - QR image is permanently on IPFS (never expires)

---

## Metrics to Track

### User Metrics
- Total SBTs minted
- QR codes generated
- Average minting time
- IPFS upload success rate

### Vendor Metrics
- Total vendors registered
- Vendors pending approval
- Total scans performed
- Average scans per vendor
- Scan failure rate

### System Health
- Database connection uptime
- IPFS upload latency
- Blockchain node sync status
- JWT token expiration rate

---

## Conclusion

This testing guide covers the complete end-to-end flow of the SBT QR verification system. Follow each phase sequentially to ensure all components work together seamlessly.

**Key Integration Points to Verify**:
1. User minting → QR generation → IPFS upload → Database update → Blockchain minting
2. Vendor registration → Admin approval → Login → QR scanning → Database update → Display verification

**Critical Success Metrics**:
- ✅ 100% IPFS upload success rate
- ✅ < 15 second minting time
- ✅ < 2 second scan time
- ✅ 0% false verification errors
- ✅ No unauthorized access (vendor JWT protection)

If any test fails, refer to the Troubleshooting section or check backend logs for detailed error messages.

---

## Support & Debugging

### Enable Debug Logging
Add to `backend/.env`:
```bash
LOG_LEVEL=DEBUG
```

### View Backend Logs
```bash
tail -f backend/logs/app.log  # If logging to file
# Or check terminal output where `python app.py` is running
```

### Database Inspection
```sql
-- Check all user verifications
SELECT
  uv.id,
  uv.traveler_id,
  t.username,
  uv.verification_token,
  uv.qr_ipfs_url,
  uv.verification_status,
  uv.scan_count
FROM user_verifications uv
JOIN travelers t ON uv.traveler_id = t.id;

-- Check all vendors
SELECT
  id,
  vendor_name,
  contact_email,
  is_verified,
  is_active,
  total_scans
FROM vendors;

-- Check SBT status
SELECT
  id,
  username,
  wallet_address,
  sbt_id,
  sbt_status,
  profile_hash
FROM travelers
WHERE sbt_status IN ('issued', 'verified');
```

### Frontend Debugging
Open browser DevTools Console:
```javascript
// Check vendor token
localStorage.getItem('vendor_token');

// Check vendor data
JSON.parse(localStorage.getItem('vendor_data'));

// Check user token (regular user, not vendor)
localStorage.getItem('token');
```

---

**Last Updated**: 2025-12-09
**Version**: 1.0
**Author**: Claude Code Implementation Team
