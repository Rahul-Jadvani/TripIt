# TripIt Travel SBT - QR Verification & Vendor System Implementation Plan

## Document Purpose

This is a comprehensive, step-by-step implementation plan for extending the existing Travel SBT system with QR-based verification and vendor login functionality. This plan must be approved before any code changes are made.

---

## Understanding of Requirements

### Current State

The project currently has:
- ✅ 4-step SBT minting flow (wallet binding → emergency/medical info → hash creation → SBT minting)
- ✅ Backend with traveler model including emergency contacts and medical fields
- ✅ Frontend BlockchainIdentity page with the complete user flow
- ✅ IPFS integration capability (Pinata)
- ✅ Blockchain integration for SBT minting

### What Will Be Added

1. **QR Code Generation System**
   - Generate unique QR codes during SBT minting
   - Store QR images on IPFS
   - Use QR IPFS URL as the SBT's tokenURI (NFT metadata)
   - QR encodes a secure verification token

2. **Vendor Authentication & Portal**
   - Vendor database table (NO admin approval required)
   - Simple vendor registration and login
   - JWT-based vendor authentication
   - Separate vendor frontend routes

3. **User Verification Table**
   - Stores verification tokens, QR IPFS URLs, and user details
   - Links travelers to their verification data
   - Enables vendor lookup by QR token

4. **Vendor Verification Flow**
   - Vendors can scan QR codes (camera or manual entry)
   - Backend decodes token and fetches user verification record
   - Displays minimal non-sensitive user information

5. **Test Vendor Data**
   - Seed 3-5 test vendors for immediate testing
   - Clearly marked as test/demo data

---

## Implementation Phases

### 📁 PHASE 1: Database Models & Schema Setup

**Objective:** Create new database models and ensure schema migrations are ready

#### 1.1 Create Vendor Model

- **File:** `backend/models/vendor.py` (NEW)
- **Fields to include:**
  - `id` (UUID, primary key)
  - `vendor_name` (String, required)
  - `organization` (String, optional)
  - `contact_email` (String, unique, required, indexed)
  - `contact_phone` (String, optional)
  - `password_hash` (String, required)
  - `vendor_type` (String: "hotel", "transport", "police", "hospital", "other")
  - `city` (String, optional)
  - `state` (String, optional)
  - `country` (String, default "India")
  - `address` (Text, optional)
  - `is_active` (Boolean, default True)
  - `total_scans` (Integer, default 0)
  - `last_scan_at` (DateTime, nullable)
  - `created_at` (DateTime, auto)
  - `updated_at` (DateTime, auto)
- **Methods to include:**
  - `set_password(password)` - hash password using werkzeug
  - `check_password(password)` - verify password
  - `to_dict()` - serialize for API responses (exclude password_hash)

#### 1.2 Create UserVerification Model

- **File:** `backend/models/user_verification.py` (NEW)
- **Fields to include:**
  - `id` (UUID, primary key)
  - `traveler_id` (UUID, foreign key to travelers.id, unique, indexed)
  - `wallet_address` (String, required, indexed)
  - `sbt_token_id` (String, nullable, indexed) - filled after minting
  - `verification_token` (String, unique, required, indexed) - the QR payload
  - `qr_ipfs_url` (String, nullable) - full IPFS gateway URL
  - `qr_ipfs_hash` (String, nullable) - IPFS CID/hash
  - `verification_status` (String: "verified", "pending", "revoked", default "verified")
  - `full_name` (String, nullable) - denormalized for quick vendor lookup
  - `emergency_contact_1_name` (String, nullable)
  - `emergency_contact_1_phone` (String, nullable)
  - `emergency_contact_2_name` (String, nullable)
  - `emergency_contact_2_phone` (String, nullable)
  - `blood_group` (String, nullable)
  - `scan_count` (Integer, default 0)
  - `last_scanned_at` (DateTime, nullable)
  - `last_scanned_by_vendor_id` (UUID, foreign key to vendors.id, nullable)
  - `created_at` (DateTime, auto)
  - `updated_at` (DateTime, auto)
- **Relationships:**
  - `traveler` - relationship to Traveler model
  - `last_scanned_by` - relationship to Vendor model
- **Methods:**
  - `to_dict()` - serialize for API (include all fields except sensitive ones)
  - `to_vendor_view()` - serialize for vendor verification response (minimal data)

#### 1.3 Update Traveler Model (if needed)

- **File:** `backend/models/traveler.py` (UPDATE)
- **Check if relationship needed:**
  - Add `user_verification_record` relationship (one-to-one with UserVerification)
  - This may already exist, verify first

