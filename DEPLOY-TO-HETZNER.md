# Deploy 0x.ship Discovery Platform to Hetzner - Complete Guide

## What You're Deploying

```
zer0.pro (Frontend)         → Nginx → localhost:3005 → Docker Container (React/Vite)
backend.zer0.pro (Backend)  → Nginx → localhost:8005 → Docker Container (Flask/Gunicorn)
                                                   ↓
                                         PostgreSQL (Docker) + Redis (Docker)
```

**Tech Stack:**
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Python Flask + SQLAlchemy + Celery + Socket.IO
- **Database**: PostgreSQL 16 (containerized)
- **Cache**: Redis 7 (containerized)
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)

---

## 🚀 QUICK START - For Servers with Existing Apps

**If you already have Docker + Nginx running with other apps, follow these simplified steps:**

### Your Current Server Setup:
```
✅ nginx running with existing apps
✅ certbot installed with SSL certificates
✅ Docker installed and running
✅ Ports in use: 3001, 3002, 3003, 3004, 8001, 8003, 8004, 6379, 27017
✅ New ports to use: 3005 (frontend), 8005 (backend), 5433 (postgres), 6380 (redis)
```

### What You Need to Do:

**1. DNS Configuration** (Do this FIRST - takes 10-15 min to propagate)
   - Add A record: `zer0.pro` → Your server IP
   - Add A record: `*.zer0.pro` → Your server IP (wildcard for subdomains)
   - Or add specific A records: `www` → Your server IP, `backend` → Your server IP

**2. On Your Local Machine:**
   ```bash
   # Navigate to project
   cd "C:\Users\JARVIS\Desktop\0x.Discovery-ship"

   # Copy and configure production environment files
   cp backend/.env.local backend/.env.prod
   cp frontend/.env.local frontend/.env.prod

   # Edit backend/.env.prod with your production credentials:
   # - Generate SECRET_KEY and JWT_SECRET_KEY (64 random chars each)
   # - Set POSTGRES_PASSWORD (will be used by Docker)
   # - Configure Pinata, OpenAI, ZeptoMail credentials
   # - Update CORS_ORIGINS to include zer0.pro domains

   # Edit frontend/.env.prod:
   # - VITE_API_URL=https://backend.zer0.pro
   # - Update WalletConnect Project ID, contract addresses, etc.

   # Push to your private GitHub repo
   git add .
   git commit -m "Add Docker deployment configuration for production"
   git push origin main
   ```

**3. On Your Server:**
   ```bash
   # Clone/upload the project
   cd /root
   git clone YOUR_REPO_URL 0x-discovery-ship
   cd 0x-discovery-ship

   # Copy production environment files
   cp backend/.env.prod backend/.env.prod
   # Edit backend/.env.prod and add your production secrets

   # Set PostgreSQL password for Docker
   export POSTGRES_PASSWORD="your_strong_postgres_password_here"

   # Start all containers (postgres, redis, backend, frontend)
   docker compose -f docker-compose.prod.yml up -d --build

   # Check containers are running
   docker ps | grep zer0

   # View logs to ensure everything started correctly
   docker compose -f docker-compose.prod.yml logs -f

   # Run database migration to create schema
   docker exec -it zer0_backend_prod python /app/migrations/migrate_schema.py

   # Fix 1: Investor Ticket Size (BIGINT)
  docker compose -f docker-compose.prod.yml run --rm --no-deps backend python fix_investor_ticket_size.py 

  # Fix 2: Intro Request Stats (PRIMARY KEY)
  docker compose -f docker-compose.prod.yml run --rm --no-deps backend python fix_intro_request_stats_constraint.py

  # Fix 3: Message Conversations (UNIQUE)
  docker compose -f docker-compose.prod.yml run --rm --no-deps backend python fix_message_conversations_constraint.py

   # Create admin users for admin panel access
   docker exec -it zer0_backend_prod python /app/scripts/add_admin_users.py

   # Add nginx config for new domains
   # Upload nginx-zer0-config.conf or create manually (see below)
   nano /etc/nginx/sites-available/zer0pro
   # Paste the nginx configuration (provided below)

   ln -s /etc/nginx/sites-available/zer0pro /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx

   # Add SSL certificates
   certbot --nginx -d zer0.pro -d www.zer0.pro -d backend.zer0.pro
   ```

