# TripIt Backend - Phase 7 & 8 Implementation Plan

## Overview
This document outlines the comprehensive testing, deployment, and production readiness strategy for the TripIt backend API. The plan excludes AI/Blockchain functionality and focuses on core travel features.

---

## PHASE 7: API TESTING & VALIDATION

### 7.1 Test Infrastructure Setup

#### Directory Structure
```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py                    # Pytest configuration & fixtures
│   ├── test_config.py                 # Test environment configuration
│   │
│   ├── unit/                          # Unit tests (individual functions)
│   │   ├── __init__.py
│   │   ├── test_models.py
│   │   ├── test_utils.py
│   │   └── test_helpers.py
│   │
│   ├── integration/                   # Integration tests (API endpoints)
│   │   ├── __init__.py
│   │   ├── auth/
│   │   │   ├── test_auth_register.py
│   │   │   ├── test_auth_login.py
│   │   │   ├── test_auth_oauth.py
│   │   │   └── test_auth_tokens.py
│   │   │
│   │   ├── travel/
│   │   │   ├── test_itineraries.py           # 16 endpoints
│   │   │   ├── test_itineraries_crud.py
│   │   │   ├── test_itineraries_filters.py
│   │   │   ├── test_safety_ratings.py        # 10 endpoints
│   │   │   ├── test_travel_intel.py          # 11 endpoints
│   │   │   ├── test_travel_groups.py         # 10 endpoints
│   │   │   └── test_women_safety.py          # 7 endpoints
│   │   │
│   │   ├── social/
│   │   │   ├── test_comments.py
│   │   │   ├── test_chains.py
│   │   │   ├── test_chain_posts.py
│   │   │   └── test_direct_messages.py
│   │   │
│   │   ├── users/
│   │   │   ├── test_users_profile.py
│   │   │   ├── test_users_search.py
│   │   │   └── test_users_stats.py
│   │   │
│   │   ├── admin/
│   │   │   ├── test_admin_auth.py
│   │   │   ├── test_admin_users.py
│   │   │   ├── test_admin_content.py
│   │   │   └── test_admin_stats.py
│   │   │
│   │   └── performance/
│   │       ├── test_prefetch.py
│   │       ├── test_caching.py
│   │       └── test_leaderboard.py
│   │
│   ├── load/                          # Load & stress tests
│   │   ├── __init__.py
│   │   ├── test_concurrent_requests.py
│   │   ├── test_database_pooling.py
│   │   └── test_cache_performance.py
│   │
│   └── fixtures/                      # Test data
│       ├── __init__.py
│       ├── users.json
│       ├── itineraries.json
│       ├── safety_ratings.json
│       └── travel_groups.json
```

### 7.2 Endpoint Coverage (60+ Travel Endpoints)

#### Authentication Endpoints (12)
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user
- POST `/api/auth/refresh` - Refresh JWT token
- POST `/api/auth/logout` - Logout user
- POST `/api/auth/verify-email` - Email verification
- GET `/api/auth/github/connect` - GitHub OAuth connect
- GET `/api/auth/github/login` - GitHub OAuth login
- GET `/api/auth/github/callback` - GitHub OAuth callback
- POST `/api/auth/github/disconnect` - GitHub disconnect
- POST `/api/auth/otp/request` - OTP request
- POST `/api/auth/otp/verify` - OTP verification

#### Itinerary Endpoints (16)
- GET `/api/itineraries` - List itineraries (with filters)
- GET `/api/itineraries/<id>` - Get single itinerary
- POST `/api/itineraries` - Create itinerary
- PUT/PATCH `/api/itineraries/<id>` - Update itinerary
- DELETE `/api/itineraries/<id>` - Delete itinerary
- POST `/api/itineraries/<id>/feature` - Feature itinerary (admin)
- POST `/api/itineraries/<id>/rating` - Rate itinerary
- POST `/api/itineraries/<id>/view` - Track itinerary view
- GET `/api/itineraries/leaderboard` - Get top itineraries
- GET `/api/itineraries/featured` - Get featured itineraries
- GET `/api/itineraries/by-destination/<dest>` - Filter by destination
- GET `/api/itineraries/rising-stars` - Get trending itineraries
- GET `/api/itineraries?activity=hiking` - Filter by activity
- GET `/api/itineraries?women_safe=true` - Women-safe filter
- GET `/api/itineraries?has_gps=true` - GPS filter
- GET `/api/itineraries?difficulty=moderate` - Difficulty filter