#### 1.4 Create Database Migration Script

- **File:** `backend/migrations/add_qr_verification_tables.py` (NEW)
- **Actions:**
  - Create `vendors` table
  - Create `user_verifications` table
  - Add foreign key constraints
  - Add indexes on: `contact_email`, `verification_token`, `traveler_id`, `wallet_address`
- **Rollback plan:** Drop tables if migration fails

#### 1.5 Update Model Imports

- **File:** `backend/models/__init__.py` (UPDATE)
- **Action:** Import Vendor and UserVerification models
- **File:** `backend/app.py` (UPDATE)
- **Action:** Import new models to ensure they're registered with SQLAlchemy

**Dependencies for Phase 1:** None (can start immediately)

---

### 🛠️ PHASE 2: Backend Services & Utilities

**Objective:** Create reusable services for QR generation, IPFS upload, and vendor authentication

#### 2.1 Create QR Generation Service

- **File:** `backend/utils/qr_service.py` (NEW)
- **Install dependency:** `qrcode[pil]` and `Pillow` (add to requirements.txt)
- **Functions to implement:**

  - `generate_verification_token(traveler_id: str, wallet_address: str) -> str`
    - Generate a secure 64-character token using `secrets.token_hex(32)`
    - Make it unique and verifiable
    - Return the token

  - `generate_qr_code(verification_token: str, user_name: str) -> BytesIO`
    - Create QR code encoding JSON: `{"type": "tripit_sbt_verification", "token": "<token>", "version": "1.0", "name": "<user_name>"}`
    - Use qrcode library with settings: `box_size=10, border=4`
    - Return QR as PNG in BytesIO buffer

  - `generate_and_upload_qr(traveler_id: str, wallet_address: str, user_name: str) -> dict`
    - Call `generate_verification_token()`
    - Call `generate_qr_code()`
    - Call `upload_qr_to_ipfs()` (from IPFS service)
    - Return dict with: `{token, qr_ipfs_url, qr_ipfs_hash}`

  - `decode_qr_data(json_string: str) -> dict`
    - Parse JSON from scanned QR
    - Validate structure (has "type", "token", "version")
    - Return parsed data or raise ValueError

#### 2.2 Verify/Update IPFS Service

- **File:** `backend/utils/ipfs.py` (VERIFY/UPDATE)
- **Check if PinataService exists** (likely already implemented)
- **If missing, implement:**
  - `upload_qr_to_ipfs(qr_image_buffer: BytesIO, filename: str) -> dict`
    - Upload to Pinata using PINATA_JWT
    - Return `{ipfs_hash, ipfs_url}`
- **Ensure environment variables exist:**
  - `PINATA_JWT` in `.env`
  - Update `.env.example` with `PINATA_JWT` if not present

#### 2.3 Create/Update Vendor Authentication Decorator

- **File:** `backend/utils/decorators.py` (UPDATE)
- **Check if `vendor_token_required` exists**
- **If not, implement:**
  - `vendor_token_required(f)` decorator
    - Extract JWT from Authorization header
    - Decode using separate `VENDOR_JWT_SECRET_KEY`
    - Fetch vendor by ID from token
    - Check `is_active` is True
    - Attach vendor to `g.vendor`
    - Return 401 if invalid/expired/inactive

#### 2.4 Update Config for Vendor JWT

- **File:** `backend/config.py` (UPDATE)
- **Add:**
  - `VENDOR_JWT_SECRET_KEY` (can be same as JWT_SECRET_KEY or separate)
  - `VENDOR_JWT_EXPIRATION_DAYS = 7`
- **File:** `backend/.env.example` (UPDATE)
- **Add:** `VENDOR_JWT_SECRET_KEY` example

**Dependencies for Phase 2:** Phase 1 must be complete (models need to exist)

---

### 🔌 PHASE 3: Backend API Routes

**Objective:** Create vendor authentication routes and update SBT minting endpoint

#### 3.1 Create Vendor Authentication Routes

- **File:** `backend/routes/vendor_auth.py` (NEW)
- **Endpoints to implement:**

**POST /api/vendor/register**
- Request body: `vendor_name`, `organization`, `contact_email`, `contact_phone`, `password`, `vendor_type`, `city`, `state`, `country`, `address`
- Validate email is unique
- Hash password using `Vendor.set_password()`
- Create vendor with `is_active=True` (no approval needed)
- Return success message and vendor ID
- Handle errors (duplicate email, missing fields)

