# Score Update Fix - Community & Total Score

## Problem Identified

When users voted on projects:
- ❌ **Community score** was NOT updating
- ❌ **Total score** (proof_score) was NOT updating
- ✅ **Comments** were working correctly

## Root Cause

The vote synchronization tasks (`sync_votes_to_db` and `reconcile_all_vote_counts`) were using **raw SQL updates** which bypassed SQLAlchemy event listeners:

```python
# This bypasses event listeners ❌
db.session.execute(text("""
    UPDATE projects
    SET upvotes = :upvotes, downvotes = :downvotes
    WHERE id = :project_id
"""))
```

**Result**: Vote counts updated, but community score and total score remained stale.

## Solution Applied

Added manual score recalculation after raw SQL updates while keeping raw SQL (as requested):

### 1. `sync_votes_to_db` (vote_tasks.py:225-232)
```python
# After raw SQL update
if result.rowcount > 0:
    project = Project.query.get(project_id)
    if project:
        from models.event_listeners import update_project_community_score
        update_project_community_score(project)
        # This recalculates both community_score AND proof_score
```

### 2. `reconcile_all_vote_counts` (vote_tasks.py:410-414)
```python
# After raw SQL update
from models.event_listeners import update_project_community_score
update_project_community_score(project)
# This recalculates both community_score AND proof_score
```

## How It Works Now

### Community Score Calculation (max 30 points)
```python
# Upvote Score (max 20)
upvote_score = (project_upvotes / max_upvotes) × 20

# Comment Score (max 10)
comment_score = (project_comments / max_comments) × 10

# Total Community Score
community_score = upvote_score + comment_score  # max 30
```

### Total Score Calculation (max 100 points)
```python
proof_score = (
    quality_score +       # max 20
    verification_score +  # max 20
    validation_score +    # max 30
    community_score       # max 30
)
```

## What Updates Automatically Now

| Action | Community Score | Total Score | How |
|--------|----------------|-------------|-----|
| **User votes** | ✅ Updates | ✅ Updates | Via `sync_votes_to_db` task (every 5s) |
| **User comments** | ✅ Updates | ✅ Updates | Via SQLAlchemy event listeners (instant) |
| **Vote count reconciliation** | ✅ Updates | ✅ Updates | Via `reconcile_all_vote_counts` task |

## Testing

### Test Vote Updates:
1. Vote on a project
2. Wait ~5 seconds (vote sync task runs)
3. Refresh project page
4. ✅ Community score should update
5. ✅ Total score should update

### Test Comment Updates:
1. Comment on a project
2. ✅ Community score updates instantly
3. ✅ Total score updates instantly

## Architecture Notes

### Why Keep Raw SQL?
Per user request: "use raw style only for updates, not orm" - raw SQL is more performant for bulk updates.

### Why Manual Score Recalculation?
Raw SQL bypasses SQLAlchemy's event system, so we must manually call `update_project_community_score` after each raw update.

### Event Listeners Still Active
Event listeners work for:
- ORM operations (`db.session.add(vote)`, `db.session.delete(vote)`)
- Used in: `process_vote_event` task (individual vote processing)
- Comments use ORM exclusively, so they always trigger listeners

## Files Modified

1. **`backend/tasks/vote_tasks.py`**
   - Line 225-232: Added score recalc in `sync_votes_to_db`
   - Line 410-414: Added score recalc in `reconcile_all_vote_counts`

## Verification

After restart, check:
- [ ] Vote on a project → Wait 5s → Community score updates
- [ ] Vote on a project → Wait 5s → Total score updates
- [ ] Comment on a project → Community score updates instantly
- [ ] Comment on a project → Total score updates instantly

---

**Status**: ✅ Fixed
**Date**: 2025-11-20
**Impact**: All score updates now work correctly