#### Safety Rating Endpoints (10)
- POST `/api/safety-ratings` - Add/update safety rating
- GET `/api/safety-ratings/<itinerary_id>` - Get ratings for itinerary
- GET `/api/safety-ratings/<rating_id>` - Get single rating
- PUT/PATCH `/api/safety-ratings/<rating_id>` - Update rating
- DELETE `/api/safety-ratings/<rating_id>` - Delete rating
- GET `/api/safety-ratings/user/ratings` - Get user's ratings
- POST `/api/safety-ratings/<rating_id>/helpful` - Mark helpful
- POST `/api/safety-ratings/<rating_id>/unhelpful` - Mark unhelpful
- GET `/api/safety-ratings?type=accommodation` - Filter by type
- GET `/api/safety-ratings?min_score=4` - Filter by score

#### Travel Intel Endpoints (11)
- GET `/api/travel-intel` - Get travel intel for itinerary
- POST `/api/travel-intel` - Add travel intel
- GET `/api/travel-intel/<intel_id>` - Get single intel
- PUT/PATCH `/api/travel-intel/<intel_id>` - Update intel
- DELETE `/api/travel-intel/<intel_id>` - Delete intel
- POST `/api/travel-intel/<intel_id>/helpful` - Mark helpful
- POST `/api/travel-intel/<intel_id>/unhelpful` - Mark unhelpful
- GET `/api/travel-intel/user/intel` - Get user's intel
- POST `/api/travel-intel/<intel_id>/respond` - Respond to intel
- GET `/api/travel-intel/stats/<itinerary_id>` - Get intel stats
- GET `/api/travel-intel?type=tip` - Filter by type

#### Travel Groups Endpoints (10)
- GET `/api/travel-groups` - List travel groups
- POST `/api/travel-groups` - Create group
- GET `/api/travel-groups/<group_id>` - Get group details
- PUT/PATCH `/api/travel-groups/<group_id>` - Update group
- DELETE `/api/travel-groups/<group_id>` - Delete group
- POST `/api/travel-groups/<group_id>/join` - Join group
- POST `/api/travel-groups/<group_id>/leave` - Leave group
- GET `/api/travel-groups/<group_id>/members` - Get members
- POST `/api/travel-groups/<group_id>/invite` - Invite member
- GET `/api/travel-groups/matching` - Get matching groups

#### Women Safety Endpoints (7)
- GET `/api/women-safety/guides` - List women travel guides
- GET `/api/women-safety/guides/<guide_id>` - Get guide details
- POST `/api/women-safety/guides/<guide_id>/book` - Book guide
- POST `/api/women-safety/guides/<guide_id>/reviews` - Add review
- GET `/api/women-safety/resources` - List safety resources
- POST `/api/women-safety/resources/<resource_id>/helpful` - Mark helpful
- GET `/api/women-safety/settings` - Get safety settings
- PUT `/api/women-safety/settings` - Update safety settings

### 7.3 Test Categories

#### A. Request/Response Validation Tests
```python
# Example: tests/integration/travel/test_itineraries.py
def test_create_itinerary_valid_data(client, auth_token):
    """Test creating itinerary with valid data"""
    data = {
        "title": "3-Day Tokyo Adventure",
        "destination": "Tokyo, Japan",
        "duration_days": 3,
        "budget_range": "medium",
        "activity_tags": ["cultural", "food"],
        "description": "Experience authentic Tokyo"
    }

    response = client.post(
        '/api/itineraries',
        json=data,
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 201
    assert response.json['data']['title'] == data['title']
    assert response.json['data']['destination'] == data['destination']

def test_create_itinerary_missing_fields(client, auth_token):
    """Test creating itinerary with missing required fields"""
    data = {"title": "Test"}  # Missing destination

    response = client.post(
        '/api/itineraries',
        json=data,
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 400
    assert 'destination' in str(response.json['message']).lower()
```

