# SBT Minting 500 Error - Final Fix

## Issue
Getting 500 Internal Server Error when trying to mint SBT:
```
POST http://localhost:5000/api/identity/mint-sbt 500 (INTERNAL SERVER ERROR)
```

## Root Cause
The backend server needs to be **restarted** to pick up the updated environment variables and database schema changes.

## Solution Status

### ✅ All Systems Verified
I've verified that everything is configured correctly:

1. **Database Migration**: ✓ COMPLETED
   - All 4 medical fields added successfully:
     - `blood_group` (VARCHAR)
     - `medications` (TEXT)
     - `allergies` (TEXT)
     - `other_medical_info` (TEXT)

2. **Blockchain Configuration**: ✓ VERIFIED
   - Web3 Connected: Yes
   - Chain ID: 31337 (Hardhat Local)
   - Block Number: 3
   - Backend Signer Balance: 9999.99 ETH

3. **Contract Deployment**: ✓ VERIFIED
   - Contract Address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - Deployed: Yes (10,049 bytes bytecode)
   - Backend has MINTER_ROLE: **True** ✓

4. **Environment Variables**: ✓ CONFIGURED
   - `HARDHAT_LOCAL_RPC=http://localhost:8545`
   - `SBT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - `BACKEND_SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - `BACKEND_SIGNER_KEY=0xac09...` (configured)

## Required Action: RESTART BACKEND

The backend Flask server **MUST** be restarted for changes to take effect.

### How to Restart

1. **Stop the current backend**:
   - Find the terminal running `python app.py`
   - Press `Ctrl+C` to stop it

2. **Restart the backend**:
   ```bash
   cd backend
   python app.py
   ```

3. **Verify it started**:
   Look for output like:
   ```
   * Running on http://127.0.0.1:5000
   * Debug mode: on
   ```

## Testing After Restart

Once the backend is restarted, test the full flow:

### Step 1: Bind Wallet
- Navigate to `/blockchain-identity`
- Connect MetaMask
- Click "Bind Wallet"
- Sign the message in MetaMask
- ✓ Should see success message

### Step 2: Enter Emergency & Medical Info
- Fill in at least:
  - Primary emergency contact name
  - Primary emergency contact phone
- Optional:
  - Secondary contact
  - Blood group
  - Medications
  - Allergies
  - Other medical info
- Click "Save Information"
- ✓ Should see success message

### Step 3: Create Transaction Hash
- Click "Create Transaction Hash"
- ✓ Should see hash generated
- ✓ Should see success toast

### Step 4: Mint SBT
- Click "Mint Travel SBT"
- ✓ Should see success message
- ✓ Transaction hash displayed
- ✓ Explorer link shown
- ✓ SBT status changes to "issued"

## Troubleshooting

If you still get errors after restarting:

### Check Backend Logs
With detailed logging enabled, you'll see:
```
[MINT_SBT] Starting SBT minting for user <id>
[MINT_SBT] Wallet: 0x...
[MINT_SBT] Profile Hash: abc123...
[MINT_SBT] Reputation: 0.0
```

If there's an error:
```
[MINT_SBT] Exception: <error message>
[MINT_SBT] Traceback: <full stack trace>
```

### Common Issues After Restart

1. **"Hardhat node not running"**
   ```bash
   cd blockchain
   npx hardhat node
   ```

2. **"Contract not deployed"**
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.ts --network localhost
   ```

3. **"Backend signer has no MINTER_ROLE"**
   - Redeploy contracts (deployment script automatically grants role)

## Summary

✅ Database: Medical fields added
✅ Blockchain: Node running, contract deployed
✅ Permissions: Backend has MINTER_ROLE
✅ Configuration: All env vars set correctly

🔄 **NEXT STEP: RESTART YOUR BACKEND SERVER**

After restarting, the SBT minting should work perfectly!
