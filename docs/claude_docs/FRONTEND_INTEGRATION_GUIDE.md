# Frontend-Backend Integration Guide

## ✅ Issues Fixed

### 1. **Publish Button Issue - FIXED**
**Problem:** Payload was sending `undefined` values which caused validation errors
**Solution:**
- Only include optional fields in payload if they have non-empty values
- Added console logging to track payload construction
- Improved error messages to show backend validation errors

**File:** `frontend/src/pages/Publish.tsx`
- Lines 59-95: Updated form submission handler
- Properly handles optional fields (tagline, demo_url, github_url, hackathon_name, hackathon_date)

### 2. **Token Refresh Error - FIXED**
**Problem:** API was looking for `response.data?.access_token` but backend returns `response.data?.data?.access`
**Solution:**
- Corrected token extraction path in refresh interceptor
- Added logging for token refresh events

**File:** `frontend/src/services/api.ts`
- Lines 37-50: Updated token refresh handling
- Now correctly accesses `response.data?.data?.access` from backend response

### 3. **API Logging & Error Handling - IMPROVED**
**Files Updated:**
- `frontend/src/services/api.ts` - Added comprehensive request/response logging
- `frontend/src/hooks/useProjects.ts` - Enhanced error reporting
- `frontend/src/pages/Publish.tsx` - Better error messages

---

## 🧪 Testing Checklist

### Test 1: Authentication Flow
```
1. Go to http://localhost:8080/register
2. Fill in:
   - Username: testuser123
   - Email: test@example.com
   - Password: TestPassword123
   - Confirm: TestPassword123
3. Click "Sign up"
4. Check browser console for API logs
✅ Should redirect to home page
✅ Should store tokens in localStorage
```

**Expected Console Logs:**
```
[API] POST /auth/register {...}
[API Response] 201 {status: "success", data: {tokens: {...}, user: {...}}}
```

---

### Test 2: Project Publishing (Main Test)
```
1. Login or register first
2. Go to http://localhost:8080/publish
3. Fill form:
   - Title: "My DeFi Project" (5+ chars)
   - Tagline: "A secure lending platform" (optional)
   - Description: "This is a detailed project description with at least 50 characters as required" (50+ chars)
   - Tech Stack: Add "React", "Solidity", "Web3.js"
   - Demo URL: https://example.com (optional)
   - GitHub URL: https://github.com/user/repo (optional)
   - Hackathon: Leave empty (optional)
4. Click "Publish Project"
✅ Should show success toast
✅ Should redirect to /my-projects
✅ Should appear in project feed
```

**Expected Console Logs:**
```
Submitting payload: {
  title: "My DeFi Project",
  description: "...",
  tech_stack: ["React", "Solidity", "Web3.js"]
}
[API] POST /projects {...}
[API Response] 201 {status: "success", data: {id: "...", ...}}
Project published successfully!
```

---

### Test 3: Comments Integration
```
1. Open any project detail page
2. Scroll to comments section
3. Type a comment (1-5000 chars)
4. Click "Post Comment"
✅ Comment should appear immediately
✅ Should see success toast
✅ Comment count should update
```

**Expected Console Logs:**
```
[API] POST /comments {project_id: "...", content: "..."}
[API Response] 201 {status: "success", data: {...}}
Comment posted!
```

---

### Test 4: Voting System
```
1. On any project card or detail page
2. Click upvote/downvote button
✅ Vote should register
✅ Vote count should update
✅ Button state should change
```

**Expected Console Logs:**
```
[API] POST /projects/{id}/upvote
[API Response] 200 {status: "success", data: {upvotes: X, ...}}
```

---

### Test 5: Form Validation
```
1. Go to /publish
2. Try to submit with:
   - Empty title → Error: "Title must be at least 5 characters"
   - Title with 3 chars → Error: "Title must be at least 5 characters"
   - Short description (30 chars) → Error: "Description must be at least 50 characters"
   - No tech stack → Error: "Please add at least one technology"
   - Invalid URL → Error: "Invalid demo URL" or "Invalid GitHub URL"
✅ Form should not submit
✅ Error messages should display
```

---

### Test 6: API Endpoint Verification

**Open Browser DevTools → Network Tab and verify these calls work:**

```
POST /auth/register      → 201 ✅
POST /auth/login         → 200 ✅
POST /projects           → 201 ✅
GET  /projects           → 200 ✅
GET  /projects/{id}      → 200 ✅
POST /comments           → 201 ✅
GET  /comments           → 200 ✅
POST /projects/{id}/upvote    → 200 ✅
POST /projects/{id}/downvote  → 200 ✅
```

---

## 🔍 Debugging Tips

### 1. **Check Console Logs** (Ctrl+Shift+I / Cmd+Option+I)
```javascript
// All API calls are logged with [API] prefix
// Errors are logged with [API Error] prefix
// Auth events logged with [Auth] prefix

// Example search in console:
filter: "[API]"
```

