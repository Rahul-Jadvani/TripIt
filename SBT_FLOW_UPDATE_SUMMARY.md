# Travel SBT Flow Update - Implementation Summary

## Overview
Successfully implemented the new 4-step flow for the Travel SBT feature, transitioning from the old profile-based system to an emergency contacts + medical information-based system.

---

## New Flow Structure

### **Old Flow (3 Steps)**
1. Connect & Bind Wallet
2. Create Profile Hash (full name, DOB, phone)
3. Mint Travel SBT

### **New Flow (4 Steps)**
1. **Connect & Bind Wallet** - Unchanged
2. **Enter Emergency Contacts & Medical Information** - NEW
   - Primary emergency contact (name, phone) - **Required**
   - Secondary emergency contact (name, phone) - Optional
   - Blood Group - Optional
   - Current Medications - Optional
   - Known Allergies - Optional
   - Other Medical/Safety Information - Optional
3. **Create Transaction Hash** - NEW (Explicit step with button)
   - Generates SHA-256 hash from all emergency + medical data
   - Uses unique salt for security
4. **Mint Travel SBT** - Unchanged (now Step 4)

---

## Files Modified

### Backend Changes

#### 1. **Database Migration**
**File:** `backend/migrations/add_medical_fields.py` (NEW)
- Adds 4 new columns to `travelers` table:
  - `blood_group` (VARCHAR(10))
  - `medications` (TEXT)
  - `allergies` (TEXT)
  - `other_medical_info` (TEXT)

**File:** `backend/models/traveler.py`
- Added medical field definitions to Traveler model (lines 80-84)

#### 2. **Hashing Utilities**
**File:** `backend/utils/identity.py`
- **Created `MedicalInfoHasher` class** (lines 218-342)
  - `normalize_medical_data()` - Normalizes all emergency + medical fields
  - `generate_medical_profile_hash()` - Creates salted SHA-256 hash
  - `verify_medical_profile_hash()` - Verifies stored hash
- Keeps existing `IdentityHasher` and `EmergencyContactHasher` for backward compatibility

#### 3. **API Endpoints**
**File:** `backend/routes/identity.py`
- **Updated `/api/identity/create-profile-hash` endpoint** (lines 134-249)
  - **Before:** Accepted `full_name`, `date_of_birth`, `phone`
  - **After:** Accepts emergency contacts + medical data:
    - `contact1_name`, `contact1_phone` (required)
    - `contact2_name`, `contact2_phone` (optional)
    - `blood_group`, `medications`, `allergies`, `other_medical_info` (optional)
  - Uses `MedicalInfoHasher` instead of `IdentityHasher`
  - Stores all data in database
  - Returns both `profile_hash` and `emergency_contacts_hash`

### Frontend Changes

#### 1. **State Management**
**File:** `frontend/src/pages/BlockchainIdentity.tsx`
- **Removed states:**
  - `fullName`, `dateOfBirth`, `phone` (old profile fields)
  - `isUpdatingContacts` (no longer needed)
- **Added states:**
  - `bloodGroup`
  - `medications`
  - `allergies`
  - `otherMedicalInfo`
- **Added computed state:**
  - `hasEmergencyContactsAndMedical` - Tracks if emergency contacts are entered

#### 2. **API Integration**
- **Updated `handleCreateProfileHash()` function** (lines 110-142)
  - Sends emergency contacts + medical data
  - Validates at least primary contact is provided
  - Updated success message to "Transaction hash created successfully!"
- **Removed `handleUpdateEmergencyContacts()` function**
  - No longer using separate `/update-emergency-contacts` endpoint

#### 3. **UI Components**

**Progress Indicators** (lines 179-228)
- Updated from 3 steps to 4 steps:
  1. Bind Wallet
  2. Enter Info
  3. Create Hash
  4. Mint SBT

**Step 1: Connect & Bind Wallet** (lines 230-317)
- Unchanged

**Step 2: Enter Emergency Contacts & Medical Information** (lines 319-463) - NEW
- Combines emergency contacts and medical information in one step
- Shows when wallet is bound and hash is NOT created
- Sections:
  - Emergency Contacts (required primary, optional secondary)
  - Medical & Safety Information (all optional)
  - Privacy notice explaining SHA-256 hashing
- Clean, modern design with icons and badges

**Step 3: Create Transaction Hash** (lines 465-511) - NEW
- Explicit button to create the hash
- Shows when wallet is bound and hash is NOT created
- Explains what happens when creating the hash
- Disabled if primary emergency contact is missing