**POST /api/vendor/login**
- Request body: `contact_email`, `password`
- Find vendor by email
- Check password using `Vendor.check_password()`
- Check `is_active` is True
- Generate JWT with `vendor_id`, `exp` (7 days)
- Return token and vendor data (exclude password_hash)
- Handle errors (invalid credentials, inactive account)

**GET /api/vendor/profile**
- Requires `@vendor_token_required` decorator
- Return `g.vendor.to_dict()`
- Handle errors (vendor not found)

**PUT /api/vendor/update-profile**
- Requires `@vendor_token_required` decorator
- Request body: `vendor_name`, `organization`, `contact_phone`, `city`, `state`, `address`
- Update vendor fields (email cannot be changed)
- Return updated vendor data
- Handle errors (validation)

**POST /api/vendor/change-password**
- Requires `@vendor_token_required` decorator
- Request body: `current_password`, `new_password`
- Verify `current_password`
- Update password with `set_password(new_password)`
- Return success message
- Handle errors (wrong current password)

- **Register blueprint in app.py:**
  - Import `vendor_auth` blueprint
  - Register at `/api/vendor` prefix

#### 3.2 Create Vendor Verification Routes

- **File:** `backend/routes/vendor_verification.py` (NEW)
- **Endpoints to implement:**

**POST /api/vendor/verify-token**
- Requires `@vendor_token_required` decorator
- Request body: `verification_token` (64-char string)
- Validate token format (64 hex chars)
- Query UserVerification by `verification_token`
- Check `verification_status` is "verified" (not "revoked")
- Increment `scan_count`
- Update `last_scanned_at`, `last_scanned_by_vendor_id`
- Update vendor `total_scans`, `last_scan_at`
- Return user verification data (use `to_vendor_view()` method)
- Include: `full_name`, `verification_status`, `sbt_token_id`, emergency contacts, `blood_group`, `scan_count`
- Handle errors (token not found, revoked user, DB errors)

**POST /api/vendor/check-token** (pre-validation, no scan increment)
- Requires `@vendor_token_required` decorator
- Request body: `verification_token`
- Query UserVerification by `verification_token`
- Return only: `exists` (bool), `verification_status`
- Do NOT increment `scan_count`
- Handle errors (token not found)

**GET /api/vendor/scan-history**
- Requires `@vendor_token_required` decorator
- Query params: `limit` (default 20), `offset` (default 0)
- Query UserVerification where `last_scanned_by_vendor_id = g.vendor.id`
- Order by `last_scanned_at` DESC
- Return paginated list
- Handle errors (DB errors)

- **Register blueprint in app.py:**
  - Import `vendor_verification` blueprint
  - Register at `/api/vendor` prefix

#### 3.3 Update Identity/SBT Minting Route

- **File:** `backend/routes/identity.py` (UPDATE)
- **Update POST /api/identity/mint-sbt endpoint:**
  - After successful SBT minting, add QR generation:
    1. Import `qr_service`
    2. Get traveler's `full_name` (from current_user or traveler model)
    3. Call `qr_service.generate_and_upload_qr(traveler_id, wallet_address, full_name)`
    4. Create UserVerification record with:
       - `traveler_id`
       - `wallet_address`
       - `verification_token` (from QR service)
       - `qr_ipfs_url`, `qr_ipfs_hash` (from QR service)
       - `sbt_token_id` (from minting result)
       - `verification_status = "verified"`
       - `full_name`
       - emergency contacts (from traveler model)
       - `blood_group` (from traveler model)
    5. Use QR IPFS URL as the SBT's tokenURI/metadata in the minting call
    6. Update response to include: `qr_ipfs_url`, `verification_token`
  - **Error handling:**
    - If QR generation fails, rollback SBT minting (or mark as incomplete)
    - Log errors clearly
  - **Transaction ordering:**
    - Ensure QR is generated BEFORE blockchain minting
    - Use QR URL as `metadata_uri` parameter

#### 3.4 Update Identity Profile Endpoint

- **File:** `backend/routes/identity.py` (UPDATE)
- **Update GET /api/identity/profile:**
  - Include `user_verification_record` data if exists
  - Return `qr_ipfs_url` in response
  - Handle case where verification record doesn't exist (old users)

**Dependencies for Phase 3:** Phase 2 must be complete (services must exist)

---

### 💻 PHASE 4: Frontend - Vendor Portal

**Objective:** Create vendor-facing UI for authentication and QR scanning

#### 4.1 Create Vendor API Service

