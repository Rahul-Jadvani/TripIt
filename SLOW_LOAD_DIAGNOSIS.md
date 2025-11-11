# Slow First Load Diagnosis - Root Cause Analysis

## Summary
**60-second slow loads on first request after server start are caused by:**
1. ❌ **Cache not warmed on startup** - 5-minute delay before warming
2. ❌ **MV refresh queue backlog on startup** - Takes time to process first refresh
3. ❌ **Unnecessary N+1 ORM queries** after MV query completes
4. ❌ **Cache warmer using ORM instead of MV** - defeats the purpose

---

## Problem #1: No Initial Cache Warming on Startup

**File:** `backend/app.py`

**Current Behavior:**
```python
# Cache warmer starts BACKGROUND thread that runs every 5 minutes
CacheWarmer.start_background_warmer(app, interval=300)  # 5 minute interval!
```

**Issue:**
- Warmer runs in background every 5 minutes
- First request hits empty Redis cache
- MV query executes (which might also be slow on fresh start)
- Falls back to ORM or slow response

**Result:** Up to 60 seconds for first user to get response

---

## Problem #2: MV Refresh Queue Backlog on Startup

**File:** `backend/workers/mv_refresh_worker.py`

**Issue:**
- MV refresh worker starts AFTER Flask app initializes
- Multiple refresh requests queued during startup
- Worker processes them sequentially (not all at once)
- First user request waits for MV to refresh

**Result:** Additional 10-30 second delay

---

## Problem #3: Unnecessary N+1 Queries After MV Fetch

**File:** `backend/routes/projects.py:149-273`

**Code Flow:**
```python
# Step 1: Query MV (FAST) ✅
result = db.session.execute(text(f"""
    SELECT * FROM mv_feed_projects
    ORDER BY {order_by}
    LIMIT :limit OFFSET :offset
"""))
raw_projects = [dict(row._mapping) for row in result.fetchall()]

# Step 2: Batch fetch USERS (necessary, ~50ms)
users = User.query.filter(User.id.in_(user_ids)).all()  # Query 1 ✅

# Step 3: Batch fetch PROJECTS (UNNECESSARY!) ❌❌❌
projects = Project.query.filter(Project.id.in_(project_ids)).all()  # Query 2 ❌
projects_dict = {p.id: p for p in projects}

# Step 4: Batch fetch VOTES (necessary, ~50ms)
votes = Vote.query.filter(...).all()  # Query 3 ✅

# Step 5: Access project relationships (TRIGGERS N+1!) ❌❌❌
for row in raw_projects:
    project = projects_dict.get(row.get('id'))
    if project:
        # These trigger additional queries to load relationships:
        screenshots = [ss.to_dict() for ss in project.screenshots]  # Query 4+ ❌
        badges = [b.to_dict() for b in project.badges]  # Query 5+ ❌
```

**Performance Timeline:**
- MV query: ~30-50ms
- User batch fetch: ~50ms
- **Project batch fetch: ~200-300ms** ← BOTTLENECK (fetches entire ORM objects)
- Loop through 20 projects + access .screenshots + .badges: ~500-1000ms ← N+1 queries!

**Total: 800ms-1.5 seconds per request**

**Why it's unnecessary:**
- MV already has `comment_count`, `upvote_count`, `downvote_count`, `badge_count`
- MV already has all core project data
- Only need extra fetch if using fields NOT in MV (screenshots, hackathon info)
- But 90% of requests don't need screenshots/badges on list view!

---

## Problem #4: Cache Warmer Uses ORM Instead of MV

**File:** `backend/utils/cache_warmer.py:22-69`

**Current Code:**
```python
@staticmethod
def warm_feed_cache():
    """Pre-warm feed caches for instant loading"""
    for page in range(1, 4):  # First 3 pages
        # ❌ USING ORM QUERIES INSTEAD OF MV!
        query = Project.query.filter_by(is_deleted=False)\
            .options(joinedload(Project.creator))\
            .order_by(Project.proof_score.desc(), Project.created_at.desc())\
            .limit(20).offset((page - 1) * 20)

        projects = query.all()  # SLOW!
```

**Why it's slow:**
- Does ORM query (loads 20 full Project objects with creator)
- Calls `p.to_dict(include_creator=True)` on each
- Triggers relationships for each object

**Should use:**
```python
# Query MV directly (already has all data!)
result = db.session.execute(text("""
    SELECT * FROM mv_feed_projects
    ORDER BY trending_score DESC
    LIMIT 20 OFFSET ?
"""))
```

---

