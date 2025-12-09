# Blockchain Environment Variables Setup Guide

## Required Environment Variables

Add these to your `backend/.env` file:

```bash
# ============================================
# BLOCKCHAIN IDENTITY & SBT CONFIGURATION
# ============================================

# Backend Signer (Server-side wallet for SBT minting)
# IMPORTANT: This wallet will mint SBTs on behalf of users
# The backend pays gas fees for minting transactions
BACKEND_SIGNER_ADDRESS=0x...  # Your backend wallet address
BACKEND_SIGNER_KEY=0x...      # Private key (NEVER COMMIT TO GIT!)

# SBT Contract Address (Deploy contracts first, then add address here)
SBT_CONTRACT_ADDRESS=0x...    # TravelSBT contract address on Base Sepolia

# Safety Registry Contract (Optional - for future use)
SAFETY_REGISTRY_ADDRESS=0x... # SafetyRegistry contract address

# Blockchain Network (base_sepolia or base_mainnet)
BLOCKCHAIN_NETWORK=base_sepolia

# Base Network RPC URLs (Already configured, verify they're present)
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org
```

---

## Step-by-Step Setup

### Step 1: Deploy Smart Contracts

```bash
cd blockchain
npm install
npx hardhat compile
npm test  # Verify all tests pass

# Deploy to Base Sepolia
npm run deploy:sepolia
```

**Save the output!** You'll get:
- `SBT_CONTRACT_ADDRESS=0x...`
- `SAFETY_REGISTRY_ADDRESS=0x...`

### Step 2: Create Backend Signer Wallet

You need a wallet that the backend will use to sign SBT minting transactions.

**Option A: Create new wallet with Hardhat**
```bash
cd blockchain
npx hardhat console --network baseSepolia

# In Hardhat console:
const wallet = ethers.Wallet.createRandom()
console.log("Address:", wallet.address)
console.log("Private Key:", wallet.privateKey)
```

**Option B: Use existing wallet**
- Export private key from MetaMask or other wallet
- Make sure it has Base Sepolia ETH for gas

### Step 3: Fund Backend Signer Wallet

The backend signer needs ETH to pay gas for minting SBTs.

**Get Base Sepolia testnet ETH:**
- Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Or bridge from Sepolia ETH: https://bridge.base.org

**Recommended Balance:** ~0.1 ETH on Base Sepolia (enough for ~100 SBT mints)

### Step 4: Update backend/.env

Add the variables:

```bash
# Add to backend/.env
BACKEND_SIGNER_ADDRESS=0xYourBackendWalletAddress
BACKEND_SIGNER_KEY=0xYourPrivateKeyHere
SBT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
SAFETY_REGISTRY_ADDRESS=0xYourRegistryAddress
BLOCKCHAIN_NETWORK=base_sepolia
```

### Step 5: Run Database Migrations

```bash
cd backend
python migrations/add_identity_fields.py
python migrations/create_posts_table.py
```

### Step 6: Restart Backend

```bash
cd backend
python app.py
```

---

## Security Checklist

### ✅ DO:
- Store `BACKEND_SIGNER_KEY` in `.env` file only
- Add `.env` to `.gitignore`
- Use a dedicated wallet for backend signer (not personal wallet)
- Monitor gas usage and refill wallet periodically
- Keep private key backup in secure location (password manager, hardware wallet)

### ❌ DON'T:
- Never commit `.env` file to git
- Never share private key in Slack, Discord, email
- Never use mainnet wallet private key on testnet
- Never hardcode private key in source code
- Never deploy without testing on testnet first

---

## Verification

### Test Backend Signer Connection

```bash
cd backend
python -c "
from utils.sbt_service import SBTService
from flask import Flask
from config import config

app = Flask(__name__)
app.config.from_object(config['development'])

with app.app_context():
    w3 = SBTService.get_web3_instance()
    print(f'✓ Connected to Base: {w3.is_connected()}')
    print(f'✓ Chain ID: {w3.eth.chain_id}')

    backend_address, _ = SBTService.get_backend_signer()
    balance = w3.eth.get_balance(backend_address)
    print(f'✓ Backend Signer: {backend_address}')
    print(f'✓ Balance: {w3.from_wei(balance, \"ether\")} ETH')
"
```