- **File:** `frontend/src/services/vendorApi.ts` (NEW)
- **Setup:**
  - Create axios instance with baseURL from `VITE_API_URL`
  - Add Authorization header interceptor (read from localStorage 'vendor_token')
  - Add response interceptor to handle 401 (redirect to /vendor/login)
- **TypeScript Interfaces:**
  - `VendorRegisterData`
  - `VendorLoginData`
  - `VendorData`
  - `UserVerificationData`
  - `ScanHistoryItem`
- **Functions to implement:**
  - `vendorRegister(data: VendorRegisterData): Promise<{status, message}>`
  - `vendorLogin(data: VendorLoginData): Promise<{token, vendor}>`
    - Store token in localStorage as 'vendor_token'
    - Store vendor data in localStorage as 'vendor_data'
  - `vendorLogout(): void`
    - Clear localStorage keys
  - `getVendorProfile(): Promise<VendorData>`
  - `updateVendorProfile(data: Partial<VendorData>): Promise<VendorData>`
  - `changeVendorPassword(currentPassword: string, newPassword: string): Promise<{status, message}>`
  - `verifyUserToken(token: string): Promise<UserVerificationData>`
  - `checkToken(token: string): Promise<{exists: boolean, status: string}>`
  - `getScanHistory(limit?: number, offset?: number): Promise<ScanHistoryItem[]>`
  - `isVendorLoggedIn(): boolean` - check if vendor_token exists
  - `getStoredVendorData(): VendorData | null` - parse vendor_data from localStorage

#### 4.2 Create Vendor Protected Route Component

- **File:** `frontend/src/components/VendorRoute.tsx` (NEW)
- **Implementation:**
  - Check if vendor is logged in using `vendorApi.isVendorLoggedIn()`
  - If not logged in, redirect to `/vendor/login`
  - If logged in, render children
  - Use React Router's `Navigate` component
- **Usage:** Wrap vendor-only routes (dashboard, scan-qr)

#### 4.3 Create Vendor Login Page

- **File:** `frontend/src/pages/VendorLogin.tsx` (NEW)
- **UI Components:**
  - Page title: "Vendor Login - TripIt Verification Portal"
  - Login form with:
    - Email input
    - Password input (type="password")
    - "Login" button
  - Error message display (for invalid credentials)
  - Loading state during login
  - Link to "Contact Support for Registration" (simple text, no actual registration form)
- **Functionality:**
  - Form state management (email, password)
  - `handleLogin()` function:
    - Call `vendorApi.vendorLogin()`
    - On success: redirect to `/vendor/dashboard`
    - On error: show error message
  - Loading spinner during API call
- **Styling:**
  - Use TripIt design system (match existing page styling)
  - Consistent with auth pages (Login.tsx, Register.tsx)
  - Responsive layout

#### 4.4 Create Vendor Dashboard Page

- **File:** `frontend/src/pages/VendorDashboard.tsx` (NEW)
- **UI Components:**
  - Header: "Vendor Dashboard - {vendor_name}"
  - Vendor info card:
    - Vendor name, organization, type
    - Location (city, state, country)
    - Contact email, phone
    - Total scans count
    - Last scan timestamp
  - Quick action cards:
    - "Scan SBT QR Code" (navigate to /vendor/scan-qr)
    - "View Scan History" (shows recent scans below or separate page)
  - Recent verifications list (last 5 scans from scan history)
  - Logout button
- **Functionality:**
  - Load vendor profile on mount using `vendorApi.getVendorProfile()`
  - Load recent scan history using `vendorApi.getScanHistory(5, 0)`
  - `handleLogout()` - call `vendorApi.vendorLogout()` and redirect to `/vendor/login`
  - Navigation to scan page
- **Styling:**
  - Grid layout for quick action cards
  - Match TripIt design system
  - Use Lucide icons (User, QrCode, History, LogOut, etc.)

#### 4.5 Create Vendor QR Scan Page

- **File:** `frontend/src/pages/VendorScanQR.tsx` (NEW)
- **Install dependency:** `html5-qrcode` (add to package.json)
- **UI Components:**
  - Page title: "Scan SBT QR Code"
  - Two scanning modes (tabs or sections):

  **Mode 1: Camera Scanner**
  - QR scanner viewport (using html5-qrcode library)
  - "Start Camera" / "Stop Camera" buttons
  - Device camera selection dropdown (if multiple cameras)
  - Auto-decode when QR detected

  **Mode 2: Manual Token Entry**
  - Text input for 64-character token
  - Character counter (shows 0/64)
  - "Verify Token" button
  - Validation (must be 64 hex chars)

  - Verification Result Card (shown after successful scan):
    - User full name
    - SBT Token ID
    - Verification status badge (green = verified)
    - Blood group (if available)
    - Emergency contact 1 (name, phone - clickable tel: link)
    - Emergency contact 2 (if available)
    - Scan count for this user
    - "Scan Another QR Code" button (reset state)
  - Error handling:
    - Invalid token format message
    - Token not found message
    - Revoked user message
    - Camera permission denied message
