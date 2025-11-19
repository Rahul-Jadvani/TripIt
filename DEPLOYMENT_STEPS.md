# Voting System - Deployment Steps

## Quick Start (2 Minutes) ⚡

Your setup already runs Celery worker + beat automatically with `app.py`!

### Step 1: Run Database Migration

```bash
cd backend
python -c "
from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with open('migrations/add_vote_events.sql', 'r') as f:
        sql = f.read()
    db.session.execute(text(sql))
    db.session.commit()
    print('✓ Migration completed')
"
```

### Step 2: Start Redis

```bash
# If not already running
redis-server

# Or use existing Redis from .env (redis://localhost:6379)
```

### Step 3: Start Backend (includes Celery worker + beat!)

```bash
cd backend
python app.py
```

**That's it for backend!** Your `app.py` already starts:
- ✅ Flask API server
- ✅ Celery worker (background thread)
- ✅ Celery beat scheduler (background thread)

You'll see these logs:
```
[AI SCORING] Celery worker started in background
[AI SCORING] Celery beat scheduler started in background
```

### Step 4: Start Frontend

```bash
cd frontend
npm run dev
```

---

## Verify Installation

### 1. Check Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

### 2. Check Database Migration

```bash
python -c "
from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    from sqlalchemy import text
    result = db.session.execute(text('SELECT COUNT(*) FROM vote_events'))
    print(f'✓ vote_events table exists with {result.scalar()} rows')
"
```

### 3. Test Vote API

```bash
# Get a valid JWT token first by logging in
# Then test voting:

curl -X POST http://localhost:5000/api/votes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "vote_type": "up"
  }'
```

Expected response:
```json
{
  "status": "success",
  "message": "Vote recorded",
  "data": {
    "id": "project-id",
    "upvotes": 1,
    "downvotes": 0,
    "user_vote": "up",
    "voteCount": 1,
    "request_id": "uuid-here",
    "action": "created"
  }
}
```

### 4. Watch Celery Logs

In the Celery Worker terminal, you should see:
```
[VoteTask] Processing request abc-123: created up on project xyz by user def
[VoteTask] ✓ Committed vote record for user def on project xyz
```

In the Celery Beat terminal, you should see (every 30 seconds):
```
[SyncVotes] Syncing 1 changed posts...
[SyncVotes] ✓ Synced project-id: 1 up, 0 down
[SyncVotes] ✓ Completed: synced 1/1 projects in 45.23ms
```

---

## Folder Structure

```
0x.Discovery-ship/
├── backend/
│   ├── migrations/
│   │   ├── add_vote_events.sql          ← NEW (run this)
│   │   └── phase1_denormalized_tables.sql
│   ├── models/
│   │   └── vote.py                      ← EXISTING (unchanged)
│   ├── routes/
│   │   └── votes.py                     ← MODIFIED (rate limiting added)
│   ├── services/
│   │   └── vote_service.py              ← MODIFIED (rate limiting, changed_posts)
│   ├── tasks/
│   │   └── vote_tasks.py                ← MODIFIED (lightweight task + sync task)
│   ├── celery_app.py                    ← MODIFIED (Beat schedule added)
│   └── config.py                        ← EXISTING (unchanged)
├── frontend/
│   └── src/
│       ├── components/
│       │   └── VoteButtons.tsx          ← MODIFIED (debouncing added)
│       └── hooks/
│           └── useVotes.ts              ← EXISTING (unchanged)
├── VOTING_SYSTEM_GUIDE.md               ← NEW (comprehensive guide)
└── DEPLOYMENT_STEPS.md                  ← NEW (this file)
```

---

## Configuration Tweaks

### Adjust Sync Frequency

Edit `backend/celery_app.py` line 43:

```python
'schedule': 30.0,  # Change to 10, 60, etc.
```

### Adjust Rate Limit

Edit `backend/services/vote_service.py` line 38-39:

```python
RATE_LIMIT_WINDOW = 10  # Seconds
RATE_LIMIT_MAX = 5      # Max votes
```

### Adjust Debounce

Edit `frontend/src/components/VoteButtons.tsx` line 34-35:

```typescript
const DEBOUNCE_DELAY = 200;
const MIN_VOTE_INTERVAL = 500;
```

---

## Production Deployment

Since Celery runs inside `app.py`, you only need to manage the Flask app process.

### Option 1: Using Gunicorn (Recommended)

```bash
# Install gunicorn
pip install gunicorn

# Run with multiple workers
gunicorn -w 4 -b 0.0.0.0:5000 app:app --timeout 120
```

### Option 2: Using Supervisor for Auto-Restart

Create `/etc/supervisor/conf.d/oxship-backend.conf`:

```ini
[program:oxship-backend]
command=/path/to/venv/bin/python app.py
directory=/path/to/backend
user=your-user
autostart=true
autorestart=true
stderr_logfile=/var/log/oxship-backend.err.log
stdout_logfile=/var/log/oxship-backend.out.log
environment=FLASK_ENV=production
```

Then:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

**Note:** Celery worker and beat are already running inside `app.py` - no separate processes needed!

---

## Troubleshooting

### Problem: ModuleNotFoundError

**Solution:** Ensure you're in the correct directory and virtual environment:

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Problem: Redis connection refused

**Solution:** Start Redis or update REDIS_URL in `.env`:

```bash
# Check if Redis is running
redis-cli ping

# If not, start it
redis-server

# Or use managed Redis (Upstash, AWS ElastiCache, etc.)
```

### Problem: Celery can't find tasks

**Solution:** Ensure tasks are imported in `celery_app.py`:

```python
include=["tasks.scoring_tasks", "tasks.vote_tasks", "tasks.feed_cache_tasks"]
```

### Problem: Beat not running sync task

**Solution:** Check Beat logs for errors, or manually trigger:

```python
from tasks.vote_tasks import sync_votes_to_db
sync_votes_to_db.delay()
```

---

## Complete System Check

Run this script to verify everything:

```bash
cd backend
python -c "
from app import create_app
from extensions import db
from sqlalchemy import text
import redis

app = create_app()
with app.app_context():
    # Check DB
    try:
        result = db.session.execute(text('SELECT COUNT(*) FROM vote_events'))
        print(f'✓ PostgreSQL: vote_events table OK ({result.scalar()} rows)')
    except Exception as e:
        print(f'✗ PostgreSQL: {e}')

    # Check Redis
    try:
        r = redis.from_url('redis://localhost:6379', decode_responses=True)
        r.ping()
        print('✓ Redis: Connection OK')
    except Exception as e:
        print(f'✗ Redis: {e}')

    # Check tables
    tables = ['votes', 'projects', 'vote_events']
    for table in tables:
        try:
            result = db.session.execute(text(f'SELECT COUNT(*) FROM {table}'))
            print(f'✓ Table {table}: {result.scalar()} rows')
        except Exception as e:
            print(f'✗ Table {table}: {e}')
"
```

Expected output:
```
✓ PostgreSQL: vote_events table OK (0 rows)
✓ Redis: Connection OK
✓ Table votes: X rows
✓ Table projects: X rows
✓ Table vote_events: 0 rows
```

---

## Next Steps

1. **Run migration** (Step 1)
2. **Start all services** (Steps 2-6)
3. **Test voting** on a project in the frontend
4. **Watch Celery logs** to see events processing
5. **Wait 30 seconds** and verify PostgreSQL sync
6. **Read VOTING_SYSTEM_GUIDE.md** for detailed architecture explanation

---

## Support

If you encounter issues:

1. Check all terminals for error messages
2. Verify Redis is running (`redis-cli ping`)
3. Check database connection in `.env`
4. Review Celery logs for task failures
5. Test with the verification scripts above

The system is now ready for high-throughput voting with Redis-first architecture!