**4. Test:**
   - Visit: https://zer0.pro (frontend)
   - Visit: https://backend.zer0.pro/health (backend API health check)

**Total Time: ~30-45 minutes (including DNS propagation wait)**

---

## 📋 DETAILED DEPLOYMENT GUIDE

**Use the detailed guide below if:**
- This is your first time deploying to Hetzner
- You need step-by-step explanations
- You're setting up a fresh server

---

## BEFORE YOU START

### 1. Get Your Hetzner Server Ready
- Purchase a VPS (CX31 recommended: 8GB RAM, €9.18/month)
- Note your server IP: `YOUR_SERVER_IP`

### 2. Configure DNS (Do This First!)
Go to your domain registrar (zer0.pro) and add these DNS records:

```
Type: A Record
Host: @
Value: YOUR_SERVER_IP

Type: A Record
Host: www
Value: YOUR_SERVER_IP

Type: A Record
Host: backend
Value: YOUR_SERVER_IP
```

**Wait 10-15 minutes for DNS to propagate** before continuing.

### 3. Prepare Your Environment Files

**a) Backend Environment (.env.prod):**

```bash
# On your local machine
cd "C:\Users\JARVIS\Desktop\0x.Discovery-ship"
cp backend/.env.local backend/.env.prod
```

Edit `backend/.env.prod` and update:
- `SECRET_KEY` - Generate a random 64-character string
- `JWT_SECRET_KEY` - Generate a random 64-character string
- `DATABASE_URL` - Will be set by Docker Compose automatically
- `REDIS_URL` - Will be set by Docker Compose automatically
- `CORS_ORIGINS=https://zer0.pro,https://www.zer0.pro,https://backend.zer0.pro`
- Pinata credentials (PINATA_API_KEY, PINATA_SECRET_API_KEY, PINATA_JWT)
- OpenAI API key (OPENAI_API_KEY)
- ZeptoMail credentials (ZEPTO_SEND_MAIL_TOKEN, ZEPTO_SENDER_ADDRESS)
- GitHub/Google OAuth credentials (optional)

**b) Frontend Environment (.env.prod):**

```bash
cd frontend
cp .env.local .env.prod
```

Edit `.env.prod`:
```
VITE_API_URL=https://backend.zer0.pro
VITE_WALLETCONNECT_PROJECT_ID=your_production_walletconnect_id
# ... other settings
```

**c) Push Your Code to GitHub:**

```bash
# Check git status
git status

# Add all changes
git add .

# Commit
git commit -m "Added Docker configuration for production deployment to zer0.pro"

# Push to your private GitHub repo
git push origin main
```

**Note:** Keep your repo private since it contains sensitive configurations.

---

## STEP-BY-STEP DEPLOYMENT

### Step 1: Connect to Your Server

```bash
ssh root@YOUR_SERVER_IP
# Enter password when prompted
```

### Step 2: Update System & Install Docker + Git

```bash
# Update packages
apt update && apt upgrade -y

# Install basic tools
apt install -y curl wget git vim ufw

# Verify Git is installed
git --version

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify Docker is installed
docker --version
docker compose version
```

### Step 3: Setup Firewall

```bash
# Allow necessary ports
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Check firewall status
ufw status
```

### Step 4: Clone Your Project from GitHub

**On your server:**

```bash
cd /root

# Clone your repository
# Replace with your actual GitHub repo URL
git clone https://github.com/YOUR_USERNAME/0x-discovery-ship.git 0x-discovery-ship

# If prompted for credentials:
# - Username: your GitHub username
# - Password: use a Personal Access Token (not your password)
# Generate token at: https://github.com/settings/tokens

cd 0x-discovery-ship

# Verify files are there
ls -la
```

