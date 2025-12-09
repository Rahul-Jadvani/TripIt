# TripIt Blockchain - Smart Contracts

Soul-Bound Token (SBT) and Safety Registry smart contracts for TripIt's decentralized identity system.

## Overview

This project contains:
- **TravelSBT**: Non-transferable ERC721 token for traveler identity
- **SafetyRegistry**: On-chain registry for safety reports and travel intel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Edit `.env` with your values:
   - `DEPLOYER_PRIVATE_KEY`: Your deployer wallet private key
   - `BACKEND_SIGNER_ADDRESS`: Backend signer address (will get MINTER_ROLE)
   - `BASESCAN_API_KEY`: For contract verification

## Development

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Test Coverage
```bash
npm run test:coverage
```

### Run Local Hardhat Node
```bash
npm run node
```

## Deployment

### Deploy to Base Sepolia (Testnet)
```bash
npm run deploy:sepolia
```

### Deploy to Base Mainnet
```bash
npm run deploy:mainnet
```

After deployment:
1. Note the contract addresses from the output
2. Update `backend/.env` with `SBT_CONTRACT_ADDRESS`
3. Verify contracts on Basescan

## Contract Verification

Verify TravelSBT on Basescan:
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

## Contract Addresses

### Base Sepolia Testnet
- TravelSBT: (deploy and update here)
- SafetyRegistry: (deploy and update here)

### Base Mainnet
- TravelSBT: (TBD)
- SafetyRegistry: (TBD)

## Architecture

### TravelSBT.sol
- **Non-transferable**: Soulbound token, cannot be transferred
- **MINTER_ROLE**: Only backend signer can mint
- **Profile Hash**: Stores SHA-256 hash of traveler profile
- **Reputation Score**: 0-10000 (0.00 to 100.00)
- **Revocation**: Admin can revoke SBTs

### SafetyRegistry.sol
- **Safety Reports**: Store hashes of safety ratings
- **Emergency Alerts**: Log emergency alerts on-chain
- **Verification**: Owner can verify reports

## Security

- Private keys must NEVER be committed to git
- Backend signer key stored securely (env variable only)
- All transfers blocked on TravelSBT (soulbound)
- Access control via OpenZeppelin AccessControl

## Testing

Tests cover:
- ✅ SBT minting with profile hash
- ✅ Soulbound enforcement (transfers revert)
- ✅ MINTER_ROLE restrictions
- ✅ Reputation score updates
- ✅ Profile hash updates
- ✅ SBT revocation

## License

MIT
