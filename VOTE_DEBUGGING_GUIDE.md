# Vote System Debugging Guide

## The Problem We Fixed

The vote removal wasn't working because the frontend was NOT sending an API request when removing a vote.

**Root Cause**: In `VoteButtons.tsx` line 60, when removing a vote:
```typescript
pendingVoteRef.current = null; // BUG: This prevented API call!
```

Then in the debounce handler (line 101), the condition:
```typescript
if (shouldSendRequest && requestVoteType !== null) {
```

This meant the API call was NEVER MADE when removing votes.

## The Fix

Changed line 60 to:
```typescript
pendingVoteRef.current = voteType; // FIX: Still send request to remove
```

Now the API call IS made for both adding and removing votes.

---

## How to Test (Step-by-Step)

### Step 1: Open Browser DevTools
1. Open your project page in browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Go to **Network** tab in a separate area

### Step 2: Click the Upvote Button (First Time)
Expected console output:
```
🗳️ VOTE CLICK: {
  voteType: "up"
  wasVoted: false
  currentVote: null
  projectId: "xxx-xxx-xxx"
}
```

After 500ms debounce:
```
📤 SENDING VOTE REQUEST: {
  finalVote: "up"
  requestVoteType: "up"
  shouldSendRequest: true
  userVote: null
  projectId: "xxx-xxx-xxx"
}

✅ EXECUTING VOTE MUTATION: up

🌐 API CALL: POST /votes {projectId: "xxx...", voteType: "up"}
```

Then SUCCESS:
```
📡 API RESPONSE /votes: {
  status: "success"
  message: "Vote recorded"
  data: {
    id: "xxx"
    upvotes: 42
    downvotes: 3
    user_vote: "up"
    ...
  }
}

✅ VOTE SUCCESS RESPONSE: {...}

📊 UPDATED COUNTS: {
  upvotes: 42
  downvotes: 3
  newCount: 39
}
```

**Expected UI Change**: Vote count increases by 1 ✓

### Step 3: Click the Same Button Again (Remove Vote)
Expected console output:
```
🗳️ VOTE CLICK: {
  voteType: "up"
  wasVoted: true  ← IMPORTANT: User already voted
  currentVote: "up"
  projectId: "xxx-xxx-xxx"
}
```

After 500ms debounce:
```
📤 SENDING VOTE REQUEST: {
  finalVote: "up"  ← SHOULD BE "up" (not null with the fix)
  requestVoteType: "up"
  shouldSendRequest: true
  userVote: "up"
  projectId: "xxx-xxx-xxx"
}

✅ EXECUTING VOTE MUTATION: up

🌐 API CALL: POST /votes {projectId: "xxx...", voteType: "up"}
```

Then SUCCESS:
```
📡 API RESPONSE /votes: {
  status: "success"
  message: "Vote removed"  ← Vote was removed
  data: {
    id: "xxx"
    upvotes: 41
    downvotes: 3
    user_vote: null  ← Vote cleared
    ...
  }
}
```

**Expected UI Change**: Vote count decreases by 1, button no longer highlighted ✓

### Step 4: Refresh the Page (F5)

Expected behavior:
- Vote count should remain the same
- Button should match the persisted vote state

**In Console**, when page loads:
```
[API] GET /projects/xxx-xxx-xxx  ← Fetches fresh project data
📡 API RESPONSE: {
  ...
  upvotes: 41
  downvotes: 3
  user_vote: null  ← Backend confirms no vote
}
```

---

## Checking Network Tab

In the **Network** tab, you should see:

### When Upvoting:
```
POST /api/votes
Status: 200
Request Payload:
{
  "project_id": "xxx-xxx-xxx",
  "vote_type": "up"
}
Response:
{
  "status": "success",
  "message": "Vote recorded",
  "data": {
    "upvotes": 42,
    "downvotes": 3,
    "user_vote": "up",
    ...
  }
}
```

### When Removing Vote:
```
POST /api/votes
Status: 200
Request Payload:
{
  "project_id": "xxx-xxx-xxx",
  "vote_type": "up"  ← Same vote type sent again to toggle
}
Response:
{
  "status": "success",
  "message": "Vote removed",
  "data": {
    "upvotes": 41,
    "downvotes": 3,
    "user_vote": null,  ← User vote cleared
    ...
  }
}
```

---

## Troubleshooting

### Issue: No console logs appearing
**Solution**:
- Clear browser cache (Ctrl+Shift+Delete)
- Hard reload (Ctrl+Shift+R)
- Make sure you're in the right DevTools window

