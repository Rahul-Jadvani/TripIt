# Backend Performance Modes - IN_DEV Toggle

## Overview
The backend now supports two performance modes controlled by the `IN_DEV` environment variable:
- **Development Mode** (`IN_DEV=true`) - Fast startup, slower initial requests
- **Production Mode** (`IN_DEV=false`) - Slower startup, fast requests after startup

This gives you flexibility during development while maintaining production-grade performance in deployed environments.

---

## Development Mode: `IN_DEV=true`

### When to Use
- **Local development** - You want quick feedback loops
- **Frequent restarts** - Running tests, debugging, hot-reloading
- **Rapid iterations** - Building features and testing them

### Behavior
```
✅ Fast Startup (2-5 seconds)
  - Skips the immediate cache warming on startup
  - No 20-60 second initialization wait
  - Server ready to accept requests immediately

⚠️  Slower First Requests (5-20 seconds)
  - First requests for feeds, leaderboards, etc. will be slower
  - Data loads on-demand from database
  - Subsequent requests use cache (background warmer kicks in every 5 minutes)

✅ Background Warmer Still Active
  - Cache still updates in the background every 5 minutes
  - Keeps warm data fresh after initial load
  - No performance cliff after startup
```

### Setup
Add to your `.env` or shell environment:
```bash
IN_DEV=true
```

### Console Output
```
[DEV] IN_DEV=true - Skipping startup cache warming for fast startup
[DEV] Note: First requests will be slower as data loads on demand
[PERFORMANCE] Background cache warmer started - updating every 5 minutes
```

---

## Production Mode: `IN_DEV=false` (Default)

### When to Use
- **Production deployment** - User-facing environment
- **Performance critical** - Every millisecond matters
- **Stable environment** - Infrequent restarts
- **Load testing** - Benchmarking and performance testing

### Behavior
```
⏳ Slow Startup (20-60 seconds)
  - Immediately warms critical caches on startup:
    • Top 60 projects (trending & newest, pages 1-3)
    • Leaderboards
    • Top 20 user profiles
    • Trending chains and their posts
  - All caches ready before server accepts traffic
  - No cold-start delays for users

✅ Fast Requests (< 100ms)
  - All requests instantly served from cache
  - Zero database queries for cached data
  - Millisecond response times
```

### Setup
Add to your `.env` or don't set `IN_DEV` (defaults to false):
```bash
IN_DEV=false
# Or simply omit it entirely
```

### Console Output
```
[PERFORMANCE] Pre-warming critical caches on startup...
[PERFORMANCE] Startup cache warming completed!
[PERFORMANCE] Background cache warmer started - updating every 5 minutes
```

---

## What Gets Cached

### Feed Cache (ON STARTUP or ON DEMAND)
- Trending projects (pages 1-3)
- Newest projects (pages 1-2)
- Proof scores calculated
- Creator data included

### Leaderboard Cache
- Top 50 projects by proof score
- Updated daily or on demand
- Instant access for leaderboard pages

### User Profile Cache
- Top 20 users by karma
- User stats (projects, followers, etc.)
- Avatar, bio, links cached

### Chain Cache
- Top 20 trending chains
- Chain posts (first page)
- Follower/project counts

### Background Updates (Every 5 Minutes)
- All of the above refreshes
- Runs in background thread
- Won't block development

---

## Switching Modes

### From Development to Production
```bash
# Before deployment
IN_DEV=false npm start

# Or in Render deployment settings
Environment: IN_DEV = false
```

### From Production to Development
```bash
# For local testing
IN_DEV=true npm start

# Or in your .env.local
IN_DEV=true
```

---

## Performance Comparison

| Metric | Dev Mode | Production Mode |
|--------|----------|-----------------|
| **Startup Time** | 2-5s | 20-60s |
| **First Request** | 5-20s | < 100ms |
| **Subsequent Requests** | < 100ms | < 100ms |
| **Cold Start Penalty** | Per request | One-time at startup |
| **CPU Usage at Startup** | Low | High |
| **Memory at Startup** | Low | High (caches loaded) |

---

## Other Environment Variables

For fine-grained control, you can also use:

```bash
# Disable specific features
DISABLE_CACHE_WARMER=true      # Skip all cache warming (not recommended)
DISABLE_MV_WORKER=true         # Skip materialized view refresh worker
DISABLE_RECONCILIATION=true    # Skip daily reconciliation scheduler

# Customize behavior
RECONCILIATION_HOUR=3          # Set reconciliation time (0-23, default: 3 = 3AM)
REDIS_URL=redis://...          # Redis connection (required for production)
```

---

## Best Practices

### Development
```bash
# .env.development
IN_DEV=true
DISABLE_MV_WORKER=false        # Keep workers active
DISABLE_RECONCILIATION=true    # Skip during dev (optional)
```

### Production
```bash
# .env.production
IN_DEV=false
DISABLE_MV_WORKER=false
DISABLE_RECONCILIATION=false
REDIS_URL=redis://your-redis:6379
```

### Testing
```bash
# .env.test
IN_DEV=true
DISABLE_CACHE_WARMER=true      # Skip warmup in tests
DISABLE_MV_WORKER=true         # No background jobs in tests
DISABLE_RECONCILIATION=true    # No scheduler in tests
```

---

## Troubleshooting

### Startup is still slow in Dev Mode
- Check if `IN_DEV` is properly set to `true`
- Verify environment variable is being read: add print statements to `app.py`
- Check console output for `[DEV]` messages

### First requests are still slow in Production Mode
- This is expected - data is warming up in cache
- Wait 30-60 seconds after startup for all caches to warm
- Check console for `[PERFORMANCE] Startup cache warming completed!`

### Cache isn't updating
- Verify background warmer is running: look for `[PERFORMANCE] Background cache warmer started`
- Check `DISABLE_CACHE_WARMER` is not set to `true`
- Monitor logs for cache warmer errors

---

## Summary Table

```
┌─────────────────────────────────────┬──────────────┬──────────────────┐
│ Setting                             │ Dev (true)   │ Prod (false)     │
├─────────────────────────────────────┼──────────────┼──────────────────┤
│ Skip startup cache warming          │ ✅ Yes       │ ❌ No            │
│ Fast startup                        │ ✅ 2-5s      │ ⏳ 20-60s         │
│ Fast initial requests               │ ❌ No (5-20s)│ ✅ Yes (< 100ms) │
│ Background cache refresh (5 min)    │ ✅ Yes       │ ✅ Yes           │
│ Use in development                  │ ✅ YES       │ ❌ No            │
│ Use in production                   │ ❌ No        │ ✅ YES           │
└─────────────────────────────────────┴──────────────┴──────────────────┘
```