#### B. Authorization & Permission Tests
```python
def test_update_itinerary_not_owner(client, auth_token, other_user_itinerary):
    """Test that users cannot update others' itineraries"""
    response = client.put(
        f'/api/itineraries/{other_user_itinerary.id}',
        json={"title": "Hacked"},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 403

def test_admin_feature_itinerary(client, admin_token, itinerary):
    """Test that admins can feature itineraries"""
    response = client.post(
        f'/api/itineraries/{itinerary.id}/feature',
        headers={'Authorization': f'Bearer {admin_token}'}
    )

    assert response.status_code == 200
```

#### C. Error Handling Tests
```python
def test_get_nonexistent_itinerary(client):
    """Test fetching non-existent itinerary"""
    response = client.get('/api/itineraries/nonexistent-id')

    assert response.status_code == 404
    assert response.json['status'] == 'error'

def test_malformed_json(client, auth_token):
    """Test handling of malformed JSON"""
    response = client.post(
        '/api/itineraries',
        data='invalid json{',
        headers={
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
    )

    assert response.status_code == 400
```

#### D. Rate Limiting Tests
```python
def test_rate_limiting(client, auth_token):
    """Test rate limiting on API endpoints"""
    # Make 100 rapid requests
    for i in range(100):
        response = client.get(
            '/api/itineraries',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

    # Should be rate limited after threshold
    assert response.status_code == 429
```

#### E. Cache Invalidation Tests
```python
def test_cache_invalidation_on_update(client, auth_token, itinerary):
    """Test that cache is invalidated when itinerary is updated"""
    # First request - populates cache
    response1 = client.get(f'/api/itineraries/{itinerary.id}')

    # Update itinerary
    client.put(
        f'/api/itineraries/{itinerary.id}',
        json={"title": "Updated Title"},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    # Second request - should reflect update
    response2 = client.get(f'/api/itineraries/{itinerary.id}')

    assert response2.json['data']['title'] == "Updated Title"
```

### 7.4 Postman/Insomnia Collection

#### Collection Structure
```json
{
  "info": {
    "name": "TripIt Backend API",
    "description": "Complete API collection for TripIt backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000",
      "type": "string"
    },
    {
      "key": "access_token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/register",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test123!\",\n  \"username\": \"testuser\",\n  \"full_name\": \"Test User\"\n}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test123!\"\n}"
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "pm.environment.set('access_token', response.data.access_token);"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Itineraries",
      "item": [
        {
          "name": "List Itineraries",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/api/itineraries?page=1&per_page=20&sort=trending",
              "query": [
                {"key": "page", "value": "1"},
                {"key": "per_page", "value": "20"},
                {"key": "sort", "value": "trending"}
              ]
            }
          }
        },
        {
          "name": "Create Itinerary",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/itineraries",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"3-Day Tokyo Adventure\",\n  \"destination\": \"Tokyo, Japan\",\n  \"duration_days\": 3,\n  \"budget_range\": \"medium\",\n  \"activity_tags\": [\"cultural\", \"food\"],\n  \"description\": \"Experience authentic Tokyo\"\n}"
            }
          }
        }
      ]
    }
  ]
}
```

### 7.5 Load Testing Strategy

#### A. Concurrent Request Testing
```python
# tests/load/test_concurrent_requests.py
import concurrent.futures
import time

def test_concurrent_itinerary_reads(client, itinerary_ids):
    """Test handling 100 concurrent itinerary read requests"""

    def fetch_itinerary(itinerary_id):
        start = time.time()
        response = client.get(f'/api/itineraries/{itinerary_id}')
        duration = time.time() - start
        return response.status_code, duration

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        futures = [executor.submit(fetch_itinerary, id) for id in itinerary_ids * 10]
        results = [f.result() for f in futures]

    success_count = sum(1 for status, _ in results if status == 200)
    avg_duration = sum(duration for _, duration in results) / len(results)

    assert success_count / len(results) > 0.95  # 95% success rate
    assert avg_duration < 0.5  # Average response < 500ms
```

#### B. Database Connection Pool Testing
```python
def test_database_connection_pooling():
    """Test database connection pool doesn't exhaust under load"""

    # Simulate 50 concurrent database operations
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = []
        for i in range(50):
            futures.append(executor.submit(query_database))

        results = [f.result() for f in futures]

    # All should succeed without pool exhaustion
    assert all(results)
```

