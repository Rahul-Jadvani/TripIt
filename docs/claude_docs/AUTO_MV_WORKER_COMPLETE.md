# Auto-Starting MV Worker - COMPLETE

## What Was Changed

The MV (Materialized View) refresh worker now starts **automatically** when you run `python app.py`. No need to run it in a separate terminal anymore!

---

## How It Works

When you start the backend with:
```bash
cd backend
python app.py
```

You'll see this in the startup logs:
```
[PERFORMANCE] Cache warmer started - warming every 5 minutes
[2025-11-07 02:26:26] [INFO] ==============================================================
[2025-11-07 02:26:26] [INFO]      MATERIALIZED VIEW REFRESH WORKER STARTED
[2025-11-07 02:26:26] [INFO] ==============================================================
[2025-11-07 02:26:26] [INFO]   Poll Interval:        2s
[2025-11-07 02:26:26] [INFO]   Max Workers:          3
[2025-11-07 02:26:26] [INFO]   Debounce Window:      5s
[2025-11-07 02:26:26] [INFO] ==============================================================
[PERFORMANCE] MV refresh worker started - processing queue every 2s
```

The worker runs in a background thread (daemon thread) and processes the MV refresh queue automatically.

---

## Files Modified

### 1. `workers/mv_refresh_worker.py`
**Changes**:
- Added `threading` import
- Added `start_background_worker()` class method to start worker in background thread
- Fixed Windows encoding issues (removed Unicode box-drawing characters)
- Changed checkmarks/crosses to `[OK]` and `[FAIL]` for Windows compatibility

**New Method**:
```python
@classmethod
def start_background_worker(cls, app, poll_interval=2, max_workers=3):
    """
    Start MV refresh worker in background thread

    Args:
        app: Flask app instance
        poll_interval: Seconds between queue checks (default: 2)
        max_workers: Max concurrent refreshes (default: 3)

    Returns:
        MVRefreshWorker instance running in background thread
    """
    worker = cls(app, poll_interval=poll_interval, max_workers=max_workers)

    # Start worker in daemon thread (won't block app shutdown)
    thread = threading.Thread(target=worker.run, daemon=True, name='MVRefreshWorker')
    thread.start()

    return worker
```

### 2. `app.py`
**Changes**:
- Added MV worker auto-start in `create_app()` function (lines 105-111)

**Code Added**:
```python
# PERFORMANCE: Start background MV refresh worker
# Skip if disabled (e.g., during testing or when running standalone worker)
if not app.config.get('TESTING') and not os.environ.get('DISABLE_MV_WORKER'):
    from workers.mv_refresh_worker import MVRefreshWorker
    # Start background worker (processes MV refresh queue every 2 seconds)
    MVRefreshWorker.start_background_worker(app, poll_interval=2, max_workers=3)
    print("[PERFORMANCE] MV refresh worker started - processing queue every 2s")
```

---

## Usage

### Development (Default)

Just start your backend normally:
```bash
cd backend
python app.py
```

**That's it!** The MV worker starts automatically in the background.

### Disabling the Worker (Optional)

If you want to run the worker separately (for debugging), set an environment variable:

**Windows PowerShell**:
```powershell
$env:DISABLE_MV_WORKER="1"
python app.py
```

**Windows CMD**:
```cmd
set DISABLE_MV_WORKER=1
python app.py
```

**Linux/Mac**:
```bash
DISABLE_MV_WORKER=1 python app.py
```

Then run the worker manually in another terminal:
```bash
python workers/mv_refresh_worker.py
```

---

## Production Deployment

### Option 1: Single Process (Recommended for Most Cases)
Just run `python app.py` - the worker runs automatically.

**Pros**:
- Simple deployment
- No need to manage multiple processes
- Worker starts/stops with the app

**Cons**:
- Worker runs in same process as Flask app

### Option 2: Separate Worker Process (For High Traffic)

If you have high traffic and want dedicated worker processes:

**1. Disable auto-start on main app**:
```bash
export DISABLE_MV_WORKER=1
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**2. Run dedicated worker(s)**:
```bash
# Terminal 2
python workers/mv_refresh_worker.py

# Optional: Terminal 3 (second worker)
python workers/mv_refresh_worker.py
```

**Use PM2 for process management**:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'gunicorn',
      args: '-w 4 -b 0.0.0.0:5000 app:app',
      cwd: './backend',
      env: {
        DISABLE_MV_WORKER: '1'
      }
    },
    {
      name: 'mv-worker',
      script: 'python',
      args: 'workers/mv_refresh_worker.py',
      cwd: './backend',
      instances: 2  // Run 2 worker processes
    }
  ]
};
```