Expected output:
```
✓ Connected to Base: True
✓ Chain ID: 84532
✓ Backend Signer: 0x...
✓ Balance: 0.1 ETH
```

### Test SBT Contract Connection

```bash
cd backend
python -c "
from utils.sbt_service import SBTService
from flask import Flask
from config import config

app = Flask(__name__)
app.config.from_object(config['development'])

with app.app_context():
    contract = SBTService.get_sbt_contract()
    name = contract.functions.name().call()
    symbol = contract.functions.symbol().call()
    print(f'✓ Contract Name: {name}')
    print(f'✓ Contract Symbol: {symbol}')
    print(f'✓ Contract Address: {contract.address}')
"
```

Expected output:
```
✓ Contract Name: TripIt Travel SBT
✓ Contract Symbol: TSBT
✓ Contract Address: 0x...
```

---

## API Endpoints Available

Once setup is complete, these endpoints will be available:

### Identity Endpoints
- `POST /api/identity/bind-wallet` - Bind wallet to account (immutable)
- `POST /api/identity/create-profile-hash` - Generate profile hash
- `POST /api/identity/mint-sbt` - Mint SBT (backend signs)
- `GET /api/identity/profile` - Get identity status
- `PUT /api/identity/update-emergency-contacts` - Update contacts + refresh hash

### Posts Endpoints
- `POST /api/posts` - Create signature-verified post
- `GET /api/posts` - Get paginated posts feed
- `GET /api/posts/<id>` - Get single post
- `GET /api/my-posts` - Get current user's posts
- `DELETE /api/posts/<id>` - Delete own post

---

## Troubleshooting

### Error: "Failed to connect to Base network"
- **Check:** `BASE_SEPOLIA_RPC` URL is correct
- **Try:** Use alternative RPC: `https://base-sepolia-rpc.publicnode.com`

### Error: "Backend signer not configured"
- **Check:** `BACKEND_SIGNER_ADDRESS` and `BACKEND_SIGNER_KEY` are in `.env`
- **Check:** No extra spaces or quotes around values

### Error: "SBT_CONTRACT_ADDRESS not configured"
- **Check:** Contract deployed successfully
- **Check:** Address copied correctly to `.env`
- **Check:** Address starts with `0x`

### Error: "Insufficient funds for gas"
- **Check:** Backend signer wallet balance
- **Fund:** Get more Base Sepolia ETH from faucet

### Error: "TravelSBT.json not found"
- **Check:** Hardhat contracts compiled: `cd blockchain && npx hardhat compile`
- **Check:** `blockchain/artifacts/` directory exists

---

## Production Deployment

### Before going to mainnet:

1. **Test thoroughly on Base Sepolia**
   - Mint 10+ SBTs
   - Test all identity flows
   - Verify signature verification works

2. **Audit smart contracts**
   - Review by security expert
   - Run static analysis tools
   - Test edge cases

3. **Setup mainnet backend signer**
   - Create new wallet for mainnet
   - Fund with real ETH (minimum 0.5 ETH)
   - Never reuse testnet keys

4. **Update config**
   ```bash
   BLOCKCHAIN_NETWORK=base_mainnet
   BASE_MAINNET_RPC=https://mainnet.base.org
   SBT_CONTRACT_ADDRESS=0x... # Mainnet address
   ```

5. **Monitor costs**
   - Track gas used per SBT mint
   - Set up alerts for low balance
   - Consider gas optimization

---

## Cost Estimates

### Base Sepolia (Testnet)
- Free ETH from faucets
- No real costs

### Base Mainnet (Production)
- **SBT Mint:** ~0.0005-0.001 ETH per mint (~$1-2)
- **Reputation Update:** ~0.0002 ETH per update (~$0.50)
- **Profile Hash Update:** ~0.0002 ETH per update (~$0.50)

**Monthly estimate for 1000 users:**
- 1000 mints × $1.50 = $1500
- Keep ~1 ETH in backend wallet ($2500 at current prices)

---

## Support

- **Base Docs:** https://docs.base.org
- **Base Sepolia Explorer:** https://sepolia.basescan.org
- **Base Discord:** https://discord.gg/buildonbase
- **Contract Verification:** Use `npx hardhat verify --network baseSepolia <address>`
