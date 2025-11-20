# 0x.ship Backend API Routes Reference

Complete reference of all available API endpoints.

**Base URL:** `http://localhost:5000` (development)
**API Base:** `/api`

---

## Health Check

### Check Backend Status
```
GET /health
```
**Public:** Yes
**Response:**
```json
{
  "status": "ok",
  "message": "0x.ship backend is running"
}
```

---

## Authentication (`/api/auth`)

### Register New User
```
POST /api/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!",
  "display_name": "Display Name" // optional
}
```
**Response:** User object + JWT tokens

### Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
**Response:** User object + JWT tokens

### Get Current User
```
GET /api/auth/me
```
**Auth:** Required
**Response:** Current user object

### Refresh Access Token
```
POST /api/auth/refresh
```
**Auth:** Refresh token required
**Response:** New access token

### Logout
```
POST /api/auth/logout
```
**Auth:** Required
**Response:** Success message

---

## Projects (`/api/projects`)

### List All Projects
```
GET /api/projects?sort=trending&page=1&per_page=20
```
**Query Params:**
- `sort`: trending | newest | top-rated (default: trending)
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

**Response:** Paginated list of projects

### Get Single Project
```
GET /api/projects/:id
```
**Response:** Project details with creator info

### Create Project
```
POST /api/projects
```
**Auth:** Required
**Body:**
```json
{
  "title": "Project Title",
  "tagline": "Short description",
  "description": "Long description (min 200 chars for quality points)",
  "demo_url": "https://demo.example.com",
  "github_url": "https://github.com/user/repo",
  "hackathon_name": "ETHGlobal 2024",
  "hackathon_date": "2024-03-15",
  "tech_stack": ["python", "react", "ai"],
  "screenshot_urls": ["ipfs://..."]
}
```
**Response:** Created project with proof score

### Update Project
```
PUT /api/projects/:id
```
**Auth:** Required (owner only)
**Body:** Any project fields to update
**Response:** Updated project

### Delete Project
```
DELETE /api/projects/:id
```
**Auth:** Required (owner only)
**Response:** Success message
**Note:** Soft delete - project marked as deleted

### Feature Project (Admin)
```
POST /api/projects/:id/feature
```
**Auth:** Admin required
**Response:** Featured project

---

## Votes (`/api/votes`)

### Cast or Change Vote
```
POST /api/votes
```
**Auth:** Required
**Body:**
```json
{
  "project_id": "project-uuid",
  "vote_type": "up" // or "down"
}
```
**Note:**
- Voting same type again removes vote
- Changing type switches vote
**Response:** Updated project with new vote counts

### Get User's Votes
```
GET /api/votes/user
```
**Auth:** Required
**Response:** List of user's votes

---

## Comments (`/api/comments`)

### Get Project Comments
```
GET /api/comments?project_id=:id&page=1&per_page=20
```
**Query Params:**
- `project_id`: Required - Project UUID
- `page`, `per_page`: Pagination

**Response:** Paginated list of root comments (replies nested)

### Create Comment
```
POST /api/comments
```
**Auth:** Required
**Body:**
```json
{
  "project_id": "project-uuid",
  "content": "Comment text",
  "parent_id": "parent-comment-uuid" // optional for replies
}
```
**Response:** Created comment

### Update Comment
```
PUT /api/comments/:id
```
**Auth:** Required (author only)
**Body:**
```json
{
  "content": "Updated comment text"
}
```
**Response:** Updated comment

### Delete Comment
```
DELETE /api/comments/:id
```
**Auth:** Required (author only)
**Response:** Success message
**Note:** Soft delete

---

## Validation Badges (`/api/badges`)

### Award Badge (Admin)
```
POST /api/badges/award
```
**Auth:** Admin required
**Body:**
```json
{
  "project_id": "project-uuid",
  "badge_type": "silver", // silver (10pts), gold (15pts), platinum (20pts)
  "rationale": "Why this badge was awarded"
}
```
**Response:** Awarded badge with project score update

### Get Project Badges
```
GET /api/badges/:project_id
```
**Response:** List of badges for project

---