### Step 5: Configure Production Environment Files

**IMPORTANT:** Never commit `.env.prod` files to Git. Create them securely on the server.

**Option A: Create directly on server**

```bash
cd /root/0x-discovery-ship

# Create backend .env.prod file
nano backend/.env.prod

# Paste all your production environment variables
# Use the template from backend/.env.local as reference
# Update all CHANGE_ME values with real production credentials

# Save with Ctrl+O, exit with Ctrl+X

# Secure the file
chmod 600 backend/.env.prod
```

**Option B: Upload from local machine**

```bash
# On your local machine (after configuring .env.prod)
scp backend/.env.prod root@YOUR_SERVER_IP:/root/0x-discovery-ship/backend/.env.prod

# On server
chmod 600 /root/0x-discovery-ship/backend/.env.prod
```

### Step 6: Set PostgreSQL Password

```bash
# Export the PostgreSQL password (used by Docker Compose)
export POSTGRES_PASSWORD="your_strong_postgres_password_here"

# Add to .bashrc for persistence (optional)
echo 'export POSTGRES_PASSWORD="your_strong_postgres_password_here"' >> ~/.bashrc
```

### Step 7: Start Your Application Containers

```bash
cd /root/0x-discovery-ship

# Build and start containers (takes 5-10 minutes on first run)
docker compose -f docker-compose.prod.yml up -d --build

# Check progress:
docker compose -f docker-compose.prod.yml logs -f
# Press Ctrl+C to exit logs
```

**Verify containers are running:**

```bash
docker ps | grep zer0

# You should see:
# - zer0_postgres_prod (port 5433)
# - zer0_redis_prod (port 6380)
# - zer0_backend_prod (port 8005)
# - zer0_frontend_prod (port 3005)
```

**Test locally on server:**

```bash
# Test backend
curl http://localhost:8005/health
# Should return: {"status": "ok", "message": "0x.ship backend is running"}

# Test frontend
curl http://localhost:3005
# Should return HTML
```

### Step 8: Initialize Database Schema

**Run the migration script to create all database tables:**

```bash
# Connect to backend container and run migration
docker exec -it zer0_backend_prod python /app/migrations/migrate_schema.py

# Check the output - should show all tables, indexes, etc. being created
# This script will also automatically add all unique constraints from source database
```

**IMPORTANT: Fix Missing Unique Constraints (Critical)**

The migration script automatically detects and adds all unique constraints from the source database. However, if you're deploying to a fresh database without a source, you need to manually add the required unique constraints:

```bash
# Option 1: Run the standalone constraint fixer (RECOMMENDED)
docker exec -it zer0_backend_prod python /app/migrations/add_missing_constraints.py

# Option 2: Add constraints manually via PostgreSQL
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod

# Inside PostgreSQL, run:
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_refresh_queue_view_name ON mv_refresh_queue(view_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_dashboard_stats_user_id ON user_dashboard_stats(user_id);

# Exit PostgreSQL
\q
```

**Why is this needed?**
- These unique constraints are required for `ON CONFLICT` operations in triggers
- Without them, you'll get errors when:
  - Connecting GitHub in the publish form
  - Publishing new projects
  - Updating user dashboard stats

**Verify constraints were added:**

```bash
# Check mv_refresh_queue constraint
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod -c "\d mv_refresh_queue"
# Should show: idx_mv_refresh_queue_view_name UNIQUE btree (view_name)

# Check user_dashboard_stats constraint
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod -c "\d user_dashboard_stats"
# Should show: idx_user_dashboard_stats_user_id UNIQUE btree (user_id)
```

**Verify database is working:**

```bash
# Connect to PostgreSQL
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod

# List tables
\dt

# You should see all your application tables
# Exit with \q
```

### Step 8.5: Create Admin Users

**Run the admin user creation script:**

