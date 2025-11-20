# Cache Configuration - Updated

## 📊 Complete Cache Times

| Route | Backend Redis | Frontend React Query | Total Cache Time |
|-------|---------------|----------------------|------------------|
| **Feed** (`/api/projects`) | **15 min** | **15 min** | **15 min** |
| **Leaderboard Projects** | **15 min** | **15 min** | **15 min** |
| **Leaderboard Builders** | **15 min** | **15 min** | **15 min** |
| **Project Detail** | **5 min** | **5 min** | **5 min** |
| **User Profile** | **5 min** | **5 min** | **5 min** |
| **User Projects** | **5 min** | **5 min** | **5 min** |

---

## ⏰ Cache Lifecycle Explained

### Example: Feed Page

```
Time: 0:00    → First request: SLOW (~500ms) - Cache MISS
              ↓
              Backend queries PostgreSQL
              Backend stores in Redis (15 min TTL)
              Frontend stores in React Query (15 min stale)
              ↓
Time: 0:05    → Second request: FAST (~50ms) - Cache HIT
              Backend returns from Redis (no DB query)
              Frontend returns from React Query (no API call)
              ↓
Time: 5:00    → Request: STILL FAST (~50ms) - Cache HIT
              Both Redis and React Query still valid
              ↓
Time: 10:00   → Request: STILL FAST (~50ms) - Cache HIT
              Both caches still valid
              ↓
Time: 15:00   → Request: STILL FAST (~50ms) - Cache HIT
              ⚠️ At the edge of expiration
              ↓
Time: 15:01   → Request: SLOW (~500ms) - Cache MISS
              Both caches expired at exactly 15:00
              Fresh data fetched from database
              New cache stored for next 15 minutes
              ↓
Time: 15:05   → Request: FAST (~50ms) - Cache HIT again
              Cycle repeats...
```

---

## 🔄 Cache Invalidation Rules

### When Cache is CLEARED (forces fresh data):

✅ **Feed cache clears when:**
- New project created
- Project updated
- Project deleted
- Project featured/unfeatured

✅ **Project detail cache clears when:**
- That specific project is updated
- Project receives a vote
- Project is deleted

✅ **User profile cache clears when:**
- User updates their profile
- User connects GitHub
- User gets a new badge

✅ **Leaderboard cache clears when:**
- Any project gets voted on (affects rankings)
- New project published (affects rankings)

### When Cache is KEPT (serves stale data):

❌ **Cache does NOT clear when:**
- Someone views a page
- Someone logs in
- Someone navigates between routes
- Time passes (until TTL expires)

---

## 📈 Expected Performance After Updates

### Before Optimization:
- Feed: ~2-3s every time
- Leaderboard: ~2-4s every time
- Project Detail: ~1-2s every time

### After Optimization (First Load):
- Feed: ~300-500ms (fresh data)
- Leaderboard: ~300-500ms (fresh data)
- Project Detail: ~100-200ms (fresh data)

### After Optimization (Cached):
- Feed: **~50-100ms** (⚡ 95% faster!)
- Leaderboard: **~50-100ms** (⚡ 95% faster!)
- Project Detail: **~50-100ms** (⚡ 90% faster!)

### Cache Duration:
- Data stays fresh for **15 minutes**
- No API calls for **15 minutes**
- After 15 min → slow load once → fast again

---

## 🎯 Why These Times?

### 15 Minutes (Feed, Leaderboards):
- ✅ Projects don't get published every minute
- ✅ Rankings change slowly
- ✅ Reduces database load by 90%+
- ✅ Still fresh enough for users
- ❌ Not so long that data feels stale

### 5 Minutes (Project Detail, User Profile):
- ✅ These pages can have votes/comments added
- ✅ Users expect more recent data here
- ✅ Still significantly reduces load
- ❌ Not too short to be ineffective

---

## 🚀 How to Test

### 1. Restart Backend
```bash
# Stop current server (CTRL+C)
cd backend
python app.py
```

### 2. Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or DevTools → Network → Disable cache

### 3. Test Feed
1. Visit http://localhost:5173
2. **First load**: ~300-500ms (cache miss)
3. Refresh: **~50-100ms** (cache hit! ⚡)
4. Wait 15 minutes
5. Refresh: ~300-500ms (cache expired)
6. Refresh again: **~50-100ms** (cached again!)

### 4. Test Leaderboard
1. Visit http://localhost:5173/leaderboard
2. **First load**: ~300-500ms
3. Refresh: **~50-100ms** (cached!)
4. Switch to "Builders" tab: **~50-100ms** (also cached!)
5. Go to Feed and back: **instant** (both cached!)

### 5. Test Route Switching
```
Feed → Leaderboard → Profile → Feed
All should be INSTANT after first load!
```

---

## 🔧 Adjusting Cache Times (If Needed)

### To Make Cache Last LONGER (even faster, less fresh):

**Backend** (`backend/routes/projects.py`, `backend/routes/users.py`):
```python
# Change 900 → 1800 (30 minutes)
CacheService.cache_feed(page, sort, response_data, ttl=1800)
```

**Frontend** (`frontend/src/hooks/useProjects.ts`, `frontend/src/hooks/useLeaderboard.ts`):
```typescript
// Change to 30 minutes
staleTime: 1000 * 60 * 30,
gcTime: 1000 * 60 * 120, // 2 hours
```

### To Make Cache SHORTER (fresher data, more DB hits):

**Backend**:
```python
# Change 900 → 300 (5 minutes)
CacheService.cache_feed(page, sort, response_data, ttl=300)
```

**Frontend**:
```typescript
// Change to 5 minutes
staleTime: 1000 * 60 * 5,
```

---

## 📝 Cache Status Summary

✅ **Database**: 8 indexes added
✅ **Backend**: Redis caching on all routes
✅ **Frontend**: React Query caching optimized
✅ **Connection Pool**: Configured for NeonDB
✅ **Route Switching**: Client-side (no reloads)

**Cache expires every 15 minutes, then refreshes automatically!**