### 2. **Check Network Tab**
```
• Request Headers should include:
  Authorization: Bearer {token}
  Content-Type: application/json

• Response should always have:
  {
    "status": "success",
    "message": "...",
    "data": {...}
  }
```

### 3. **Check LocalStorage** (DevTools → Application → Local Storage)
```
• token → Contains JWT access token
• refreshToken → Contains JWT refresh token
• Tokens should expire after API calls and be refreshed
```

### 4. **Common Error Messages**
| Error | Cause | Solution |
|-------|-------|----------|
| "401 Unauthorized" | Token expired or invalid | Check token in localStorage |
| "400 Validation error" | Form fields don't match schema | Check field values in console.log |
| "Network error" | Backend not running | Start backend with `python app.py` |
| "CORS error" | Backend CORS config issue | Check `CORS_ORIGINS` in backend config |

---

## 📋 Form Field Mappings

### Publish Form (Frontend → Backend)
```javascript
Frontend (camelCase)  →  Backend (snake_case)
title                 →  title
tagline               →  tagline
description           →  description
demoUrl               →  demo_url
githubUrl             →  github_url
hackathonName         →  hackathon_name
hackathonDate         →  hackathon_date
techStack: []         →  tech_stack: []
```

### Comment Form
```javascript
Frontend: { content: "..." }
Backend:  {
  project_id: "...",
  content: "...",
  parent_id?: "..." (optional, for replies)
}
```

### Authentication
```javascript
Register:
Frontend: { email, username, password, display_name? }
Backend:  { email, username, password, display_name? }

Login:
Frontend & Backend: { email, password }

Token Response:
{
  "user": {...},
  "tokens": {
    "access": "...",
    "refresh": "..."
  }
}
```

---

## 🚀 Environment Configuration

**File:** `frontend/.env`
```
# Backend API
VITE_API_URL=http://localhost:5000/api

# Blockchain (Kaia Testnet)
VITE_KAIA_KAIROS_RPC=https://public-en-kairos.node.kaia.io
VITE_KAIA_CHAIN_ID=1001

# Wallet Connection
VITE_WALLETCONNECT_PROJECT_ID=eb797222bfe9f2635dd42dbe7b942da9

# Smart Contracts
VITE_OXCERTS_ADDRESS=0x...
VITE_OXCERTS_ABI=[]

# Feature Flags
VITE_ENABLE_WALLET_CONNECTION=true
VITE_ENABLE_0XCERTS_VERIFICATION=true
VITE_ENABLE_COMMENTS=true
VITE_ENABLE_INTROS=true
VITE_ENABLE_BADGES=true

# Auth Token Key
VITE_AUTH_TOKEN_KEY=auth_token
```

---

## 🐛 Troubleshooting

### Publish Button Not Working
**Step 1:** Open browser console (F12)
**Step 2:** Fill form and click publish
**Step 3:** Check console for:
- "Submitting payload:" log with form data
- "[API] POST /projects" log with request
- Error or success response log

**Common Issues:**
- ❌ No "Submitting payload" log → Form validation failing
- ❌ "[API Error] 400" → Backend validation error (check message in console)
- ❌ "[API Error] 401" → Token missing or expired (login again)
- ❌ "[API Error] Network" → Backend not running

### Comments Not Posting
**Check:**
1. Are you logged in? (Check localStorage for token)
2. Open console → Submit comment
3. Look for "[API] POST /comments" log
4. Check response for errors

### Voting Not Working
**Check:**
1. Token is valid (still logged in)
2. Project exists and not deleted
3. Console shows "[API] POST /projects/{id}/upvote"

---

## 📊 API Response Structures

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": { /* ... */ }
}
```

### Paginated Response
```json
{
  "status": "success",
  "message": "Success",
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Error type",
  "message": "Detailed message"
}
```

---

## ✨ Integration Status

| Feature | Status | Tested |
|---------|--------|--------|
| Authentication (Register/Login) | ✅ Working | ❓ |
| Project Publishing | ✅ Fixed | ❓ |
| Project Listing | ✅ Working | ❓ |
| Comments | ✅ Working | ❓ |
| Voting | ✅ Working | ❓ |
| Badges | ✅ Working | ❓ |
| Intros | ✅ Working | ❓ |
| File Upload | ⚠️ Placeholder | ❓ |
| Blockchain Features | ⚠️ Pending | ❓ |

---

## 🔧 Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python app.py
# Server runs on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:8080
```

### Test the Full Flow
```bash
1. Start backend: python app.py
2. Start frontend: npm run dev
3. Register: http://localhost:8080/register
4. Publish: http://localhost:8080/publish
5. View: http://localhost:8080
```

---

## 📝 Notes

- All forms now have proper client-side validation with Zod
- Backend validation happens after frontend validation
- Token refresh is automatic on 401 responses
- All API calls are logged for debugging
- Error messages from backend are displayed to users
- Optional form fields are only sent if they have values

---

**Last Updated:** 2025-10-23
**Integration Version:** 2.0 (Fixed & Enhanced)
