# Voting System - Complete Fix Documentation

## Summary of Issues Found and Fixed

The voting system had multiple disconnects between frontend and backend that prevented votes from persisting and being displayed correctly.

---

## Issues Identified

### 1. **Backend Vote Removal Not Returning Project Data**
**Location**: `backend/routes/votes.py` line 74

**Problem**:
When removing a vote (clicking the same vote button twice), the backend returned:
```python
return success_response(None, 'Vote removed', 200)
```

This meant the frontend received a response with no project data, so it couldn't know the updated vote counts.

**Fix Applied**:
```python
return success_response(project.to_dict(include_creator=False, user_id=user_id), 'Vote removed', 200)
```

Now the backend always returns updated project data with correct upvotes/downvotes and user_vote state.

---

### 2. **Frontend Cache Not Being Refetched After Voting**
**Location**: `frontend/src/hooks/useVotes.ts` lines 170-185

**Problem**:
The `onSettled` callback was invalidating the query cache with `refetchType: 'none'`, which meant:
- The cache was marked as "stale"
- But it wasn't refetching the data
- When user refreshed the page, it used stale/outdated cache

**Fix Applied**:
Changed the invalidation to allow default refetch behavior:
```typescript
onSettled: () => {
  queryClient.invalidateQueries({
    queryKey: ['project', projectId]
    // Removed refetchType: 'none' - now allows refetch
  });
```

This ensures fresh data is fetched when needed.

---

### 3. **Frontend Using Wrong Cache TTL Values**
**Location**: `frontend/src/hooks/useProjects.ts`

**Problem**:
- `useProjects`: staleTime was 5 minutes (votes change frequently)
- `useProjectById`: staleTime was 5 minutes (votes change constantly)
- `refetchOnMount` wasn't set for project detail pages

**Fix Applied**:
- Reduced `staleTime` from 5 minutes to **1 minute** for both hooks
- Added `refetchOnMount: 'always'` to ensure fresh data on page load
- This ensures votes are fetched from database immediately when you load the page

---

### 4. **NaN Display in Vote Count**
**Location**: `frontend/src/components/VoteButtons.tsx`

**Problem**:
- Vote count could be undefined/null when props weren't properly initialized
- Mathematical operations on null resulted in NaN

**Fix Applied**:
- Added proper initialization: `const normalizedVoteCount = typeof voteCount === 'number' ? voteCount : 0;`
- Added NaN checks in all arithmetic operations
- Added display-level safeguard: `{isNaN(currentCount) || currentCount === undefined ? 0 : currentCount}`

---

### 5. **Vote Button Visibility Issues**
**Location**: `frontend/src/components/VoteButtons.tsx`

**Problem**:
Using Button component with `ghost` variant made buttons invisible (transparent, no border, no shadow).

**Fix Applied**:
Replaced with native `<button>` elements with explicit styling:
- Always visible background: `bg-secondary` (inactive) or `bg-primary` (active)
- Proper borders and hover effects
- Clear visual feedback

---

## How the Voting System Now Works

### Complete Flow:

```
USER CLICKS VOTE BUTTON
         ↓
VoteButtons component → handleVote()
         ↓
optim update: setCurrentVote + setCurrentCount
         ↓
voteMutation.mutate(voteType)
         ↓
BACKEND: POST /api/votes
  - Find or create Vote record in database
  - Update project.upvotes/downvotes in database
  - Calculate new upvote/downvote counts
  - Return: project.to_dict() with updated counts
         ↓
FRONTEND: onSuccess handler
  - Extract upvotes/downvotes from response
  - Calculate newCount = upvotes - downvotes
  - Update state: setCurrentCount(newCount)
  - Update user vote: setCurrentVote(data.user_vote)
         ↓
onSettled: Invalidate cache → allows refetch
         ↓
useProjectById hook refetches fresh data
         ↓
USER REFRESHES PAGE
         ↓
useProjectById hook (refetchOnMount: 'always')
         ↓
API GET /api/projects/{id}
         ↓
Backend returns latest vote counts from database
         ↓
Frontend displays correct vote count ✓
```

---

## Files Modified

### Backend Changes:
1. **`backend/routes/votes.py`** (line 74)
   - Changed vote removal response to include project data
   - **Before**: `return success_response(None, 'Vote removed', 200)`
   - **After**: `return success_response(project.to_dict(...), 'Vote removed', 200)`

### Frontend Changes:
1. **`frontend/src/hooks/useVotes.ts`** (lines 170-185)
   - Removed `refetchType: 'none'` from invalidation
   - Now allows background refetch after voting

