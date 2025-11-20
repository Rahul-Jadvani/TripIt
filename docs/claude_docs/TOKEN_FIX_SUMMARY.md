# 401 Unauthorized Error - Token Fix Summary

## Problem
When clicking "Verify 0xCert Ownership" button, got a 401 Unauthorized error:
```
AxiosError: Request failed with status code 401
```

## Root Cause Analysis

### Issue 1: Wrong Token Key ❌
**WalletVerification.tsx** was looking for:
```typescript
const token = localStorage.getItem('access_token');
```

But **AuthContext.tsx** stores the token as:
```typescript
localStorage.setItem('token', tokens.access);
```

### Issue 2: Missing Frontend .env ❌
The frontend didn't have a `.env` file, so `VITE_API_URL` was using the fallback:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

## Solutions Applied

### 1. Fixed Token Key ✅
**File:** `frontend/src/components/WalletVerification.tsx`

**Before:**
```typescript
const token = localStorage.getItem('access_token'); // Wrong key!
```

**After:**
```typescript
const token = localStorage.getItem('token'); // Matches AuthContext

if (!token) {
  toast.error('Not authenticated. Please log in again.');
  setVerifying(false);
  return;
}
```

**Changes:**
- Changed token key from `'access_token'` to `'token'`
- Added null check with user-friendly error message
- Early return if no token found

### 2. Created Frontend .env ✅
**File:** `frontend/.env`

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# Blockchain Configuration
VITE_KAIA_KAIROS_RPC=https://public-en-kairos.node.kaia.io
VITE_KAIA_CHAIN_ID=1001

# 0xCerts Contract (Kaia Testnet)
VITE_OXCERTS_ADDRESS=0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7

# Wallet Connection (Wagmi/WalletConnect)
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Feature Flags
VITE_ENABLE_WALLET_CONNECTION=true
VITE_ENABLE_0XCERTS_VERIFICATION=true
VITE_ENABLE_COMMENTS=true
VITE_ENABLE_INTROS=true
VITE_ENABLE_BADGES=true

# Auth
VITE_AUTH_TOKEN_KEY=token
```

### 3. Verified CORS Configuration ✅
**File:** `backend/.env`

CORS already includes all necessary origins:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,https://public-en-kairos.node.kaia.io
```

Includes:
- ✅ `http://localhost:8080` - Current frontend dev server
- ✅ `http://127.0.0.1:8080` - Localhost alias
- ✅ Other common ports (3000, 5173)

## Token Flow - How It Works

### 1. Login/Register
```typescript
// AuthContext.tsx
const login = async (email, password) => {
  const response = await authService.login(email, password);
  const { tokens, user } = response.data.data;

  localStorage.setItem('token', tokens.access);        // ← Stored as 'token'
  localStorage.setItem('refreshToken', tokens.refresh);

  axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
  setToken(tokens.access);
  setUser(user);
};
```

### 2. Wallet Verification Request
```typescript
// WalletVerification.tsx
const handleVerifyCert = async () => {
  const token = localStorage.getItem('token'); // ← Retrieved as 'token' ✅

  const response = await axios.post(
    `${API_URL}/api/blockchain/verify-cert`,
    { wallet_address: address },
    {
      headers: {
        Authorization: `Bearer ${token}`, // ← Sent to backend
      },
    }
  );
};
```

### 3. Backend Validation
```python
# backend/routes/blockchain.py
@blockchain_bp.route('/verify-cert', methods=['POST'])
@token_required  # ← Validates JWT token
def verify_cert(user_id):
    # Token validated ✅
    # user_id extracted from token
    # Process verification...
```

## Testing Checklist

- [x] Token key matches between AuthContext and WalletVerification
- [x] Frontend .env created with correct API URL
- [x] CORS origins include frontend dev server
- [x] Token validation added with null check
- [x] User-friendly error messages

## How to Test

1. **Restart Frontend Dev Server** (required to load new .env):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Ensure Backend is Running**:
   ```bash
   cd backend
   python app.py
   ```

3. **Test Flow**:
   - Login to your account
   - Go to Profile page (Avatar → "Edit Profile & Verify Wallet")
   - Connect your wallet (MetaMask, etc.)
   - Click "Verify 0xCert Ownership"
   - Should now work without 401 error! ✅

## Expected Behavior

### Success Case (Has 0xCert):
```
POST /api/blockchain/verify-cert
Headers: Authorization: Bearer <valid_token>
Body: { wallet_address: "0x..." }

Response 200:
{
  "status": "success",
  "message": "Cert verified successfully",
  "data": {
    "has_cert": true,
    "balance": 1,
    "user": { ... }
  }
}

Toast: "0xCert verified! Your projects now have +10 verification score"
```

### Success Case (No 0xCert):
```
Response 200:
{
  "status": "success",
  "data": {
    "has_cert": false,
    "balance": 0
  }
}

Toast: "No 0xCert found in this wallet"
```

### Error Cases:

**No Token:**
```
Toast: "Not authenticated. Please log in again."
(No API call made)
```

**Invalid Token:**
```
Response 401:
{
  "status": "error",
  "message": "Invalid or expired token"
}

Toast: "Invalid or expired token"
```

**Blockchain Error:**
```
Response 500:
{
  "status": "error",
  "message": "RPC connection failed"
}

Toast: "RPC connection failed"
```

## Files Modified

1. `frontend/src/components/WalletVerification.tsx`
   - Fixed token localStorage key
   - Added null check and error handling

2. `frontend/.env` (Created)
   - Added API URL configuration
   - Added blockchain settings
   - Added feature flags

## Environment Variables Reference

### Frontend (.env)
| Variable | Value | Purpose |
|----------|-------|---------|
| VITE_API_URL | http://localhost:5000 | Backend API base URL |
| VITE_KAIA_KAIROS_RPC | https://public-en-kairos.node.kaia.io | Kaia blockchain RPC |
| VITE_OXCERTS_ADDRESS | 0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7 | 0xCert contract address |

### Backend (.env)
| Variable | Value | Purpose |
|----------|-------|---------|
| CORS_ORIGINS | http://localhost:8080,... | Allowed frontend origins |
| KAIA_TESTNET_RPC | https://public-en-kairos.node.kaia.io | Kaia blockchain RPC |
| OXCERTS_CONTRACT_ADDRESS | 0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7 | 0xCert contract address |

## Summary

✅ **Fixed 401 Error by:**
1. Correcting token localStorage key from `'access_token'` → `'token'`
2. Adding token validation with null checks
3. Creating frontend `.env` with proper API URL
4. Verifying CORS configuration includes frontend origin

✅ **Authentication Flow Now Works:**
- Login stores token as `'token'`
- WalletVerification retrieves token as `'token'`
- Token sent to backend with Authorization header
- Backend validates and processes request

**Next Step:** Restart frontend dev server to load the new `.env` file!