```bash
# Create root admin users for admin panel access
docker exec -it zer0_backend_prod python /app/scripts/add_admin_users.py

# You should see output like:
# ✅ Created admin: sameerkatte@gmail.com
# ✅ Created admin: saijadhav148@gmail.com
# ✅ Created admin: sarankumar.0x@gmail.com
# ✅ Created admin: zer0@z-0.io
```

**Verify admin users were created:**

```bash
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod -c "SELECT email, is_root, is_active FROM admin_users;"

# Should show:
#          email         | is_root | is_active
# -----------------------+---------+-----------
#  sameerkatte@gmail.com | t       | t
#  saijadhav148@gmail.com| t       | t
#  ...
```

**To login to admin panel:**

1. Go to `https://zer0.pro/admin` (or your admin panel URL)
2. Enter one of the admin emails
3. Click "Request OTP"
4. Check your email for the OTP code
5. Enter the OTP to login

**Troubleshooting: If OTP email doesn't arrive:**

```bash
# Check if email was sent
docker compose -f docker-compose.prod.yml logs backend | grep -i "admin OTP"

# Check OTP code directly from database (if needed)
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod -c "SELECT email, otp_code, created_at, expires_at FROM admin_otps ORDER BY created_at DESC LIMIT 5;"
```

### Step 9: Configure Nginx (Add to Existing Setup)

**If you already have Nginx running with other apps (RECOMMENDED):**

**Option A: Upload pre-made config file (EASIEST)**

```bash
# On your LOCAL machine, upload the nginx config file
scp nginx-zer0-config.conf root@YOUR_SERVER_IP:/etc/nginx/sites-available/zer0pro

# On your SERVER
# Enable the configuration
ln -s /etc/nginx/sites-available/zer0pro /etc/nginx/sites-enabled/

# Test configuration (should show "syntax is ok")
nginx -t

# Reload Nginx (this will NOT affect your existing apps)
systemctl reload nginx

# Verify all your apps are still running
docker ps
```

**Option B: Create config manually on server**

```bash
# On SERVER
nano /etc/nginx/sites-available/zer0pro
```

**Paste this configuration:**

```nginx
# Nginx Configuration for Zer0.pro Platform
# Frontend - zer0.pro and www.zer0.pro
server {
    listen 80;
    server_name zer0.pro www.zer0.pro;

    location / {
        proxy_pass http://localhost:3005;
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

    client_max_body_size 50M;
}

# Backend API - backend.zer0.pro
server {
    listen 80;
    server_name backend.zer0.pro;

    location / {
        proxy_pass http://localhost:8005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running requests (AI scoring)
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # WebSocket support for Socket.IO
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # CORS (handled by Flask, but adding as backup)
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Admin-Password" always;
        add_header Access-Control-Allow-Credentials "true" always;

        # Preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin $http_origin always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Admin-Password" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    client_max_body_size 50M;
}
```

**Then enable it:**

```bash
# Create symlink
ln -s /etc/nginx/sites-available/zer0pro /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx (preserves existing configs)
systemctl reload nginx
systemctl status nginx
```

**If you're setting up Nginx for the FIRST TIME on a new server:**

```bash
# Install Nginx
apt install -y nginx

# Then follow Option A or B above
```

**IMPORTANT NOTES:**
- ✅ Using `systemctl reload nginx` instead of `restart` keeps your existing apps running
- ✅ Your existing nginx configs (certs, hackathons, landing page) will NOT be affected
- ✅ The new config adds domains: zer0.pro, www.zer0.pro, backend.zer0.pro
- ✅ All apps continue running on their respective ports

### Step 10: Test Your Site (HTTP)

**Test backend first:**
```bash
# On server
curl http://localhost:8005/health

# Should return:
# {"status":"ok","message":"0x.ship backend is running"}
```

**Test frontend:**
```bash
curl http://localhost:3005
# Should return HTML
```

**Test from browser:**