- **Functionality:**
  - Initialize html5-qrcode scanner
  - Handle QR scan success:
    - Decode JSON from QR
    - Extract token
    - Call `vendorApi.verifyUserToken(token)`
    - Display verification result
  - Handle manual token entry:
    - Validate format
    - Call `vendorApi.verifyUserToken(token)`
    - Display verification result
  - Reset state for new scan
  - Handle camera permissions
  - Handle errors gracefully
- **Styling:**
  - Centered layout
  - QR viewport with border
  - Result card with green border (success) or red (error)
  - Match TripIt design system
  - Use Lucide icons (Camera, QrCode, CheckCircle, AlertCircle, Phone, etc.)

#### 4.6 Update App Routing

- **File:** `frontend/src/App.tsx` (UPDATE)
- **Add routes:**
  - `/vendor/login` - VendorLogin (public)
  - `/vendor/dashboard` - VendorDashboard (protected with VendorRoute)
  - `/vendor/scan-qr` - VendorScanQR (protected with VendorRoute)
- **Import statements:**
  - Import VendorLogin, VendorDashboard, VendorScanQR
  - Import VendorRoute component

**Dependencies for Phase 4:** Phase 3 must be complete (backend APIs must exist)

---

### 🖼️ PHASE 5: Frontend - User QR Display

**Objective:** Show QR code to users after SBT minting

#### 5.1 Update BlockchainIdentity Page

- **File:** `frontend/src/pages/BlockchainIdentity.tsx` (UPDATE)
- **Location:** After Step 4 success (SBT minted successfully)
- **Add QR Display Section:**
  - Check if user has `qr_ipfs_url` in profile data
  - Display section with:
    - Heading: "Your Verification QR Code"
    - QR image from IPFS (use `<img>` tag with `qr_ipfs_url`)
    - Image styling: white background, centered, border, max-width 300px
    - Explanatory text: "Vendors can scan this QR code to verify your identity and access your emergency contact information."
    - "View on IPFS" link (opens `qr_ipfs_url` in new tab)
  - Show after SBT minting success card
  - Ensure it only shows if QR exists (handle old users without QR)
- **Styling:**
  - Match existing success card styling
  - Use subtle background color
  - Add border around QR image
  - Responsive (scale QR on mobile)
- **No functional changes to existing 4-step flow:**
  - Do not modify Steps 1-4
  - Only add QR display as additional information after Step 4

#### 5.2 Update User State/Context (if needed)

- **File:** `frontend/src/context/UserContext.tsx` (VERIFY/UPDATE if needed)
- **Check if user context includes `qr_ipfs_url`**
- **If not:**
  - Update `UserData` interface to include `qr_ipfs_url` (optional)
  - Ensure `refreshUser()` fetches updated profile with QR URL

**Dependencies for Phase 5:** Phase 3 (backend changes) and Phase 4.6 (routing) complete

---

### 🌱 PHASE 6: Test Data & Seeding

**Objective:** Create test vendors for immediate end-to-end testing

#### 6.1 Create Vendor Seed Script

- **File:** `backend/seeds/create_test_vendors.py` (NEW)
- **Create 5 test vendors:**

  **a. Hotel Vendor**
  - `vendor_name`: "Test Hotel - Taj Palace"
  - `organization`: "Test Hotels Group"
  - `contact_email`: "test.hotel@tripit.demo"
  - `password`: "TestVendor123!" (hashed)
  - `vendor_type`: "hotel"
  - `city`: "Mumbai"
  - `state`: "Maharashtra"
  - `is_active`: True

  **b. Transport Vendor**
  - `vendor_name`: "Test Transport - Mumbai Cabs"
  - `organization`: "Test Transport Services"
  - `contact_email`: "test.transport@tripit.demo"
  - `password`: "TestVendor123!" (hashed)
  - `vendor_type`: "transport"
  - `city`: "Mumbai"
  - `state`: "Maharashtra"
  - `is_active`: True

  **c. Hospital Vendor**
  - `vendor_name`: "Test Hospital - City General"
  - `organization`: "Test Medical Group"
  - `contact_email`: "test.hospital@tripit.demo"
  - `password`: "TestVendor123!" (hashed)
  - `vendor_type`: "hospital"
  - `city`: "Bangalore"
  - `state`: "Karnataka"
  - `is_active`: True

  **d. Police Vendor**
  - `vendor_name`: "Test Police - Central Station"
  - `organization`: "Test Police Department"
  - `contact_email`: "test.police@tripit.demo"
  - `password`: "TestVendor123!" (hashed)
  - `vendor_type`: "police"
  - `city`: "Delhi"
  - `state`: "Delhi"
  - `is_active`: True

  **e. Inactive Vendor** (for testing inactive state)
  - `vendor_name`: "Test Inactive Vendor"
  - `organization`: "Deactivated Services"
  - `contact_email`: "test.inactive@tripit.demo"
  - `password`: "TestVendor123!" (hashed)
  - `vendor_type`: "other"
  - `city`: "Chennai"
  - `state`: "Tamil Nadu"
  - `is_active`: False

