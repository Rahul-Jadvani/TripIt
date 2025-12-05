# Local Testing Guide - Hardhat + Backend + Frontend

Complete guide for testing the blockchain identity system locally without deploying to testnet.

---

## Prerequisites

- Node.js 18+ installed
- Python 3.9+ installed
- PostgreSQL database running
- Redis running (for backend caching)

---

## Step 1: Start Hardhat Local Blockchain

Open **Terminal 1**:

```bash
cd blockchain
npm install
npx hardhat node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

...
```

**Keep this terminal running!** This is your local blockchain.

---

## Step 2: Deploy Contracts to Local Network

Open **Terminal 2**:

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

**Expected Output:**
```
🚀 Starting deployment to Base network...

📍 Deploying contracts with account: 0xf39Fd...
💰 Account balance: 10000.0 ETH

📄 Deploying TravelSBT contract...
✅ TravelSBT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

📄 Deploying SafetyRegistry contract...
✅ SafetyRegistry deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

🔐 Granting MINTER_ROLE to backend signer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
✅ MINTER_ROLE granted successfully

🎉 DEPLOYMENT COMPLETE!
```

**IMPORTANT:** Copy these contract addresses!

---

## Step 3: Configure Backend Environment

Edit `backend/.env` and add/update these lines:

```bash
# Blockchain Configuration - LOCAL TESTING
BLOCKCHAIN_NETWORK=localhost
BASE_SEPOLIA_RPC=http://localhost:8545

# Backend Signer (Hardhat Account #0)
BACKEND_SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
BACKEND_SIGNER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (from deployment output)
SBT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
SAFETY_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Existing config (keep these)
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=...
```

---

## Step 4: Run Database Migrations

In **Terminal 3**:

```bash
cd backend
python migrations/add_identity_fields.py
python migrations/create_posts_table.py
```

**Expected Output:**
```
============================================================
MIGRATION: Add Identity Fields to Travelers Table
============================================================

1. Adding wallet_address and wallet_bound_at columns...
   ✓ Columns added
2. Adding unique index on wallet_address...
   ✓ Unique index created
...
✅ MIGRATION COMPLETED SUCCESSFULLY
```

---

## Step 5: Start Backend Server

Still in **Terminal 3**:

```bash
cd backend
python app.py
```

**Expected Output:**
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
✓ Database connected
✓ Redis connected
✓ Celery workers started
```

**Keep this running!**

---

## Step 6: Test Backend API with curl

Open **Terminal 4** for testing:

### Test 1: Health Check
```bash
curl http://localhost:5000/api/blockchain/health
```

Expected: `{"connected": true, "network": "unknown", "block_number": 1}`

### Test 2: Create Test User & Login

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "display_name": "Test User"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Copy the JWT token from response!**

### Test 3: Bind Wallet

First, we need to sign a message. Use this Node.js script:

Create `test-sign.js`:
```javascript
const { ethers } = require('ethers');

// Hardhat Account #1 (for testing)
const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const wallet = new ethers.Wallet(privateKey);

const message = 'Bind wallet 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 to TripIt account test@example.com';

wallet.signMessage(message).then(signature => {
  console.log('Wallet:', wallet.address);
  console.log('Signature:', signature);
});
```

Run: `node test-sign.js`

Then bind wallet:
```bash
curl -X POST http://localhost:5000/api/identity/bind-wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "signature": "0x..."
  }'
```

### Test 4: Create Profile Hash

```bash
curl -X POST http://localhost:5000/api/identity/create-profile-hash \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "date_of_birth": "1990-01-01",
    "phone": "+1234567890"
  }'
```

### Test 5: Mint SBT

```bash
curl -X POST http://localhost:5000/api/identity/mint-sbt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sbt_id": "0",
    "tx_hash": "0x...",
    "gas_used": 250000,
    "explorer_url": "http://localhost:8545/tx/..."
  },
  "message": "SBT minted successfully!"
}
```

### Test 6: Verify SBT Ownership

Check directly on the contract:
```bash
cd blockchain
npx hardhat console --network localhost
```

In Hardhat console:
```javascript
const contract = await ethers.getContractAt(
  "TravelSBT",
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"  // Your deployed address
);

const wallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";  // User's wallet
const balance = await contract.balanceOf(wallet);
console.log("SBT Balance:", balance.toString());  // Should be 1

const profile = await contract.getProfile(0);  // Token ID 0
console.log("Profile Hash:", profile.profileHash);
console.log("Reputation:", profile.reputationScore.toString());
console.log("Is Active:", profile.isActive);
```

---

## Step 7: Start Frontend (Coming Next!)

Once RainbowKit installation completes:

```bash
cd frontend
npm install  # If not already done
npm run dev
```

Visit: http://localhost:5173

---

## Troubleshooting

### Error: "Connection refused" to localhost:8545
- **Solution:** Make sure Hardhat node is running in Terminal 1

### Error: "Cannot find module 'ethers'"
- **Solution:** `npm install --save-dev ethers` in blockchain folder

### Error: "Nonce too high"
- **Solution:** Restart Hardhat node (Ctrl+C and run again)
- The nonce resets when you restart

### Error: "Transaction reverted"
- **Check:** Contract address is correct in .env
- **Check:** BACKEND_SIGNER_ADDRESS has MINTER_ROLE
- **Debug:** Look at Hardhat terminal for error messages

### Backend can't connect to database
- **Check:** PostgreSQL is running
- **Check:** DATABASE_URL in .env is correct
- **Test:** `psql $DATABASE_URL` should connect

---

## Quick Reset (Start Fresh)

If you want to start over:

```bash
# Terminal 1: Restart Hardhat (Ctrl+C)
cd blockchain
npx hardhat node  # Fresh blockchain with reset state

# Terminal 2: Re-deploy contracts
npx hardhat run scripts/deploy.ts --network localhost
# Update .env with new contract addresses

# Terminal 3: Restart backend
# (No need to re-run migrations unless you dropped the database)
cd backend
python app.py
```

---

## Testing Checklist

- [ ] Hardhat node running and showing blocks
- [ ] Contracts deployed successfully
- [ ] Backend .env configured with correct addresses
- [ ] Backend server starts without errors
- [ ] Can create user and login
- [ ] Can bind wallet with signature
- [ ] Can create profile hash
- [ ] Can mint SBT (check Hardhat terminal for tx)
- [ ] Can verify SBT ownership on contract
- [ ] Frontend connects to MetaMask on localhost:8545

---

## Network Configuration Summary

| Network | Chain ID | RPC URL | Use Case |
|---------|----------|---------|----------|
| Hardhat localhost | 31337 | http://localhost:8545 | Local testing |
| Base Sepolia | 84532 | https://sepolia.base.org | Testnet |
| Base Mainnet | 8453 | https://mainnet.base.org | Production |

**For now, use localhost (31337) for all testing!**

---

## Next Steps After Local Testing Works

1. ✅ Verify all endpoints work locally
2. ✅ Test wallet binding immutability
3. ✅ Test signature verification
4. ✅ Complete frontend integration
5. → Deploy to Base Sepolia testnet
6. → Get testnet ETH from faucet
7. → Test on testnet with real MetaMask
8. → Production deployment to Base Mainnet

---

## Useful Commands

### Check Hardhat accounts:
```bash
npx hardhat accounts
```

### Compile contracts:
```bash
npx hardhat compile
```

### Run contract tests:
```bash
npx hardhat test
```

### Clean and recompile:
```bash
npx hardhat clean
npx hardhat compile
```

### Check contract size:
```bash
npx hardhat size-contracts
```

---

## Support Resources

- **Hardhat Docs:** https://hardhat.org/hardhat-runner/docs/getting-started
- **Base Docs:** https://docs.base.org
- **Wagmi Docs:** https://wagmi.sh
- **RainbowKit Docs:** https://www.rainbowkit.com

Happy testing! 🚀