#### C. Cache Performance Testing
```python
def test_cache_hit_performance(client, itinerary_id):
    """Test cache improves performance significantly"""

    # First request (cache miss)
    start = time.time()
    response1 = client.get(f'/api/itineraries/{itinerary_id}')
    duration_uncached = time.time() - start

    # Second request (cache hit)
    start = time.time()
    response2 = client.get(f'/api/itineraries/{itinerary_id}')
    duration_cached = time.time() - start

    # Cached should be at least 5x faster
    assert duration_cached < duration_uncached / 5
```

---

## PHASE 8: DEPLOYMENT PREPARATION

### 8.1 Docker Containerization

#### Dockerfile (Production-Optimized)
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=5)"

# Run with gunicorn
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]
```

#### docker-compose.yml (Full Stack)
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: tripit_postgres
    environment:
      POSTGRES_USER: ${DB_USER:-tripit}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-tripit_password}
      POSTGRES_DB: ${DB_NAME:-tripit_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-tripit}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tripit_network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: tripit_redis
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tripit_network

  # Flask Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tripit_backend
    env_file:
      - ./backend/.env
    environment:
      - FLASK_ENV=${FLASK_ENV:-production}
      - DATABASE_URL=postgresql://${DB_USER:-tripit}:${DB_PASSWORD:-tripit_password}@postgres:5432/${DB_NAME:-tripit_db}
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - backend_logs:/app/logs
    networks:
      - tripit_network
    restart: unless-stopped

  # Celery Worker (Background Tasks)
  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tripit_celery_worker
    command: celery -A celery_app worker --loglevel=info --concurrency=4
    env_file:
      - ./backend/.env
    environment:
      - DATABASE_URL=postgresql://${DB_USER:-tripit}:${DB_PASSWORD:-tripit_password}@postgres:5432/${DB_NAME:-tripit_db}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    networks:
      - tripit_network
    restart: unless-stopped

  # Celery Beat Scheduler
  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tripit_celery_beat
    command: celery -A celery_app beat --loglevel=info
    env_file:
      - ./backend/.env
    environment:
      - DATABASE_URL=postgresql://${DB_USER:-tripit}:${DB_PASSWORD:-tripit_password}@postgres:5432/${DB_NAME:-tripit_db}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    networks:
      - tripit_network
    restart: unless-stopped

  # Nginx Reverse Proxy (Production)
  nginx:
    image: nginx:alpine
    container_name: tripit_nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - tripit_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  backend_logs:

networks:
  tripit_network:
    driver: bridge
```

#### .dockerignore
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
dist/
*.egg-info/

# Environment
.env
.env.local
.env.prod

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Testing
.pytest_cache/
htmlcov/
.coverage

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
celerybeat-schedule*

# Git
.git/
.gitignore
```

### 8.2 CI/CD Pipeline (GitHub Actions)

#### .github/workflows/backend-ci.yml
```yaml
name: Backend CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'

jobs:
  # Job 1: Linting & Code Quality
  lint:
    name: Lint & Code Quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install flake8 black isort

      - name: Run Black (code formatter check)
        run: |
          black --check backend/

      - name: Run isort (import sorting check)
        run: |
          isort --check-only backend/

      - name: Run Flake8 (linting)
        run: |
          flake8 backend/ --max-line-length=120 --exclude=migrations

  # Job 2: Unit & Integration Tests
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Cache pip dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('backend/requirements.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-flask

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379/0
          FLASK_ENV: testing
          SECRET_KEY: test-secret-key
          JWT_SECRET_KEY: test-jwt-secret
        run: |
          cd backend
          pytest tests/ \
            --cov=. \
            --cov-report=xml \
            --cov-report=html \
            --cov-report=term-missing \
            -v

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
          flags: backend
          name: backend-coverage

  # Job 3: Security Scanning
  security:
    name: Security Scanning
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install safety
        run: pip install safety

      - name: Run safety check
        run: |
          cd backend
          safety check --file requirements.txt

      - name: Run Bandit (security linter)
        run: |
          pip install bandit
          bandit -r backend/ -ll -i

  # Job 4: Build Docker Image
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test, security]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/tripit-backend:latest
            ${{ secrets.DOCKER_USERNAME }}/tripit-backend:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/tripit-backend:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/tripit-backend:buildcache,mode=max

  # Job 5: Deploy to Staging (on develop branch)
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Deploy to Staging Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USERNAME }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/tripit
            docker-compose pull backend
            docker-compose up -d backend
            docker-compose exec backend flask db upgrade

  # Job 6: Deploy to Production (on main branch)
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Deploy to Production Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USERNAME }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/tripit
            docker-compose pull backend
            docker-compose up -d backend
            docker-compose exec backend flask db upgrade

      - name: Health Check
        run: |
          sleep 30
          curl -f ${{ secrets.PROD_URL }}/health || exit 1
