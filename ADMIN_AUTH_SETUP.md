# Admin OTP Authentication Setup

## Overview

The admin authentication system has been upgraded from password-based to OTP (One-Time Password) email-based authentication for enhanced security.

## Security Improvements

### Before (CRITICAL VULNERABILITIES FIXED):
- ❌ Hardcoded password `"Admin"` in multiple files
- ❌ Password exposed in `.env` file
- ❌ Header-based authentication accepting literal password
- ❌ No rate limiting on login attempts

### After:
- ✅ Email-based OTP authentication
- ✅ OTP codes expire after 10 minutes
- ✅ One-time use codes (cannot be reused)
- ✅ Root admin can manage other admin users
- ✅ No hardcoded credentials anywhere in codebase

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
python migrations/create_admin_otp_system.py
```

### 2. Create Root Admin User

Option A - Using the script (recommended):
```bash
python scripts/create_root_admin.py
```

Option B - Manual SQL:
```sql
INSERT INTO admin_users (id, email, is_root, is_active)
VALUES (gen_random_uuid()::text, 'your-email@example.com', TRUE, TRUE);
```

Replace `your-email@example.com` with your actual email address.

### 3. Configure Email Service

Ensure ZeptoMail is configured in your `.env` file:

```env
ZEPTOMAIL_API_URL=https://api.zeptomail.in/v1.1/email
ZEPTOMAIL_TOKEN=your_zepto_token
ZEPTOMAIL_FROM_EMAIL=your-email@yourdomain.com
ZEPTOMAIL_FROM_NAME=Team Zer0
```

## API Endpoints

### Authentication Endpoints

#### 1. Request OTP
```http
POST /api/admin/request-otp
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

Response:
```json
{
  "status": "success",
  "message": "If this email is registered as admin, you will receive an OTP code shortly"
}
```

#### 2. Verify OTP
```http
POST /api/admin/verify-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp_code": "123456"
}
```

Response:
```json
{
  "status": "success",
  "message": "Admin authenticated successfully",
  "data": {
    "email": "admin@example.com",
    "is_root": true
  }
}
```

#### 3. Check Authentication Status
```http
GET /api/admin/check
```

Response:
```json
{
  "status": "success",
  "authenticated": true,
  "email": "admin@example.com",
  "is_root": true
}
```

#### 4. Logout
```http
POST /api/admin/logout
```

### Admin Management Endpoints (Root Admin Only)

#### 1. List All Admins
```http
GET /api/admin/admins
```

Requires: Root admin session

Response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-here",
      "email": "admin@example.com",
      "is_root": true,
      "is_active": true,
      "created_at": "2025-11-20T10:00:00Z",
      "last_login": "2025-11-20T12:00:00Z"
    }
  ]
}
```

#### 2. Add New Admin
```http
POST /api/admin/admins/add
Content-Type: application/json

{
  "email": "new-admin@example.com"
}
```

Requires: Root admin session

#### 3. Remove Admin
```http
DELETE /api/admin/admins/{admin_id}
```

Requires: Root admin session

Notes:
- Cannot remove root admin
- Cannot remove yourself
- Performs soft delete (sets is_active to false)

#### 4. Toggle Admin Active Status
```http
POST /api/admin/admins/{admin_id}/toggle-active
```

Requires: Root admin session

## Frontend Integration

### Login Flow

1. User enters email on admin login page
2. Frontend calls `/api/admin/request-otp` with email
3. User receives OTP via email (6-digit code)
4. User enters OTP code
5. Frontend calls `/api/admin/verify-otp` with email and OTP
6. Session is created, user is authenticated
7. Frontend can check `/api/admin/check` to verify auth status

### Example Frontend Code

```javascript
// Step 1: Request OTP
async function requestOTP(email) {
  const response = await fetch('/api/admin/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return await response.json();
}

// Step 2: Verify OTP
async function verifyOTP(email, otpCode) {
  const response = await fetch('/api/admin/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify({
      email,
      otp_code: otpCode
    })
  });
  return await response.json();
}

// Step 3: Check authentication
async function checkAuth() {
  const response = await fetch('/api/admin/check', {
    credentials: 'include'
  });
  return await response.json();
}
```

## Admin Dashboard Management (Root Admin Only)

Root admins have access to additional features in the admin dashboard:

### Admin Users Section

Located at `/admin/users/admins` (or similar), root admins can:

1. **View all admin users**
   - See email, status, last login
   - Identify root vs regular admins

2. **Add new admins**
   - Enter email address
   - New admin receives notification (optional)
   - New admin can immediately request OTP to login

3. **Remove/deactivate admins**
   - Soft delete by deactivating
   - Cannot remove root admin
   - Cannot remove yourself

4. **Toggle admin status**
   - Activate/deactivate admin accounts
   - Deactivated admins cannot login

## Security Best Practices

1. **OTP Validity**: OTPs expire after 10 minutes
2. **One-Time Use**: Each OTP can only be used once
3. **Rate Limiting**: Consider adding rate limiting on OTP requests
4. **Email Security**: Ensure your email service is properly configured
5. **Root Admin Protection**: Root admin cannot be removed or deactivated through the API

## Migration from Old System

If you were using the old password-based system:

1. ✅ Old `ADMIN_PASSWORD` has been removed from `.env`
2. ✅ Password-based header authentication has been removed
3. ✅ All admin routes now require OTP-verified session
4. ⚠️ Update frontend to use new OTP flow
5. ⚠️ Create root admin user in database
6. ⚠️ Test OTP email delivery

## Troubleshooting

### OTP Email Not Received

1. Check ZeptoMail configuration in `.env`
2. Check application logs for email sending errors
3. Verify email address is correct
4. Check spam folder

### Cannot Login

1. Ensure admin user exists in `admin_users` table
2. Verify `is_active` is `true`
3. Check session configuration
4. Verify OTP hasn't expired (10 minute limit)

### Root Admin Access

Only root admins can manage other admin users. To make an existing admin a root admin:

```sql
UPDATE admin_users
SET is_root = TRUE
WHERE email = 'admin@example.com';
```

## Support

For issues or questions:
- Check application logs
- Review email service configuration
- Verify database migrations ran successfully
- Ensure session management is properly configured
