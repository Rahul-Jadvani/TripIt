# Denormalization Implementation Guide
## Step-by-Step Deployment Instructions

---

## 📋 Pre-Deployment Checklist

### Prerequisites
- [ ] Postgres 13+ (required for CONCURRENTLY refresh)
- [ ] Redis 6+ (for user-specific caching)
- [ ] Database backup completed
- [ ] Downtime window scheduled (optional, all migrations are non-blocking)
- [ ] Monitoring/alerting configured

### Environment Variables
Add to `.env`:
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Worker Configuration
MV_REFRESH_WORKER_ENABLED=true
RECONCILIATION_JOB_ENABLED=true
```

---

## 🚀 Phase 1: Real-Time Denormalized Tables (Week 1)

### Step 1.1: Run Migration
```bash
cd backend
psql -U postgres -d discovery_platform -f migrations/phase1_denormalized_tables.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE INDEX
...
CREATE TRIGGER
COMMIT
```

**Duration:** ~5 minutes

### Step 1.2: Backfill Existing Data
```bash
psql -U postgres -d discovery_platform -f migrations/phase1_backfill_data.sql
```

**Expected Output:**
```
NOTICE:  Backfilled 1523 rows in user_dashboard_stats
NOTICE:  Backfilled 487 rows in message_conversations_denorm
NOTICE:  Backfilled 1523 rows in intro_request_stats
COMMIT
```

**Duration:** ~10-15 minutes (depends on data volume)

### Step 1.3: Verify Tables
```sql
-- Check row counts
SELECT COUNT(*) FROM user_dashboard_stats;
SELECT COUNT(*) FROM message_conversations_denorm;
SELECT COUNT(*) FROM intro_request_stats;

-- Check triggers
SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_dashboard%' OR tgname LIKE 'trg_conversation%' OR tgname LIKE 'trg_intro%';
-- Expected: 9 triggers
```

### Step 1.4: Test Triggers
```sql
-- Test project creation trigger
INSERT INTO projects (id, user_id, title, description, is_deleted)
VALUES (gen_random_uuid(), (SELECT id FROM users LIMIT 1), 'Test Project', 'Test', FALSE);

-- Verify dashboard stats updated
SELECT project_count, active_projects, last_updated_at
FROM user_dashboard_stats
WHERE user_id = (SELECT user_id FROM projects WHERE title = 'Test Project');

-- Clean up test
DELETE FROM projects WHERE title = 'Test Project';
```

**Status:** ✅ Phase 1 Complete

---

## 📊 Phase 2: Materialized Views with Debouncing (Week 2)

### Step 2.1: Run Migration
```bash
psql -U postgres -d discovery_platform -f migrations/phase2_materialized_views.sql
```

**Expected Output:**
```
CREATE TABLE (mv_refresh_queue)
CREATE MATERIALIZED VIEW (mv_feed_projects)
...
CREATE TRIGGER
COMMIT
```

**Duration:** ~10 minutes

### Step 2.2: Verify Materialized Views
```sql
-- Check all views exist
SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';
-- Expected: mv_feed_projects, mv_leaderboard_projects, mv_leaderboard_builders, mv_chains_discovery, mv_project_details

-- Check row counts
SELECT COUNT(*) FROM mv_feed_projects;
SELECT COUNT(*) FROM mv_leaderboard_projects;
SELECT COUNT(*) FROM mv_leaderboard_builders;
SELECT COUNT(*) FROM mv_chains_discovery;
SELECT COUNT(*) FROM mv_project_details;
```

### Step 2.3: Test Debouncing
```sql
-- Trigger a refresh
UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM projects LIMIT 1);

-- Check queue (should have pending entry)
SELECT * FROM mv_refresh_queue WHERE view_name = 'mv_feed_projects';

-- Process queue (manual test)
SELECT * FROM process_mv_refresh_queue();

-- Check log
SELECT * FROM mv_refresh_log ORDER BY refresh_started_at DESC LIMIT 5;
```

### Step 2.4: Start Background Worker
```bash
# Option 1: Run in foreground (for testing)
cd backend
python workers/mv_refresh_worker.py

# Option 2: Run as daemon
nohup python workers/mv_refresh_worker.py > logs/mv_worker.log 2>&1 &

# Option 3: Use supervisor (recommended for production)
# Create /etc/supervisor/conf.d/mv_worker.conf:
[program:mv_refresh_worker]
command=/path/to/venv/bin/python /path/to/backend/workers/mv_refresh_worker.py
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/mv_worker.log

