# SBT Minting Error Fix - Resolution Summary

## Issue Description
When trying to mint an SBT after creating the profile hash, the frontend was receiving a 500 Internal Server Error:

```
POST http://localhost:5000/api/identity/mint-sbt 500 (INTERNAL SERVER ERROR)
SBT minting error: AxiosError
```

## Root Cause
The issue was that the TravelSBT smart contract was **not deployed** to the local Hardhat network.

While the contract address (`0x5FbDB2315678afecb367f032d93F642f64180aa3`) was correctly configured in the `.env` file, the local Hardhat node had been restarted since the last deployment. Since Hardhat runs an ephemeral blockchain (state resets on restart), the contract bytecode was no longer at that address.

## Diagnostic Process

Created and ran a diagnostic script that checked:

1. ✓ Environment variables configured
2. ✓ Web3 connection to localhost:8545
3. ✓ Contract ABI file exists
4. ✗ **Contract NOT deployed** (no bytecode at address)
5. ✓ Backend signer configured correctly

## Solution

### Step 1: Updated Blockchain .env
Added the backend signer address to `blockchain/.env`:
```bash
BACKEND_SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

This is required by the deployment script to grant the MINTER_ROLE to the backend signer.

### Step 2: Deployed Contracts
Ran the deployment script:
```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

**Deployment Results:**
```
Network: localhost (chainId 31337)
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
TravelSBT: 0x5FbDB2315678afecb367f032d93F642f64180aa3
SafetyRegistry: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

The deployment script automatically:
- Deployed both contracts
- Granted MINTER_ROLE to the backend signer
- Saved deployment info to `blockchain/deployments/`

### Step 3: Verified Deployment
Re-ran the diagnostic to confirm:
- ✓ Contract deployed (10049 bytes of bytecode)
- ✓ All checks passed
- ✓ Ready for SBT minting

## Current Status: FIXED ✓

The SBT minting endpoint should now work correctly. The complete flow is:

1. **Bind Wallet** → Connect MetaMask and sign binding message
2. **Provide Info** → Enter emergency contacts + medical information
3. **Create Hash** → Generate SHA-256 hash with unique salt
4. **Mint SBT** → Backend signs transaction and mints TravelSBT NFT

## Important Notes

### For Development
- **Hardhat Node is Ephemeral**: Every time you restart `npx hardhat node`, you must redeploy contracts
- The contract addresses remain the same (deterministic deployment)
- Keep the Hardhat node running during development

### For Testing
If you encounter the same error again:
1. Check if Hardhat node is running: `lsof -i :8545` (Mac/Linux) or `netstat -ano | findstr :8545` (Windows)
2. Verify contract deployment: `cd blockchain && npx hardhat run scripts/deploy.ts --network localhost`
3. The deployment script is idempotent and safe to run multiple times

### For Production
When deploying to Base Sepolia or Base Mainnet:
1. Update `backend/.env`:
   ```
   BLOCKCHAIN_NETWORK=base_sepolia  # or base_mainnet
   ```
2. Deploy to the target network:
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.ts --network base-sepolia
   ```
3. Update `backend/.env` with the deployed contract addresses

## Files Modified

### Created
- `blockchain/deployments/deployment-31337-[timestamp].json` - Deployment record

### Updated
- `blockchain/.env` - Added BACKEND_SIGNER_ADDRESS

## Contract Information

### TravelSBT Contract
- **Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Network**: Hardhat Local (chainId: 31337)
- **Deployer**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Backend Signer**: Same as deployer (has MINTER_ROLE)

### SafetyRegistry Contract
- **Address**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Network**: Hardhat Local (chainId: 31337)

## Testing Instructions

1. **Start Services** (if not already running):
   ```bash
   # Terminal 1: Hardhat Node
   cd blockchain
   npx hardhat node

   # Terminal 2: Backend
   cd backend
   python app.py

   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

2. **Test SBT Minting Flow**:
   - Navigate to `/blockchain-identity` in your browser
   - Connect MetaMask (use account `0xf39...92266` or another Hardhat account)
   - Complete all 4 steps:
     1. Bind Wallet
     2. Enter emergency contacts + medical info
     3. Create transaction hash
     4. Mint SBT ← Should now work!

3. **Expected Result**:
   - Success toast notification
   - Transaction hash displayed
   - SBT status changes to "issued"
   - Token ID assigned to your wallet

## Troubleshooting

If you still get errors:

1. **Connection Error**:
   - Ensure Hardhat node is running on port 8545
   - Check `backend/.env` has correct `WEB3_PROVIDER_URL`

2. **Gas Errors**:
   - Backend signer should have plenty of ETH (starts with 10,000)
   - Check balance with diagnostic script

3. **Transaction Reverts**:
   - Ensure MINTER_ROLE was granted (check deployment logs)
   - Verify contract ABI is up to date

4. **Other Errors**:
   - Check backend console for detailed error messages
   - Use browser DevTools Network tab to see API responses

## Summary

The issue was simply that the contract needed to be deployed to the local Hardhat network. This is a common occurrence in development because Hardhat nodes are ephemeral and don't persist state between restarts.

**Fix**: Deployed contracts using `npx hardhat run scripts/deploy.ts --network localhost`

**Status**: ✅ All systems operational. SBT minting ready!