Open your browser and visit:
- **http://zer0.pro** - Should show your application
- **http://backend.zer0.pro/health** - Should show: `{"status":"ok",...}`

**CRITICAL: Test API connectivity**

1. Open http://zer0.pro
2. Open browser DevTools (F12) → Network tab
3. Try to sign up or login
4. Check Network tab:
   - API calls should go to `http://backend.zer0.pro/api/...`
   - Should return JSON responses (not HTML/errors)
   - Status codes should be 200, 201, or 304 (not 404, 502, 503)

**If you see errors:**
- 502 Bad Gateway → Backend container not running: `docker ps`
- CORS errors → Check backend CORS configuration
- Connection refused → Firewall issue: `ufw status`

**If everything works, continue to SSL!**

### Step 11: Setup SSL (HTTPS)

**If you already have Certbot installed (existing apps):**

Simply add SSL certificates for the new domains:

```bash
# Add SSL for zer0.pro domains
certbot --nginx -d zer0.pro -d www.zer0.pro -d backend.zer0.pro

# Follow prompts:
# 1. Enter your email (or it may use existing email)
# 2. Agree to terms (Y) - may skip if already agreed
# 3. Redirect HTTP to HTTPS? (2 for Yes - RECOMMENDED)
```

**If this is your FIRST TIME setting up SSL on this server:**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificates
certbot --nginx -d zer0.pro -d www.zer0.pro -d backend.zer0.pro

# Follow prompts:
# 1. Enter your email: your@email.com
# 2. Agree to terms (Y)
# 3. Share email? (N)
# 4. Redirect HTTP to HTTPS? (2 for Yes - RECOMMENDED)
```

**Verify all your SSL certificates:**

```bash
# List all certificates
certbot certificates

# Should show certificates for:
# - Your existing apps
# - zer0.pro
# - www.zer0.pro
# - backend.zer0.pro
```

**Test auto-renewal:**

```bash
certbot renew --dry-run
```

**IMPORTANT NOTES:**
- ✅ Certbot automatically configures nginx with SSL
- ✅ Your existing SSL certificates will NOT be affected
- ✅ All certificates auto-renew together
- ✅ HTTP will redirect to HTTPS automatically

### Step 12: Verify Everything Works!

Visit in your browser:
- ✅ https://zer0.pro (Frontend - Public Access)
- ✅ https://www.zer0.pro (Frontend - with www)
- ✅ https://backend.zer0.pro/health (Backend API health check)

**You should see the lock icon!** 🔒

**Test the platform:**
1. Create a new user account
2. Login and navigate around
3. Test file uploads (project screenshots)
4. Verify real-time features (Socket.IO notifications)
5. Test AI scoring features
6. Check admin features (if you're a root admin)

---

## MANAGING YOUR APPLICATION

### View Logs

```bash
cd /root/0x-discovery-ship

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# View frontend logs only
docker compose -f docker-compose.prod.yml logs -f frontend

# View postgres logs
docker compose -f docker-compose.prod.yml logs -f postgres

# View redis logs
docker compose -f docker-compose.prod.yml logs -f redis
```

### Restart Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart backend only
docker compose -f docker-compose.prod.yml restart backend

# Restart frontend only
docker compose -f docker-compose.prod.yml restart frontend

# Restart database
docker compose -f docker-compose.prod.yml restart postgres
```

### Update Your App (After Code Changes)

**Method 1: Using Git (Recommended)**

```bash
# On your local machine - push changes
cd "C:\Users\JARVIS\Desktop\0x.Discovery-ship"
git add .
git commit -m "Updated feature XYZ"
git push origin main

# On your server - pull and rebuild
cd /root/0x-discovery-ship
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Monitor the rebuild
docker compose -f docker-compose.prod.yml logs -f
```

**Method 2: Update Backend Environment Variables**

```bash
# On server
cd /root/0x-discovery-ship
nano backend/.env.prod
# Make your changes
# Save with Ctrl+O, exit with Ctrl+X

# Restart backend to pick up new env vars
docker compose -f docker-compose.prod.yml restart backend
```