### Issue: ❌ VOTE ERROR in console
**Check the error details**:
```
❌ VOTE ERROR: {
  status: 401,  ← Probably not authenticated
  message: "Unauthorized"
}
```

**Solution**:
- Check you're logged in
- Check token is valid: `localStorage.getItem('token')` in console
- If token is missing, login again

### Issue: Vote button doesn't update even though API succeeded
**Check console for**:
```
⚠️ No valid data in response: null
```

**This means backend didn't return project data**. Check backend response includes `data` field.

### Issue: Vote count shows NaN
**Check console for**:
```
📊 UPDATED COUNTS: {
  upvotes: undefined
  downvotes: undefined
  newCount: NaN
}
```

**Solution**: Backend response is missing upvotes/downvotes fields. Verify backend is returning project.to_dict().

---

## Testing Without Browser (Quick Check)

If you want to test just the API endpoint:

```bash
# Get a project
curl http://localhost:5000/api/projects | jq '.data[0] | {id, title, upvotes, downvotes, user_vote}'

# Extract the ID and use it below
PROJECT_ID="xxx-xxx-xxx"
TOKEN="your-bearer-token"

# Cast an upvote
curl -X POST http://localhost:5000/api/votes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"'$PROJECT_ID'", "vote_type":"up"}'

# Should return project data with updated upvotes
# upvotes should increase by 1

# Remove the vote (send same vote_type again)
curl -X POST http://localhost:5000/api/votes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"'$PROJECT_ID'", "vote_type":"up"}'

# Should return project data with upvotes decreased by 1
# user_vote should be null

# Verify persistence
curl http://localhost:5000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {upvotes, downvotes, user_vote}'

# Should show upvotes decreased and user_vote = null
```

---

## Complete Debug Flow Checklist

- [ ] Browser console shows `🗳️ VOTE CLICK` logs
- [ ] Browser console shows `📤 SENDING VOTE REQUEST` logs
- [ ] Browser console shows `✅ EXECUTING VOTE MUTATION` logs
- [ ] Browser console shows `🌐 API CALL: POST /votes` logs
- [ ] Browser console shows `📡 API RESPONSE /votes` logs
- [ ] No `❌ VOTE ERROR` logs (except maybe first time)
- [ ] Network tab shows `POST /api/votes` request with status 200
- [ ] Network response includes `"data"` with `upvotes`/`downvotes`
- [ ] Vote button highlights when vote is active
- [ ] Vote count updates immediately (optimistic)
- [ ] Vote count matches backend response after API returns
- [ ] Refresh page - vote count persists (from database)
- [ ] Click same button - vote is removed and API request is made
- [ ] Refresh page - vote removal persists (from database)

---

## Key Files Modified

1. **`frontend/src/components/VoteButtons.tsx`**
   - Line 61: Fixed vote removal (changed from `null` to `voteType`)
   - Added comprehensive console logging

2. **`frontend/src/services/api.ts`**
   - Added API call logging with detailed request/response info

3. **`backend/routes/votes.py`**
   - Line 74: Fixed vote removal to return project data

---

## If Everything Checks Out But Still Not Working

1. **Check Backend Routes Are Registered**:
   ```bash
   # In backend app.py, verify:
   from routes.votes import votes_bp
   app.register_blueprint(votes_bp, url_prefix='/api/votes')
   ```

2. **Check Database Tables Exist**:
   - The `votes` table should exist
   - Should have columns: `id`, `user_id`, `project_id`, `vote_type`

3. **Check API Base URL**:
   - Browser Network tab should show `POST http://localhost:5000/api/votes`
   - Not `http://localhost:3000/api/votes` (wrong port)

4. **Verify Authentication**:
   - Every vote request needs `Authorization: Bearer {token}` header
   - Token must be valid and not expired

---

## Expected Complete Flow

```
USER CLICK
    ↓
handleVote() → console logs
    ↓
Optimistic UI update (instant)
    ↓
500ms debounce timer
    ↓
voteMutation.mutate() → console logs
    ↓
API POST /votes → Network tab shows request
    ↓
Backend processes vote → updates database
    ↓
Backend returns updated project data
    ↓
onSuccess callback → console logs with updated counts
    ↓
setCurrentCount() with new value
    ↓
UI re-renders with new count
    ↓
USER REFRESHES PAGE
    ↓
useProjectById hook with refetchOnMount: 'always'
    ↓
API GET /projects/{id}
    ↓
Backend fetches fresh project data from database
    ↓
Returns upvotes/downvotes/user_vote from DB
    ↓
UI shows persisted vote count ✓
```

That's it! Follow this guide to debug the voting system.