2. **`frontend/src/hooks/useProjects.ts`**
   - Changed staleTime from 5 min to 1 min for both hooks
   - Added `refetchOnMount: 'always'` to useProjectById

3. **`frontend/src/components/VoteButtons.tsx`**
   - Fixed vote button visibility (native buttons vs Button component)
   - Improved NaN handling with type checks
   - Simplified onSuccess handler (backend now always returns data)

---

## Testing the System

### 1. Manual Testing in Browser:
```
1. Open project page
2. Click the upvote button → count should increase
3. Refresh the page → count should still be there (fetched from DB)
4. Click upvote again to remove → count should decrease
5. Refresh again → count should be decreased (fetched from DB)
6. Logout and login → vote state should persist (it's in the database)
```

### 2. Run Automated Test (Backend):
```bash
cd backend
python test_voting_system.py
```

This test will:
- Create/authenticate a test user
- Find a project
- Cast an upvote
- Verify it was saved in the database
- Remove the upvote
- Verify the removal was saved

---

## Database Verification

### Votes Table:
```sql
-- Check votes table structure
SHOW COLUMNS FROM votes;

-- Check votes for a specific user
SELECT * FROM votes WHERE user_id = 'user_id_here';

-- Check votes on a specific project
SELECT * FROM votes WHERE project_id = 'project_id_here';

-- Check upvote/downvote counts
SELECT
  project_id,
  (SELECT COUNT(*) FROM votes WHERE project_id = p.id AND vote_type = 'up') as upvotes,
  (SELECT COUNT(*) FROM votes WHERE project_id = p.id AND vote_type = 'down') as downvotes
FROM projects p
LIMIT 5;
```

---

## API Endpoints Reference

### POST /api/votes
**Create or modify a vote**

Request:
```json
{
  "project_id": "uuid-here",
  "vote_type": "up" | "down"
}
```

Response (Success 200):
```json
{
  "status": "success",
  "message": "Vote recorded" | "Vote removed",
  "data": {
    "id": "project_id",
    "upvotes": 42,
    "downvotes": 3,
    "user_vote": "up" | "down" | null,
    ...
  }
}
```

### GET /api/projects/{id}
**Fetch project with user's vote state**

Response includes:
```json
{
  "status": "success",
  "message": "Project retrieved",
  "data": {
    "id": "project_id",
    "title": "...",
    "upvotes": 42,
    "downvotes": 3,
    "user_vote": "up" | "down" | null,  ← Shows current user's vote
    ...
  }
}
```

### GET /api/votes/user
**Get all votes cast by the user**

Response:
```json
{
  "status": "success",
  "message": "User votes retrieved",
  "data": {
    "votes": [
      {
        "id": "vote_id",
        "project_id": "project_id",
        "vote_type": "up" | "down",
        "created_at": "2024-..."
      },
      ...
    ],
    "pagination": {...}
  }
}
```

---

## Troubleshooting

### Issue: Votes still showing as NaN
**Solution**:
- Clear browser cache: Ctrl+Shift+Delete
- Check DevTools Console for errors
- Verify backend is returning valid numbers in response

### Issue: Votes not persisting on refresh
**Solution**:
- Ensure `refetchOnMount: 'always'` is set in useProjectById
- Check Network tab to verify API call is made on page load
- Verify backend is returning correct user_vote from database

### Issue: Vote count doesn't increase/decrease
**Solution**:
- Check Network tab: Is POST /api/votes being called?
- Check Response: Does it include valid upvotes/downvotes?
- Verify database: Are votes actually being stored in the votes table?

---

## Configuration Summary

| Setting | Old | New | Reason |
|---------|-----|-----|--------|
| useProjects staleTime | 5 min | 1 min | Votes change frequently |
| useProjectById staleTime | 5 min | 1 min | Votes change constantly |
| useProjectById refetchOnMount | not set | 'always' | Ensure fresh data on load |
| votes.py vote removal response | null | project data | Frontend needs updated counts |
| useVotes onSettled refetchType | 'none' | default | Allow background refetch |

---

## Related Documentation

- Backend Vote Model: `backend/models/vote.py`
- Backend Votes Routes: `backend/routes/votes.py`
- Frontend Vote Hook: `frontend/src/hooks/useVotes.ts`
- Frontend Vote Buttons: `frontend/src/components/VoteButtons.tsx`
- Project Hooks: `frontend/src/hooks/useProjects.ts`