# Then:
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mv_refresh_worker
```

### Step 2.5: Monitor Worker
```bash
# Check worker logs
tail -f logs/mv_worker.log

# Check queue status
psql -U postgres -d discovery_platform -c "SELECT * FROM mv_refresh_queue ORDER BY refresh_requested_at DESC LIMIT 10;"

# Check refresh performance
psql -U postgres -d discovery_platform -c "SELECT view_name, AVG(duration_ms), COUNT(*) FROM mv_refresh_log WHERE status = 'completed' GROUP BY view_name;"
```

**Status:** ✅ Phase 2 Complete

---

## 🔍 Phase 3: Search Index & Chain Forums (Week 3)

### Step 3.1: Run Migration
```bash
psql -U postgres -d discovery_platform -f migrations/phase3_search_and_forums.sql
```

**Expected Output:**
```
CREATE EXTENSION (pg_trgm)
CREATE MATERIALIZED VIEW (mv_search_index)
CREATE MATERIALIZED VIEW (mv_chain_posts)
CREATE MATERIALIZED VIEW (mv_investors_directory)
CREATE FUNCTION (search_content, search_fuzzy, search_combined)
COMMIT
```

**Duration:** ~10 minutes

### Step 3.2: Verify Search
```sql
-- Test full-text search
SELECT * FROM search_content('blockchain', NULL, 10);

-- Test fuzzy search (with typo)
SELECT * FROM search_fuzzy('blokchain', NULL, 0.3, 10);

-- Test combined search
SELECT * FROM search_combined('web3 project', 'project', 20);

-- Check performance
EXPLAIN ANALYZE SELECT * FROM search_combined('test query', 'project', 20);
-- Should use GIN index scan
```

### Step 3.3: Verify Chain Forums
```sql
-- Check chain posts
SELECT COUNT(*) FROM mv_chain_posts;

-- Test forum query
SELECT id, title, upvote_count, comment_count, trending_score
FROM mv_chain_posts
WHERE chain_id = (SELECT id FROM chains LIMIT 1)
ORDER BY is_pinned DESC, trending_score DESC
LIMIT 10;
```

**Status:** ✅ Phase 3 Complete

---

## ⚡ Phase 4: Critical Indexes (Week 4)

### Step 4.1: Run Migration (Non-Blocking)
```bash
# This uses CREATE INDEX CONCURRENTLY - zero downtime
psql -U postgres -d discovery_platform -f migrations/phase4_critical_indexes.sql
```

**Duration:** ~15-20 minutes (runs concurrently with live traffic)

**Note:** If any index creation fails, the script continues with remaining indexes.

### Step 4.2: Verify Indexes
```sql
-- Count all indexes
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';

-- Check specific table indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'projects'
ORDER BY indexname;

-- Check index sizes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### Step 4.3: Test Index Usage
```sql
-- Test query with index
EXPLAIN ANALYZE
SELECT * FROM projects
WHERE user_id = (SELECT id FROM users LIMIT 1) AND is_deleted = FALSE
ORDER BY created_at DESC
LIMIT 10;

-- Should use: Index Scan using idx_projects_user_deleted
```

**Status:** ✅ Phase 4 Complete

---

## 🎯 Phase 5: Redis Caching & Workers (Week 5)

### Step 5.1: Install Redis
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server

# Or as service
sudo systemctl start redis
sudo systemctl enable redis
```

### Step 5.2: Initialize Redis Cache in app.py
```python
# backend/app.py
from services.redis_cache_service import RedisUserCache

def create_app():
    app = Flask(__name__)

    # ... existing setup ...

    # Initialize Redis cache
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RedisUserCache.initialize(redis_url)

    print(f"[App] Redis cache initialized: {redis_url}")

    return app
```

### Step 5.3: Update Routes to Use Redis Cache

**Example: Upvote Route**
```python
# backend/routes/projects.py
from services.redis_cache_service import RedisUserCache

