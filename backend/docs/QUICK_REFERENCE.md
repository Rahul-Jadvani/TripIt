# Phase 7 & 8 Quick Reference Guide

## Quick Start

### Run Tests
```bash
# All tests
pytest tests/ -v

# Specific category
pytest tests/integration/travel/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html

# Watch mode (re-run on changes)
pytest-watch tests/
```

### Docker Commands
```bash
# Development
docker-compose up -d                    # Start all services
docker-compose logs -f backend          # View logs
docker-compose exec backend bash        # Shell access
docker-compose down                     # Stop services

# Production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Commands
```bash
# Migrations
docker-compose exec backend flask db migrate -m "description"
docker-compose exec backend flask db upgrade
docker-compose exec backend flask db downgrade

# Backup
docker-compose exec postgres pg_dump -U tripit tripit_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U tripit tripit_db < backup.sql
```

---

## Test File Structure

```
tests/
├── conftest.py                         # Shared fixtures
├── unit/                               # 10 files
│   ├── test_models.py
│   ├── test_utils.py
│   └── test_helpers.py
├── integration/
│   ├── auth/                          # 8 files
│   │   ├── test_auth_register.py
│   │   ├── test_auth_login.py
│   │   └── test_auth_tokens.py
│   ├── travel/                        # 25 files
│   │   ├── test_itineraries_crud.py
│   │   ├── test_itineraries_filters.py
│   │   ├── test_safety_ratings.py
│   │   ├── test_travel_intel.py
│   │   └── test_travel_groups.py
│   └── load/                          # 5 files
│       ├── test_concurrent_requests.py
│       └── test_cache_performance.py
└── fixtures/                          # 4 files
    └── test_data.json
```

---

## Environment Variables

### Required (Production)
```bash
# Core
SECRET_KEY=64_char_random_string
JWT_SECRET_KEY=64_char_random_string

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=https://tripit.app,https://api.tripit.app
```

### Optional
```bash
# Email
ZEPTO_SEND_MAIL_TOKEN=your_token
ZEPTO_SENDER_ADDRESS=noreply@tripit.app

# OAuth
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

## API Endpoints Quick Reference

### Authentication
- POST `/api/auth/register` - Register
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Current user
- POST `/api/auth/refresh` - Refresh token

### Itineraries
- GET `/api/itineraries` - List (with filters)
- POST `/api/itineraries` - Create
- GET `/api/itineraries/<id>` - Get one
- PUT `/api/itineraries/<id>` - Update
- DELETE `/api/itineraries/<id>` - Delete

### Safety Ratings
- POST `/api/safety-ratings` - Add rating
- GET `/api/safety-ratings/<itinerary_id>` - Get ratings
- PUT `/api/safety-ratings/<rating_id>` - Update
- DELETE `/api/safety-ratings/<rating_id>` - Delete

### Travel Intel
- GET `/api/travel-intel?itinerary_id=<id>` - List
- POST `/api/travel-intel` - Create
- PUT `/api/travel-intel/<intel_id>` - Update
- POST `/api/travel-intel/<intel_id>/helpful` - Mark helpful

### Travel Groups
- GET `/api/travel-groups` - List
- POST `/api/travel-groups` - Create
- POST `/api/travel-groups/<id>/join` - Join
- POST `/api/travel-groups/<id>/leave` - Leave

---

## Common Filters

### Itineraries
```
?destination=Tokyo                    # Filter by destination
?activity=hiking&activity=nature      # Filter by activities
?women_safe=true                      # Women-safe only
?has_gps=true                         # With GPS coordinates
?difficulty=easy                      # By difficulty
?sort=trending                        # Sort options
?page=1&per_page=20                  # Pagination
```

### Safety Ratings
```
?type=accommodation                   # By type
?min_score=4                         # Minimum score
```

### Travel Intel
```
?type=tip                            # By type (tip, warning, question)
?sort=helpful                        # Sort by helpfulness
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Response Time (p95) | < 200ms | Most requests |
| Response Time (p99) | < 500ms | Peak times |
| Throughput | 1000 req/sec | Sustained |
| Error Rate | < 0.1% | Production |
| Cache Hit Rate | > 85% | Redis |
| Database Pool | < 80% utilization | PostgreSQL |
| Uptime | 99.9% | Annual |

---

## Security Headers

All API responses include:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## Deployment Workflow

### Development → Staging
```bash
# 1. Create PR to develop branch
git checkout -b feature/new-feature
git push origin feature/new-feature

# 2. GitHub Actions runs:
#    - Linting
#    - Tests
#    - Security scan
#    - Build image

# 3. Merge to develop
#    - Auto-deploy to staging

# 4. Verify on staging
curl https://staging.api.tripit.app/health
```

### Staging → Production
```bash
# 1. Create PR from develop to main
# 2. GitHub Actions runs full suite
# 3. Merge to main
#    - Auto-deploy to production
# 4. Verify health check
curl https://api.tripit.app/health
```

---

## Troubleshooting

### Tests Failing
```bash
# Clear pytest cache
pytest --cache-clear

# Run specific test
pytest tests/integration/travel/test_itineraries.py::test_create_itinerary -v

# Debug mode
pytest tests/ -v -s --pdb
```

### Docker Issues
```bash
# Rebuild containers
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Check container status
docker-compose ps
```

### Database Issues
```bash
# Check connections
docker-compose exec postgres psql -U tripit -c "SELECT count(*) FROM pg_stat_activity;"

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend flask db upgrade
```

### Cache Issues
```bash
# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Check Redis status
docker-compose exec redis redis-cli INFO
```

---

## Useful Scripts

### Generate Test Coverage Report
```bash
pytest tests/ --cov=. --cov-report=html
open htmlcov/index.html  # View in browser
```

### Run Load Tests
```bash
pytest tests/load/ -v --maxfail=1
```

### Check Code Quality
```bash
black backend/ --check
isort backend/ --check-only
flake8 backend/ --max-line-length=120
```

### Generate Migration
```bash
docker-compose exec backend flask db migrate -m "Add new field"
docker-compose exec backend flask db upgrade
```

---

## File Locations

### Documentation
- `backend/docs/PHASE_7_8_PLAN.md` - Full implementation plan
- `backend/docs/TEST_FILES_STRUCTURE.md` - Test file templates
- `backend/docs/DEPLOYMENT_GUIDE.md` - Docker & deployment
- `backend/docs/PHASE_7_8_SUMMARY.md` - Executive summary
- `backend/docs/TripIt_Postman_Collection.json` - API collection

### Configuration
- `backend/Dockerfile` - Container definition
- `backend/docker-compose.yml` - Dev stack
- `backend/docker-compose.prod.yml` - Prod stack
- `backend/.dockerignore` - Build exclusions
- `nginx/nginx.conf` - Reverse proxy config
- `.github/workflows/backend-ci.yml` - CI/CD pipeline

---

## Contact & Support

### Resources
- **Documentation**: `/backend/docs/`
- **Postman Collection**: `/backend/docs/TripIt_Postman_Collection.json`
- **Test Examples**: `/backend/tests/`

### Getting Help
1. Check documentation in `/backend/docs/`
2. Review test examples in `/backend/tests/`
3. Check logs: `docker-compose logs -f backend`
4. Review GitHub Actions runs for CI/CD issues

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-12-02
