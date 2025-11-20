# GitHub OAuth Setup Guide for 0x.Discovery-ship

This guide will help you set up GitHub OAuth authentication for your application.

## 📋 Overview

GitHub OAuth allows users to connect their GitHub accounts to your platform, enabling:
- **+5 verification score** for all their projects
- **Automatic validation** of GitHub repository URLs
- **Username verification** to ensure users are linking their own repositories

---

## 🔧 Step 1: Register a GitHub OAuth Application

1. Go to **GitHub Developer Settings**:
   👉 [https://github.com/settings/developers](https://github.com/settings/developers)

2. Click **"New OAuth App"** (or "Register a new application")

3. Fill in the application details:

### For Local Development:
```
Application name: 0x.Discovery-ship (Local)
Homepage URL: http://localhost:8080
Application description: 0x.Discovery-ship - Hackathon Project Discovery Platform
Authorization callback URL: http://localhost:5000/api/auth/github/callback
```

### For Production:
```
Application name: 0x.Discovery-ship
Homepage URL: https://your-domain.com
Application description: 0x.Discovery-ship - Hackathon Project Discovery Platform
Authorization callback URL: https://your-domain.com/api/auth/github/callback
```

4. Click **"Register application"**

5. You'll see your application page with:
   - **Client ID** (shown immediately)
   - **Client Secret** (click "Generate a new client secret")

6. **IMPORTANT**: Copy both values immediately! The client secret will only be shown once.

---

## 🔐 Step 2: Configure Your Backend

1. Open `backend/.env` file

2. Replace the placeholder values with your actual GitHub OAuth credentials:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:5000/api/auth/github/callback
```

### Example (with fake credentials):
```env
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678
GITHUB_REDIRECT_URI=http://localhost:5000/api/auth/github/callback
```

---

## 🚀 Step 3: Restart Your Servers

After updating the `.env` file, restart both servers for changes to take effect:

### Backend:
```bash
# Stop the backend (Ctrl+C in the terminal)
# Then restart:
cd backend
python app.py
```

### Frontend:
```bash
# Stop the frontend (Ctrl+C in the terminal)
# Then restart:
cd frontend
npm run dev
```

---

## ✅ Step 4: Test GitHub OAuth

1. Navigate to `/publish` page in your frontend (http://localhost:8080/publish)

2. Scroll down to the **"Wallet & 0xCert Verification"** section

3. Look for the **"Connect GitHub Account"** section

4. Click the **"Connect with GitHub"** button

5. You'll be redirected to GitHub to authorize the app

6. After authorizing, you'll be redirected back to your app with a success message

7. Your GitHub username will now show as **connected** with **+5 verification points**

---

## 🎯 How It Works

### User Flow:
1. User clicks "Connect with GitHub" on `/publish` page
2. Backend generates OAuth authorization URL
3. User is redirected to GitHub
4. User authorizes the application
5. GitHub redirects back with an authorization code
6. Backend exchanges code for access token
7. Backend fetches user's GitHub profile
8. Username is saved to database and user sees success message

### Verification Flow:
1. When user enters a GitHub URL in the project form
2. System validates:
   - Is it a valid GitHub URL?
   - If GitHub is connected, does the URL belong to the connected account?
3. Warning shown if validation fails
4. Project submission blocked until GitHub URL is valid

---

## 🔍 Features Implemented

### Backend (`backend/routes/auth.py`):
- `/api/auth/github/connect` - Initiates GitHub OAuth flow
- `/api/auth/github/callback` - Handles OAuth callback
- `/api/auth/github/disconnect` - Disconnects GitHub account

### Frontend:
- **WalletVerification Component** - Shows GitHub connection status and button
- **Publish Page** - GitHub URL validation with real-time warnings
- **User Type** - Extended to include GitHub fields
- **AuthService** - API methods for GitHub connect/disconnect

### Database:
- `github_username` - Stores the user's GitHub username
- `github_connected` - Boolean flag for connection status

---

## 🛡️ Security Notes

1. **Client Secret**: Never commit your `GITHUB_CLIENT_SECRET` to version control
2. **State Parameter**: Used to prevent CSRF attacks (implemented in the code)
3. **Token Storage**: GitHub access token is NOT stored (only used to fetch username)
4. **User Verification**: Only the username is saved, ensuring minimal data collection

---

## 🐛 Troubleshooting

### Issue: "GitHub connection failed: token_failed"
**Solution**: Check that your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct in `.env`

### Issue: "Redirect URI mismatch"
**Solution**: Make sure the callback URL in your GitHub OAuth app settings matches exactly:
```
http://localhost:5000/api/auth/github/callback
```

### Issue: GitHub button not working
**Solution**:
1. Check browser console for errors
2. Ensure you're logged in to your app
3. Make sure backend is running on port 5000

### Issue: GitHub URL validation not working
**Solution**:
1. Ensure GitHub is connected first
2. URL must include your GitHub username
3. Example valid URL: `https://github.com/your-username/repo-name`

---

## 📊 Verification Score Breakdown

Total possible: **20/20 points**

| Verification Type | Points | How to Earn |
|-------------------|--------|-------------|
| Email Verified    | +5     | Auto-verified for MVP |
| GitHub Connected  | +5     | Connect GitHub account |
| 0xCert NFT       | +10    | Verify 0xCert ownership |

---

## 🔗 Useful Links

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub Apps vs OAuth Apps](https://docs.github.com/en/developers/apps/getting-started-with-apps/differences-between-github-apps-and-oauth-apps)
- [GitHub Developer Settings](https://github.com/settings/developers)

---

## ✨ Success!

Once configured, users can:
- ✅ Connect their GitHub accounts
- ✅ Earn +5 verification points
- ✅ Automatically validate GitHub repository URLs
- ✅ Ensure they're only linking their own repositories

The system will automatically validate GitHub URLs and warn users if they're trying to link repositories that don't belong to their connected GitHub account.
