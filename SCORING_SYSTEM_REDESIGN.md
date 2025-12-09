# Scoring System Redesign - Complete Implementation

## Overview
Redesigned the itinerary scoring system to use formula-based calculations with actual available data and real-time score updates on every engagement metric change.

## Key Changes

### 1. Travel History Score (0-20) - NEW FORMULA
**Previous:** Used `total_trips_count`, `destinations_visited`, `total_km_traveled` (data we don't track)

**New:** Uses actual creator content contributions, normalized against top creators:
```
- Itineraries created:      (user_count / max_count) * 8.0 points
- Snaps posted:             (user_count / max_count) * 6.0 points
- Safety ratings given:     (user_count / max_count) * 4.0 points
- Verified contributions:   (user_count / max_count) * 2.0 points
Total: 0-20 points
```

**Data Sources:**
- Count itineraries from `Itinerary` table filtered by `created_by_traveler_id`
- Count snaps from `Snap` table filtered by `user_id`
- Count safety ratings from `safety_ratings` relationship on `Traveler` model
- Get verified contributions from `Traveler.contributions_verified` field

### 2. Community Score (0-20) - NEW FORMULA WITH UPVOTE RATIO
**Previous:** Only normalized helpful_votes, view_count, comment_count

**New:** Includes upvote ratio as primary engagement metric:
```
- Upvote ratio:     upvotes/(upvotes+downvotes) * 8.0 points
- View count:       (views / max_views) * 6.0 points
- Comment count:    (comments / max_comments) * 4.0 points
- Helpful votes:    (helpful / max_helpful) * 2.0 points
Total: 0-20 points
```

**Upvote Ratio Logic:**
- If `total_votes > 0`: ratio = upvotes/total_votes → score
- If `total_votes == 0`: score = 0.0 (neutral, not penalized)

**Data Sources:**
- `Itinerary.upvotes` and `Itinerary.downvotes` fields (already exist, confirmed)
- `Itinerary.view_count`, `Itinerary.comment_count`, `Itinerary.helpful_votes`

### 3. Identity Score (0-20) - UNCHANGED
No changes made as per requirement. Keeps existing verification-based scoring:
- SBT verified: 10 points
- Women guide certified: 5 points
- Has certifications: 3 points
- Complete profile: 2 points

### 4. Safety Score Component (0-20) - UNCHANGED
Keeps existing formula-based approach:
- Community safety rating (0-5 scale) converted to 0-20 scale
- Bonus for 3+ verified ratings

### 5. Content Quality Score (0-20) - UNCHANGED
Keeps existing subdivision-based scoring:
- Description quality: 0-5 points
- Extended details: 0-7 points
- Photos: 0-5 points
- Route details: 0-3 points

## Score Update Triggers

### When Scores Recalculate
Scores now automatically recalculate (via Celery task) when:

1. **Itinerary Created** ✅
   - File: `backend/routes/itineraries.py:266`
   - Already implemented: `score_itinerary_task.delay(itinerary.id)`

2. **Upvotes/Downvotes Change** ✅
   - File: `backend/tasks/vote_tasks.py:254-255`
   - Triggers on vote sync to database
   - For itineraries: `score_itinerary_task.delay(project_id)`

3. **Comments Added** ✅
   - File: `backend/routes/comments.py:102-110`
   - On comment creation for itineraries
   - Triggers: `score_itinerary_task.delay(content.id)`

4. **Safety Ratings Created/Updated/Deleted** ✅
   - Files:
     - Create: `backend/routes/safety_ratings.py:125`
     - Update: `backend/routes/safety_ratings.py:255`
     - Delete: `backend/routes/safety_ratings.py:301`
   - All trigger: `score_itinerary_task.delay(itinerary_id)`

### View Count Updates
**Decision:** View count updates do NOT trigger scoring (too frequent, costly)
- View count is still used in Community Score via normalization
- Scores update on other engagement events, which is sufficient

## Updated Explanations

### Travel History Explanation
```
"Creator's content contributions and platform activity"

Details:
- Itineraries created: X (normalized: +Y.YY/8.0 pts)
- Snaps posted: X (normalized: +Y.YY/6.0 pts)
- Safety ratings given: X (normalized: +Y.YY/4.0 pts)
- Verified contributions: X (normalized: +Y.YY/2.0 pts)
- Scoring normalized against top creators in the platform
```

### Community Score Explanation
```
"Community engagement: upvote ratio, views, comments, helpful votes"

Details:
- Upvote ratio: X/Y (Z.Z%) → +W.WW/8.0 pts
- View count: X (normalized: +Y.YY/6.0 pts)
- Comments: X (normalized: +Y.YY/4.0 pts)
- Helpful votes: X (normalized: +Y.YY/2.0 pts)
- Engagement normalized against top-performing itineraries
- Max values: X views, Y comments, Z helpful
```

## Files Modified

1. **backend/tasks/scoring_tasks.py**
   - Lines 193-250: Rewrote Travel History Score calculation
   - Lines 252-288: Rewrote Community Score with upvote ratio
   - Lines 391-428: Updated Travel History explanation
   - Lines 430-458: Updated Community Score explanation

2. **backend/tasks/vote_tasks.py**
   - Lines 250-255: Trigger full scoring for itineraries on vote sync

3. **backend/routes/comments.py**
   - Lines 95-114: Add scoring trigger for itineraries on comment creation

4. **backend/routes/safety_ratings.py**
   - Lines 124-126: Trigger scoring on safety rating creation
   - Lines 254-256: Trigger scoring on safety rating update
   - Lines 300-302: Trigger scoring on safety rating deletion

## Testing Recommendations

### 1. Test Travel History Score
```python
# Create test scenario:
# User A: 10 itineraries, 5 snaps, 3 ratings, 2 contributions
# User B: 20 itineraries, 10 snaps, 6 ratings, 4 contributions
# Expected: User B gets higher travel history score
```

### 2. Test Community Score with Upvote Ratio
```python
# Scenario 1: High upvote ratio
# Itinerary A: 100 upvotes, 10 downvotes → 90.9% → 7.27/8.0 pts
# Expected: High upvote score

# Scenario 2: Low upvote ratio
# Itinerary B: 10 upvotes, 20 downvotes → 33.3% → 2.67/8.0 pts
# Expected: Low upvote score

# Scenario 3: No votes yet
# Itinerary C: 0 upvotes, 0 downvotes → 0/0 → 0.00/8.0 pts (neutral)
# Expected: Not penalized, just no score yet
```

### 3. Test Score Update Triggers
```python
# Test upvote trigger:
# 1. Create itinerary → check score
# 2. Upvote itinerary → wait for celery task → check score updated
# Expected: Community score increases

# Test comment trigger:
# 1. Add comment to itinerary → wait for celery task
# Expected: Community score increases (comment count normalized)

# Test safety rating trigger:
# 1. Add safety rating → wait for celery task
# Expected: Safety component and total score update
```

## Performance Considerations

### Celery Task Queue
- All scoring runs asynchronously via Celery
- No blocking on user requests
- Task: `tasks.scoring_tasks.score_itinerary_task`
- Max retries: 3 with exponential backoff

### Database Queries
Travel History score requires:
- 4x subqueries to get max values (itineraries, snaps, safety ratings, contributions)
- 3x count queries for user's data
- Runs once per scoring event (not every request)

Community Score requires:
- 1x query to get max values (helpful_votes, view_count, comment_count)
- Minimal overhead, already normalized

### Cache Invalidation
After scoring completes:
- Invalidates itinerary cache
- Invalidates itinerary feed cache
- Invalidates leaderboard cache

## API Response Changes

### Score Breakdown Response
The `score_explanations` field now includes:

```json
{
  "travel_history_score": {
    "score": 12.5,
    "max": 20.0,
    "percentage": 62.5,
    "summary": "Creator's content contributions and platform activity",
    "details": [
      "Itineraries created: 5 (normalized: +6.25/8.0 pts)",
      "Snaps posted: 10 (normalized: +3.75/6.0 pts)",
      "Safety ratings given: 3 (normalized: +2.00/4.0 pts)",
      "Verified contributions: 1 (normalized: +0.50/2.0 pts)",
      "Scoring normalized against top creators in the platform"
    ]
  },
  "community_score": {
    "score": 15.8,
    "max": 20.0,
    "percentage": 79.0,
    "summary": "Community engagement: upvote ratio, views, comments, helpful votes",
    "details": [
      "Upvote ratio: 95/100 (95.0%) → +7.60/8.0 pts",
      "View count: 1500 (normalized: +4.50/6.0 pts)",
      "Comments: 25 (normalized: +2.50/4.0 pts)",
      "Helpful votes: 40 (normalized: +1.20/2.0 pts)",
      "Engagement normalized against top-performing itineraries",
      "Max values: 2000 views, 50 comments, 100 helpful"
    ]
  }
}
```

## Frontend Integration Notes

### Info Button Tooltips (TODO)
Add info button (ℹ️) next to each score field with tooltip:

**Travel History Score:**
```
"Measures creator's platform activity based on content contributions.
Calculated from: itineraries created, snaps posted, safety ratings
given, and verified contributions. Normalized against top creators."
```

**Community Score:**
```
"Measures community engagement and interaction quality.
Calculated from: upvote ratio (most important), view count,
comment count, and helpful votes. Normalized against top itineraries."
```

## Migration Notes

### No Database Migration Required
- All fields already exist in database
- `upvotes` and `downvotes` confirmed in `Itinerary` model (lines 83-84)
- No new columns needed

### Backward Compatibility
- Old score values remain valid
- Scores recalculate on next trigger event
- No manual migration needed - scores update organically

## Summary of Requirements Met

✅ **DON'T touch Identity Score** - Unchanged
✅ **Use formula-based calculations** - All scores use formulas with subdivisions
✅ **Use normalized values** - `(value/max) * weight` pattern throughout
✅ **Use only available data** - No fake fields like `destinations_visited`, `km_traveled`
✅ **Use upvote ratio approach** - Primary metric in Community Score (8/20 points)
✅ **Score on itinerary creation** - Already implemented
✅ **Update on engagement changes** - Triggers on upvotes, downvotes, comments, ratings
✅ **Add subdivisions that make sense** - All components clearly subdivided with weights
✅ **Crisp explanations** - Each score has summary + detailed breakdown

## Next Steps

1. **Test scoring in development**
   - Create test itineraries with different engagement levels
   - Verify upvote ratio calculations
   - Confirm score updates on engagement changes

2. **Add frontend info tooltips**
   - Add info (ℹ️) button next to each score component
   - Show explanation on hover/click

3. **Monitor Celery task queue**
   - Ensure scoring tasks complete successfully
   - Check for any retry/failure patterns
   - Monitor task execution time

4. **Performance tuning** (if needed)
   - Cache max values for normalization (if queries slow)
   - Batch score updates for high-traffic scenarios
   - Optimize subqueries in Travel History calculation