- **Script functionality:**
  - Check if vendors already exist (by email)
  - Skip creation if exists
  - Print created vendor details (email, password for testing)
  - Commit to database
- **Documentation:**
  - Add comment at top of file: "TEST VENDORS - FOR DEMO/TESTING ONLY"
  - List all vendor credentials in script comments

#### 6.2 Create Seed Execution Instructions

- **File:** `backend/seeds/README.md` (NEW or UPDATE)
- **Document:**
  - How to run seed script: `python seeds/create_test_vendors.py`
  - List all test vendor credentials
  - Note: These are for development/testing only
  - Instructions to delete test vendors if needed

#### 6.3 Add Seed Script to Setup Documentation

- **File:** Root-level README or setup documentation (UPDATE)
- **Add section:**
  - "Setting Up Test Vendors for QR Verification"
  - Command to run seeds
  - Login credentials for testing

**Dependencies for Phase 6:** Phase 1 (database models) and Phase 3.1 (vendor auth routes) complete

---

### ✅ PHASE 7: Testing & Validation

**Objective:** Comprehensive testing checklist before considering implementation complete

#### 7.1 Backend Unit Testing Checklist

- **Vendor Model:**
  - [ ] `set_password()` hashes correctly
  - [ ] `check_password()` validates correctly
  - [ ] `to_dict()` excludes password_hash
  - [ ] Unique email constraint works

- **UserVerification Model:**
  - [ ] Foreign keys work correctly
  - [ ] `to_vendor_view()` returns only allowed fields
  - [ ] Unique verification_token constraint works

- **QR Service:**
  - [ ] `generate_verification_token()` returns 64-char hex
  - [ ] `generate_qr_code()` creates valid PNG
  - [ ] QR encodes correct JSON structure
  - [ ] `decode_qr_data()` parses correctly

- **Vendor Auth:**
  - [ ] Registration creates vendor successfully
  - [ ] Login returns JWT token
  - [ ] JWT token validates correctly
  - [ ] Inactive vendors cannot login
  - [ ] Invalid credentials are rejected

- **Vendor Verification:**
  - [ ] verify-token increments scan_count
  - [ ] verify-token updates timestamps
  - [ ] Revoked users cannot be verified
  - [ ] Invalid tokens return 404
  - [ ] Scan history returns correct data

#### 7.2 Integration Testing Checklist

- **User Flow:**
  - [ ] User can complete 4-step SBT minting
  - [ ] QR code is generated during minting
  - [ ] QR image is uploaded to IPFS successfully
  - [ ] UserVerification record is created
  - [ ] SBT metadata includes QR IPFS URL
  - [ ] QR displays on BlockchainIdentity page

- **Vendor Flow:**
  - [ ] Test vendors can login with seed credentials
  - [ ] Vendor dashboard loads correctly
  - [ ] Camera scanner initializes (in browser with camera)
  - [ ] Manual token entry works
  - [ ] Valid token shows user verification data
  - [ ] Invalid token shows error
  - [ ] Scan history displays correctly
  - [ ] Logout works and redirects

#### 7.3 End-to-End Testing Checklist

- **Complete Flow:**
  - [ ] a. Create new user account
  - [ ] b. Complete SBT minting with emergency contacts and medical info
  - [ ] c. Verify QR appears on user's page
  - [ ] d. Download/screenshot QR code
  - [ ] e. Login as test vendor
  - [ ] f. Scan the user's QR (camera or manual)
  - [ ] g. Verify correct user data displays
  - [ ] h. Verify scan_count incremented
  - [ ] i. Check scan appears in vendor scan history
  - [ ] j. Verify scan appears in vendor dashboard recent scans