## Intro Requests (`/api/intros`)

### Request Introduction
```
POST /api/intros/request
```
**Auth:** Required
**Body:**
```json
{
  "project_id": "project-uuid",
  "recipient_id": "user-uuid", // usually project creator
  "message": "I'd like to connect...",
  "requester_contact": "email@example.com or @twitter"
}
```
**Response:** Created intro request

### Accept Intro Request
```
PUT /api/intros/:id/accept
```
**Auth:** Required (recipient only)
**Response:** Updated intro with accepted status

### Decline Intro Request
```
PUT /api/intros/:id/decline
```
**Auth:** Required (recipient only)
**Response:** Updated intro with declined status

### Get Received Intros
```
GET /api/intros/received?page=1&per_page=20
```
**Auth:** Required
**Response:** Paginated list of intro requests received

### Get Sent Intros
```
GET /api/intros/sent?page=1&per_page=20
```
**Auth:** Required
**Response:** Paginated list of intro requests sent

---

## Users (`/api/users`)

### Get User Profile
```
GET /api/users/:username
```
**Response:** Public user profile

### Update Own Profile
```
PUT /api/users/profile
```
**Auth:** Required
**Body:**
```json
{
  "display_name": "New Display Name",
  "bio": "Bio text",
  "avatar_url": "https://...",
  "github_username": "githubuser"
}
```
**Response:** Updated user profile

### Get User Statistics
```
GET /api/users/stats
```
**Auth:** Required
**Response:**
```json
{
  "user_id": "...",
  "username": "...",
  "project_count": 5,
  "comment_count": 23,
  "karma": 234,
  "badges_awarded": 12,
  "intros_sent": 3,
  "intros_received": 8
}
```

---

## Blockchain (`/api/blockchain`)

### Verify 0xCert NFT
```
POST /api/blockchain/verify-cert
```
**Auth:** Required
**Body:**
```json
{
  "wallet_address": "0x..."
}
```
**Response:**
```json
{
  "wallet_address": "0x...",
  "has_cert": true,
  "balance": 1,
  "user": {...}
}
```
**Note:** Automatically updates all user's projects with +10 verification score

### Get Cert Info
```
GET /api/blockchain/cert-info/:wallet_address
```
**Response:** Certificate ownership info for wallet

### Check Network Health
```
GET /api/blockchain/health
```
**Response:**
```json
{
  "connected": true,
  "block_number": 12345,
  "network": "Kaia Testnet (Kairos)"
}
```

---

## File Upload (`/api/upload`)

### Upload File to IPFS
```
POST /api/upload
```
**Auth:** Required
**Content-Type:** multipart/form-data
**Body:**
- `file`: File to upload

**Allowed types:** png, jpg, jpeg, gif, webp, svg
**Max size:** 10MB

**Response:**
```json
{
  "filename": "image.png",
  "url": "https://gateway.pinata.cloud/ipfs/...",
  "ipfs_hash": "Qm...",
  "pinata_url": "https://pinata.cloud/...",
  "size": 12345
}
```

### Test Pinata Connection
```
GET /api/upload/test
```
**Auth:** Required
**Response:** Connection status

---

## Authentication

### JWT Token Format
```
Authorization: Bearer <access_token>
```

### Token Expiry
- **Access Token:** 30 days
- **Refresh Token:** 90 days

### Protected Routes
Most routes except GET endpoints require authentication.
Admin routes require `is_admin = true` in user account.

---

## Response Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **409** - Conflict (duplicate resource)
- **413** - Payload Too Large
- **500** - Internal Server Error

---

## Pagination

All list endpoints support pagination:

**Query Params:**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## Error Response Format

```json
{
  "status": "error",
  "error": "Error Type",
  "message": "Detailed error message"
}
```

---

## Rate Limiting

Currently **disabled** for MVP development.
Can be enabled via `RATELIMIT_ENABLED=true` in `.env`

---

## CORS

Configured origins in `.env`:
```
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

---

## Testing

Run comprehensive test suite:
```bash
python test_all_routes.py
```

---

**Last Updated:** October 23, 2025
**API Version:** 1.0 (MVP)