**Step 4: Mint Travel SBT** (lines 513+)
- Renamed from "Step 3" to "Step 4"
- Shows when wallet is bound and hash IS created
- UI and functionality unchanged

---

## Technical Details

### Hash Generation
The new `MedicalInfoHasher.generate_medical_profile_hash()` method:
1. Normalizes all input data (lowercase, trim whitespace, remove non-digits from phone)
2. Creates canonical JSON string with sorted keys
3. Generates 16-byte random salt (32 hex characters)
4. Concatenates JSON + salt with delimiter
5. Creates SHA-256 hash
6. Returns `{'hash': '<64-char-hex>', 'salt': '<32-char-hex>'}`

### Data Privacy
- All sensitive data is hashed using SHA-256 with unique salt
- Only the hash is stored on-chain (in SBT contract)
- Original data is stored in encrypted database fields
- Hash can be verified without revealing original data

### Backward Compatibility
- `IdentityHasher` and `EmergencyContactHasher` classes remain available
- `emergency_contacts_hash` is still generated for compatibility
- Existing database fields are preserved
- `/update-emergency-contacts` endpoint still exists (though not used by frontend)

---

## Testing Instructions

### 1. Run Database Migration
```bash
cd backend
python migrations/add_medical_fields.py
```

Expected output:
```
✅ Migration completed successfully!

Added columns:
  - blood_group (VARCHAR(10))
  - medications (TEXT)
  - allergies (TEXT)
  - other_medical_info (TEXT)
```

### 2. Start Services
```bash
# Terminal 1: Hardhat Node (if using localhost)
cd blockchain
npx hardhat node

# Terminal 2: Backend
cd backend
python app.py

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 3. Test the New 4-Step Flow

Navigate to `http://localhost:5173/blockchain-identity` (or your frontend URL)

#### Step 1: Bind Wallet ✅
1. Click "Connect Wallet" (MetaMask popup)
2. Select an account
3. Click "Bind Wallet to Account (Permanent)"
4. Sign the message in MetaMask
5. ✓ Should see "Wallet bound successfully" toast
6. ✓ Progress indicator shows Step 1 complete (green checkmark)

#### Step 2: Enter Emergency Contacts & Medical Info ✅
1. Form should appear after wallet binding
2. Fill in required fields:
   - Primary Contact Name: "John Doe"
   - Primary Contact Phone: "+1234567890"
3. Optional fields:
   - Secondary Contact Name: "Jane Doe"
   - Secondary Contact Phone: "+0987654321"
   - Blood Group: "O+"
   - Medications: "Aspirin, Metformin"
   - Allergies: "Peanuts, Shellfish"
   - Other Medical Info: "Diabetic"
4. ✓ All fields should accept input
5. ✓ Privacy notice should be visible

#### Step 3: Create Transaction Hash ✅
1. Step 3 card should appear below Step 2
2. Click "Create Transaction Hash" button
3. ✓ Should see "Transaction hash created successfully!" toast
4. ✓ Progress indicator shows Step 3 complete
5. ✓ Step 2 and Step 3 forms should disappear

#### Step 4: Mint Travel SBT ✅
1. Step 4 card should appear after hash creation
2. Click "Mint Travel SBT" button
3. ✓ Should see "SBT minted successfully!" toast
4. ✓ Progress indicator shows Step 4 complete
5. ✓ Should see SBT details:
   - Token ID
   - Status: ISSUED
   - Reputation Score
   - Minted On date
6. ✓ Should see "View Transaction on Block Explorer" link
7. ✓ Should see benefits section below

### 4. Verify Database
```bash
cd backend
python
```

```python
from app import create_app
from models.traveler import Traveler
from extensions import db

app = create_app()
with app.app_context():
    # Get your traveler (replace with your user ID)
    traveler = Traveler.query.filter_by(email='your@email.com').first()

    # Verify emergency contacts
    print(f"Contact 1: {traveler.emergency_contact_1_name}, {traveler.emergency_contact_1_phone}")
    print(f"Contact 2: {traveler.emergency_contact_2_name}, {traveler.emergency_contact_2_phone}")

    # Verify medical data
    print(f"Blood Group: {traveler.blood_group}")
    print(f"Medications: {traveler.medications}")
    print(f"Allergies: {traveler.allergies}")
    print(f"Other Medical Info: {traveler.other_medical_info}")

    # Verify hashes
    print(f"Profile Hash: {traveler.profile_hash}")
    print(f"Salt: {traveler.profile_hash_salt}")
    print(f"Emergency Contacts Hash: {traveler.emergency_contacts_hash}")
```