```

### 8.3 Environment Configuration

#### .env.example (Complete Template)
```bash
# ======================
# FLASK CONFIGURATION
# ======================
FLASK_ENV=production
FLASK_APP=app.py
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars
DEBUG=false

# ======================
# DATABASE CONFIGURATION
# ======================
# Local: postgresql://user:password@localhost:5432/tripit_db
# Docker: postgresql://tripit:tripit_password@postgres:5432/tripit_db
# Neon: postgresql://user:password@ep-example.us-east-2.aws.neon.tech/tripit_db
DATABASE_URL=postgresql://user:password@localhost:5432/tripit_db

# Database Connection Pool (Production-Optimized)
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_TIMEOUT=10
DB_POOL_RECYCLE=1800

# ======================
# JWT CONFIGURATION
# ======================
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production-min-32-chars
JWT_ACCESS_TOKEN_EXPIRES=2592000  # 30 days in seconds
JWT_REFRESH_TOKEN_EXPIRES=7776000  # 90 days in seconds

# ======================
# REDIS CACHE CONFIGURATION
# ======================
# Local: redis://localhost:6379/0
# Docker: redis://redis:6379/0
# Upstash: rediss://default:PASSWORD@host.upstash.io:6379
REDIS_URL=redis://localhost:6379/0

# Rate Limiting Redis (separate database)
RATELIMIT_STORAGE_URL=redis://localhost:6379/1
RATELIMIT_ENABLED=true

# ======================
# CORS CONFIGURATION
# ======================
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://tripit.app

# ======================
# FILE UPLOAD (PINATA IPFS)
# ======================
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_api_key
PINATA_JWT=your_pinata_jwt_token

# ======================
# EMAIL CONFIGURATION (ZEPTOMAIL)
# ======================
ZEPTO_ENDPOINT=https://api.zeptomail.com/v1.1/email
ZEPTO_SEND_MAIL_TOKEN=your_zeptomail_token
ZEPTO_SENDER_ADDRESS=noreply@tripit.app
ZEPTO_SENDER_NAME=TripIt
FRONTEND_APP_URL=https://tripit.app

# ======================
# OAUTH CONFIGURATION
# ======================
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=https://api.tripit.app/api/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://api.tripit.app/api/auth/google/callback

# ======================
# CELERY CONFIGURATION
# ======================
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# ======================
# PERFORMANCE TOGGLES
# ======================
# Cache Warmer (disable in dev for faster startup)
DISABLE_CACHE_WARMER=false
IN_DEV=false

# Materialized View Worker
DISABLE_MV_WORKER=false

# Celery Background Workers
DISABLE_CELERY=false

# Daily Reconciliation
DISABLE_RECONCILIATION=false
RECONCILIATION_HOUR=3

# ======================
# MONITORING & LOGGING
# ======================
LOG_LEVEL=INFO
SENTRY_DSN=  # Optional: Sentry error tracking

# ======================
# SECURITY
# ======================
SESSION_COOKIE_SECURE=true  # Set to false for local dev
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax

# ======================
# PRODUCTION OVERRIDES
# ======================
# Uncomment for production
# FLASK_ENV=production
# DEBUG=false
# SESSION_COOKIE_SECURE=true
# DB_POOL_SIZE=30
# DB_MAX_OVERFLOW=60
```

#### Production vs Development Configs

**Development (.env.dev)**
```bash
FLASK_ENV=development
DEBUG=true
IN_DEV=true
DISABLE_CACHE_WARMER=true
DATABASE_URL=postgresql://user:password@localhost:5432/tripit_dev
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SESSION_COOKIE_SECURE=false
```

**Production (.env.prod)**
```bash
FLASK_ENV=production
DEBUG=false
IN_DEV=false
DISABLE_CACHE_WARMER=false
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/tripit_prod
REDIS_URL=rediss://default:PASSWORD@prod-redis.upstash.io:6379
CORS_ORIGINS=https://tripit.app,https://www.tripit.app
SESSION_COOKIE_SECURE=true
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=60
```

### 8.4 Database Optimization

#### A. Connection Pooling Configuration
```python
# config.py - Production-optimized pool settings
SQLALCHEMY_ENGINE_OPTIONS = {
    # Base pool size (always maintained)
    'pool_size': 30,              # Production: 30, Dev: 20

    # Overflow pool (additional connections under load)
    'max_overflow': 60,           # Production: 60, Dev: 40

    # Connection timeout
    'pool_timeout': 10,           # Wait 10s for connection

    # Recycle connections (prevent stale connections)
    'pool_recycle': 1800,         # 30 minutes

    # Pre-ping to test connections
    'pool_pre_ping': True,        # Test before use

    # Connection args
    'connect_args': {
        'connect_timeout': 10,
        'application_name': 'tripit_backend',
    }
}
```

#### B. Index Creation Script
```sql
-- scripts/create_indexes.sql
-- Run this after initial database setup

-- Itineraries
CREATE INDEX idx_itineraries_destination ON itineraries(destination);
CREATE INDEX idx_itineraries_created_at ON itineraries(created_at DESC);
CREATE INDEX idx_itineraries_traveler_id ON itineraries(traveler_id);
CREATE INDEX idx_itineraries_is_deleted ON itineraries(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_itineraries_featured ON itineraries(is_featured) WHERE is_featured = true;
CREATE INDEX idx_itineraries_activity_tags ON itineraries USING GIN(activity_tags);

-- Safety Ratings
CREATE INDEX idx_safety_ratings_itinerary ON safety_ratings(itinerary_id);
CREATE INDEX idx_safety_ratings_traveler ON safety_ratings(traveler_id);
CREATE INDEX idx_safety_ratings_score ON safety_ratings(overall_safety_score);
CREATE INDEX idx_safety_ratings_created ON safety_ratings(created_at DESC);

-- Travel Intel
CREATE INDEX idx_travel_intel_itinerary ON travel_intel(itinerary_id);
CREATE INDEX idx_travel_intel_author ON travel_intel(author_id);
CREATE INDEX idx_travel_intel_type ON travel_intel(intel_type);
CREATE INDEX idx_travel_intel_parent ON travel_intel(parent_intel_id);

-- Travel Groups
CREATE INDEX idx_travel_groups_destination ON travel_groups(destination);
CREATE INDEX idx_travel_groups_creator ON travel_groups(creator_id);
CREATE INDEX idx_travel_groups_status ON travel_groups(status);

-- Users/Travelers
CREATE INDEX idx_travelers_email ON travelers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_travelers_username ON travelers(username);

-- Composite indexes for common queries
CREATE INDEX idx_itineraries_dest_date ON itineraries(destination, created_at DESC);
CREATE INDEX idx_safety_ratings_itin_score ON safety_ratings(itinerary_id, overall_safety_score);
```

#### C. Query Optimization Examples
```python
# Use select_related/joinedload to avoid N+1 queries
itineraries = Itinerary.query.options(
    joinedload(Itinerary.traveler),
    joinedload(Itinerary.safety_ratings)
).filter_by(is_deleted=False).all()

# Use lazy='dynamic' for large collections
class Itinerary(db.Model):
    safety_ratings = db.relationship('SafetyRating', lazy='dynamic')

# Paginate large result sets
page = request.args.get('page', 1, type=int)
per_page = request.args.get('per_page', 20, type=int)
itineraries = Itinerary.query.paginate(page=page, per_page=per_page)
```

#### D. Backup & Restore Procedures

**Automated Backup Script (backup.sh)**
```bash
#!/bin/bash
# backend/scripts/backup.sh

# Configuration
DB_NAME="tripit_prod"
DB_USER="tripit"
DB_HOST="localhost"
BACKUP_DIR="/backups/tripit"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tripit_backup_$TIMESTAMP.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup with compression
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "tripit_backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_FILE s3://tripit-backups/$(basename $BACKUP_FILE)

echo "Backup completed: $BACKUP_FILE"
```

**Restore Script (restore.sh)**
```bash
#!/bin/bash
# backend/scripts/restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# Restore from backup
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --clean \
  --if-exists \
  $BACKUP_FILE

echo "Restore completed from: $BACKUP_FILE"
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing (unit, integration, load)
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] DNS configured
- [ ] Backup procedures tested