**Method 3: Database Schema Changes**

```bash
# If you modified the database schema
# Re-run the migration script
docker exec -it zer0_backend_prod python /app/migrations/migrate_schema.py
```

### Stop Everything

```bash
docker compose -f docker-compose.prod.yml down
```

### Database Backup (PostgreSQL)

**Automated Backup:**

```bash
# Create backup script
nano /root/backup-postgres.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/root/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

docker exec zer0_postgres_prod pg_dump -U zer0_prod_user zer0_discovery_prod | gzip > $BACKUP_DIR/zer0_backup_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "zer0_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: zer0_backup_$TIMESTAMP.sql.gz"
```

```bash
# Make executable
chmod +x /root/backup-postgres.sh

# Run backup
/root/backup-postgres.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /root/backup-postgres.sh
```

**Manual Backup:**

```bash
# Backup entire database
docker exec zer0_postgres_prod pg_dump -U zer0_prod_user zer0_discovery_prod > /root/zer0_backup.sql

# Restore from backup
cat /root/zer0_backup.sql | docker exec -i zer0_postgres_prod psql -U zer0_prod_user zer0_discovery_prod
```

### Monitor Resource Usage

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
htop
# (press 'q' to exit)

# Check Docker container stats
docker stats

# Check container-specific stats
docker stats zer0_backend_prod zer0_frontend_prod zer0_postgres_prod zer0_redis_prod
```

---

## TESTING LOCALLY (Before Deployment)

You can test the entire stack locally on your development machine:

```bash
# On Windows (PowerShell) or Mac/Linux terminal
cd "C:\Users\JARVIS\Desktop\0x.Discovery-ship"

# Make sure your local .env files are configured
# backend/.env.local should have your local settings
# frontend/.env.local should point to http://localhost:5000

# Start local development stack
docker compose -f docker-compose.local.yml up -d --build

# View logs
docker compose -f docker-compose.local.yml logs -f

# Access the app:
# Frontend: http://localhost:8080
# Backend: http://localhost:5000

# Stop when done
docker compose -f docker-compose.local.yml down
```

---

## TROUBLESHOOTING

### Container won't start?

```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs redis

# Check for common issues:
# - Missing .env.prod file
# - Invalid PostgreSQL credentials
# - Port conflicts (3005, 8005, 5433, 6380 already in use)
```

### Can't access from browser?

```bash
# Check DNS propagation
nslookup zer0.pro
nslookup backend.zer0.pro

# Check containers are running
docker ps | grep zer0

# Check Nginx
systemctl status nginx
nginx -t

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Check firewall
ufw status
```

### Database connection errors?

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs zer0_postgres_prod

# Connect to PostgreSQL manually
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod

# Check database exists
\l

# List tables
\dt

# Exit
\q
```

### Redis connection errors?

```bash
# Check if Redis container is running
docker ps | grep redis

# Check Redis logs
docker logs zer0_redis_prod

# Connect to Redis manually
docker exec -it zer0_redis_prod redis-cli

# Test connection
ping
# Should return: PONG

# Exit
exit
```

### Frontend shows "API connection failed"?

This usually means:
1. **Backend is not running**: `docker ps | grep backend` to verify
2. **VITE_API_URL is incorrect**: Should be `https://backend.zer0.pro` in production
3. **Backend not accessible**: `curl https://backend.zer0.pro/health` should work
4. **CORS issues**: Check backend CORS configuration in .env.prod
5. **Nginx not routing correctly**: Check nginx configuration

```bash
# Test backend directly on server
curl http://localhost:8005/health
# Should return: {"status":"ok",...}

# Test backend from external domain
curl https://backend.zer0.pro/health
# Should return same JSON

# Test frontend
curl https://zer0.pro
# Should return HTML

# If VITE_API_URL is wrong, rebuild frontend:
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build frontend
```

### SSL Certificate Issues?

