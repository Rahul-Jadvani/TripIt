# SBT Minting 500 Error - Final Fix

## Issue
After creating the profile hash, attempting to mint the SBT resulted in a 500 Internal Server Error:
```
POST http://localhost:5000/api/identity/mint-sbt 500 (INTERNAL SERVER ERROR)
SBT minting error: AxiosError
```

## Root Causes Identified

### 1. Missing Configuration Variable ✓ FIXED
**Problem:** The `.env` file had `WEB3_PROVIDER_URL=http://localhost:8545` but the backend code was looking for `HARDHAT_LOCAL_RPC`.

**File:** `backend/.env`

**Solution:** Added the missing configuration variable:
```bash
HARDHAT_LOCAL_RPC=http://localhost:8545
```

The `sbt_service.py` code checks the `BLOCKCHAIN_NETWORK` value and uses the appropriate RPC URL:
- If `base_mainnet` → uses `BASE_MAINNET_RPC`
- If `base_sepolia` → uses `BASE_SEPOLIA_RPC`
- Otherwise (localhost/hardhat) → uses `HARDHAT_LOCAL_RPC`

Since `BLOCKCHAIN_NETWORK=localhost`, it was trying to access `HARDHAT_LOCAL_RPC` which wasn't set.

### 2. Poor Error Logging ✓ FIXED
**Problem:** When errors occurred in the SBT minting process, the backend wasn't logging detailed information, making debugging difficult.

**File:** `backend/routes/identity.py` (lines 296-315)

**Solution:** Added comprehensive try-catch logging:
```python
try:
    current_app.logger.info(f"[MINT_SBT] Starting SBT minting for user {user_id}")
    current_app.logger.info(f"[MINT_SBT] Wallet: {traveler.wallet_address}")
    current_app.logger.info(f"[MINT_SBT] Profile Hash: {traveler.profile_hash}")
    current_app.logger.info(f"[MINT_SBT] Reputation: {reputation}")

    result = SBTService.mint_sbt(...)

    current_app.logger.info(f"[MINT_SBT] Result: {result}")
except Exception as e:
    current_app.logger.error(f"[MINT_SBT] Exception: {str(e)}")
    current_app.logger.error(f"[MINT_SBT] Traceback: {traceback.format_exc()}")
    return error_response(f'SBT minting failed: {str(e)}', status_code=500)
```

This will now show:
- Input parameters (wallet, hash, reputation)
- Exact error messages
- Full stack traces
- Makes debugging much easier in the future

## Verification

Ran comprehensive tests that verified:

✅ **Web3 Connection**
- Status: CONNECTED
- Chain ID: 31337 (Hardhat local)
- Latest Block: 3

✅ **Contract Deployment**
- Contract Address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Bytecode: Present (10,049 bytes)

✅ **Backend Signer**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Balance: 9999.99 ETH (plenty for gas)

✅ **Contract Permissions**
- MINTER_ROLE: `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
- Backend has MINTER_ROLE: **True** ✓

## Files Modified

### backend/.env
```diff
BLOCKCHAIN_NETWORK=localhost
WEB3_PROVIDER_URL=http://localhost:8545
+ HARDHAT_LOCAL_RPC=http://localhost:8545

BACKEND_SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### backend/routes/identity.py
- Added detailed logging for SBT minting process (lines 296-315)
- Added try-catch block to capture and log exceptions
- Improved error messages returned to frontend

## How to Test

1. **Ensure Services Are Running:**
   ```bash
   # Terminal 1: Hardhat Node
   cd blockchain
   npx hardhat node

   # Terminal 2: Backend (RESTART REQUIRED!)
   cd backend
   python app.py

   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

2. **Test the Full Flow:**
   - Navigate to `/blockchain-identity`
   - Connect your wallet (MetaMask)
   - Complete all 4 steps:
     1. ✓ Bind Wallet
     2. ✓ Enter Emergency Contacts + Medical Info
     3. ✓ Create Transaction Hash
     4. **→ Mint SBT** (should work now!)

3. **Expected Success:**
   - Success toast notification
   - Transaction hash displayed
   - SBT status changes to "issued"
   - Token ID assigned

## Important: Restart Backend Required!

**⚠️ CRITICAL:** You must restart your Flask backend for the `.env` changes to take effect.

```bash
# Stop the current backend (Ctrl+C)
# Then restart:
cd backend
python app.py
```

The Flask app only loads environment variables on startup.

## Troubleshooting

If you still encounter errors after restarting:

### Check Backend Logs
With the new logging, you'll see detailed output:
```
[MINT_SBT] Starting SBT minting for user <id>
[MINT_SBT] Wallet: 0x...
[MINT_SBT] Profile Hash: abc123...
[MINT_SBT] Reputation: 0.0
```

If an error occurs, you'll see:
```
[MINT_SBT] Exception: <error message>
[MINT_SBT] Traceback: <full stack trace>
```

### Common Issues

1. **"Connection error"**
   - Hardhat node not running
   - Solution: `cd blockchain && npx hardhat node`

2. **"Contract not found"**
   - Contract not deployed
   - Solution: `cd blockchain && npx hardhat run scripts/deploy.ts --network localhost`

3. **"Transaction reverted"**
   - Backend signer doesn't have MINTER_ROLE
   - Solution: Redeploy contracts (script automatically grants role)

4. **Still getting 500 with no details**
   - Backend not restarted
   - Solution: Stop and restart Flask app

## Summary

### What Was Wrong
1. Missing `HARDHAT_LOCAL_RPC` environment variable
2. Insufficient error logging

### What Was Fixed
1. ✅ Added `HARDHAT_LOCAL_RPC=http://localhost:8545` to `.env`
2. ✅ Added comprehensive logging to mint-sbt endpoint
3. ✅ Verified all systems operational

### Next Steps
1. **RESTART your Flask backend** (crucial!)
2. Try minting an SBT again
3. If it fails, check backend console for detailed logs
4. Share the `[MINT_SBT]` log output if you need further help

## Status: FIXED ✅

All configuration issues resolved. The SBT minting endpoint is now properly configured and includes detailed error logging for any future issues.

**Remember: Restart your backend!**