### Deployment Steps
- [ ] Stop maintenance page
- [ ] Pull latest code
- [ ] Run database migrations
- [ ] Rebuild Docker images
- [ ] Update docker-compose
- [ ] Start services
- [ ] Run health checks
- [ ] Monitor logs for errors
- [ ] Test critical endpoints
- [ ] Update documentation

### Post-Deployment
- [ ] Verify all endpoints responding
- [ ] Check database connections
- [ ] Verify Redis cache working
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify background jobs running
- [ ] Test user flows
- [ ] Send deployment notification

### Rollback Plan
- [ ] Keep previous Docker images tagged
- [ ] Database backup before deployment
- [ ] Quick rollback script ready
- [ ] Monitoring alerts configured
- [ ] Team notification process

---

## MONITORING & OBSERVABILITY

### Health Check Endpoints
```python
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check"""
    return jsonify({'status': 'ok'}), 200

@app.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """Detailed health check with dependencies"""
    health = {
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'checks': {}
    }

    # Database check
    try:
        db.session.execute(text('SELECT 1'))
        health['checks']['database'] = 'ok'
    except Exception as e:
        health['checks']['database'] = 'error'
        health['status'] = 'degraded'

    # Redis check
    try:
        from utils.cache import CacheService
        CacheService.redis_client.ping()
        health['checks']['redis'] = 'ok'
    except Exception as e:
        health['checks']['redis'] = 'error'
        health['status'] = 'degraded'

    return jsonify(health), 200 if health['status'] == 'ok' else 503
```

### Logging Configuration
```python
# config.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    """Configure application logging"""

    # Create logs directory
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # File handler
    file_handler = RotatingFileHandler(
        'logs/tripit.log',
        maxBytes=10240000,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)

    # Add handlers
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('TripIt backend startup')
```

---

## PERFORMANCE BENCHMARKS

### Target Metrics (Production)
- **Response Time**: < 200ms (p95)
- **Throughput**: 1000 req/sec
- **Error Rate**: < 0.1%
- **Database Connections**: < 80% pool utilization
- **Cache Hit Rate**: > 85%
- **Uptime**: 99.9%

### Load Testing Scenarios
1. **Normal Load**: 100 concurrent users
2. **Peak Load**: 500 concurrent users
3. **Stress Test**: 1000+ concurrent users
4. **Spike Test**: Sudden 10x traffic increase

---

## SECURITY CONSIDERATIONS

### API Security Checklist
- [ ] HTTPS enforced in production
- [ ] JWT tokens with expiration
- [ ] Password hashing (bcrypt)
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] SQL injection prevention (ORM)
- [ ] XSS prevention
- [ ] CSRF tokens for state-changing ops
- [ ] Input validation on all endpoints
- [ ] Secure headers (X-Frame-Options, etc.)

### Database Security
- [ ] Connection string in environment vars
- [ ] Database user with minimal permissions
- [ ] Regular backups
- [ ] Encrypted backups
- [ ] No sensitive data in logs
- [ ] Database connection pooling limits

---

## APPENDIX

### Useful Commands

**Run Tests**
```bash
# All tests
pytest tests/ -v

# Specific category
pytest tests/integration/travel/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html

# Load tests only
pytest tests/load/ -v
```

**Docker Commands**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Run migrations
docker-compose exec backend flask db upgrade

# Shell access
docker-compose exec backend bash
```

**Database Commands**
```bash
# Create migration
flask db migrate -m "description"

# Apply migrations
flask db upgrade

# Rollback
flask db downgrade

# Database shell
flask shell
```

---

**End of Phase 7 & 8 Plan**
