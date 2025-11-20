# ZER0 AI SCORING SYSTEM V2.0 - COMPLETE IMPLEMENTATION PLAN

**Document Version:** 1.0
**Date:** 2025-01-17
**Status:** Ready for Implementation
**Estimated Timeline:** 5-7 days

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Current System Analysis](#current-system-analysis)
3. [New Scoring Framework](#new-scoring-framework)
4. [Decision Log](#decision-log)
5. [Database Changes](#database-changes)
6. [File Structure](#file-structure)
7. [Implementation Steps](#implementation-steps)
8. [API Endpoints](#api-endpoints)
9. [Scoring Workflow](#scoring-workflow)
10. [Error Handling & Retry Logic](#error-handling--retry-logic)
11. [Configuration](#configuration)
12. [Testing Strategy](#testing-strategy)
13. [Deployment Guide](#deployment-guide)
14. [Security Considerations](#security-considerations)
15. [Monitoring & Observability](#monitoring--observability)
16. [UI Changes](#ui-changes)

---

## 📖 PROJECT OVERVIEW

### **Platform:** Zer0 (0x.ship)
**Purpose:** Discovery platform for early-stage projects that can become startups after hackathons

### **Current Scoring System:**
- **Max Score:** 100 points
- **Components:**
  - Verification Score (20): Email verified, 0xCert NFT, GitHub connected
  - Community Score (30): Upvote ratio + comment engagement
  - Validation Score (30): Manual validator badges (stone/silver/gold/platinum)
  - Quality Score (20): Demo URL, GitHub URL, screenshots, description length

### **Problem:**
- Manual validation bottleneck
- No automated quality checks
- No AI-powered analysis
- Simple binary checks insufficient for real quality assessment

### **Solution:**
Complete AI-powered scoring system replacement with:
- GitHub API deep analysis
- OpenAI GPT-4o-mini LLM analysis
- Async Celery-based processing
- Automatic retry mechanism
- Admin-configurable weights
- Rate limiting

---

## 🔍 CURRENT SYSTEM ANALYSIS

### **Technology Stack:**
- **Backend:** Flask + SQLAlchemy + PostgreSQL (NeonDB)
- **Cache:** Redis (Upstash)
- **Storage:** IPFS (Pinata)
- **Auth:** JWT + GitHub OAuth + Google OAuth
- **Frontend:** React (assumed)

### **Current Scoring Implementation:**
**File:** `backend/utils/scores.py`
**Class:** `ProofScoreCalculator`

```python
# Current Algorithm (TO BE REPLACED)
proof_score = verification_score + community_score + validation_score + quality_score
# Max 100, simple addition with caps
```

### **Existing Database Schema:**
**Projects Table:**
```sql
proof_score INTEGER DEFAULT 0
verification_score INTEGER DEFAULT 0
community_score INTEGER DEFAULT 0
validation_score INTEGER DEFAULT 0
quality_score INTEGER DEFAULT 0
trending_score FLOAT DEFAULT 0.0
upvotes INTEGER DEFAULT 0
downvotes INTEGER DEFAULT 0
comment_count INTEGER DEFAULT 0
```

### **GitHub OAuth Status:**
- ✅ OAuth flow implemented (`backend/routes/auth.py`)
- ✅ Client ID/Secret configured in `.env`
- ✅ Stores `github_username` in User model
- ❌ **Does NOT store access token** (critical missing piece)
- Current scope: `read:user user:email` (insufficient)

### **Validator System:**
- Manual badge awards by human validators
- Badge types: stone (+5), silver (+10), gold (+15), platinum (+20), demerit (-10)
- Auto-assignment based on project categories
- Status tracking: pending, in_review, validated, rejected

---

## 🎯 NEW SCORING FRAMEWORK

### **Scoring Philosophy:**
Replace manual validation with AI-powered comprehensive analysis while keeping community engagement

### **Score Breakdown (Total: 100 points)**

| Category | Points | Old Method | New Method |
|----------|--------|------------|------------|
| **Code Quality** | 20 | Simple checks (has demo URL, has GitHub URL, has description) | GitHub API analysis (repo structure, README quality, file organization, code patterns) |
| **GitHub Score** | 20 | Binary check (GitHub connected = 5 points) | Team analysis (past projects, contribution history, profile strength, repo metrics) |
| **LLM Analysis** | 30 | Manual validator badges | AI analysis (competitive position, market fit, success criteria, innovation evaluation) |
| **Community Score** | 30 | Upvote ratio + comments | **UNCHANGED** (keeps existing algorithm) |

### **LLM Analysis Sub-Components (30 points total)**

```json
{
  "competitive_analysis": {
    "weight": 0.25,
    "evaluates": [
      "Market saturation (red vs blue ocean)",
      "Differentiation strength",
      "Competitive moat potential",
      "Risk of commoditization"
    ]
  },
  "market_fit": {
    "weight": 0.25,
    "evaluates": [
      "Problem-solution alignment",
      "Target market clarity",
      "ICP (Ideal Customer Profile) definition",
      "Market size/TAM signals"
    ]
  },
  "success_criteria": {
    "weight": 0.25,
    "evaluates": [
      "Technical feasibility",
      "Business viability",
      "Execution risk assessment",
      "PMF (Product-Market Fit) likelihood"
    ]
  },
  "evaluation": {
    "weight": 0.25,
    "evaluates": [
      "Problem clarity",
      "Innovation level",
      "Real-world impact potential",
      "Scalability assessment"
    ]
  }
}
```

### **Final Score Calculation:**

```python
# Weighted combination (admin-configurable)
proof_score = (
    quality_score * 0.20 +        # Code quality (GitHub API)
    verification_score * 0.20 +    # Team analysis (GitHub API)
    validation_score * 0.30 +      # AI/LLM comprehensive analysis
    community_score * 0.30         # Upvotes + engagement
)

# Capped at 100
proof_score = min(proof_score, 100)
```

---

## 🗂️ DECISION LOG

### **Q1: GitHub Access Token Storage**
**Decision:** Store `github_access_token` in User model
**Rationale:** Needed for authenticated GitHub API calls (5000 req/hr vs 60 anonymous), access to private repos, team analysis

### **Q2: GitHub OAuth Scope**
**Decision:** YES, expand scope to `repo` + `read:org` + existing scopes
**Rationale:**
- `repo` - Access private repositories if user submits private project
- `read:org` - Access organization membership for team analysis
- `read:user user:email` - Existing scopes (keep)

**New OAuth Scope:**
```
scope=read:user user:email repo read:org
```

### **Q3: Scoring Timing**
**Decision:** Async background processing via Celery
**Rationale:**
- AI analysis takes 30-60 seconds
- Better UX (instant project creation)
- Retry capability
- No timeout issues

### **Q4: OpenAI Model**
**Decision:** GPT-4o-mini
**Rationale:**
- 90% accuracy of GPT-4
- 15x cheaper ($0.15 per 1M input tokens vs $2.50)
- ~$0.001-0.003 per project analysis
- Faster response times

### **Q5: Code Analysis Depth**
**Decision:** GitHub API file analysis (no repo cloning)
**Rationale:**
- Faster (no cloning overhead)
- No disk space issues
- Sufficient depth for scoring
- Can analyze file structure, README, key files

### **Q6: Scoring Configuration UI**
**Decision:** New "Scoring Settings" page in Admin Dashboard
**Rationale:**
- User requested admin UI-based configuration
- Provides real-time weight adjustments
- Better UX than config files

### **Q7: Existing Projects Rescoring**
**Decision:** Keep existing projects with old scores, NO automatic rescoring
**Rationale:**
- User confirmed old data is dummy data
- No migration complexity
- Clean break between v1 and v2
- Admin can manually rescore if needed via UI button

### **Q8: Error Handling**
**Decision:** Allow submission, set score to 0, show "Pending Analysis" badge, retry up to 10 times
**Requirements:**
- ✅ MUST retry automatically even if delayed
- ✅ MUST remove old scoring algorithm completely
- ✅ Exponential backoff retry strategy
- ✅ Clear error logging

### **Q9: Caching Strategy**
**Decision:** PostgreSQL JSONB column (`score_breakdown`)
**Rationale:**
- Simpler than Redis (no extra infra)
- Queryable via SQL if needed
- Persistent (survives Redis restart)
- GitHub analysis cached for 7 days

### **Q10: Rate Limiting**
**Decision:** 1 submission per user per hour with clear error messages
**Error Message Format:**
```
"Please wait {X} minutes before submitting another project. This helps us manage AI analysis costs."
```
**Rationale:**
- Prevents abuse
- Controls OpenAI API costs
- User-friendly messaging

---

## 🗄️ DATABASE CHANGES

### **Migration 1: Add GitHub Token to Users**

```sql
-- File: backend/migrations/add_github_token.sql

-- Add github_access_token column
ALTER TABLE users
ADD COLUMN github_access_token TEXT NULL;

-- Add index for performance
CREATE INDEX idx_users_github_token ON users(github_access_token)
WHERE github_access_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.github_access_token IS
'GitHub OAuth access token for API calls. Stored encrypted. Used for repo/team analysis.';
```

### **Migration 2: Add Scoring Fields to Projects**

```sql
-- File: backend/migrations/add_scoring_fields.sql

-- Add AI scoring metadata columns
ALTER TABLE projects
ADD COLUMN score_breakdown JSONB DEFAULT '{}',
ADD COLUMN scoring_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN scoring_retry_count INTEGER DEFAULT 0,
ADD COLUMN last_scored_at TIMESTAMP NULL,
ADD COLUMN scoring_error TEXT NULL;

-- Add indexes for filtering and performance
CREATE INDEX idx_projects_scoring_status ON projects(scoring_status);
CREATE INDEX idx_projects_last_scored_at ON projects(last_scored_at);
CREATE INDEX idx_projects_score_breakdown ON projects USING GIN(score_breakdown);

-- Add constraint for valid scoring statuses
ALTER TABLE projects
ADD CONSTRAINT check_scoring_status
CHECK (scoring_status IN ('pending', 'processing', 'completed', 'failed', 'retrying'));

-- Add comments
COMMENT ON COLUMN projects.score_breakdown IS
'JSONB field containing detailed AI scoring breakdown (GitHub analysis, LLM results, reasoning)';
COMMENT ON COLUMN projects.scoring_status IS
'Current status of AI scoring: pending, processing, completed, failed, retrying';
COMMENT ON COLUMN projects.scoring_retry_count IS
'Number of retry attempts (max 10). Increments on each failure.';
COMMENT ON COLUMN projects.last_scored_at IS
'Timestamp of last successful scoring attempt';
COMMENT ON COLUMN projects.scoring_error IS
'Error message from last failed scoring attempt (for debugging)';
```

### **Migration 3: Create Admin Scoring Config Table**

```sql
-- File: backend/migrations/create_scoring_config.sql

-- Create admin settings table for configurable weights
CREATE TABLE admin_scoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO admin_scoring_config (config_key, config_value) VALUES
-- Main scoring weights (must sum to 100)
('scoring_weights', '{
    "quality_score": 20,
    "verification_score": 20,
    "validation_score": 30,
    "community_score": 30
}'::jsonb),

-- LLM sub-weights (must sum to 1.0)
('llm_weights', '{
    "competitive": 0.25,
    "market_fit": 0.25,
    "success_criteria": 0.25,
    "evaluation": 0.25
}'::jsonb),

-- GitHub analysis sub-weights (must sum to 1.0)
('github_weights', '{
    "repo_quality": 0.5,
    "team_quality": 0.5
}'::jsonb),

-- Code quality sub-weights (must sum to 1.0)
('code_quality_weights', '{
    "repo_structure": 0.3,
    "readme_quality": 0.3,
    "file_organization": 0.2,
    "code_patterns": 0.2
}'::jsonb),

-- General scoring configuration
('scoring_config', '{
    "llm_model": "gpt-4o-mini",
    "max_retries": 10,
    "retry_backoff_seconds": 300,
    "rate_limit_hours": 1,
    "github_cache_days": 7,
    "enable_scoring": true
}'::jsonb);

-- Add index for fast config lookups
CREATE INDEX idx_scoring_config_key ON admin_scoring_config(config_key);

-- Add comment
COMMENT ON TABLE admin_scoring_config IS
'Stores admin-configurable scoring weights and settings. Updated via Admin UI.';
```

### **Migration 4: Update Materialized Views (Optional)**

```sql
-- File: backend/migrations/update_materialized_views.sql

-- Refresh materialized view definition to use new scoring
-- (Only if you want to update existing MVs, otherwise skip)

-- Drop old view
DROP MATERIALIZED VIEW IF EXISTS mv_feed_projects;

-- Recreate with new scoring logic
CREATE MATERIALIZED VIEW mv_feed_projects AS
SELECT
  p.id,
  p.title,
  p.tagline,
  p.proof_score,
  p.scoring_status,
  p.upvotes,
  p.comment_count,
  p.created_at,
  -- New trending calculation
  (
    p.proof_score * 0.5 +
    p.comment_count * 2 +
    p.upvotes * 1.5 -
    EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 45000
  ) as trending_score
FROM projects p
WHERE p.is_deleted = FALSE
  AND p.scoring_status IN ('completed', 'processing', 'pending');

-- Add index
CREATE UNIQUE INDEX idx_mv_feed_projects_id ON mv_feed_projects(id);
CREATE INDEX idx_mv_feed_projects_trending ON mv_feed_projects(trending_score DESC);
```

### **Total Database Impact:**
- **Users table:** +1 column (`github_access_token`)
- **Projects table:** +5 columns (`score_breakdown`, `scoring_status`, `scoring_retry_count`, `last_scored_at`, `scoring_error`)
- **New tables:** +1 (`admin_scoring_config`)
- **Total new columns:** 6
- **Total new tables:** 1

---

## 📁 FILE STRUCTURE

```
backend/
├── config.py ⚠️ MODIFY
│   └── Add: OPENAI_API_KEY, Celery config
│
├── requirements.txt ⚠️ MODIFY
│   └── Add: openai, PyGithub, celery, tenacity
│
├── celery_app.py ✅ NEW
│   └── Celery application configuration
│
├── migrations/ ⚠️ MODIFY
│   ├── add_github_token.sql ✅ NEW
│   ├── add_scoring_fields.sql ✅ NEW
│   └── create_scoring_config.sql ✅ NEW
│
├── models/
│   ├── user.py ⚠️ MODIFY
│   │   └── Add: github_access_token field
│   ├── project.py ⚠️ MODIFY
│   │   └── Add: scoring fields (score_breakdown, scoring_status, etc.)
│   └── admin_scoring_config.py ✅ NEW
│       └── Model for scoring configuration
│
├── schemas/
│   ├── scoring.py ✅ NEW
│   │   └── Validation schemas for scoring config
│   └── project.py ⚠️ MODIFY (if needed)
│
├── services/
│   └── scoring/ ✅ NEW FOLDER
│       ├── __init__.py
│       ├── score_engine.py ✅ NEW
│       │   └── Main scoring orchestrator
│       ├── github_analyzer.py ✅ NEW
│       │   └── GitHub API analysis (repo + team)
│       ├── llm_analyzer.py ✅ NEW
│       │   └── OpenAI GPT-4o-mini analysis
│       ├── normalizer.py ✅ NEW
│       │   └── Score normalization utilities
│       └── config_manager.py ✅ NEW
│           └── Load admin config from DB
│
├── tasks/ ✅ NEW FOLDER
│   ├── __init__.py
│   ├── scoring_tasks.py ✅ NEW
│   │   └── Celery tasks for async scoring
│   └── retry_failed_scores.py ✅ NEW
│       └── Cron job for retrying failed scores
│
├── routes/
│   ├── auth.py ⚠️ MODIFY
│   │   └── Update GitHub OAuth (expand scope, store token)
│   ├── projects.py ⚠️ MODIFY
│   │   └── Remove old scoring, trigger Celery task
│   ├── admin.py ⚠️ MODIFY
│   │   └── Add scoring config CRUD endpoints
│   └── scoring.py ✅ NEW
│       └── Scoring status/retry endpoints
│
├── utils/
│   └── scores.py ❌ DELETE or ARCHIVE
│       └── Old ProofScoreCalculator (replaced)
│
└── .env ⚠️ MODIFY
    └── Add: OPENAI_API_KEY, Celery config
```

### **File Count Summary:**
- **New files:** 11
- **Modified files:** 7
- **Deleted files:** 1 (optional archive)
- **New folders:** 2 (`services/scoring/`, `tasks/`)

---

## 📦 DEPENDENCIES

### **Add to `requirements.txt`:**

```txt
# AI/LLM
openai>=1.50.0

# GitHub API
PyGithub>=2.4.0

# Async Task Queue
celery>=5.4.0
redis>=5.0.0  # Already installed, ensure version

# Retry Logic & Utilities
tenacity>=8.5.0
python-dateutil>=2.9.0

# Existing dependencies (no changes needed)
Flask
SQLAlchemy
psycopg2-binary
marshmallow
flask-jwt-extended
flask-cors
flask-socketio
```

### **Installation Command:**

```bash
pip install openai>=1.50.0 PyGithub>=2.4.0 celery>=5.4.0 tenacity>=8.5.0 python-dateutil>=2.9.0
```

---

## ⚙️ CONFIGURATION

### **1. Update `backend/config.py`**

Add after line 68 (after `PINATA_JWT`):

```python
# OpenAI API Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
OPENAI_MAX_TOKENS = int(os.getenv('OPENAI_MAX_TOKENS', 2000))
OPENAI_TEMPERATURE = float(os.getenv('OPENAI_TEMPERATURE', 0.3))

# Celery Configuration
CELERY_BROKER_URL = os.getenv(
    'CELERY_BROKER_URL',
    os.getenv('REDIS_URL', 'redis://localhost:6379/0')
)
CELERY_RESULT_BACKEND = os.getenv(
    'CELERY_RESULT_BACKEND',
    os.getenv('REDIS_URL', 'redis://localhost:6379/0')
)
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 600  # 10 minutes max per task
CELERY_TASK_SOFT_TIME_LIMIT = 540  # 9 minutes soft limit
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Scoring Configuration
SCORING_RATE_LIMIT_HOURS = int(os.getenv('SCORING_RATE_LIMIT_HOURS', 1))
SCORING_MAX_RETRIES = int(os.getenv('SCORING_MAX_RETRIES', 10))
SCORING_RETRY_BACKOFF = int(os.getenv('SCORING_RETRY_BACKOFF', 300))  # 5 minutes
SCORING_GITHUB_CACHE_DAYS = int(os.getenv('SCORING_GITHUB_CACHE_DAYS', 7))
```

### **2. Update `backend/.env`**

Add after line 49 (after `GITHUB_REDIRECT_URI`):

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3

# Celery Configuration (uses existing Redis)
CELERY_BROKER_URL=rediss://default:AW3CAAIncDI3ZTM2MjU4YjhjOTE0MzQ0YWU2NzYwOGFhNjcxODc1ZnAyMjgwOTg@relaxed-possum-28098.upstash.io:6379
CELERY_RESULT_BACKEND=rediss://default:AW3CAAIncDI3ZTM2MjU4YjhjOTE0MzQ0YWU2NzYwOGFhNjcxODc1ZnAyMjgwOTg@relaxed-possum-28098.upstash.io:6379

# Scoring Configuration
SCORING_RATE_LIMIT_HOURS=1
SCORING_MAX_RETRIES=10
SCORING_RETRY_BACKOFF=300
SCORING_GITHUB_CACHE_DAYS=7
```

### **3. Create `backend/celery_app.py`**

```python
"""
Celery application configuration
"""
from celery import Celery
from flask import Flask
from config import config
import os

def make_celery(app=None):
    """Create Celery instance with Flask app context"""

    # If no app provided, create minimal Flask app for config
    if app is None:
        app = Flask(__name__)
        env = os.getenv('FLASK_ENV', 'development')
        app.config.from_object(config[env])

    celery = Celery(
        app.import_name,
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND'],
        include=['tasks.scoring_tasks']
    )

    celery.conf.update(
        task_track_started=app.config['CELERY_TASK_TRACK_STARTED'],
        task_time_limit=app.config['CELERY_TASK_TIME_LIMIT'],
        task_soft_time_limit=app.config['CELERY_TASK_SOFT_TIME_LIMIT'],
        task_acks_late=app.config['CELERY_TASK_ACKS_LATE'],
        worker_prefetch_multiplier=app.config['CELERY_WORKER_PREFETCH_MULTIPLIER'],
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
    )

    # Add Flask app context to tasks
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

# Create celery instance
celery = make_celery()
```

---

## 🔄 IMPLEMENTATION STEPS (ORDERED)

### **PHASE 1: Foundation (Day 1) ✅**

1. **Run Database Migrations**
   ```bash
   psql $DATABASE_URL -f backend/migrations/add_github_token.sql
   psql $DATABASE_URL -f backend/migrations/add_scoring_fields.sql
   psql $DATABASE_URL -f backend/migrations/create_scoring_config.sql
   ```

2. **Install Dependencies**
   ```bash
   cd backend
   pip install openai PyGithub celery tenacity python-dateutil
   pip freeze > requirements.txt
   ```

3. **Update Configuration**
   - Edit `backend/config.py` (add OpenAI + Celery config)
   - Edit `backend/.env` (add API keys)
   - Create `backend/celery_app.py`

4. **Create Folder Structure**
   ```bash
   mkdir -p backend/services/scoring
   mkdir -p backend/tasks
   touch backend/services/scoring/__init__.py
   touch backend/tasks/__init__.py
   ```

5. **Test Basic Setup**
   ```bash
   # Verify imports work
   python -c "import openai; import github; import celery; print('✅ All dependencies installed')"

   # Verify DB migrations applied
   psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='scoring_status';"
   ```

---

### **PHASE 2: Core Services (Day 2-3) ✅**

6. **Implement `normalizer.py`**
   - Score normalization helpers
   - Range conversion functions (0-100)
   - Weight application utilities

7. **Implement `config_manager.py`**
   - Load scoring config from `admin_scoring_config` table
   - Cache config in Redis (optional)
   - Validation for config values

8. **Implement `github_analyzer.py`**
   - Initialize PyGithub client with user token
   - Repo analysis function (structure, README, files)
   - Team analysis function (profiles, past projects)
   - Cache results for 7 days

9. **Implement `llm_analyzer.py`**
   - Initialize OpenAI client
   - 4 analysis functions:
     - `competitive_analysis()`
     - `market_fit_analysis()`
     - `success_criteria_analysis()`
     - `evaluation_analysis()`
   - Prompt engineering for structured JSON output
   - Error handling & retries

10. **Implement `score_engine.py`**
    - Main `score_project()` orchestrator
    - Parallel execution of analyzers
    - Score combination logic
    - Result formatting

---

### **PHASE 3: Database Models & Async Tasks (Day 4) ✅**

11. **Update `models/user.py`**
    - Add `github_access_token` column
    - Add encryption/decryption methods (optional)
    - Update `to_dict()` to exclude token

12. **Update `models/project.py`**
    - Add scoring fields
    - Add helper methods (`is_scoring_pending()`, `can_retry()`)
    - Update relationships if needed

13. **Create `models/admin_scoring_config.py`**
    - SQLAlchemy model for config table
    - CRUD methods
    - Validation methods

14. **Implement `tasks/scoring_tasks.py`**
    - Celery task: `score_project_task(project_id)`
    - Retry logic with exponential backoff
    - Error handling & status updates
    - Rate limit checking

15. **Implement `tasks/retry_failed_scores.py`**
    - Cron job to find failed scores
    - Retry logic for projects with `scoring_status='failed'`
    - Respect max retry count

---

### **PHASE 4: API Routes (Day 5) ✅**

16. **Update `routes/auth.py`**
    - Expand GitHub OAuth scope to `read:user user:email repo read:org`
    - Store `access_token` in User model (line 373-403)
    - Add token refresh logic (optional)

17. **Update `routes/projects.py`**
    - Remove old `ProofScoreCalculator` calls
    - Add rate limit check on project creation
    - Trigger Celery task: `score_project_task.delay(project.id)`
    - Set initial `scoring_status='pending'`, `proof_score=0`

18. **Create `routes/scoring.py`**
    ```python
    # New endpoints:
    GET /api/projects/<id>/scoring-status
    POST /api/projects/<id>/retry-scoring (auth required)
    ```

19. **Update `routes/admin.py`**
    ```python
    # New admin endpoints:
    GET /api/admin/scoring/config
    PUT /api/admin/scoring/config
    POST /api/admin/projects/<id>/rescore
    GET /api/admin/scoring/stats
    ```

20. **Create `schemas/scoring.py`**
    - Validation schemas for config updates
    - Request/response schemas

---

### **PHASE 5: Admin UI (Day 6) ✅**

21. **Create Scoring Settings Page**
    - Frontend: `frontend/src/pages/admin/ScoringSettings.tsx`
    - Weight sliders for each component
    - LLM model selector
    - Retry configuration inputs
    - Save/Reset buttons

22. **Add Rescore Button**
    - In Admin Project Detail view
    - Calls `POST /api/admin/projects/<id>/rescore`
    - Shows loading state + success/error toast

23. **Add Scoring Status Badges**
    - Project cards show status badge:
      - 🕐 Pending (yellow)
      - 🔄 Processing (blue)
      - ✅ Completed (green)
      - ⚠️ Failed (red)
      - 🔁 Retrying (orange)

24. **Add Detailed Score Breakdown**
    - Project detail page shows expandable sections
    - Display `score_breakdown` JSON in readable format
    - Show AI reasoning text

---

### **PHASE 6: Testing & Deployment (Day 7) ✅**

25. **Unit Tests**
    ```bash
    # Create test files
    tests/test_normalizer.py
    tests/test_github_analyzer.py
    tests/test_llm_analyzer.py
    tests/test_score_engine.py
    tests/test_config_manager.py
    ```

26. **Integration Tests**
    ```bash
    tests/test_scoring_integration.py
    tests/test_scoring_tasks.py
    tests/test_retry_logic.py
    ```

27. **Manual Testing**
    - Submit test project
    - Monitor Celery logs
    - Verify scores in DB
    - Test rate limiting
    - Test retry on mock failure
    - Test admin config changes

28. **Deploy Celery Worker**
    ```bash
    # Local testing
    celery -A celery_app.celery worker --loglevel=info

    # Production (Render/Heroku)
    # Add worker process to Procfile
    ```

29. **Deploy Celery Beat (Optional)**
    ```bash
    # For retry cron job
    celery -A celery_app.celery beat --loglevel=info
    ```

30. **Monitor First 10 Projects**
    - Check scoring times
    - Verify accuracy
    - Monitor OpenAI costs
    - Collect feedback

---

## 🌐 API ENDPOINTS

### **Public Endpoints**

#### **1. Get Scoring Status**
```http
GET /api/projects/<project_id>/scoring-status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "scoring_status": "completed",
    "proof_score": 78,
    "retry_count": 0,
    "last_scored_at": "2025-01-17T10:30:00Z",
    "error": null,
    "score_breakdown": {
      "quality": {
        "score": 16,
        "repo_structure": 8,
        "readme_quality": 9,
        "file_organization": 7,
        "code_patterns": 8
      },
      "verification": {
        "score": 15,
        "team_experience": 12,
        "past_projects": 3
      },
      "validation": {
        "score": 25,
        "competitive": 22,
        "market_fit": 24,
        "success_criteria": 26,
        "evaluation": 28,
        "reasoning": "Strong technical execution with clear market differentiation..."
      },
      "community": {
        "score": 22,
        "upvotes": 45,
        "comments": 12
      }
    }
  }
}

Response 404:
{
  "success": false,
  "error": "Project not found"
}
```

#### **2. Retry Failed Scoring (User)**
```http
POST /api/projects/<project_id>/retry-scoring
Authorization: Bearer <token>

Request Body: {}

Response 200:
{
  "success": true,
  "message": "Scoring retry queued successfully",
  "data": {
    "task_id": "celery-task-uuid",
    "status": "queued"
  }
}

Response 429:
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Please wait 45 minutes before retrying scoring."
}
```

---

### **Admin Endpoints**

#### **3. Get Scoring Configuration**
```http
GET /api/admin/scoring/config
Authorization: Bearer <admin-token>

Response 200:
{
  "success": true,
  "data": {
    "scoring_weights": {
      "quality_score": 20,
      "verification_score": 20,
      "validation_score": 30,
      "community_score": 30
    },
    "llm_weights": {
      "competitive": 0.25,
      "market_fit": 0.25,
      "success_criteria": 0.25,
      "evaluation": 0.25
    },
    "github_weights": {
      "repo_quality": 0.5,
      "team_quality": 0.5
    },
    "code_quality_weights": {
      "repo_structure": 0.3,
      "readme_quality": 0.3,
      "file_organization": 0.2,
      "code_patterns": 0.2
    },
    "scoring_config": {
      "llm_model": "gpt-4o-mini",
      "max_retries": 10,
      "retry_backoff_seconds": 300,
      "rate_limit_hours": 1,
      "github_cache_days": 7,
      "enable_scoring": true
    }
  }
}
```

#### **4. Update Scoring Configuration**
```http
PUT /api/admin/scoring/config
Authorization: Bearer <admin-token>
Content-Type: application/json

Request Body:
{
  "config_key": "scoring_weights",
  "config_value": {
    "quality_score": 25,
    "verification_score": 25,
    "validation_score": 25,
    "community_score": 25
  }
}

Validation Rules:
- scoring_weights must sum to 100
- All sub-weights must sum to 1.0
- max_retries must be 1-20
- rate_limit_hours must be 1-24

Response 200:
{
  "success": true,
  "message": "Scoring configuration updated successfully",
  "data": {
    "config_key": "scoring_weights",
    "config_value": {...},
    "updated_by": "admin-user-id",
    "updated_at": "2025-01-17T10:30:00Z"
  }
}

Response 400:
{
  "success": false,
  "error": "Validation error",
  "message": "Scoring weights must sum to 100 (current sum: 110)"
}
```

#### **5. Rescore Project (Admin)**
```http
POST /api/admin/projects/<project_id>/rescore
Authorization: Bearer <admin-token>

Request Body: {}

Response 200:
{
  "success": true,
  "message": "Project rescore queued successfully",
  "data": {
    "project_id": "uuid",
    "task_id": "celery-task-uuid",
    "previous_score": 65,
    "scoring_status": "processing"
  }
}
```

#### **6. Get Scoring Statistics (Admin)**
```http
GET /api/admin/scoring/stats
Authorization: Bearer <admin-token>

Response 200:
{
  "success": true,
  "data": {
    "total_projects": 1250,
    "scored_today": 45,
    "pending": 12,
    "processing": 3,
    "completed": 1180,
    "failed": 5,
    "retrying": 2,
    "average_score": 68.5,
    "average_scoring_time_seconds": 42,
    "success_rate": 98.5,
    "total_retries_today": 8,
    "estimated_openai_cost_today": 0.15
  }
}
```

---

## 🔄 SCORING WORKFLOW

### **User Perspective:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User submits project with GitHub repo                       │
│    - Required: GitHub account connected (OAuth)                │
│    - Required: Valid repo URL                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Backend checks rate limit                                   │
│    - Query: last project by user in past N hours?             │
│    - If YES: Return error "Please wait X minutes"             │
│    - If NO: Continue                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Project created in database                                 │
│    - scoring_status = "pending"                                │
│    - proof_score = 0                                           │
│    - All score components = 0                                  │
│    - scoring_retry_count = 0                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Celery task queued (async)                                  │
│    - Task: score_project_task.delay(project.id)                │
│    - User sees: "⏳ Scoring in Progress..." badge              │
│    - Response: Project created (200 OK)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Background worker executes task                             │
│    - Update status: "processing"                               │
│    - Start timer                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6a. GitHub Analysis (parallel)                                 │
│     - Fetch repo metadata via GitHub API                       │
│     - Analyze file structure                                   │
│     - Analyze README quality                                   │
│     - Analyze team profiles                                    │
│     - Cache results for 7 days                                 │
│     - Duration: ~10-15 seconds                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────────────────────┐
│ 6b. LLM Analysis (parallel)                                    │
│     - Call OpenAI GPT-4o-mini API                              │
│     - Competitive analysis                                     │
│     - Market fit evaluation                                    │
│     - Success criteria assessment                              │
│     - Innovation evaluation                                    │
│     - Duration: ~20-30 seconds                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────────────────────┐
│ 6c. Community Score (instant)                                  │
│     - Calculate from upvotes/comments                          │
│     - Uses existing data                                       │
│     - Duration: <1 second                                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Combine scores (weighted)                                   │
│    - Load weights from admin_scoring_config                    │
│    - Apply weights to each component                           │
│    - Calculate final proof_score (max 100)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8a. SUCCESS PATH                                               │
│     - Update project:                                          │
│       * proof_score = calculated_score                         │
│       * scoring_status = "completed"                           │
│       * score_breakdown = detailed JSON                        │
│       * last_scored_at = NOW()                                 │
│     - User sees: "✅ Score: 78/100" badge                      │
│     - Send notification (optional)                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 8b. FAILURE PATH                                               │
│     - Log error details                                        │
│     - Update project:                                          │
│       * scoring_status = "retrying"                            │
│       * scoring_retry_count += 1                               │
│       * scoring_error = error message                          │
│     - Queue retry task (exponential backoff)                   │
│     - Retry delay: 300s * (2 ^ retry_count)                    │
│       * Retry 1: 5 minutes                                     │
│       * Retry 2: 10 minutes                                    │
│       * Retry 3: 20 minutes                                    │
│       * ...                                                     │
│       * Retry 10: ~85 hours                                    │
│     - User sees: "🔁 Retrying..." badge                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. After 10 failed retries                                     │
│    - Update project:                                           │
│      * scoring_status = "failed"                               │
│      * proof_score = 0                                         │
│    - Notify admin                                              │
│    - User sees: "⚠️ Scoring Failed - Contact Support"         │
│    - Admin can manually rescore via UI                         │
└─────────────────────────────────────────────────────────────────┘
```

### **System Perspective (Celery Task):**

```python
@celery.task(bind=True, max_retries=10)
def score_project_task(self, project_id):
    """
    Main Celery task for scoring projects
    Runs async in background worker
    """

    # 1. Load project
    project = Project.query.get(project_id)
    if not project:
        raise Exception("Project not found")

    # 2. Check if already scored
    if project.scoring_status == 'completed':
        return {'message': 'Already scored', 'score': project.proof_score}

    # 3. Update status to processing
    project.scoring_status = 'processing'
    db.session.commit()

    try:
        # 4. Initialize scoring engine
        engine = ScoringEngine()

        # 5. Run scoring pipeline
        result = engine.score_project(project)

        # 6. Update project with results
        project.proof_score = result['proof_score']
        project.quality_score = result['quality_score']
        project.verification_score = result['verification_score']
        project.validation_score = result['validation_score']
        project.community_score = result['community_score']
        project.score_breakdown = result['breakdown']
        project.scoring_status = 'completed'
        project.last_scored_at = datetime.utcnow()
        project.scoring_error = None
        db.session.commit()

        return {'success': True, 'score': project.proof_score}

    except Exception as e:
        # 7. Handle failure
        project.scoring_retry_count += 1
        project.scoring_error = str(e)

        if project.scoring_retry_count >= 10:
            # Max retries exceeded
            project.scoring_status = 'failed'
            db.session.commit()
            # Notify admin
            notify_admin_scoring_failed(project.id, str(e))
            raise
        else:
            # Retry with exponential backoff
            project.scoring_status = 'retrying'
            db.session.commit()

            # Calculate retry delay: 300s * (2 ^ retry_count)
            countdown = 300 * (2 ** project.scoring_retry_count)

            # Queue retry
            raise self.retry(exc=e, countdown=countdown)
```

---

## 🛡️ ERROR HANDLING & RETRY LOGIC

### **Retry Strategy:**

```python
# Exponential backoff formula
retry_delay_seconds = BASE_DELAY * (2 ^ retry_count)

# Example timeline:
Retry 0 (initial): Immediate
Retry 1: 300s (5 minutes)
Retry 2: 600s (10 minutes)
Retry 3: 1200s (20 minutes)
Retry 4: 2400s (40 minutes)
Retry 5: 4800s (80 minutes)
Retry 6: 9600s (160 minutes)
Retry 7: 19200s (320 minutes)
Retry 8: 38400s (640 minutes)
Retry 9: 76800s (1280 minutes)
Retry 10: FAIL (max retries exceeded)

Total retry window: ~42 hours
```

### **Error Categories:**

```python
# RETRY-ABLE ERRORS (attempt retry)
RETRYABLE_ERRORS = [
    'OpenAI API timeout',
    'OpenAI API rate limit',
    'GitHub API rate limit',
    'Network connection error',
    'Temporary service unavailable',
    'Redis connection error',
]

# PERMANENT ERRORS (do not retry)
PERMANENT_ERRORS = [
    'Invalid OpenAI API key',
    'Invalid GitHub token',
    'Project deleted',
    'GitHub repo not found (404)',
    'GitHub repo access denied (403)',
    'User not found',
]

# ERROR HANDLING LOGIC
def handle_scoring_error(error, project):
    error_type = classify_error(error)

    if error_type == 'PERMANENT':
        # Mark as failed, do not retry
        project.scoring_status = 'failed'
        project.scoring_error = str(error)
        db.session.commit()
        return False  # Do not retry

    elif error_type == 'RETRYABLE':
        # Increment retry count and queue retry
        if project.scoring_retry_count < MAX_RETRIES:
            project.scoring_status = 'retrying'
            project.scoring_retry_count += 1
            project.scoring_error = str(error)
            db.session.commit()
            return True  # Retry
        else:
            # Max retries exceeded
            project.scoring_status = 'failed'
            db.session.commit()
            notify_admin(project.id, error)
            return False  # Stop retrying
```

### **Rate Limiting:**

```python
def check_rate_limit(user_id):
    """
    Check if user has submitted project in last N hours
    Raises RateLimitError if limit exceeded
    """

    # Get last project submission by user
    last_project = Project.query.filter_by(user_id=user_id)\
        .order_by(Project.created_at.desc())\
        .first()

    if not last_project:
        return True  # No previous submissions

    # Calculate hours since last submission
    hours_since = (datetime.utcnow() - last_project.created_at).total_seconds() / 3600

    if hours_since < SCORING_RATE_LIMIT_HOURS:
        # Rate limit exceeded
        minutes_remaining = int((SCORING_RATE_LIMIT_HOURS - hours_since) * 60)
        raise RateLimitError(
            f"Please wait {minutes_remaining} minutes before submitting another project. "
            f"This helps us manage AI analysis costs and ensure quality scoring for all users."
        )

    return True
```

### **User-Facing Error Messages:**

```python
ERROR_MESSAGES = {
    # Rate limiting
    'rate_limited': 'Please wait {minutes} minutes before submitting another project.',

    # GitHub issues
    'github_not_connected': 'Please connect your GitHub account in Settings to enable AI scoring.',
    'github_token_expired': 'GitHub connection expired. Please reconnect your GitHub account.',
    'github_repo_not_found': 'GitHub repository not found. Please check the URL.',
    'github_repo_private_no_access': 'Cannot access private repository. Please make it public or grant access.',

    # OpenAI issues
    'openai_quota_exceeded': 'AI analysis quota exceeded. Scoring will retry automatically in a few minutes.',
    'openai_timeout': 'AI analysis timed out. Scoring will retry automatically.',

    # Network issues
    'network_error': 'Temporary network issue. Scoring will retry automatically.',

    # System issues
    'max_retries_exceeded': 'Scoring failed after 10 automatic retry attempts. Our team has been notified and will investigate.',
    'system_error': 'An unexpected error occurred. Our team has been notified.',
}
```

---

## 🧪 TESTING STRATEGY

### **Unit Tests:**

```python
# tests/test_normalizer.py
def test_normalize_score():
    """Test score normalization to 0-100 range"""
    assert normalize(50, max_value=100) == 50
    assert normalize(75, max_value=150) == 50
    assert normalize(-10, max_value=100) == 0
    assert normalize(150, max_value=100) == 100

def test_apply_weights():
    """Test weight application"""
    scores = {'quality': 80, 'verification': 70, 'validation': 90, 'community': 60}
    weights = {'quality': 0.2, 'verification': 0.2, 'validation': 0.3, 'community': 0.3}
    result = apply_weights(scores, weights)
    assert result == 74  # (80*0.2 + 70*0.2 + 90*0.3 + 60*0.3)
```

```python
# tests/test_github_analyzer.py
@mock.patch('github.Github')
def test_analyze_repo_structure(mock_github):
    """Test GitHub repo analysis"""
    analyzer = GitHubAnalyzer(token='fake-token')
    result = analyzer.analyze_repo('user/repo')
    assert 'score' in result
    assert 0 <= result['score'] <= 100
    assert 'repo_structure' in result
    assert 'readme_quality' in result

def test_analyze_team():
    """Test team analysis"""
    analyzer = GitHubAnalyzer(token='fake-token')
    team_members = [
        {'github_username': 'user1'},
        {'github_username': 'user2'}
    ]
    result = analyzer.analyze_team(team_members)
    assert 'score' in result
    assert 'team_experience' in result
```

```python
# tests/test_llm_analyzer.py
@mock.patch('openai.ChatCompletion.create')
def test_competitive_analysis(mock_openai):
    """Test LLM competitive analysis"""
    mock_openai.return_value = {
        'choices': [{
            'message': {
                'content': '{"score": 75, "market_type": "blue_ocean", "reasoning": "..."}'
            }
        }]
    }

    analyzer = LLMAnalyzer(api_key='fake-key')
    result = analyzer.competitive_analysis({'description': 'Test project'})
    assert result['score'] == 75
    assert result['market_type'] == 'blue_ocean'
```

```python
# tests/test_score_engine.py
def test_full_scoring_pipeline():
    """Test complete scoring flow"""
    engine = ScoringEngine()
    project = create_test_project()

    result = engine.score_project(project)

    assert 'proof_score' in result
    assert 0 <= result['proof_score'] <= 100
    assert 'breakdown' in result
    assert all(key in result['breakdown'] for key in ['quality', 'verification', 'validation', 'community'])
```

### **Integration Tests:**

```python
# tests/test_scoring_integration.py
def test_end_to_end_scoring():
    """Test full scoring flow from project creation to completion"""
    # 1. Create user with GitHub connected
    user = create_test_user(github_token='valid-token')

    # 2. Create project
    project = create_test_project(user_id=user.id, github_url='https://github.com/test/repo')

    # 3. Trigger scoring task
    task = score_project_task.delay(project.id)
    task.wait(timeout=60)

    # 4. Verify results
    project = Project.query.get(project.id)
    assert project.scoring_status == 'completed'
    assert project.proof_score > 0
    assert project.score_breakdown is not None

def test_retry_on_failure():
    """Test retry mechanism on OpenAI failure"""
    project = create_test_project()

    # Mock OpenAI to fail
    with mock.patch('openai.ChatCompletion.create', side_effect=Exception('API timeout')):
        with pytest.raises(Exception):
            score_project_task(project.id)

    # Verify retry status
    project = Project.query.get(project.id)
    assert project.scoring_status == 'retrying'
    assert project.scoring_retry_count == 1

def test_rate_limiting():
    """Test rate limiting on project submission"""
    user = create_test_user()

    # Submit first project (should succeed)
    project1 = create_project(user_id=user.id)
    assert project1.id is not None

    # Submit second project immediately (should fail)
    with pytest.raises(RateLimitError):
        create_project(user_id=user.id)
```

### **Manual Testing Checklist:**

```
□ Submit project with valid GitHub repo
  - Verify project created with status "pending"
  - Verify Celery task queued
  - Check Celery worker logs for task execution
  - Verify project status updates to "processing"
  - Wait for completion (~30-60 seconds)
  - Verify status updates to "completed"
  - Verify all scores populated in database
  - Verify score_breakdown JSON populated

□ Submit project without GitHub connection
  - Verify error message displayed
  - Verify project not created

□ Test rate limiting
  - Submit project
  - Immediately submit second project
  - Verify error message with time remaining

□ Test retry mechanism
  - Mock OpenAI API failure
  - Submit project
  - Verify status changes to "retrying"
  - Verify retry_count increments
  - Wait for retry
  - Verify retry succeeds

□ Test max retries
  - Mock permanent failure
  - Verify status changes to "failed" after 10 retries
  - Verify admin notification sent

□ Test admin config update
  - Update scoring weights in admin UI
  - Submit new project
  - Verify new weights applied

□ Test rescore button
  - Click rescore in admin UI
  - Verify task queued
  - Verify project rescored with new score

□ Test scoring status badges
  - Verify badges display correctly:
    * Pending (yellow)
    * Processing (blue)
    * Completed (green)
    * Failed (red)
    * Retrying (orange)

□ Test detailed score breakdown
  - Open project detail page
  - Verify all score components displayed
  - Verify AI reasoning text readable
```

---

## 🚀 DEPLOYMENT GUIDE

### **Local Development:**

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Run database migrations
psql $DATABASE_URL -f migrations/add_github_token.sql
psql $DATABASE_URL -f migrations/add_scoring_fields.sql
psql $DATABASE_URL -f migrations/create_scoring_config.sql

# 3. Update .env with API keys
echo "OPENAI_API_KEY=sk-proj-YOUR-KEY" >> .env

# 4. Start Flask app (Terminal 1)
python app.py

# 5. Start Celery worker (Terminal 2)
celery -A celery_app.celery worker --loglevel=info

# 6. (Optional) Start Celery Beat for retry cron (Terminal 3)
celery -A celery_app.celery beat --loglevel=info
```

### **Production Deployment (Render.com example):**

#### **1. Web Service (Flask)**
```yaml
# render.yaml
services:
  - type: web
    name: zer0-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "gunicorn app:app"
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: zer0-db
          property: connectionString
      - key: REDIS_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: GITHUB_CLIENT_ID
        sync: false
      - key: GITHUB_CLIENT_SECRET
        sync: false
```

#### **2. Background Worker (Celery)**
```yaml
  - type: worker
    name: zer0-celery-worker
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "celery -A celery_app.celery worker --loglevel=info"
    envVars:
      # Same as web service
      - key: DATABASE_URL
        fromDatabase:
          name: zer0-db
          property: connectionString
      - key: REDIS_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
```

#### **3. Cron Job (Celery Beat - Optional)**
```yaml
  - type: cron
    name: zer0-celery-beat
    env: python
    schedule: "*/5 * * * *"  # Every 5 minutes
    buildCommand: "pip install -r requirements.txt"
    startCommand: "celery -A celery_app.celery beat --loglevel=info"
    envVars:
      # Same as above
```

### **Environment Variables (Production):**

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_URL=rediss://user:password@host:6379

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://yourdomain.com/api/auth/github/callback

# JWT
JWT_SECRET_KEY=...

# Celery
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# Scoring Config
SCORING_RATE_LIMIT_HOURS=1
SCORING_MAX_RETRIES=10
SCORING_RETRY_BACKOFF=300
SCORING_GITHUB_CACHE_DAYS=7

# Flask
FLASK_ENV=production
SECRET_KEY=...
```

### **Post-Deployment Checklist:**

```
□ Verify database migrations applied
  psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='scoring_status';"

□ Verify Redis connection
  redis-cli -u $REDIS_URL ping

□ Verify OpenAI API key valid
  curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"

□ Verify Celery worker running
  # Check Render dashboard or logs

□ Test project submission
  # Submit test project via UI

□ Monitor Celery task execution
  # Check Celery logs in Render

□ Verify scoring completion
  # Check project in database

□ Set up monitoring
  # Sentry for errors
  # Flower for Celery monitoring (optional)
  # OpenAI usage dashboard

□ Set up alerts
  # Email on scoring failures
  # Slack webhook for admin notifications
```

---

## 🔐 SECURITY CONSIDERATIONS

### **1. GitHub Token Storage:**

```python
# RECOMMENDED: Encrypt tokens in database
from cryptography.fernet import Fernet

class User(db.Model):
    github_access_token_encrypted = db.Column(db.Text, nullable=True)

    def set_github_token(self, token):
        """Encrypt and store GitHub token"""
        cipher = Fernet(current_app.config['ENCRYPTION_KEY'])
        encrypted = cipher.encrypt(token.encode())
        self.github_access_token_encrypted = encrypted.decode()

    def get_github_token(self):
        """Decrypt and return GitHub token"""
        if not self.github_access_token_encrypted:
            return None
        cipher = Fernet(current_app.config['ENCRYPTION_KEY'])
        decrypted = cipher.decrypt(self.github_access_token_encrypted.encode())
        return decrypted.decode()
```

**Add to config.py:**
```python
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')  # Generate with Fernet.generate_key()
```

### **2. OpenAI API Key Protection:**

```python
# NEVER expose in API responses
# NEVER log in plain text
# NEVER commit to git

# Store in environment variables only
# Use different keys for dev/staging/production
# Rotate keys periodically
# Monitor usage via OpenAI dashboard
# Set up billing alerts
```

### **3. Rate Limiting:**

```python
# Prevent abuse and cost explosions

# User-level rate limiting (1 submission per hour)
@rate_limit(limit=1, per=3600, key='user_id')
def create_project():
    pass

# IP-level rate limiting (10 submissions per hour)
@rate_limit(limit=10, per=3600, key='ip_address')
def create_project():
    pass

# API-level quota monitoring
# Alert when daily OpenAI spend exceeds threshold
if daily_openai_spend > MAX_DAILY_SPEND:
    notify_admin("OpenAI quota alert")
    disable_scoring_temporarily()
```

### **4. Input Validation:**

```python
# Sanitize all user inputs before sending to LLM

def sanitize_for_llm(text):
    """Remove potential prompt injection attempts"""
    # Remove system prompts
    text = re.sub(r'<\|.*?\|>', '', text)
    # Remove instruction patterns
    text = re.sub(r'(?i)(ignore previous|disregard|forget)', '', text)
    # Limit length
    text = text[:5000]  # Max 5000 chars
    return text

# Validate GitHub URLs
def validate_github_url(url):
    pattern = r'^https://github\.com/[\w-]+/[\w.-]+$'
    if not re.match(pattern, url):
        raise ValidationError("Invalid GitHub URL format")
```

### **5. Admin Endpoint Protection:**

```python
# All admin endpoints require admin role

@admin_bp.route('/scoring/config', methods=['PUT'])
@jwt_required()
@admin_required  # Custom decorator
def update_scoring_config():
    user = get_current_user()
    if not user.is_admin:
        return error_response('Forbidden', 'Admin access required', 403)
    # ... update logic
```

---

## 📊 MONITORING & OBSERVABILITY

### **Key Metrics to Track:**

```python
# Performance Metrics
- Average scoring time per project
- P50, P95, P99 scoring latency
- GitHub API response times
- OpenAI API response times

# Success Metrics
- Scoring success rate (%)
- Retry frequency by error type
- Failed scoring count (last 24h)
- Max retries exceeded count

# Cost Metrics
- OpenAI API tokens used per project
- OpenAI API cost per project
- Daily/monthly OpenAI spend
- GitHub API rate limit usage

# Queue Metrics
- Celery queue depth (pending tasks)
- Celery worker utilization (%)
- Average task wait time
- Task timeout frequency
```

### **Logging Strategy:**

```python
# Structured logging for all scoring events

import logging
import json

logger = logging.getLogger('scoring')

# Log scoring start
logger.info('scoring_started', extra={
    'project_id': project.id,
    'user_id': project.user_id,
    'github_repo': project.github_url
})

# Log scoring completion
logger.info('scoring_completed', extra={
    'project_id': project.id,
    'proof_score': project.proof_score,
    'duration_seconds': duration,
    'quality_score': quality_score,
    'verification_score': verification_score,
    'validation_score': validation_score
})

# Log scoring failure
logger.error('scoring_failed', extra={
    'project_id': project.id,
    'error_type': type(e).__name__,
    'error_message': str(e),
    'retry_count': project.scoring_retry_count
})
```

### **Admin Dashboard Metrics:**

```python
# GET /api/admin/scoring/stats

{
  "overview": {
    "total_projects": 1250,
    "scored_today": 45,
    "pending": 12,
    "processing": 3,
    "completed": 1180,
    "failed": 5,
    "retrying": 2
  },
  "performance": {
    "average_score": 68.5,
    "average_scoring_time_seconds": 42,
    "p95_scoring_time_seconds": 78,
    "success_rate_percent": 98.5
  },
  "costs": {
    "total_projects_scored_today": 45,
    "estimated_openai_cost_today_usd": 0.15,
    "estimated_monthly_cost_usd": 4.50,
    "average_tokens_per_project": 1500
  },
  "errors": {
    "total_retries_today": 8,
    "failed_last_24h": 2,
    "common_errors": [
      {"error": "OpenAI timeout", "count": 5},
      {"error": "GitHub rate limit", "count": 3}
    ]
  },
  "queue": {
    "pending_tasks": 12,
    "worker_count": 2,
    "average_wait_time_seconds": 15
  }
}
```

### **Alerting Setup:**

```python
# Critical alerts (immediate notification)
- Scoring failure rate > 5% (last 1 hour)
- Max retries exceeded > 5 (last 1 hour)
- OpenAI API down
- Celery worker down
- Daily OpenAI spend > $10

# Warning alerts (email notification)
- Scoring failure rate > 2% (last 24 hours)
- Average scoring time > 90 seconds
- Queue depth > 50 tasks
- GitHub API rate limit approaching

# Info alerts (dashboard only)
- Daily scoring summary
- Weekly cost report
- Monthly usage trends
```

---

## 🎨 UI CHANGES

### **1. Project Card Badge (Status Indicator):**

```jsx
// frontend/src/components/ProjectCard.tsx

function ScoringStatusBadge({ project }) {
  const statusConfig = {
    pending: {
      icon: '⏳',
      text: 'Scoring Pending',
      color: 'yellow',
      tooltip: 'Your project is queued for AI analysis'
    },
    processing: {
      icon: '🔄',
      text: 'Analyzing...',
      color: 'blue',
      tooltip: 'AI is currently analyzing your project'
    },
    completed: {
      icon: '✅',
      text: `Score: ${project.proof_score}`,
      color: 'green',
      tooltip: 'AI analysis completed'
    },
    failed: {
      icon: '⚠️',
      text: 'Scoring Failed',
      color: 'red',
      tooltip: 'Scoring failed. Contact support.'
    },
    retrying: {
      icon: '🔁',
      text: `Retrying (${project.scoring_retry_count}/10)`,
      color: 'orange',
      tooltip: 'Automatically retrying scoring after temporary error'
    }
  };

  const config = statusConfig[project.scoring_status] || statusConfig.pending;

  return (
    <Badge color={config.color} tooltip={config.tooltip}>
      {config.icon} {config.text}
    </Badge>
  );
}
```

### **2. Admin Scoring Settings Page:**

```jsx
// frontend/src/pages/admin/ScoringSettings.tsx

function ScoringSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScoringConfig();
  }, []);

  async function fetchScoringConfig() {
    const response = await api.get('/api/admin/scoring/config');
    setConfig(response.data);
    setLoading(false);
  }

  async function handleSave() {
    await api.put('/api/admin/scoring/config', config);
    toast.success('Scoring configuration updated');
  }

  return (
    <AdminLayout>
      <h1>Scoring Configuration</h1>

      {/* Main Scoring Weights */}
      <Card title="Main Scoring Weights (Total must equal 100)">
        <WeightSlider
          label="Code Quality Score"
          value={config.scoring_weights.quality_score}
          onChange={(val) => updateWeight('quality_score', val)}
          max={100}
        />
        <WeightSlider
          label="Team Verification Score"
          value={config.scoring_weights.verification_score}
          onChange={(val) => updateWeight('verification_score', val)}
          max={100}
        />
        <WeightSlider
          label="AI Validation Score"
          value={config.scoring_weights.validation_score}
          onChange={(val) => updateWeight('validation_score', val)}
          max={100}
        />
        <WeightSlider
          label="Community Score"
          value={config.scoring_weights.community_score}
          onChange={(val) => updateWeight('community_score', val)}
          max={100}
        />
        <div>Total: {calculateTotal(config.scoring_weights)}/100</div>
      </Card>

      {/* LLM Configuration */}
      <Card title="AI/LLM Configuration">
        <Select
          label="OpenAI Model"
          value={config.scoring_config.llm_model}
          options={['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']}
          onChange={(val) => updateConfig('llm_model', val)}
        />
        <NumberInput
          label="Max Retries"
          value={config.scoring_config.max_retries}
          min={1}
          max={20}
          onChange={(val) => updateConfig('max_retries', val)}
        />
        <NumberInput
          label="Retry Backoff (seconds)"
          value={config.scoring_config.retry_backoff_seconds}
          min={60}
          max={600}
          onChange={(val) => updateConfig('retry_backoff_seconds', val)}
        />
      </Card>

      {/* Rate Limiting */}
      <Card title="Rate Limiting">
        <NumberInput
          label="Hours Between Submissions"
          value={config.scoring_config.rate_limit_hours}
          min={1}
          max={24}
          onChange={(val) => updateConfig('rate_limit_hours', val)}
        />
      </Card>

      {/* Actions */}
      <div className="actions">
        <Button onClick={handleSave} variant="primary">
          Save Configuration
        </Button>
        <Button onClick={resetToDefaults} variant="secondary">
          Reset to Defaults
        </Button>
      </div>
    </AdminLayout>
  );
}
```

### **3. Project Detail Score Breakdown:**

```jsx
// frontend/src/pages/ProjectDetail.tsx

function ScoreBreakdown({ project }) {
  if (!project.score_breakdown) {
    return <div>Score breakdown not available</div>;
  }

  const { quality, verification, validation, community } = project.score_breakdown;

  return (
    <div className="score-breakdown">
      <h2>Detailed Score Breakdown</h2>

      {/* Code Quality */}
      <ScoreCard
        title="Code Quality"
        score={quality.score}
        maxScore={20}
        color="blue"
      >
        <div className="details">
          <ScoreItem label="Repo Structure" value={quality.repo_structure} max={10} />
          <ScoreItem label="README Quality" value={quality.readme_quality} max={10} />
          <ScoreItem label="File Organization" value={quality.file_organization} max={10} />
          <ScoreItem label="Code Patterns" value={quality.code_patterns} max={10} />
        </div>
      </ScoreCard>

      {/* Team Verification */}
      <ScoreCard
        title="Team Verification"
        score={verification.score}
        maxScore={20}
        color="green"
      >
        <div className="details">
          <ScoreItem label="Team Experience" value={verification.team_experience} max={20} />
          <div className="metadata">
            <span>Past Projects: {verification.past_projects}</span>
            <span>GitHub Contributions: {verification.contributions}</span>
          </div>
        </div>
      </ScoreCard>

      {/* AI Validation */}
      <ScoreCard
        title="AI Evaluation"
        score={validation.score}
        maxScore={30}
        color="purple"
      >
        <div className="ai-analysis">
          <ScoreItem label="Competitive Analysis" value={validation.competitive} max={100} />
          <ScoreItem label="Market Fit" value={validation.market_fit} max={100} />
          <ScoreItem label="Success Criteria" value={validation.success_criteria} max={100} />
          <ScoreItem label="Innovation" value={validation.evaluation} max={100} />

          <div className="ai-reasoning">
            <h4>AI Analysis Summary:</h4>
            <p>{validation.reasoning}</p>
          </div>
        </div>
      </ScoreCard>

      {/* Community */}
      <ScoreCard
        title="Community Engagement"
        score={community.score}
        maxScore={30}
        color="orange"
      >
        <div className="details">
          <ScoreItem label="Upvotes" value={community.upvotes} />
          <ScoreItem label="Comments" value={community.comments} />
        </div>
      </ScoreCard>
    </div>
  );
}
```

### **4. Admin Rescore Button:**

```jsx
// frontend/src/pages/admin/AdminProjectDetail.tsx

function AdminProjectActions({ project }) {
  const [rescoring, setRescoring] = useState(false);

  async function handleRescore() {
    setRescoring(true);
    try {
      await api.post(`/api/admin/projects/${project.id}/rescore`);
      toast.success('Project rescore queued successfully');
    } catch (error) {
      toast.error('Failed to queue rescore');
    } finally {
      setRescoring(false);
    }
  }

  return (
    <div className="admin-actions">
      <Button
        onClick={handleRescore}
        disabled={rescoring || project.scoring_status === 'processing'}
        icon={rescoring ? '🔄' : '🔁'}
      >
        {rescoring ? 'Rescoring...' : 'Rescore Project'}
      </Button>

      {project.scoring_error && (
        <Alert variant="error">
          <strong>Last Scoring Error:</strong>
          <pre>{project.scoring_error}</pre>
        </Alert>
      )}
    </div>
  );
}
```

---

## 📝 IMPLEMENTATION NOTES

### **Critical Success Factors:**

1. **OpenAI API Key Must Be Valid**
   - Test before deployment: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
   - Set up billing alerts in OpenAI dashboard
   - Monitor usage daily

2. **Celery Worker Must Be Running**
   - Separate process from Flask app
   - Auto-restart on crash (use supervisord/systemd)
   - Monitor with Flower (optional): `celery -A celery_app.celery flower`

3. **Redis Must Be Accessible**
   - Same Redis instance for both Flask and Celery
   - Use `rediss://` for TLS connections (Upstash)
   - Monitor connection count

4. **GitHub Tokens Must Be Stored**
   - Update auth.py to save token (line 373)
   - Encrypt tokens in database (recommended)
   - Handle token expiration gracefully

5. **Rate Limiting Must Work**
   - Test thoroughly before production
   - Clear error messages
   - Consider IP-based limiting as backup

### **Common Pitfalls to Avoid:**

1. **Do NOT block project creation on scoring**
   - Scoring must be async
   - User sees project immediately
   - Scoring happens in background

2. **Do NOT retry permanently failed errors**
   - Classify errors correctly
   - Don't waste retries on 404s, invalid keys, etc.

3. **Do NOT expose sensitive data**
   - Never return GitHub tokens in API responses
   - Never log OpenAI API keys
   - Sanitize all error messages shown to users

4. **Do NOT forget to update old projects**
   - Decision: Keep old projects as-is
   - But add migration path if needed later
   - Admin can manually rescore

5. **Do NOT skip testing**
   - Test retry logic thoroughly
   - Test rate limiting with real timing
   - Test all error paths

### **Optimization Opportunities (Post-MVP):**

1. **Caching:**
   - Cache GitHub API responses (7 days)
   - Cache OpenAI responses for similar projects
   - Use Redis for hot data

2. **Parallelization:**
   - Run GitHub analysis in parallel with LLM
   - Batch multiple LLM calls into one request
   - Use async/await throughout

3. **Cost Optimization:**
   - Use cheaper models for initial screening
   - Only use GPT-4o for high-stakes projects
   - Implement smart caching

4. **Performance:**
   - Add database indexes on scoring fields
   - Use connection pooling
   - Optimize SQL queries

---

## 🎯 SUCCESS CRITERIA

### **MVP Launch Checklist:**

```
✅ Database migrations applied successfully
✅ All dependencies installed
✅ Celery worker running in production
✅ OpenAI API key valid and tested
✅ GitHub OAuth updated to new scope
✅ Rate limiting working correctly
✅ Retry mechanism tested (at least 3 retries)
✅ Admin UI deployed and functional
✅ First 10 projects scored successfully
✅ Average scoring time < 60 seconds
✅ Success rate > 95%
✅ Error messages clear and helpful
✅ Monitoring dashboard live
✅ Alerting configured for failures
✅ Documentation complete
```

### **Post-Launch Metrics (Week 1):**

```
Target Metrics:
- Projects scored: > 100
- Success rate: > 98%
- Average score: 60-80 (realistic distribution)
- Average scoring time: < 45 seconds
- User complaints: < 5
- OpenAI cost per project: < $0.01
- Retry rate: < 5%
- Failed rate: < 1%
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### **Common Issues:**

**Issue: Celery worker not picking up tasks**
```bash
# Check if worker is running
ps aux | grep celery

# Check Redis connection
redis-cli -u $REDIS_URL ping

# Check Celery logs
celery -A celery_app.celery inspect active
```

**Issue: Scoring takes too long**
```bash
# Check OpenAI API latency
# Check GitHub API rate limit status
# Verify network connectivity from worker
```

**Issue: Rate limiting not working**
```bash
# Check database clock sync
# Verify rate limit config loaded
# Check user_id in rate limit query
```

**Issue: GitHub token not working**
```bash
# Verify token stored in database
# Check token scopes
# Test token with GitHub API directly:
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

---

## 📚 REFERENCES

### **Documentation:**
- OpenAI API Docs: https://platform.openai.com/docs
- PyGithub Docs: https://pygithub.readthedocs.io
- Celery Docs: https://docs.celeryq.dev
- Flask Docs: https://flask.palletsprojects.com

### **Tools:**
- Flower (Celery monitoring): https://flower.readthedocs.io
- Sentry (Error tracking): https://sentry.io
- Redis Insight (Redis GUI): https://redis.io/insight

### **Cost Calculators:**
- OpenAI Pricing: https://openai.com/api/pricing
- Estimated cost per project: $0.001-0.003 (GPT-4o-mini)

---

## 🔄 VERSION HISTORY

**v1.0** (2025-01-17)
- Initial implementation plan
- Complete architecture design
- All decisions documented
- Ready for implementation

---

## ✅ NEXT STEPS

**To begin implementation, confirm:**
1. OpenAI API key obtained and added to .env
2. Database backup taken (optional, since dummy data)
3. Celery worker deployment plan confirmed
4. All questions answered and decisions approved

**Then execute phases in order:**
1. Phase 1: Foundation (Day 1)
2. Phase 2: Core Services (Day 2-3)
3. Phase 3: Database Models & Async Tasks (Day 4)
4. Phase 4: API Routes (Day 5)
5. Phase 5: Admin UI (Day 6)
6. Phase 6: Testing & Deployment (Day 7)

---

**Document maintained by:** Claude Code
**Last updated:** 2025-01-17
**Status:** Ready for Implementation ✅