Start with: `pm2 start ecosystem.config.js`

---

## How Materialized Views Get Refreshed

### Trigger Flow

1. **User Action** (e.g., upvote a project):
   ```python
   project.upvotes += 1
   db.session.commit()
   ```

2. **Database Trigger Fires** (automatic):
   ```sql
   -- Trigger on projects table
   INSERT INTO mv_refresh_queue (view_name, refresh_requested_at)
   VALUES ('mv_feed_projects', NOW())
   ON CONFLICT (view_name) DO UPDATE ...
   ```

3. **MV Worker Detects** (polls every 2 seconds):
   ```
   [2025-11-07 02:26:28] [INFO] Processing queue...
   ```

4. **Debouncing** (waits 5 seconds for more changes):
   ```
   Multiple upvotes within 5s → Single MV refresh
   ```

5. **MV Refresh Executes**:
   ```
   [2025-11-07 02:26:33] [SUCCESS] [OK] Refreshed mv_feed_projects: 30 rows in 245ms
   ```

6. **Next API Request** gets fresh data from updated MV

---

## Monitoring

### Check Worker Status

The worker logs activity every minute:
```
[2025-11-07 02:27:26] [STATS] ==============================================================
[2025-11-07 02:27:26] [STATS]            MV REFRESH WORKER STATISTICS
[2025-11-07 02:27:26] [STATS] ==============================================================
[2025-11-07 02:27:26] [STATS]   Total Refreshes:      15
[2025-11-07 02:27:26] [STATS]   Successful:           15
[2025-11-07 02:27:26] [STATS]   Failed:               0
[2025-11-07 02:27:26] [STATS]   Success Rate:         100.0%
[2025-11-07 02:27:26] [STATS]   Avg Duration:         234ms
[2025-11-07 02:27:26] [STATS]   Uptime:               5.2 minutes
[2025-11-07 02:27:26] [STATS] ==============================================================
```

### Database Monitoring

Check recent refresh history:
```sql
SELECT
    view_name,
    status,
    duration_ms,
    refresh_completed_at
FROM mv_refresh_log
ORDER BY refresh_completed_at DESC
LIMIT 10;
```

Check pending queue:
```sql
SELECT * FROM mv_refresh_queue WHERE status = 'pending';
```

---

## Benefits

| Before | After |
|--------|-------|
| 2 terminals required | 1 terminal |
| Manual worker startup | Automatic |
| Easy to forget worker | Always running |
| Complex deployment | Simple deployment |
| Need process manager | Optional |

---

## FAQ

### Q: What happens if the worker crashes?
**A**: The worker runs in a daemon thread. If it crashes, check the logs. For production, use a process manager (PM2, systemd, NSSM) to auto-restart the entire app.

### Q: Can I run multiple workers?
**A**: Yes! The queue handles concurrent workers. Each worker will process different views from the queue.

### Q: Does the worker slow down the app startup?
**A**: No. The worker starts in a background thread and doesn't block the main Flask app.

### Q: What about gunicorn with multiple workers?
**A**: Each gunicorn worker process will start its own MV refresh worker thread. Set `DISABLE_MV_WORKER=1` and run a dedicated worker process instead.

### Q: How do I know if it's working?
**A**: Check the startup logs for `[PERFORMANCE] MV refresh worker started`. Then trigger an action (upvote) and watch for `[OK] Refreshed mv_...` log messages.

---

## Complete Denormalization System Status

### What's Working ✅

1. **Denormalized Tables**: 3 tables with 29 real-time triggers
2. **Materialized Views**: 8 MVs with debounced refresh
3. **Indexes**: 50+ performance indexes
4. **Redis Cache**: Instant upvote state
5. **Cache Warmer**: Auto-starts with app
6. **MV Worker**: **NOW AUTO-STARTS** with app ← NEW!
7. **Windows Compatibility**: All encoding issues fixed

### How to Use

**Development**:
```bash
cd backend
python app.py
# That's it! Everything runs automatically
```

**Production**:
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
# Worker still runs automatically (or disable and run separately)
```

---

## Summary

You no longer need to run `python workers/mv_refresh_worker.py` in a separate terminal. The worker now:

- ✅ Starts automatically when you run `python app.py`
- ✅ Runs in background (daemon thread)
- ✅ Processes MV refresh queue every 2 seconds
- ✅ Logs activity and statistics
- ✅ Works in both dev and production
- ✅ Can be disabled with environment variable if needed

**One command to rule them all**: `python app.py` 🚀