```bash
# Check certificate status
certbot certificates

# Renew certificates manually
certbot renew

# Test renewal
certbot renew --dry-run

# If renewal fails, check:
# 1. DNS is pointing to correct IP
# 2. Port 80 and 443 are open
# 3. Nginx is running
```

### WebSocket/Socket.IO not working?

```bash
# Make sure Nginx has WebSocket headers (already in config above)
# Check backend logs for Socket.IO connections
docker logs -f zer0_backend_prod | grep -i socket

# Test WebSocket connection from browser console:
# Open https://zer0.pro and in DevTools console:
# const socket = io('https://backend.zer0.pro')
# socket.on('connect', () => console.log('Connected!'))
```

### Out of disk space?

```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a

# Remove old Docker images
docker image prune -a

# Clean up logs
docker compose -f docker-compose.prod.yml down
find /var/lib/docker/containers -name "*-json.log" -delete
docker compose -f docker-compose.prod.yml up -d

# Check largest directories
du -h --max-depth=1 /root | sort -hr
```

### Celery tasks not running?

```bash
# Check backend logs for Celery worker
docker logs zer0_backend_prod | grep -i celery

# Check Redis is accessible
docker exec zer0_backend_prod python -c "import redis; r = redis.from_url('redis://redis:6379/0'); print(r.ping())"

# Restart backend to restart workers
docker compose -f docker-compose.prod.yml restart backend
```

---

## SECURITY BEST PRACTICES

### 1. Change Default SSH Port (Optional but Recommended)

```bash
nano /etc/ssh/sshd_config
# Change: Port 22 → Port 2222
systemctl restart sshd

# Update firewall
ufw allow 2222/tcp
ufw delete allow OpenSSH

# Test new connection before closing current session:
# ssh root@YOUR_SERVER_IP -p 2222
```

### 2. Setup SSH Key Authentication

```bash
# On your local machine (Windows PowerShell):
ssh-keygen -t ed25519
# Save to default location

# Copy public key to server
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@YOUR_SERVER_IP "cat >> ~/.ssh/authorized_keys"

# On server, disable password authentication:
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
systemctl restart sshd
```

### 3. Regular Updates

```bash
# Update system packages monthly
apt update && apt upgrade -y

# Update Docker images
cd /root/0x-discovery-ship
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Monitor Logs Regularly

```bash
# Check for suspicious activity
tail -f /var/log/auth.log

# Check Nginx access logs
tail -f /var/log/nginx/access.log

# Check application logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## ADDING MORE APPS TO THE SAME SERVER

**You've already done this!** Your server currently runs:
- Certs app (ports 3001, 8001)
- Landing page (port 3002)
- Hackathon platforms (ports 3003/8003, 3004/8004)
- MongoDB (port 27017)
- Redis (port 6379)
- **NEW: 0x.ship Discovery (ports 3005/8005, postgres 5433, redis 6380)**

When you deploy your next app to the same Hetzner server, follow the same pattern:

### Port Allocation Strategy:
```
App 1 (Certs):       Frontend: 3001, Backend: 8001
App 2 (Landing):     Frontend: 3002
App 3 (Hackathon 1): Frontend: 3003, Backend: 8003
App 4 (Hackathon 2): Frontend: 3004, Backend: 8004
App 5 (Discovery):   Frontend: 3005, Backend: 8005, Postgres: 5433, Redis: 6380
App 6 (Next):        Frontend: 3006, Backend: 8006  ← Use these for your next app
```

### Steps for Adding Another App:

1. **Use different ports** in docker-compose.prod.yml (e.g., 3006:80 and 8006:5000)
2. **Clone to different directory** (e.g., /root/app6)
3. **Add new server blocks to Nginx** (/etc/nginx/sites-available/app6)
4. **Get SSL for new domains** (`certbot --nginx -d app6.yourdomain.com`)