#### 7.4 Security Testing Checklist

- **Authentication:**
  - [ ] Expired JWT tokens are rejected
  - [ ] Invalid JWT signatures are rejected
  - [ ] Protected routes require authentication
  - [ ] Vendor routes require vendor token (not user token)

- **Authorization:**
  - [ ] Vendors can only access their own profile
  - [ ] Vendors cannot access admin endpoints (if any)
  - [ ] Users cannot access vendor endpoints

- **Data Privacy:**
  - [ ] Verification token is cryptographically secure
  - [ ] QR only contains token, not sensitive data
  - [ ] Vendor view shows minimal necessary data
  - [ ] Password hashes are secure (bcrypt/werkzeug)

#### 7.5 UI/UX Testing Checklist

- **Design Consistency:**
  - [ ] Vendor pages match TripIt design system
  - [ ] Color scheme is consistent
  - [ ] Fonts and typography match
  - [ ] Icons are consistent (Lucide)
  - [ ] Spacing and layout match existing pages

- **Responsiveness:**
  - [ ] Vendor login works on mobile
  - [ ] QR scanner works on mobile (camera)
  - [ ] Dashboard is responsive
  - [ ] QR display on user page is responsive

- **Accessibility:**
  - [ ] Form labels are present
  - [ ] Error messages are clear
  - [ ] Buttons have descriptive text
  - [ ] Links have descriptive text

#### 7.6 Error Handling Testing Checklist

- **Backend Errors:**
  - [ ] IPFS upload failure is handled gracefully
  - [ ] Database errors return proper status codes
  - [ ] Invalid input returns validation errors
  - [ ] Missing required fields return 400

- **Frontend Errors:**
  - [ ] Network errors show user-friendly messages
  - [ ] Camera permission denied shows helpful message
  - [ ] Invalid QR shows clear error
  - [ ] Loading states prevent double submissions

#### 7.7 Performance Testing Checklist

- **QR Generation:**
  - [ ] QR generation completes within 2 seconds
  - [ ] IPFS upload completes within 5 seconds
  - [ ] Total SBT minting time is acceptable

- **Vendor Verification:**
  - [ ] Token lookup is fast (< 500ms)
  - [ ] Scan history loads quickly
  - [ ] Camera scanner initializes quickly

**Dependencies for Phase 7:** All previous phases complete

---

## Dependency Graph Summary

```
Phase 1 (Models)
    ↓
Phase 2 (Services) ← depends on Phase 1
    ↓
Phase 3 (Backend APIs) ← depends on Phase 1 & 2
    ↓
Phase 4 (Frontend Vendor Portal) ← depends on Phase 3
Phase 5 (Frontend User QR Display) ← depends on Phase 3
    ↓
Phase 6 (Seed Data) ← depends on Phase 1 & Phase 3.1
    ↓
Phase 7 (Testing) ← depends on ALL phases
```

---

## Files to Create (New)

### Backend
1. `backend/models/vendor.py`
2. `backend/models/user_verification.py`
3. `backend/migrations/add_qr_verification_tables.py`
4. `backend/utils/qr_service.py`
5. `backend/routes/vendor_auth.py`
6. `backend/routes/vendor_verification.py`
7. `backend/seeds/create_test_vendors.py`
8. `backend/seeds/README.md`

### Frontend
9. `frontend/src/services/vendorApi.ts`
10. `frontend/src/components/VendorRoute.tsx`
11. `frontend/src/pages/VendorLogin.tsx`
12. `frontend/src/pages/VendorDashboard.tsx`
13. `frontend/src/pages/VendorScanQR.tsx`

**Total New Files: 13**

---

## Files to Modify (Existing)

### Backend
1. `backend/models/__init__.py` - Add vendor and user verification imports
2. `backend/models/traveler.py` - Add relationship (verify if needed)
3. `backend/app.py` - Register vendor blueprints and import models
4. `backend/utils/decorators.py` - Add vendor_token_required (if not exists)
5. `backend/utils/ipfs.py` - Verify/update (if needed)
6. `backend/config.py` - Add vendor JWT config
7. `backend/.env.example` - Add PINATA_JWT, VENDOR_JWT_SECRET_KEY
8. `backend/requirements.txt` - Add qrcode[pil], Pillow
9. `backend/routes/identity.py` - Update mint-sbt and profile endpoints

