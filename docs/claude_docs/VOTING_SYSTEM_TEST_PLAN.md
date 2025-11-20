# Voting System - Complete Test Plan

## Overview
This document outlines comprehensive tests for the voting system after all fixes have been applied.

## Fixes Applied

### Backend Fixes
1. **Vote Injection Data Copy** (projects.py lines 52-98)
   - Creates shallow copy of cached data before modifying
   - Prevents cross-user vote contamination

2. **Individual Project Vote Injection** (projects.py lines 430-454)
   - Adds user_vote to cached individual project responses

3. **Vote Persistence** (votes.py, existing)
   - Database deadlock handling with retry logic
   - Row-level locking to prevent race conditions
   - Cache invalidation on vote changes

### Frontend Fixes
1. **Cache Invalidation with Delay** (useVotes.ts lines 191-198)
   - Invalidates cache after updating with response
   - 100ms delay ensures backend cache is cleared

2. **Debounce Logic** (VoteButtons.tsx)
   - Uses immediate state instead of stale props
   - Prevents skip-request bug on quick clicks

## Test Cases

### Test 1: Basic Upvote
**Steps:**
1. Open project feed
2. Note current vote count (e.g., 0)
3. Click upvote button
4. Verify:
   - Button becomes highlighted immediately
   - Vote count increases by 1
   - Backend response shows user_vote: 'up'
5. Wait 2 seconds - count should STAY increased
6. Refresh page (F5)
7. Verify:
   - Upvote button is still highlighted
   - Vote count is still increased
   - Backend response includes user_vote: 'up'

### Test 2: Vote Removal
**Steps:**
1. Start with voted project (from Test 1)
2. Click upvote button again
3. Verify:
   - Button becomes unhighlighted
   - Vote count decreases by 1
   - Backend response shows user_vote: null
4. Refresh page
5. Verify:
   - Button is unhighlighted
   - Vote count is back to original

### Test 3: Vote Type Change
**Steps:**
1. Start with upvote (from Test 1)
2. Click downvote button
3. Verify:
   - Upvote button unhighlighted, downvote button highlighted
   - Vote count changes by 2 (e.g., from +1 to -1)
   - Backend response shows user_vote: 'down'
4. Wait 2 seconds - count should STAY
5. Refresh page
6. Verify:
   - Downvote button is highlighted
   - Vote count is at new value

### Test 4: Rapid Clicks (Debounce)
**Steps:**
1. Rapidly click upvote 3 times
2. Verify:
   - UI updates immediately each click
   - Only ONE request sent to backend (debounced)
   - Final state matches request

### Test 5: Multiple Users
**Steps:**
1. User A: Upvote project
2. User B: Check same project
   - Should NOT see User A's vote as highlighted
   - Vote count should be correct
3. User B: Upvote same project
   - Should see own vote highlighted
   - Vote count increases from User A's vote
4. User A: Check project again
   - Should see own vote highlighted
   - Should NOT see User B's vote as highlighted
   - Vote count reflects both votes (user_vote field is A's vote)

### Test 6: Cache Persistence
**Steps:**
1. Load feed and vote on project
2. Immediately refresh (F5) without waiting
3. Verify vote is visible
4. Wait 5 minutes
5. Refresh again
6. Verify:
   - Backend uses fresh data (old cache expired)
   - Vote is still visible
   - user_vote field is present

## Expected Console Logs

### Vote Request
```
📤 SENDING VOTE REQUEST: {
  finalVote: 'up',
  currentVote: null,
  projectId: '...'
}
✅ EXECUTING VOTE MUTATION: up
```

### Vote Response
```
✅ VOTE SUCCESS RESPONSE: {
  status: 'success',
  data: {
    id: '...',
    upvotes: 2,
    downvotes: 0,
    user_vote: 'up',
    ...
  }
}
📊 UPDATED COUNTS: { upvotes: 2, downvotes: 0, newCount: 2 }
```

### Backend Vote Injection
```
[VOTE INJECTION] User: xxxxxxxx-xxxx-..., Projects in cache: 20
[VOTE INJECTION] Found 2 votes for user xxxxxxxx-xxxx-...
[VOTE INJECTION] Votes dictionary: {'project-id-1': 'up', 'project-id-2': 'down'}
[VOTE INJECTION] Project 0 (project-id-1): null → up
[API RESPONSE] Returning 20 projects from cache
```

## Success Criteria

✓ All Test Cases 1-6 pass
✓ No votes disappear after a few seconds
✓ Page refresh preserves vote state
✓ Different users see correct votes
✓ Console shows proper debug logs
✓ No database deadlock errors
✓ Cache hit/miss messages show correct behavior

## Troubleshooting

### If votes disappear after a few seconds:
- Check browser console for errors
- Verify backend invalidation is working (check logs for CacheService.invalidate_project_feed)
- Check if refetch is hitting stale backend cache despite invalidation
- Possible: Increase setTimeout delay in useVotes.ts onSettled from 100ms to 200ms

### If user_vote is null after refresh:
- Check backend response includes user_vote field
- Verify vote injection in projects.py is running
- Check database has vote record (SELECT * FROM votes WHERE user_id=... AND project_id=...)

### If votes show wrong user:
- Check data copy is being used in list_projects endpoint
- Verify response_data is shallow copy of cached, and projects are deep copies
- Check vote injection applies to copy, not original cache

### If same user sees multiple votes:
- Check unique constraint on votes table: UNIQUE(user_id, project_id)
- Verify vote removal logic properly deletes vote record