@projects_bp.route('/<project_id>/upvote', methods=['POST'])
@token_required
def upvote_project(user_id, project_id):
    try:
        # Add upvote to Redis (instant UI update)
        added = RedisUserCache.add_upvote(user_id, project_id, sync_db=True)

        if added:
            return success_response({'upvoted': True}, 'Project upvoted', 200)
        else:
            # Already upvoted, remove it
            RedisUserCache.remove_upvote(user_id, project_id, sync_db=True)
            return success_response({'upvoted': False}, 'Upvote removed', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
```

**Example: Feed Route with User Data**
```python
# backend/routes/projects.py
from services.redis_cache_service import RedisUserCache

@projects_bp.route('', methods=['GET'])
@optional_auth
def get_feed(user_id=None):
    try:
        # Get feed from materialized view
        projects = db.session.query(MVFeedProjects)\
            .order_by(MVFeedProjects.trending_score.desc())\
            .limit(10).all()

        # Convert to dict
        projects_data = [p.to_dict() for p in projects]

        # Fill user-specific data from Redis (if authenticated)
        if user_id:
            project_ids = [p['id'] for p in projects_data]
            upvoted_ids = RedisUserCache.get_user_upvotes(user_id, project_ids)

            for project in projects_data:
                project['user_has_upvoted'] = project['id'] in upvoted_ids

        return success_response(projects_data, 'Feed loaded', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
```

### Step 5.4: Test Redis Cache
```bash
# Start Redis CLI
redis-cli

# Check keys
KEYS user:upvotes:*

# Check specific user's upvotes
SMEMBERS user:upvotes:<user_id>

# Check cache stats
INFO stats
```

### Step 5.5: Setup Nightly Reconciliation Job
```bash
# Add to crontab
crontab -e

# Add this line (runs at 3 AM daily)
0 3 * * * cd /path/to/backend && /path/to/venv/bin/python workers/reconciliation_job.py >> /var/log/reconciliation.log 2>&1
```

### Step 5.6: Test Reconciliation Job
```bash
# Run manually
cd backend
python workers/reconciliation_job.py

# Check output
tail -f /var/log/reconciliation.log
```

**Status:** ✅ Phase 5 Complete

---

## 📈 Performance Testing

### Load Testing Setup
```bash
# Install k6
sudo apt-get install k6

# Create load test script
cat > loadtest.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 5000 },  // Stay at 5000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
};