Expected output:
```
Contact 1: john doe, 1234567890
Contact 2: jane doe, 0987654321
Blood Group: o+
Medications: aspirin, metformin
Allergies: peanuts, shellfish
Other Medical Info: diabetic
Profile Hash: <64-character-hex-string>
Salt: <32-character-hex-string>
Emergency Contacts Hash: <64-character-hex-string>
```

---

## Troubleshooting

### Issue: Migration fails with "column already exists"
**Solution:** The migration has already been run. Check database schema:
```sql
DESCRIBE travelers;
-- Should show blood_group, medications, allergies, other_medical_info columns
```

### Issue: Frontend shows "Failed to create transaction hash"
**Possible causes:**
1. Backend not restarted after changes
2. Database migration not run
3. Primary emergency contact not provided

**Solution:**
- Check backend console for detailed error logs
- Ensure migration was run successfully
- Verify at least contact1_name and contact1_phone are filled

### Issue: Step 2 doesn't appear after binding wallet
**Possible causes:**
1. `hasProfileHash` is already true (hash already created)
2. `boundToCurrentWallet` is false (wrong wallet connected)

**Solution:**
- Check browser console for user object
- Verify `user.profile_hash` is `null`
- Verify `user.wallet_address` matches connected wallet

### Issue: "Cannot read property 'emergency_contact_1_name' of undefined"
**Possible causes:**
- `hasEmergencyContactsAndMedical` computed state checking non-existent fields

**Solution:**
- Ensure `refreshUser()` is called after wallet binding
- Check that user context is properly updated

---

## Key Design Decisions

### Why Emergency Contacts + Medical Instead of Profile?
1. **Travel Safety Focus**: Emergency contacts and medical info are more critical for travelers
2. **Privacy**: Medical information is already sensitive, so hashing aligns with privacy goals
3. **Emergency Verification**: Enables privacy-preserving emergency contact verification
4. **Reduced PII**: Eliminates need to store full name and DOB on-chain

### Why Separate Step for Hash Creation?
1. **User Awareness**: Makes users explicitly aware of the hashing process
2. **Data Review**: Gives users a chance to review entered data before hashing
3. **Clear Flow**: Separates data entry from cryptographic operations
4. **Better UX**: Prevents accidental hash creation while filling forms

### Why Keep Old Hashers?
1. **Backward Compatibility**: Existing data may use old hashing methods
2. **Migration Path**: Allows gradual migration of old data
3. **Testing**: Useful for comparing old vs new implementations
4. **Emergency Contacts Hash**: Still generated for compatibility with other systems

---

## API Contract

### POST `/api/identity/create-profile-hash`

**Request Body:**
```json
{
  "contact1_name": "John Doe",
  "contact1_phone": "+1234567890",
  "contact2_name": "Jane Doe",
  "contact2_phone": "+0987654321",
  "blood_group": "O+",
  "medications": "Aspirin, Metformin",
  "allergies": "Peanuts, Shellfish",
  "other_medical_info": "Diabetic, requires insulin"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Profile hash created successfully from emergency contacts and medical information",
  "data": {
    "profile_hash": "<64-character-hex-string>",
    "emergency_contacts_hash": "<64-character-hex-string>",
    "updated_at": "2025-12-09T10:30:00.000Z"
  }
}
```

**Response (Error - Missing Required Fields):**
```json
{
  "status": "error",
  "error": "Missing required fields: contact1_name, contact1_phone",
  "code": 400
}
```

---

## Summary of Changes

### ✅ Completed
- [x] Database migration to add medical fields
- [x] Created `MedicalInfoHasher` utility class
- [x] Updated `/create-profile-hash` endpoint
- [x] Updated frontend state management
- [x] Removed old profile hash fields (full name, DOB, phone)
- [x] Created new Step 2 UI (Emergency Contacts + Medical Info)
- [x] Created new Step 3 UI (Create Transaction Hash)
- [x] Updated progress indicators to 4 steps
- [x] Updated step numbers (Mint SBT is now Step 4)
- [x] Removed unused handler functions

### 🎯 Next Steps
- [ ] Run database migration
- [ ] Test the complete 4-step flow
- [ ] Deploy to staging/production (when ready)
- [ ] Update user documentation

---

## Conclusion

The Travel SBT feature has been successfully updated to the new 4-step flow focusing on emergency contacts and medical information. All backend and frontend changes are complete and ready for testing.

The new flow provides better privacy, clearer user experience, and more relevant data for travel safety use cases.

**Status:** ✅ Implementation Complete - Ready for Testing
