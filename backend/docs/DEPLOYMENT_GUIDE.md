# TripIt Backend - Complete Deployment Guide

## Table of Contents
1. [Docker Setup](#docker-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Docker Setup

### Project Structure
```
TripIt-dev/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── requirements.txt
│   └── ...
├── nginx/
│   ├── nginx.conf
│   └── ssl/
└── .github/
    └── workflows/
        └── backend-ci.yml
```

### Dockerfile (backend/Dockerfile)
```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    mkdir -p /app/logs && \
    chown -R appuser:appuser /app/logs

USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=5)" || exit 1

# Run application with gunicorn
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]
```

### .dockerignore (backend/.dockerignore)
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
.eggs/

# Environment files
.env
.env.local
.env.prod
.env.staging

# IDEs
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Testing
.pytest_cache/
htmlcov/
.coverage
.tox/
.hypothesis/

# Logs
*.log
logs/

# Database
*.db
*.sqlite
celerybeat-schedule*

# Git
.git/
.gitignore
.gitattributes

# Documentation
docs/
README.md
CHANGELOG.md

# CI/CD
.github/

# Temp files
*.tmp
*.bak
*.swp
*~
```

### docker-compose.yml (Development)
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: tripit_postgres_dev
    environment:
      POSTGRES_USER: ${DB_USER:-tripit}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-tripit_password}
      POSTGRES_DB: ${DB_NAME:-tripit_db}
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-tripit}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tripit_network
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: tripit_redis_dev
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
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
    restart: unless-stopped

  # Flask Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tripit_backend_dev
    env_file:
      - .env
    environment:
      - FLASK_ENV=development
      - DATABASE_URL=postgresql://${DB_USER:-tripit}:${DB_PASSWORD:-tripit_password}@postgres:5432/${DB_NAME:-tripit_db}
      - REDIS_URL=redis://redis:6379/0
      - IN_DEV=true
      - DISABLE_CACHE_WARMER=true
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - backend_logs:/app/logs
    networks:
      - tripit_network
    restart: unless-stopped
    command: ["python", "app.py"]  # Dev mode with auto-reload

  # Celery Worker (Background Tasks)
  celery_worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tripit_celery_worker_dev
    command: celery -A celery_app worker --loglevel=info --concurrency=4
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgresql://${DB_USER:-tripit}:${DB_PASSWORD:-tripit_password}@postgres:5432/${DB_NAME:-tripit_db}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
      - backend
    volumes:
      - .:/app
    networks:
      - tripit_network
    restart: unless-stopped

  # Celery Beat Scheduler
  celery_beat:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tripit_celery_beat_dev
    command: celery -A celery_app beat --loglevel=info
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgresql://${DB_USER:-tripit}:${DB_PASSWORD:-tripit_password}@postgres:5432/${DB_NAME:-tripit_db}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
      - backend
    volumes:
      - .:/app
    networks:
      - tripit_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_logs:
    driver: local

networks:
  tripit_network:
    driver: bridge
```

### docker-compose.prod.yml (Production)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: tripit_postgres_prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tripit_network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: tripit_redis_prod
    command: >
      redis-server
      --appendonly yes
      --maxmemory 1gb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tripit_network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tripit_backend_prod
    env_file:
      - .env.prod
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - backend_logs:/app/logs
    networks:
      - tripit_network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  celery_worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tripit_celery_worker_prod
    command: celery -A celery_app worker --loglevel=info --concurrency=8
    env_file:
      - .env.prod
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      - postgres
      - redis
      - backend
    networks:
      - tripit_network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  celery_beat:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tripit_celery_beat_prod
    command: celery -A celery_app beat --loglevel=info
    env_file:
      - .env.prod
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      - postgres
      - redis
      - backend
    networks:
      - tripit_network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: tripit_nginx_prod
    volumes:
      - ../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ../nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - tripit_network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
  redis_data:
  backend_logs:
  nginx_logs:

networks:
  tripit_network:
    driver: bridge
```

### Nginx Configuration (nginx/nginx.conf)
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Upstream backend
    upstream backend {
        least_conn;
        server backend:5000 max_fails=3 fail_timeout=30s;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name api.tripit.app www.api.tripit.app;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name api.tripit.app;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Client body size
        client_max_body_size 50M;

        # Proxy settings
        location / {
            limit_req zone=api_limit burst=50 nodelay;
            limit_conn addr 10;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint (no rate limit)
        location /health {
            proxy_pass http://backend;
            access_log off;
        }

        # WebSocket support
        location /socket.io {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

---

## Environment Configuration

### Production Environment Template (.env.prod)
```bash
# ======================
# FLASK CONFIGURATION
# ======================
FLASK_ENV=production
FLASK_APP=app.py
SECRET_KEY=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
DEBUG=false

# ======================
# DATABASE CONFIGURATION
# ======================
DATABASE_URL=postgresql://tripit_user:STRONG_PASSWORD@postgres:5432/tripit_prod
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=60
DB_POOL_TIMEOUT=10
DB_POOL_RECYCLE=1800

# ======================
# JWT CONFIGURATION
# ======================
JWT_SECRET_KEY=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
JWT_ACCESS_TOKEN_EXPIRES=2592000
JWT_REFRESH_TOKEN_EXPIRES=7776000

# ======================
# REDIS CONFIGURATION
# ======================
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379/0
REDIS_PASSWORD=STRONG_REDIS_PASSWORD
RATELIMIT_STORAGE_URL=redis://:REDIS_PASSWORD@redis:6379/1
RATELIMIT_ENABLED=true

# ======================
# CORS CONFIGURATION
# ======================
CORS_ORIGINS=https://tripit.app,https://www.tripit.app,https://api.tripit.app

# ======================
# FILE UPLOAD (PINATA IPFS)
# ======================
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_api_key
PINATA_JWT=your_pinata_jwt_token

# ======================
# EMAIL (ZEPTOMAIL)
# ======================
ZEPTO_ENDPOINT=https://api.zeptomail.com/v1.1/email
ZEPTO_SEND_MAIL_TOKEN=your_zeptomail_token
ZEPTO_SENDER_ADDRESS=noreply@tripit.app
ZEPTO_SENDER_NAME=TripIt
FRONTEND_APP_URL=https://tripit.app

# ======================
# OAUTH
# ======================
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=https://api.tripit.app/api/auth/github/callback

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://api.tripit.app/api/auth/google/callback

# ======================
# CELERY
# ======================
CELERY_BROKER_URL=redis://:REDIS_PASSWORD@redis:6379/0
CELERY_RESULT_BACKEND=redis://:REDIS_PASSWORD@redis:6379/0

# ======================
# PERFORMANCE
# ======================
DISABLE_CACHE_WARMER=false
IN_DEV=false
DISABLE_MV_WORKER=false
DISABLE_CELERY=false
DISABLE_RECONCILIATION=false
RECONCILIATION_HOUR=3

# ======================
# MONITORING
# ======================
LOG_LEVEL=INFO
SENTRY_DSN=your_sentry_dsn_optional

# ======================
# SECURITY
# ======================
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax
```

---

## Docker Commands

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild backend
docker-compose build backend

# Run migrations
docker-compose exec backend flask db upgrade

# Access backend shell
docker-compose exec backend bash

# Clean up
docker-compose down -v  # Remove volumes
```

### Production
```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend flask db upgrade

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U tripit_user tripit_prod > backup.sql

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] DNS configured
- [ ] Database migrations tested
- [ ] Backup procedures tested
- [ ] Load testing completed

### Deployment
- [ ] Pull latest code
- [ ] Build Docker images
- [ ] Run database migrations
- [ ] Start services
- [ ] Health checks passing
- [ ] Monitor logs for errors

### Post-Deployment
- [ ] Verify endpoints responding
- [ ] Check database connections
- [ ] Verify Redis cache
- [ ] Monitor error rates
- [ ] Test critical user flows

---

**End of Deployment Guide**