export default function () {
  // Test feed endpoint
  let res = http.get('http://localhost:5000/api/projects');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
EOF

# Run load test
k6 run loadtest.js
```

### Expected Results
```
✓ status is 200.........................: 100.00%
✓ response time < 200ms................: 98.50%

http_req_duration...................avg=120ms  med=95ms   max=450ms
http_reqs...........................5000/s
```

### Monitor During Load Test
```sql
-- Check active queries
SELECT pid, query, state, wait_event_type, backend_start
FROM pg_stat_activity
WHERE state = 'active' AND pid != pg_backend_pid()
ORDER BY backend_start;

-- Check cache hit rate
SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;
-- Target: > 95%

-- Check slow queries
SELECT calls, mean_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🔒 Monitoring & Alerts

### Database Monitoring
```sql
-- Create monitoring view
CREATE VIEW monitoring_dashboard AS
SELECT
    'Materialized Views' as metric,
    COUNT(*) as value,
    'views' as unit
FROM pg_matviews WHERE schemaname = 'public'

UNION ALL

SELECT
    'Denormalized Tables' as metric,
    COUNT(*) as value,
    'tables' as unit
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('user_dashboard_stats', 'message_conversations_denorm', 'intro_request_stats')

UNION ALL

SELECT
    'Active MV Refreshes' as metric,
    COUNT(*) as value,
    'refreshes' as unit
FROM mv_refresh_queue WHERE status = 'in_progress'

UNION ALL

SELECT
    'Failed Refreshes (24h)' as metric,
    COUNT(*) as value,
    'failures' as unit
FROM mv_refresh_log
WHERE status = 'failed' AND refresh_started_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Query monitoring dashboard
SELECT * FROM monitoring_dashboard;
```

### Redis Monitoring
```bash
# Monitor Redis in real-time
redis-cli --stat

# Check memory usage
redis-cli INFO memory | grep used_memory_human

# Monitor cache hit rate
redis-cli INFO stats | grep keyspace
```

### Application Monitoring
Create health check endpoint:
```python
# backend/routes/health.py
from services.redis_cache_service import RedisUserCache

@health_bp.route('/health', methods=['GET'])
def health_check():
    health = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'checks': {}
    }

    # Check database
    try:
        db.session.execute(text("SELECT 1"))
        health['checks']['database'] = {'status': 'healthy'}
    except Exception as e:
        health['checks']['database'] = {'status': 'unhealthy', 'error': str(e)}
        health['status'] = 'unhealthy'

    # Check Redis
    redis_health = RedisUserCache.health_check()
    health['checks']['redis'] = redis_health

    # Check materialized views
    try:
        result = db.session.execute(text("""
            SELECT COUNT(*) as stale_views
            FROM mv_refresh_queue
            WHERE status = 'pending' AND refresh_requested_at < CURRENT_TIMESTAMP - INTERVAL '1 minute'
        """)).scalar()

        health['checks']['materialized_views'] = {
            'status': 'healthy' if result == 0 else 'degraded',
            'stale_views': result
        }
    except Exception as e:
        health['checks']['materialized_views'] = {'status': 'unhealthy', 'error': str(e)}

    status_code = 200 if health['status'] == 'healthy' else 503
    return jsonify(health), status_code
```

---

## 🐛 Troubleshooting

### Issue: Materialized View Refresh Slow
```sql
-- Check view sizes
SELECT
    schemaname,
    matviewname,
    pg_size_pretty(pg_relation_size(matviewname::regclass)) as size
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY pg_relation_size(matviewname::regclass) DESC;

-- Check for missing indexes
SELECT * FROM pg_matviews WHERE schemaname = 'public';
-- Ensure UNIQUE index exists for CONCURRENTLY refresh
```

**Solution:** Add/rebuild unique indexes on materialized views.

### Issue: Redis Out of Memory
```bash
# Check Redis memory
redis-cli INFO memory

# Set max memory policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Clear cache if needed
redis-cli FLUSHDB
```

### Issue: Worker Not Processing Queue
```bash
# Check worker process
ps aux | grep mv_refresh_worker

# Check worker logs
tail -f logs/mv_worker.log

# Restart worker
sudo supervisorctl restart mv_refresh_worker

# Check queue manually
psql -U postgres -d discovery_platform -c "SELECT * FROM mv_refresh_queue WHERE status = 'pending';"
```

### Issue: Reconciliation Job Finds Discrepancies
```bash
# Run reconciliation in dry-run mode (no auto-fix)
python workers/reconciliation_job.py --no-auto-fix

# Check logs for patterns
grep "FOUND" /var/log/reconciliation.log | sort | uniq -c

# Investigate specific user
psql -U postgres -d discovery_platform -c "
    SELECT * FROM user_dashboard_stats WHERE user_id = '<user_id>';
    SELECT COUNT(*) FROM projects WHERE user_id = '<user_id>';
"
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Database backup completed
- [ ] Redis installed and running
- [ ] All environment variables configured
- [ ] Monitoring/alerting configured

### Phase 1: Denormalized Tables
- [ ] Migration executed successfully
- [ ] Backfill completed
- [ ] Triggers verified
- [ ] Test inserts/updates work

### Phase 2: Materialized Views
- [ ] Views created successfully
- [ ] Debouncing queue functional
- [ ] Background worker running
- [ ] Refresh triggers working

### Phase 3: Search & Forums
- [ ] Search indexes created
- [ ] Full-text search functional
- [ ] Fuzzy search working
- [ ] Chain forums loading fast

### Phase 4: Indexes
- [ ] All indexes created
- [ ] Query plans using indexes
- [ ] No blocking locks

### Phase 5: Redis & Workers
- [ ] Redis cache initialized
- [ ] Routes updated to use cache
- [ ] Reconciliation job scheduled
- [ ] Health checks passing

### Post-Deployment
- [ ] Load testing passed (5000 concurrent users)
- [ ] Response times < 200ms
- [ ] Cache hit rate > 95%
- [ ] No errors in logs
- [ ] Monitoring dashboards configured

---

## 📊 Success Metrics

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Feed Load Time | 800ms | 120ms | ____ |
| Leaderboard Load Time | 1200ms | 80ms | ____ |
| Dashboard Load Time | 600ms | 50ms | ____ |
| Search Response Time | 1500ms | 150ms | ____ |
| Database Cache Hit Rate | 85% | 95%+ | ____ |
| Peak Concurrent Users | N/A | 5000 | ____ |
| MV Refresh Time (avg) | N/A | < 500ms | ____ |

---

## 🎉 Completion

Once all phases are complete and metrics are hit:
1. Update project documentation
2. Train team on new architecture
3. Monitor for 1 week
4. Celebrate 🎉

**Questions or issues?** Check logs, run health checks, or review troubleshooting section.