**Key Principles:**
- ✅ Each app gets its own directory in /root/
- ✅ Each app uses unique ports (increment by 1)
- ✅ Each app gets its own nginx config file
- ✅ All configs coexist peacefully in /etc/nginx/sites-enabled/
- ✅ All SSL certificates managed by single certbot instance
- ✅ Use `systemctl reload nginx` to avoid interrupting existing apps

---

## COSTS BREAKDOWN

- **Hetzner CX31 VPS:** €9.18/month (8GB RAM, 160GB SSD, 20TB traffic)
- **Domain (zer0.pro):** Already owned
- **SSL Certificates:** Free (Let's Encrypt)
- **PostgreSQL:** Included (containerized on your VPS)
- **Redis:** Included (containerized on your VPS)
- **ZeptoMail:** Free tier (10K emails/month) or paid plans
- **Pinata IPFS:** Free tier or paid plans
- **OpenAI API:** Pay per use

**Total: ~€10-20/month depending on email and AI usage**

---

## QUICK REFERENCE

### Important Paths
```
Application Root: /root/0x-discovery-ship
Backend Code: /root/0x-discovery-ship/backend
Frontend Code: /root/0x-discovery-ship/frontend
Backend Env: /root/0x-discovery-ship/backend/.env.prod
Nginx Config: /etc/nginx/sites-available/zer0pro
Nginx Logs: /var/log/nginx/
SSL Certs: /etc/letsencrypt/live/
```

### Important Commands
```bash
# View all containers
docker ps -a | grep zer0

# View application logs
docker compose -f docker-compose.prod.yml logs -f

# Restart application
docker compose -f docker-compose.prod.yml restart

# Rebuild application
docker compose -f docker-compose.prod.yml up -d --build

# Stop application
docker compose -f docker-compose.prod.yml down

# Check Nginx status
systemctl status nginx

# Reload Nginx config
nginx -t && systemctl reload nginx

# Check SSL certificates
certbot certificates

# Renew SSL
certbot renew

# Database backup
docker exec zer0_postgres_prod pg_dump -U zer0_prod_user zer0_discovery_prod > backup.sql

# Database restore
cat backup.sql | docker exec -i zer0_postgres_prod psql -U zer0_prod_user zer0_discovery_prod

# Connect to PostgreSQL
docker exec -it zer0_postgres_prod psql -U zer0_prod_user -d zer0_discovery_prod

# Connect to Redis
docker exec -it zer0_redis_prod redis-cli

# View backend logs in real-time
docker logs -f zer0_backend_prod

# View celery worker logs
docker logs -f zer0_backend_prod | grep -i celery
```

### Ports Used
```
3005 → Frontend container (internal: 80)
8005 → Backend container (internal: 5000)
5433 → PostgreSQL container (internal: 5432)
6380 → Redis container (internal: 6379)
80   → Nginx HTTP
443  → Nginx HTTPS
```

### Domains
```
https://zer0.pro → Frontend (Public Users)
https://www.zer0.pro → Frontend (with www)
https://backend.zer0.pro → Backend API
```

---

## DONE! 🎉

Your 0x.ship Discovery Platform is now live at:
- **Frontend:** https://zer0.pro
- **Backend:** https://backend.zer0.pro

### What's Included:
✅ Full-stack Web3 discovery platform
✅ Multi-role authentication (Admin, Builder, Investor, Validator)
✅ Real-time features with Socket.IO
✅ File upload support via IPFS (Pinata)
✅ AI-powered project scoring (OpenAI)
✅ Email notifications (ZeptoMail)
✅ PostgreSQL database (containerized)
✅ Redis caching (containerized)
✅ Blockchain integration (Kaia)
✅ Responsive design with TailwindCSS
✅ SSL/HTTPS enabled
✅ Automated deployments with Docker
✅ Production-ready with Nginx reverse proxy
✅ Background workers (Celery)
✅ Materialized views for performance
✅ Vote synchronization system

For support, issues, or questions, contact the development team.

---

**Last Updated:** 2025-01-21
**Version:** 1.0.0