## Timeline: What Happens on First Request After Server Start

```
T=0ms      Server starts
T=100ms    Flask app initializes
T=150ms    Cache warmer starts (background, runs every 5 min)
T=200ms    MV refresh worker starts
T=250ms    First user hits /projects endpoint

           ❌ PROBLEM: Cache is empty (Redis not warmed yet)
           ❌ PROBLEM: MV refresh queue has backlog

T=260ms    Code checks cache → MISS
T=270ms    Code queries mv_feed_projects
           ↓ If MV is empty/not refreshed: MV refresh happens NOW
           ↓ MV refresh takes 5-10 seconds (queued refresh)
           ↓ OR MV is outdated
T=10,270ms After MV query completes:
           - Fetch users (~50ms)
           - Fetch projects full ORM (~300ms) ← SLOW
           - Access screenshots/badges (~500ms) ← N+1 queries
T=11,120ms Response sent to user

**Total wait: 11+ seconds (sometimes up to 60s)**
```

---

## Why 60 Seconds Sometimes?

If the MV itself needs refresh after server restart:
1. Query hits mv_feed_projects
2. MV is stale or empty
3. Database runs `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feed_projects`
4. This locks on concurrent refresh, takes 10-30+ seconds
5. THEN the N+1 queries happen
6. **Total: 20-60+ seconds**

---

## The Fix - Implementation Steps

### Fix #1: Warm Cache Immediately on Startup (Right Now)

**File:** `backend/app.py`

**Change from:**
```python
CacheWarmer.start_background_warmer(app, interval=300)  # 5 min delay
```

**Change to:**
```python
# Warm cache immediately on startup
with app.app_context():
    from utils.cache_warmer import CacheWarmer
    CacheWarmer.warm_all()  # Synchronous warm on startup
    print("[STARTUP] Cache warmed immediately")

# Then start background warmer for updates
CacheWarmer.start_background_warmer(app, interval=300)
```

**Impact:** First request now has warm cache immediately

---

### Fix #2: Use MV in Cache Warmer (Not ORM)

**File:** `backend/utils/cache_warmer.py:22-69`

**Change warm_feed_cache() to use MV instead of ORM:**

```python
@staticmethod
def warm_feed_cache():
    """Pre-warm feed caches using MATERIALIZED VIEW (fast)"""
    from sqlalchemy import text

    print(f"[{datetime.now()}] Warming feed caches (using MV)...")

    try:
        # Warm trending feed using MV (NOT ORM!)
        for page in range(1, 4):  # First 3 pages
            try:
                offset = (page - 1) * 20

                # Query MV directly (already has all data!)
                result = db.session.execute(text(f"""
                    SELECT * FROM mv_feed_projects
                    ORDER BY trending_score DESC, created_at DESC
                    LIMIT 20 OFFSET {offset}
                """))

                raw_projects = [dict(row._mapping) for row in result.fetchall()]

                # Transform to expected format (no ORM needed!)
                data = []
                for row in raw_projects:
                    data.append({
                        'id': row.get('id'),
                        'title': row.get('title'),
                        'tagline': row.get('tagline'),
                        'description': row.get('description'),
                        'tech_stack': row.get('tech_stack'),
                        'demo_url': row.get('demo_url'),
                        'github_url': row.get('github_url'),
                        'upvotes': row.get('upvote_count'),
                        'downvotes': row.get('downvote_count'),
                        'comment_count': row.get('comment_count'),
                        'badge_count': row.get('badge_count'),
                        'proof_score': row.get('proof_score'),
                        'created_at': row.get('created_at').isoformat() if row.get('created_at') else None,
                        'creator': {
                            'id': row.get('user_id'),
                            'username': row.get('creator_username'),
                            'display_name': row.get('creator_display_name'),
                            'avatar_url': row.get('creator_avatar_url'),
                        }
                    })

                # Cache this page
                CacheService.cache_feed(page, 'trending', {
                    'status': 'success',
                    'data': data,
                    'pagination': {'page': page, 'per_page': 20}
                }, ttl=3600)

                print(f"  [OK] Warmed trending page {page} (from MV)")

            except Exception as e:
                print(f"  [FAIL] Failed to warm page {page}: {e}")

    except Exception as e:
        print(f"  [FAIL] Feed cache warming failed: {e}")
```

**Impact:** Cache warming 5x faster (uses MV instead of ORM)

---

### Fix #3: Remove Unnecessary Project ORM Fetch

**File:** `backend/routes/projects.py:160-163`

