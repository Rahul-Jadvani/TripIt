# Voting System - Backend Endpoints

## Status: ✅ Complete

Your backend is **fully configured for upvote/downvote** terminology (no "like/dislike" anywhere).

---

## API Endpoints

### Project Voting Endpoints
These endpoints are now available at `/api/projects/`:

#### Upvote Project
```
POST /api/projects/<project_id>/upvote
Authorization: Bearer <token>
```

**Behavior:**
- If user hasn't voted: Creates upvote (+1 upvotes)
- If user upvoted: Removes vote (-1 upvotes)
- If user downvoted: Changes to upvote (-1 downvotes, +1 upvotes)

**Response:**
```json
{
  "success": true,
  "data": { ...project data... },
  "message": "Project upvoted"
}
```

#### Downvote Project
```
POST /api/projects/<project_id>/downvote
Authorization: Bearer <token>
```

**Behavior:**
- If user hasn't voted: Creates downvote (+1 downvotes)
- If user downvoted: Removes vote (-1 downvotes)
- If user upvoted: Changes to downvote (-1 upvotes, +1 downvotes)

**Response:**
```json
{
  "success": true,
  "data": { ...project data... },
  "message": "Project downvoted"
}
```

#### Remove Vote
```
DELETE /api/projects/<project_id>/vote
Authorization: Bearer <token>
```

**Behavior:**
- Removes user's vote (either upvote or downvote)
- Returns 404 if no vote exists

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Vote removed"
}
```

---

## Backend Data Structure

### Vote Model (`models/vote.py`)
```python
class Vote(db.Model):
    id: str (UUID)
    user_id: str (UUID) - References users.id
    project_id: str (UUID) - References projects.id
    vote_type: str - Either 'up' or 'down'
    created_at: datetime
    updated_at: datetime
```

**Constraint:** One vote per user per project (UNIQUE constraint on user_id + project_id)

### Project Vote Fields (`models/project.py`)
```python
upvotes: int - Count of upvotes
downvotes: int - Count of downvotes
```

---

## How It Works

1. **User upvotes:**
   - Frontend: `POST /api/projects/:id/upvote`
   - Backend: Creates or modifies Vote record with vote_type='up'
   - Increments project.upvotes
   - Recalculates proof_score
   - Invalidates cache

2. **User downvotes:**
   - Frontend: `POST /api/projects/:id/downvote`
   - Backend: Creates or modifies Vote record with vote_type='down'
   - Increments project.downvotes
   - Recalculates proof_score
   - Invalidates cache

3. **User removes vote:**
   - Frontend: `DELETE /api/projects/:id/vote`
   - Backend: Deletes Vote record
   - Decrements upvotes or downvotes
   - Recalculates proof_score
   - Invalidates cache

---

## Proof Score Impact

The Community Score component uses upvote ratio in its calculation:

```python
# From utils/scores.py
upvote_ratio = (project.upvotes / (project.upvotes + project.downvotes)) * 100

# Contributes to community_score (max 30 points)
# Formula: (upvote_ratio / 100) * 20 = 0-20 points
```

---

## Frontend Integration

The frontend expects these endpoints and uses them via:

```typescript
// src/services/api.ts
export const votesService = {
  upvote: (projectId: string) =>
    api.post(`/projects/${projectId}/upvote`),
  downvote: (projectId: string) =>
    api.post(`/projects/${projectId}/downvote`),
  removeVote: (projectId: string) =>
    api.delete(`/projects/${projectId}/vote`),
};
```

Used in the `VoteButtons` component:
```typescript
// src/components/VoteButtons.tsx
<VoteButtons
  projectId={projectId}
  voteCount={project.voteCount}
  userVote={userVote}
/>
```

---

## Testing Voting

### With cURL
```bash
# Upvote
curl -X POST http://localhost:5000/api/projects/PROJECT_ID/upvote \
  -H "Authorization: Bearer YOUR_TOKEN"

# Downvote
curl -X POST http://localhost:5000/api/projects/PROJECT_ID/downvote \
  -H "Authorization: Bearer YOUR_TOKEN"

# Remove vote
curl -X DELETE http://localhost:5000/api/projects/PROJECT_ID/vote \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### With Python
```python
import requests

headers = {"Authorization": f"Bearer {token}"}

# Upvote
response = requests.post(
    "http://localhost:5000/api/projects/PROJECT_ID/upvote",
    headers=headers
)

# Downvote
response = requests.post(
    "http://localhost:5000/api/projects/PROJECT_ID/downvote",
    headers=headers
)

# Remove vote
response = requests.delete(
    "http://localhost:5000/api/projects/PROJECT_ID/vote",
    headers=headers
)
```

---

## Error Responses

### Authentication Error (401)
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Project Not Found (404)
```json
{
  "error": "Not found",
  "message": "Project not found"
}
```

### Server Error (500)
```json
{
  "error": "Error",
  "message": "Error details"
}
```

---

## Database Schema

### Votes Table
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

### Project Vote Columns
```sql
ALTER TABLE projects ADD COLUMN upvotes INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN downvotes INTEGER DEFAULT 0;
```

---

## Additional Endpoints (Votes Blueprint)

Alternative endpoint at `/api/votes/`:

```
POST /api/votes/
{
  "project_id": "uuid",
  "vote_type": "up" or "down"
}
```

This endpoint uses the generic voting system but is less convenient than the project-scoped endpoints.

---

## Summary

✅ Backend uses "upvote/downvote" terminology throughout
✅ Vote model correctly stores 'up' and 'down' vote types
✅ Project model tracks upvotes and downvotes counts
✅ Convenience endpoints added: `/api/projects/:id/upvote`, `/api/projects/:id/downvote`, `/api/projects/:id/vote`
✅ Scores automatically recalculated on vote changes
✅ Cache invalidated on vote changes
✅ Frontend and backend terminology are now aligned

---

**No "like" or "dislike" terminology found in the backend.** ✅