### Frontend
10. `frontend/src/App.tsx` - Add vendor routes
11. `frontend/src/pages/BlockchainIdentity.tsx` - Add QR display section
12. `frontend/src/context/UserContext.tsx` - Add qr_ipfs_url (if needed)
13. `frontend/package.json` - Add html5-qrcode

**Total Modified Files: 13**

---

## Environment Variables Required

### Backend (.env)

```env
# Existing
DATABASE_URL=...
JWT_SECRET_KEY=...
BLOCKCHAIN_NETWORK=...
SBT_CONTRACT_ADDRESS=...
PRIVATE_KEY=...

# New (if not already present)
PINATA_JWT=your_pinata_jwt_token
VENDOR_JWT_SECRET_KEY=your_vendor_secret_key  # Can be same as JWT_SECRET_KEY
```

### Frontend (.env)

```env
# Existing
VITE_API_URL=http://localhost:5000/api
```

---

## Design Philosophy Preservation

### How Existing UI/UX is Maintained:

1. **Consistent Component Structure:**
   - All vendor pages use same layout patterns as existing auth/dashboard pages
   - Form components match Login.tsx and Register.tsx styling
   - Card-based layouts match BlockchainIdentity.tsx

2. **Color Scheme:**
   - Use existing TripIt color variables
   - Success states in green, errors in red (existing pattern)
   - Neutral backgrounds and borders

3. **Typography:**
   - Match existing heading levels (h1, h2, h3)
   - Use same font families and weights
   - Consistent text sizing

4. **Icons:**
   - Continue using Lucide React icons (already in project)
   - Same icon sizing and styling

5. **Spacing:**
   - Use existing margin/padding scales
   - Match gap sizes in grid layouts
   - Consistent border-radius values

6. **User Flow:**
   - Do not modify existing 4-step SBT minting flow
   - QR display is additive (appears after Step 4)
   - No changes to wallet binding, emergency contacts, hash creation

7. **Vendor Portal Separation:**
   - Vendor portal is completely separate route hierarchy (`/vendor/*`)
   - Does not interfere with user routes
   - Separate authentication system (different localStorage keys)

8. **Responsive Design:**
   - Mobile-first approach (existing pattern)
   - Same breakpoints as existing pages
   - Touch-friendly button sizes

---

## Risk Mitigation

### Potential Issues and Solutions:

1. **IPFS Upload Failures:**
   - Risk: Pinata service down or quota exceeded
   - Mitigation: Add retry logic, fallback to database-only mode, clear error messages

2. **QR Generation Performance:**
   - Risk: Slow QR generation delays SBT minting
   - Mitigation: Optimize image size, use background tasks if needed

3. **Camera Permissions:**
   - Risk: Users deny camera access
   - Mitigation: Always provide manual token entry fallback

4. **Vendor Credential Security:**
   - Risk: Test vendors have weak passwords
   - Mitigation: Document clearly as test-only, strong password hashing

5. **Database Migration Issues:**
   - Risk: Migration fails on existing production data
   - Mitigation: Test migration on copy of production DB first, provide rollback script

6. **Frontend Build Size:**
   - Risk: html5-qrcode adds significant bundle size
   - Mitigation: Use code splitting, lazy load vendor pages

---

## Success Criteria

Implementation is considered complete when:

- [ ] All database models are created and migrated
- [ ] QR generation produces valid, scannable QR codes
- [ ] QR images upload to IPFS successfully
- [ ] SBT minting includes QR IPFS URL as metadata
- [ ] Users see their QR code after minting
- [ ] Vendors can register and login
- [ ] Vendors can scan QR codes (camera or manual)
- [ ] Valid tokens display correct user verification data
- [ ] Scan counts and timestamps update correctly
- [ ] Test vendors are seeded and functional
- [ ] All existing user flows remain unchanged
- [ ] UI design is consistent with TripIt design system
- [ ] No breaking changes to existing functionality
- [ ] Documentation is updated with new features

---

## Post-Implementation Tasks

After approval and implementation:

1. **Documentation Updates:**
   - Update main README with QR verification feature
   - Document vendor login credentials (test vendors)
   - Add QR verification to API documentation
   - Create vendor onboarding guide

2. **Security Audit:**
   - Review vendor authentication implementation
   - Check for SQL injection vulnerabilities
   - Verify JWT implementation security
   - Test for XSS in QR scanning

3. **Performance Optimization:**
   - Monitor IPFS upload times
   - Optimize database queries (add indexes if needed)
   - Profile QR generation performance

4. **User Feedback:**
   - Test with real users
   - Gather feedback on vendor UI
   - Iterate based on usability findings