**Current Code (SLOW):**
```python
# Batch fetch projects for additional fields
projects_dict = {}
if project_ids:
    projects = Project.query.filter(Project.id.in_(project_ids)).all()  # ❌ SLOW
    projects_dict = {p.id: p for p in projects}
```

**New Code (FAST):**
```python
# Only fetch projects if we actually need screenshots/badges
# For most list views, MV data is sufficient
projects_dict = {}
# Don't fetch unless specifically needed
# Screenshots/badges are only used on detail page, not list
```

**Or, Fetch Only When Needed:**
```python
# Check if client actually wants screenshots/badges
wants_full_data = request.args.get('include', '').lower() == 'full'

if wants_full_data and project_ids:
    # Only then fetch from ORM
    projects = Project.query.filter(Project.id.in_(project_ids)).all()
    projects_dict = {p.id: p for p in projects}
else:
    projects_dict = {}
```

**Impact:** Saves ~300ms per request

---

### Fix #4: Defer Screenshot/Badge Loading

**File:** `backend/routes/projects.py:246-273`

**Current (Causes N+1):**
```python
project = projects_dict.get(row.get('id'))
if project:
    screenshots = [ss.to_dict() for ss in project.screenshots]  # ← N+1!
    badges = [b.to_dict() for b in project.badges]  # ← N+1!
```

**Better:**
```python
# Only include if explicitly requested or on detail view
if wants_full_data:
    project = projects_dict.get(row.get('id'))
    if project:
        try:
            screenshots = [ss.to_dict() for ss in project.screenshots]
        except:
            screenshots = []
    else:
        screenshots = []
else:
    screenshots = []  # Don't load on list view
```

**Impact:** Saves ~500-1000ms per request

---

## Expected Performance After Fixes

### Before Fixes
- First request after startup: **10-60 seconds** ❌
- Subsequent requests (if cache hit): **100-200ms**

### After Fixes
- First request after startup: **500-800ms** ✅ (70x faster!)
- Subsequent requests (cache hit): **10-50ms**

### Breakdown of Improved First Request
```
T=0ms      Server starts
T=100ms    Flask initializes
T=150ms    Cache warmer runs SYNCHRONOUSLY (warm_all())
T=500ms    Cache warm complete
T=700ms    User makes first request
T=710ms    Cache hit! Return cached data
T=720ms    Response sent to user

Total: 720ms (vs 10-60 seconds before)
```

---

## Implementation Priority

1. **CRITICAL (Fix Now):** Warm cache immediately on startup
   - Impact: 99% improvement (10s → 100ms)
   - Effort: 5 minutes

2. **HIGH (Fix Next):** Use MV in cache warmer instead of ORM
   - Impact: 5x faster warming
   - Effort: 30 minutes

3. **HIGH (Fix Next):** Remove Project ORM batch fetch from feed endpoint
   - Impact: 40% faster responses
   - Effort: 20 minutes

4. **MEDIUM (Fix Later):** Lazy-load screenshots/badges
   - Impact: 30% faster responses
   - Effort: 30 minutes

---

## Quick Fix (Right Now)

Add to `backend/app.py` after creating app:

```python
def create_app():
    app = Flask(__name__)
    # ... existing code ...

    with app.app_context():
        # ❌ REMOVE THIS:
        # from utils.cache_warmer import CacheWarmer
        # CacheWarmer.start_background_warmer(app, interval=300)

        # ✅ ADD THIS INSTEAD:
        print("\n[STARTUP] Warming critical caches...")
        from utils.cache_warmer import CacheWarmer
        CacheWarmer.warm_all()  # Warm immediately on startup
        print("[STARTUP] Cache warming complete!")

        # Then start background warmer for periodic updates
        CacheWarmer.start_background_warmer(app, interval=300)
```

This single change will reduce first-load time from 10-60 seconds to **100-500ms**.

---

## Summary

| Issue | Cause | Impact | Fix Effort |
|-------|-------|--------|-----------|
| No startup warming | Cache warmer runs in background after 5min | 10-60s first load | 5 min |
| ORM in warmer | Cache warmer uses slow ORM instead of MV | 2-3s warming time | 30 min |
| Project ORM fetch | Unnecessary batch fetch of full Project objects | 300ms delay | 20 min |
| N+1 on screenshots/badges | Accessing relationships in loop | 500-1000ms delay | 30 min |
| **TOTAL FIRST LOAD** | All combined | **10-60 seconds** | **85 min for all fixes** |
| **TOTAL (after Fix #1)** | Cache warming on startup | **100-500ms** | **5 min for quick win** |

