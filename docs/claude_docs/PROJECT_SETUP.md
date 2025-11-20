# 0x.ship MVP - Complete Setup Guide

A proof-weighted discovery platform for hackathon projects, featuring community voting, expert validation, and blockchain integration.

## 📋 Project Overview

**0x.ship** is a decentralized platform that helps hackathon participants showcase their projects and connect with investors. The MVP (Minimum Viable Product) focuses on core functionality:

- **User Roles**: Visitors, Builders (Creators), Admins (Curators)
- **Discovery Engine**: Reddit-style feed with proof-weighted scoring
- **Community Engagement**: Upvoting, downvoting, comments
- **Expert Validation**: Admins award Silver/Gold/Platinum badges
- **Blockchain Integration**: Read 0xCerts from Kaia Testnet
- **Intro Requests**: Builder-to-investor introductions

## 🏗️ Architecture

```
0x.ship MVP
├── Frontend (Handled by Lovable)
│   └── React 18, TypeScript, TailwindCSS, Shadcn/ui
│
└── Backend (This Setup)
    ├── Flask REST API
    ├── PostgreSQL Database
    ├── Redis Caching
    └── Web3.py Blockchain Integration
```

## 📁 Project Structure

```
E:\Disc Plat/
├── backend/                        # Backend Flask API
│   ├── app.py                     # Flask application factory
│   ├── config.py                  # Configuration management
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example              # Environment template
│   ├── Dockerfile                # Docker containerization
│   ├── README.md                 # Backend documentation
│   │
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── vote.py
│   │   ├── comment.py
│   │   ├── badge.py
│   │   └── intro.py
│   │
│   ├── routes/                   # API endpoint blueprints
│   │   ├── auth.py              # /api/auth/*
│   │   ├── projects.py          # /api/projects/*
│   │   ├── votes.py             # /api/votes/*
│   │   ├── comments.py          # /api/comments/*
│   │   ├── badges.py            # /api/badges/*
│   │   ├── intros.py            # /api/intros/*
│   │   ├── blockchain.py        # /api/blockchain/*
│   │   ├── users.py             # /api/users/*
│   │   └── uploads.py           # /api/upload/*
│   │
│   ├── schemas/                 # Marshmallow validation schemas
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── vote.py
│   │   ├── comment.py
│   │   ├── badge.py
│   │   └── intro.py
│   │
│   ├── utils/                   # Utility modules
│   │   ├── decorators.py        # @token_required, @admin_required
│   │   ├── validators.py        # Input validation
│   │   ├── blockchain.py        # Web3.py integration
│   │   ├── cache.py             # Redis caching
│   │   ├── scores.py            # Proof score calculation
│   │   └── helpers.py           # Common helpers
│   │
│   ├── seeds/                   # Database seeding
│   │   └── demo_data.py         # Demo data script
│   │
│   ├── migrations/              # Alembic migrations (auto-generated)
│   ├── tests/                   # Test files
│   └── uploads/                 # Local file uploads
│
├── 0x.ship MVP — Demo Day Version.md    # Full project specification
└── PROJECT_SETUP.md                      # This file
```

## 🚀 Quick Start

### 1. Prerequisites

Install required software:
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **PostgreSQL 12+** - [Download](https://www.postgresql.org/download/)
- **Redis 6+** - [Download](https://redis.io/download) or [Docker](https://www.docker.com/)
- **Git** - [Download](https://git-scm.com/download)

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Create database
createdb oxship

# Run migrations (initialize schema)
flask db upgrade

# Seed demo data (optional)
python -m seeds.demo_data
```

### 4. Start Services

**Terminal 1 - Redis:**
```bash
# Option A: Local Redis
redis-server

# Option B: Docker
docker run -d -p 6379:6379 redis:latest
```

**Terminal 2 - Flask Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
flask run
```

Backend will run at: `http://localhost:5000`

### 5. Test the API

```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "myusername",
    "password": "SecurePass123"
  }'
```

## 📊 Database Schema

### Core Tables

**users**
- id, email, username, display_name
- email_verified, password_hash
- wallet_address, has_oxcert (blockchain)
- github_username, github_connected
- avatar_url, bio
- karma, is_admin, is_active
- created_at, updated_at

**projects**
- id, user_id (creator), title, tagline, description
- demo_url, github_url
- hackathon_name, hackathon_date
- tech_stack (array)
- **Proof Score Components**: verification_score, community_score, validation_score, quality_score, proof_score
- **Engagement**: upvotes, downvotes, comment_count, view_count, share_count
- **Status**: is_featured, is_deleted, featured_at, featured_by
- created_at, updated_at

**votes**
- id, user_id, project_id, vote_type ('up'/'down')
- created_at, updated_at
- **Unique**: one vote per user per project

**comments**
- id, project_id, user_id, parent_id (for nested comments)
- content, upvotes, downvotes
- is_deleted, created_at, updated_at

**validation_badges**
- id, project_id, validator_id, badge_type (silver/gold/platinum)
- rationale, points, is_featured
- created_at

**intros**
- id, project_id, requester_id, recipient_id
- message, requester_contact
- status (pending/accepted/declined)
- accepted_at, declined_at, created_at, updated_at

**project_screenshots**
- id, project_id, url, order_index, created_at

## 🔐 Authentication

All protected endpoints require JWT tokens in the Authorization header:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/projects
```

**Token Flow:**
1. Register/Login → Get `access` + `refresh` tokens
2. Use `access` token for authenticated requests
3. When `access` expires, use `refresh` token to get new `access`

## 📈 Proof Score System

Projects get scored 0-100 points across 4 categories:

### Category 1: Basic Verification (Max 20)
- Email verified: 5 pts
- 0xCert owned: 10 pts
- GitHub connected: 5 pts

### Category 2: Community Signal (Max 30)
- Upvote ratio (0-20%): 0-20 pts
- Comment engagement: 0-10 pts (0.5 per comment, max 10)

### Category 3: Expert Validation (Max 30)
- Silver badge: 10 pts
- Gold badge: 15 pts
- Platinum badge: 20 pts

### Category 4: Project Quality (Max 20)
- Has demo link: 5 pts
- Has GitHub link: 5 pts
- Has screenshots: 5 pts
- Complete description (>200 chars): 5 pts

## 🔄 Key Workflows

### Workflow 1: Publish a Project
1. User creates account → verify email
2. Create project → add title, description, links, screenshots
3. Backend calculates proof score
4. Project appears in feed

### Workflow 2: Award Validation Badge (Admin)
1. Admin visits project
2. Clicks "Award Badge" → selects Silver/Gold/Platinum
3. Adds rationale
4. Project score updates automatically

### Workflow 3: Community Voting
1. Logged-in user upvotes/downvotes project
2. Vote count updates → proof score recalculates
3. Changed votes override previous votes (one vote per user)

### Workflow 4: Request Intro
1. Investor finds interesting project
2. Clicks "Request Intro" → adds message + contact
3. Builder receives intro request
4. Builder accepts/declines

## 🛠️ Development Commands

```bash
# Run Flask development server
flask run

# Run tests
pytest

# Run tests with coverage
pytest --cov=routes --cov=models

# Create database migration
flask db migrate -m "description"

# Apply migrations
flask db upgrade

# Seed demo data
python -m seeds.demo_data

# Interactive shell
flask shell
```

## 🔌 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | ❌ | Register user |
| POST | /api/auth/login | ❌ | Login user |
| GET | /api/auth/me | ✅ | Get current user |
| POST | /api/auth/refresh | ✅ | Refresh token |
| GET | /api/projects | ⭕ | List projects |
| POST | /api/projects | ✅ | Create project |
| GET | /api/projects/:id | ⭕ | Get project |
| PUT | /api/projects/:id | ✅ | Update project |
| DELETE | /api/projects/:id | ✅ | Delete project |
| POST | /api/votes | ✅ | Vote on project |
| POST | /api/comments | ✅ | Comment on project |
| POST | /api/badges/award | ✅👑 | Award badge (admin) |
| POST | /api/intros/request | ✅ | Request intro |
| POST | /api/blockchain/verify-cert | ✅ | Verify 0xCert |

Legend: ❌ = No auth, ✅ = Login required, ⭕ = Optional, 👑 = Admin only

## 🐳 Docker Deployment

```bash
# Build image
docker build -t oxship-backend backend/

# Run container
docker run -p 5000:5000 \
  --env-file backend/.env \
  -e DATABASE_URL="postgresql://user:pass@db:5432/oxship" \
  -e REDIS_URL="redis://cache:6379/0" \
  oxship-backend
```

## 🔧 Configuration

Edit `backend/.env` to configure:

- **Database**: PostgreSQL connection string
- **JWT**: Secret key for token signing
- **Redis**: Caching service URL
- **Blockchain**: Kaia testnet RPC + contract address
- **Storage**: AWS S3 credentials (optional)
- **CORS**: Allowed frontend origins

See `backend/.env.example` for all options.

## 📚 Documentation

- **Full Backend Docs**: `backend/README.md`
- **Project Spec**: `0x.ship MVP — Demo Day Version.md`
- **API Reference**: See OpenAPI/Swagger (TODO)

## 🧪 Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=routes --cov=models --cov-report=html
```

## 🚨 Common Issues

### PostgreSQL Connection Error
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check service status
sudo service postgresql status  # Linux
# or use Postgres.app on macOS
```

### Redis Connection Error
```bash
# Test connection
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server
```

### JWT Token Invalid
- Tokens expire after 30 days
- Use `/api/auth/refresh` to get new access token
- Check `JWT_SECRET_KEY` in `.env`

### Blockchain Contract Not Found
- Verify `OXCERTS_CONTRACT_ADDRESS` is correct
- Check contract exists on Kaia Testnet
- Ensure `KAIA_TESTNET_RPC` endpoint is accessible

## 📋 Demo Data

Run `python -m seeds.demo_data` to populate with:
- 4 demo users (1 admin, 3 builders)
- 3 sample projects with details
- Votes, badges, and comments
- Proof scores calculated

**Login credentials:**
- Admin: `admin@0xship.com` / `AdminPassword123`
- User1: `alice@example.com` / `DemoPassword123`
- User2: `bob@example.com` / `DemoPassword123`

## 🔄 Development Workflow

1. **Feature Branch**: `git checkout -b feature/your-feature`
2. **Make Changes**: Edit files in `backend/`
3. **Test**: `pytest`
4. **Commit**: `git commit -m "Add feature description"`
5. **Push**: `git push origin feature/your-feature`
6. **Pull Request**: Create PR for review

## 📦 Dependencies

**Key Libraries:**
- Flask 3.0 - Web framework
- SQLAlchemy 2.0 - ORM
- Flask-JWT-Extended - Authentication
- Marshmallow - Validation
- Web3.py - Blockchain
- Redis - Caching
- Psycopg2 - PostgreSQL driver

See `backend/requirements.txt` for complete list.

## 🎯 Next Steps

After setup is complete:

1. ✅ Backend is running on `http://localhost:5000`
2. ⏳ Frontend will be set up by Lovable team
3. ⏳ Integration testing between frontend and backend
4. ⏳ Demo Day preparation

## 🤝 Support

For issues or questions:
1. Check `backend/README.md` for detailed backend docs
2. Review `0x.ship MVP — Demo Day Version.md` for specifications
3. Check existing GitHub issues
4. Create new issue with detailed description

## 📄 License

MIT License - See LICENSE file

---

**Built with ❤️ for 0x.ship MVP**
