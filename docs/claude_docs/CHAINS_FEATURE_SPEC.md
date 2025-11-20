# Chains Feature Specification
## Subreddit-Style Project Collections for 0x.ship

**Version:** 1.0
**Date:** 2025-11-04
**Status:** Ready for Implementation

---

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [User Stories](#user-stories)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Business Rules](#business-rules)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Notification System](#notification-system)
8. [Frontend Components](#frontend-components)
9. [UI/UX Flows](#uiux-flows)
10. [Implementation Phases](#implementation-phases)

---

## Feature Overview

### What are Chains?
Chains are user-created collections that function like subreddits - thematic or organizational groupings where projects can be published. Any authenticated user can create and manage their own chains.

### Core Concept
- **Any user** can create and name their own chain
- **Projects** are published in both:
  - Global feed (`/projects`)
  - Chain-specific pages (`/chains/:slug`)
- **Chain owners** market and promote their chains
- **Project owners** choose which chains to publish under (up to 5 chains per project)

### Use Cases
1. **Event Organizers:** "ETHGlobal2024" chain collecting all hackathon submissions
2. **Thematic Collections:** "AI Tools", "DeFi Projects", "Climate Tech"
3. **Investor Portfolios:** "Acme Ventures Portfolio"
4. **Community Hubs:** "Stanford Builders", "Web3 Africa", "YC W24"
5. **Company Showcases:** All projects built by/for a specific company

---

## User Stories

### As a User (Any Role)
- ✅ I can create a new chain with a unique name
- ✅ I can browse all public chains
- ✅ I can search for chains by name/description
- ✅ I can view projects in a specific chain
- ✅ I can follow chains I'm interested in
- ✅ I can receive notifications when followed chains have new projects

### As a Chain Owner
- ✅ I can edit my chain's properties (name, description, images, settings)
- ✅ I can set my chain to public or private
- ✅ I can choose approval workflow: instant add or requires approval
- ✅ I can remove inappropriate projects from my chain
- ✅ I can view chain analytics (views, projects, followers)
- ✅ I can delete my chain
- ✅ I can feature/pin important projects in my chain

### As a Project Owner
- ✅ I can add my project to up to 5 chains during creation/editing
- ✅ I can request to add my project to approval-required chains
- ✅ I can remove my project from any chain
- ✅ I can see which chains my project belongs to

### As a Chain Follower
- ✅ I receive notifications when new projects are added to chains I follow
- ✅ I can unfollow chains
- ✅ I can view all chains I follow in my profile

---

## Database Schema

### 1. Chain Model

```python
class Chain(db.Model):
    __tablename__ = 'chains'

    # Primary Key
    id = db.Column(UUID, primary_key=True, default=uuid.uuid4)

    # Ownership
    creator_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=False)

    # Core Properties (MANDATORY)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)

    # Optional Properties
    banner_url = db.Column(db.String(500), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    categories = db.Column(db.ARRAY(db.String), default=list)  # ['AI', 'DeFi']
    rules = db.Column(db.Text, nullable=True)  # Chain guidelines
    social_links = db.Column(JSON, default=dict)  # {twitter: '', website: '', discord: ''}

    # Privacy & Moderation Settings
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    requires_approval = db.Column(db.Boolean, default=False, nullable=False)

    # Stats & Counts
    project_count = db.Column(db.Integer, default=0)
    follower_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)

    # Platform Flags
    is_featured = db.Column(db.Boolean, default=False)  # Admin-set
    is_active = db.Column(db.Boolean, default=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', backref='created_chains', foreign_keys=[creator_id])
    chain_projects = db.relationship('ChainProject', backref='chain', cascade='all, delete-orphan')
    followers = db.relationship('ChainFollower', backref='chain', cascade='all, delete-orphan')
    pending_requests = db.relationship('ChainProjectRequest', backref='chain', cascade='all, delete-orphan')

    # Indexes
    __table_args__ = (
        db.Index('idx_chain_slug', 'slug'),
        db.Index('idx_chain_creator', 'creator_id'),
        db.Index('idx_chain_public_active', 'is_public', 'is_active'),
    )
```

### 2. ChainProject Model (Many-to-Many Junction)

```python
class ChainProject(db.Model):
    __tablename__ = 'chain_projects'

    # Primary Key
    id = db.Column(UUID, primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    chain_id = db.Column(UUID, db.ForeignKey('chains.id'), nullable=False)
    project_id = db.Column(UUID, db.ForeignKey('projects.id'), nullable=False)
    added_by_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=False)

    # Metadata
    order_index = db.Column(db.Integer, default=0)  # For featured/pinned ordering
    is_pinned = db.Column(db.Boolean, default=False)  # Chain owner can pin
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    project = db.relationship('Project', backref='chain_memberships')
    added_by = db.relationship('User', foreign_keys=[added_by_id])

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('chain_id', 'project_id', name='uq_chain_project'),
        db.Index('idx_chain_projects_chain', 'chain_id'),
        db.Index('idx_chain_projects_project', 'project_id'),
    )
```

### 3. ChainProjectRequest Model (For Approval Workflow)

```python
class ChainProjectRequest(db.Model):
    __tablename__ = 'chain_project_requests'

    # Primary Key
    id = db.Column(UUID, primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    chain_id = db.Column(UUID, db.ForeignKey('chains.id'), nullable=False)
    project_id = db.Column(UUID, db.ForeignKey('projects.id'), nullable=False)
    requester_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=False)

    # Request Details
    message = db.Column(db.Text, nullable=True)  # Optional message to chain owner
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected

    # Review Details
    reviewed_by_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = db.relationship('Project')
    requester = db.relationship('User', foreign_keys=[requester_id])
    reviewed_by = db.relationship('User', foreign_keys=[reviewed_by_id])

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('chain_id', 'project_id', 'status',
                          name='uq_chain_project_pending_request'),
        db.Index('idx_chain_requests_status', 'chain_id', 'status'),
    )
```

### 4. ChainFollower Model

```python
class ChainFollower(db.Model):
    __tablename__ = 'chain_followers'

    # Primary Key
    id = db.Column(UUID, primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    chain_id = db.Column(UUID, db.ForeignKey('chains.id'), nullable=False)
    user_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=False)

    # Metadata
    followed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='followed_chains')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('chain_id', 'user_id', name='uq_chain_follower'),
        db.Index('idx_chain_followers_user', 'user_id'),
    )
```

### 5. Notification Model (Extension)

```python
# Extend existing Notification model or create new one
class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=False)

    # Notification Types
    notification_type = db.Column(db.String(50), nullable=False)
    # Types: 'chain_new_project', 'chain_request_approved', 'chain_request_rejected',
    #        'project_added_to_chain', 'project_removed_from_chain',
    #        'chain_follower', 'chain_featured'

    # Notification Content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)

    # Related Entities (nullable, depends on type)
    project_id = db.Column(UUID, db.ForeignKey('projects.id'), nullable=True)
    chain_id = db.Column(UUID, db.ForeignKey('chains.id'), nullable=True)
    actor_id = db.Column(UUID, db.ForeignKey('users.id'), nullable=True)  # Who triggered

    # Redirect URL
    redirect_url = db.Column(db.String(500), nullable=True)

    # Status
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    actor = db.relationship('User', foreign_keys=[actor_id])
    project = db.relationship('Project', foreign_keys=[project_id])
    chain = db.relationship('Chain', foreign_keys=[chain_id])

    # Indexes
    __table_args__ = (
        db.Index('idx_notifications_user_read', 'user_id', 'is_read'),
        db.Index('idx_notifications_created', 'created_at'),
    )
```

---

## API Endpoints

### Chain Management

#### 1. Create Chain
```http
POST /api/chains
Authorization: Bearer <token>

Request Body:
{
  "name": "ETHGlobal 2024",
  "description": "All projects from ETHGlobal hackathon 2024",
  "banner_url": "https://ipfs.io/...",  // Optional
  "logo_url": "https://ipfs.io/...",    // Optional
  "categories": ["Hackathon", "Ethereum"],  // Optional
  "rules": "Only ETHGlobal 2024 participants...",  // Optional
  "social_links": {  // Optional
    "twitter": "https://twitter.com/ethglobal",
    "website": "https://ethglobal.com",
    "discord": "https://discord.gg/..."
  },
  "is_public": true,
  "requires_approval": false
}

Response: 201 Created
{
  "success": true,
  "chain": {
    "id": "uuid",
    "name": "ETHGlobal 2024",
    "slug": "ethglobal-2024",
    "creator": { user object },
    "description": "...",
    "banner_url": "...",
    "logo_url": "...",
    "categories": ["Hackathon", "Ethereum"],
    "rules": "...",
    "social_links": {...},
    "is_public": true,
    "requires_approval": false,
    "project_count": 0,
    "follower_count": 0,
    "view_count": 0,
    "is_featured": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}

Errors:
- 400: Name/slug already exists
- 401: Unauthorized
- 422: Validation errors
```

#### 2. List Chains
```http
GET /api/chains?page=1&limit=20&sort=trending&search=eth&category=Hackathon&visibility=public

Query Params:
- page: int (default: 1)
- limit: int (default: 20, max: 100)
- sort: trending | newest | most_projects | most_followers | alphabetical
- search: string (searches name + description)
- category: string (filter by category)
- visibility: all | public | private (default: public, admins can see all)
- featured: boolean (filter featured chains)
- creator_id: UUID (filter by creator)

Response: 200 OK
{
  "success": true,
  "chains": [
    {
      "id": "uuid",
      "name": "ETHGlobal 2024",
      "slug": "ethglobal-2024",
      "creator": { user object },
      "description": "...",
      "logo_url": "...",
      "categories": ["Hackathon"],
      "is_public": true,
      "project_count": 42,
      "follower_count": 128,
      "is_featured": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### 3. Get Chain Details
```http
GET /api/chains/:slug
Authorization: Bearer <token> (optional, required for private chains)

Response: 200 OK
{
  "success": true,
  "chain": {
    "id": "uuid",
    "name": "ETHGlobal 2024",
    "slug": "ethglobal-2024",
    "creator": { full user object },
    "description": "...",
    "banner_url": "...",
    "logo_url": "...",
    "categories": ["Hackathon", "Ethereum"],
    "rules": "...",
    "social_links": {...},
    "is_public": true,
    "requires_approval": false,
    "project_count": 42,
    "follower_count": 128,
    "view_count": 1543,
    "is_featured": true,
    "is_following": true,  // If user authenticated
    "is_owner": false,     // If user authenticated
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  },
  "stats": {
    "total_views": 1543,
    "total_upvotes": 2341,  // Sum of all project upvotes in chain
    "avg_proof_score": 75.3,
    "top_contributors": [
      { user object + project_count }
    ]
  }
}

Errors:
- 404: Chain not found
- 403: Private chain, not authorized
```

#### 4. Update Chain
```http
PUT /api/chains/:slug
Authorization: Bearer <token>

Request Body: (all fields optional)
{
  "name": "ETHGlobal 2024 Winners",
  "description": "Updated description",
  "banner_url": "...",
  "logo_url": "...",
  "categories": ["Hackathon", "Ethereum", "Winners"],
  "rules": "...",
  "social_links": {...},
  "is_public": false,
  "requires_approval": true
}

Response: 200 OK
{
  "success": true,
  "chain": { updated chain object }
}

Errors:
- 403: Not chain owner
- 404: Chain not found
- 400: Name/slug conflict
```

#### 5. Delete Chain
```http
DELETE /api/chains/:slug
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Chain deleted successfully"
}

Errors:
- 403: Not chain owner
- 404: Chain not found
```

### Chain-Project Association

#### 6. Add Project to Chain
```http
POST /api/chains/:slug/projects
Authorization: Bearer <token>

Request Body:
{
  "project_id": "uuid",
  "message": "This project won first place!"  // Optional, for approval requests
}

Response: 201 Created (instant add)
{
  "success": true,
  "message": "Project added to chain",
  "chain_project": {
    "id": "uuid",
    "chain": { chain object },
    "project": { project object },
    "added_by": { user object },
    "added_at": "2024-01-01T00:00:00Z"
  }
}

Response: 202 Accepted (requires approval)
{
  "success": true,
  "message": "Request submitted for approval",
  "request": {
    "id": "uuid",
    "chain": { chain object },
    "project": { project object },
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}

Errors:
- 400: Project already in chain
- 400: Project limit reached (5 chains max)
- 403: Not project owner OR private chain without access
- 404: Chain or project not found
```

#### 7. Remove Project from Chain
```http
DELETE /api/chains/:slug/projects/:project_id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Project removed from chain"
}

Errors:
- 403: Not project owner AND not chain owner
- 404: Association not found
```

#### 8. Get Projects in Chain
```http
GET /api/chains/:slug/projects?page=1&limit=20&sort=trending&tech_stack=React

Query Params: (inherits all project filtering from /api/projects)
- page, limit
- sort: trending | newest | top_rated | most_voted | pinned_first
- tech_stack, hackathon_name, min_proof_score, etc.
- pinned_only: boolean

Response: 200 OK
{
  "success": true,
  "projects": [
    {
      ...project object,
      "chain_metadata": {
        "added_at": "2024-01-01T00:00:00Z",
        "is_pinned": true,
        "added_by": { user object }
      }
    }
  ],
  "pagination": {...}
}
```

#### 9. Pin/Unpin Project (Chain Owner)
```http
POST /api/chains/:slug/projects/:project_id/pin
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Project pinned",
  "is_pinned": true
}

Errors:
- 403: Not chain owner
```

### Chain Project Requests (Approval Workflow)

#### 10. Get Pending Requests (Chain Owner)
```http
GET /api/chains/:slug/requests?status=pending
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "project": { project object },
      "requester": { user object },
      "message": "...",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}

Errors:
- 403: Not chain owner
```

#### 11. Approve Request
```http
POST /api/chains/:slug/requests/:request_id/approve
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Request approved, project added to chain",
  "chain_project": { chain_project object }
}

Notifications triggered:
- To requester: "Your project was approved for [Chain Name]"

Errors:
- 403: Not chain owner
- 404: Request not found or already processed
```

#### 12. Reject Request
```http
POST /api/chains/:slug/requests/:request_id/reject
Authorization: Bearer <token>

Request Body:
{
  "reason": "Project doesn't fit chain theme"  // Optional
}

Response: 200 OK
{
  "success": true,
  "message": "Request rejected"
}

Notifications triggered:
- To requester: "Your request to add project to [Chain Name] was declined"

Errors:
- 403: Not chain owner
- 404: Request not found
```

### Chain Following

#### 13. Follow Chain
```http
POST /api/chains/:slug/follow
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Following chain",
  "follower_count": 129
}

Notifications triggered:
- To chain owner: "[User] followed your chain [Chain Name]"

Errors:
- 400: Already following
- 403: Private chain, no access
```

#### 14. Unfollow Chain
```http
DELETE /api/chains/:slug/follow
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Unfollowed chain",
  "follower_count": 128
}
```

#### 15. Get Chain Followers
```http
GET /api/chains/:slug/followers?page=1&limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "followers": [
    {
      "user": { user object },
      "followed_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### User's Chains

#### 16. Get User's Created Chains
```http
GET /api/users/:username/chains?include=private

Query Params:
- include: private (only if authenticated as that user)

Response: 200 OK
{
  "success": true,
  "chains": [ chain objects ]
}
```

#### 17. Get User's Followed Chains
```http
GET /api/users/:username/followed-chains
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "chains": [ chain objects with follow metadata ]
}
```

### Notifications

#### 18. Get Notifications
```http
GET /api/notifications?unread_only=true&limit=20&types=chain_new_project

Query Params:
- unread_only: boolean
- limit: int
- types: comma-separated notification types

Response: 200 OK
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "type": "chain_new_project",
      "title": "New project in ETHGlobal 2024",
      "message": "DeFi Wallet was added to ETHGlobal 2024",
      "chain": { chain object },
      "project": { project object },
      "actor": { user object },
      "redirect_url": "/chains/ethglobal-2024",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "unread_count": 5
}
```

#### 19. Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### 20. Mark All Notifications as Read
```http
POST /api/notifications/read-all
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### Admin Endpoints

#### 21. Feature/Unfeature Chain
```http
POST /api/admin/chains/:slug/feature
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Chain featured",
  "is_featured": true
}

Errors:
- 403: Not admin
```

#### 22. Get Chain Analytics (Admin/Owner)
```http
GET /api/chains/:slug/analytics
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "analytics": {
    "views_over_time": [...],
    "projects_over_time": [...],
    "followers_over_time": [...],
    "top_projects": [...],
    "engagement_rate": 0.45,
    "avg_project_score": 75.3
  }
}
```

---

## Business Rules

### Chain Creation
1. ✅ Any authenticated user can create a chain
2. ✅ Chain names must be unique (case-insensitive)
3. ✅ Slugs are auto-generated from names (lowercase, hyphenated)
4. ✅ Mandatory fields: name (3-100 chars), description (10-5000 chars)
5. ✅ Optional fields: banner, logo, categories, rules, social links
6. ✅ No limit on chains per user

### Chain Privacy
1. ✅ **Public chains:** Visible to all, anyone can view projects
2. ✅ **Private chains:** Only accessible to:
   - Chain owner
   - Users who follow (need to be added by owner? TBD in implementation)
   - Admins
3. ✅ Default: public
4. ✅ Privacy can be changed anytime by owner

### Project-Chain Association
1. ✅ **Maximum 5 chains per project** (enforced)
2. ✅ **Unlimited projects per chain**
3. ✅ Only project owner can add their project to chains
4. ✅ Both project owner AND chain owner can remove project
5. ✅ If chain requires approval:
   - Project owner submits request
   - Request enters pending state
   - Chain owner approves/rejects
   - Notification sent to requester on decision
6. ✅ If chain is instant-add: project immediately added
7. ✅ Cannot add project to private chain unless user has access

### Chain Ownership & Permissions
1. ✅ **Chain Owner can:**
   - Edit all chain properties
   - Change privacy settings
   - Change approval workflow
   - Remove any project from chain
   - Pin/unpin projects
   - Delete chain (removes all associations)
   - View analytics
   - Approve/reject project requests

2. ✅ **Project Owner can:**
   - Add their project to chains (subject to approval)
   - Remove their project from any chain
   - View which chains their project is in

3. ✅ **Admins can:**
   - View all chains (including private)
   - Feature/unfeature chains
   - Delete any chain
   - Remove projects from chains
   - View all analytics

### Chain Following
1. ✅ Users can follow unlimited chains
2. ✅ Following a chain triggers notifications for new projects
3. ✅ Cannot follow private chains without access
4. ✅ Chain owner receives notification when followed

### Deletion Rules
1. ✅ Deleting a chain:
   - Removes all ChainProject associations
   - Removes all followers
   - Removes all pending requests
   - Does NOT delete projects themselves
2. ✅ Deleting a project:
   - Removes all ChainProject associations
   - Updates chain project counts
3. ✅ Deleting a user:
   - Transfers chain ownership to admin (or deletes if specified)
   - Removes all follows

---

## User Roles & Permissions

### Permission Matrix

| Action | Regular User | Chain Owner | Admin |
|--------|-------------|-------------|-------|
| Create chain | ✅ | ✅ | ✅ |
| View public chains | ✅ | ✅ | ✅ |
| View private chains | ❌ (unless follower) | ✅ (own) | ✅ (all) |
| Edit chain | ❌ | ✅ (own) | ✅ (all) |
| Delete chain | ❌ | ✅ (own) | ✅ (all) |
| Add project to chain | ✅ (own projects) | ✅ | ✅ |
| Remove project from chain | ✅ (own projects) | ✅ (from own chain) | ✅ |
| Pin project in chain | ❌ | ✅ (own chain) | ✅ |
| Approve project requests | ❌ | ✅ (own chain) | ✅ |
| Follow chain | ✅ | ✅ | ✅ |
| Feature chain | ❌ | ❌ | ✅ |
| View analytics | ❌ | ✅ (own chain) | ✅ (all) |

---

## Notification System

### Notification Types & Triggers

#### 1. `chain_new_project`
**When:** New project added to followed chain
**Recipients:** All chain followers (except the one who added)
**Title:** "New project in [Chain Name]"
**Message:** "[Project Name] was added to [Chain Name]"
**Redirect:** `/chains/:slug` or `/projects/:id`
**Icon:** 🔗

#### 2. `chain_request_approved`
**When:** Chain owner approves project request
**Recipients:** Project owner (requester)
**Title:** "Project approved for [Chain Name]"
**Message:** "Your project [Project Name] was approved for [Chain Name]"
**Redirect:** `/chains/:slug`
**Icon:** ✅

#### 3. `chain_request_rejected`
**When:** Chain owner rejects project request
**Recipients:** Project owner (requester)
**Title:** "Request declined"
**Message:** "Your request to add [Project Name] to [Chain Name] was declined"
**Redirect:** `/projects/:id`
**Icon:** ❌

#### 4. `project_added_to_chain`
**When:** Someone adds their project to your chain (instant-add chains)
**Recipients:** Chain owner
**Title:** "New project in your chain"
**Message:** "[User] added [Project Name] to [Chain Name]"
**Redirect:** `/chains/:slug`
**Icon:** ➕

#### 5. `chain_follower`
**When:** Someone follows your chain
**Recipients:** Chain owner
**Title:** "New follower"
**Message:** "[User] followed [Chain Name]"
**Redirect:** `/chains/:slug/followers`
**Icon:** 👥

#### 6. `chain_featured`
**When:** Admin features your chain
**Recipients:** Chain owner
**Title:** "Chain featured!"
**Message:** "Your chain [Chain Name] was featured by the platform"
**Redirect:** `/chains/:slug`
**Icon:** ⭐

#### 7. `chain_project_request`
**When:** Someone requests to add project to your approval-required chain
**Recipients:** Chain owner
**Title:** "New project request"
**Message:** "[User] wants to add [Project Name] to [Chain Name]"
**Redirect:** `/chains/:slug/requests`
**Icon:** 📝

#### 8. `project_removed_from_chain`
**When:** Chain owner removes your project
**Recipients:** Project owner
**Title:** "Project removed from chain"
**Message:** "Your project [Project Name] was removed from [Chain Name]"
**Redirect:** `/projects/:id`
**Icon:** 🗑️

### Notification Settings (User Preferences)
Users can toggle notifications for:
- ✅ New projects in followed chains
- ✅ Chain request approvals/rejections
- ✅ New followers on my chains
- ✅ Project requests for my chains
- ✅ Featured chain notifications

### Notification UI Requirements

#### Bell Icon in Navbar
```tsx
<BellIcon>
  {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
</BellIcon>
```

#### Notification Popup/Dropdown
- Appears on bell icon click
- Shows last 10 notifications
- "Mark all as read" button
- "View all" link → `/notifications`
- Real-time updates via WebSocket
- Grouped by date (Today, Yesterday, This Week, Older)

#### Notification Item
```tsx
<NotificationItem>
  <Icon>{emoji}</Icon>
  <Content>
    <Title>{title}</Title>
    <Message>{message}</Message>
    <Time>{timeAgo}</Time>
  </Content>
  {!isRead && <UnreadDot />}
</NotificationItem>
```

---

## Frontend Components

### Pages

#### 1. `/chains` - Browse All Chains
**Components:**
- `ChainsListPage`
- `ChainCard` (grid/list view)
- `ChainFilters` (search, category, sort)
- `FeaturedChainsSection`
- `CreateChainButton` (if authenticated)

#### 2. `/chains/create` - Create New Chain
**Components:**
- `CreateChainPage`
- `ChainForm`
  - Basic info (name, description)
  - Media upload (banner, logo)
  - Categories multi-select
  - Rules textarea
  - Social links inputs
  - Privacy toggle
  - Approval workflow toggle

#### 3. `/chains/:slug` - Chain Detail Page
**Components:**
- `ChainDetailPage`
- `ChainHeader`
  - Banner image
  - Logo, name, description
  - Follow button
  - Stats (projects, followers, views)
  - Share button
  - Edit button (if owner)
- `ChainTabs`
  - **Projects tab:** Grid of projects in chain
  - **About tab:** Full description, rules, categories
  - **Followers tab:** List of followers
  - **Requests tab:** Pending requests (owner only)
- `ProjectsGrid` (reuse existing)
- `ChainSidebar`
  - Creator info
  - Categories badges
  - Social links
  - Privacy indicator
  - Approval workflow indicator

#### 4. `/chains/:slug/edit` - Edit Chain
**Components:**
- `EditChainPage`
- `ChainForm` (pre-filled)
- Delete chain button (with confirmation)

#### 5. `/chains/:slug/requests` - Manage Requests (Owner)
**Components:**
- `ChainRequestsPage`
- `RequestCard`
  - Project preview
  - Requester info
  - Request message
  - Approve/Reject buttons
  - Timestamp

#### 6. `/notifications` - All Notifications
**Components:**
- `NotificationsPage`
- `NotificationList`
- `NotificationFilters` (type, read status)
- Infinite scroll

### Reusable Components

#### `ChainCard`
```tsx
<ChainCard chain={chain}>
  <Logo src={chain.logo_url} />
  <Name>{chain.name}</Name>
  <Description>{truncate(chain.description)}</Description>
  <Categories>{chain.categories.map(Badge)}</Categories>
  <Stats>
    <Stat icon="📦">{chain.project_count} projects</Stat>
    <Stat icon="👥">{chain.follower_count} followers</Stat>
  </Stats>
  <Creator>{chain.creator.username}</Creator>
  {chain.is_featured && <FeaturedBadge />}
  {!chain.is_public && <PrivateBadge />}
</ChainCard>
```

#### `ChainBadge` (Mini)
```tsx
<ChainBadge chain={chain}>
  <Logo size="sm" />
  <Name>{chain.name}</Name>
</ChainBadge>
```

#### `ChainSelector` (Multi-select for project form)
```tsx
<ChainSelector
  selected={selectedChains}
  onChange={setSelectedChains}
  maxSelections={5}
>
  <SearchInput />
  <ChainList>
    {chains.map(chain => (
      <ChainOption
        chain={chain}
        selected={isSelected}
        disabled={isMaxReached && !isSelected}
        requiresApproval={chain.requires_approval}
      />
    ))}
  </ChainList>
  <CreateChainLink />
</ChainSelector>
```

#### `NotificationBell`
```tsx
<NotificationBell>
  <BellIcon onClick={togglePopup} />
  {unreadCount > 0 && <Badge>{unreadCount}</Badge>}

  {isOpen && (
    <NotificationPopup>
      <Header>
        <Title>Notifications</Title>
        <MarkAllReadButton />
      </Header>
      <NotificationList>
        {notifications.map(notif => (
          <NotificationItem
            notification={notif}
            onClick={() => handleClick(notif)}
          />
        ))}
      </NotificationList>
      <Footer>
        <ViewAllLink to="/notifications" />
      </Footer>
    </NotificationPopup>
  )}
</NotificationBell>
```

### Modifications to Existing Components

#### `ProjectCard`
Add below tags/badges:
```tsx
{project.chains && project.chains.length > 0 && (
  <ChainsSection>
    <Label>In chains:</Label>
    {project.chains.slice(0, 3).map(chain => (
      <ChainBadge chain={chain} size="sm" />
    ))}
    {project.chains.length > 3 && <MoreBadge>+{project.chains.length - 3}</MoreBadge>}
  </ChainsSection>
)}
```

#### `ProjectDetailPage`
Add section after tags:
```tsx
<ChainsMembershipSection>
  <Heading>Published in these chains</Heading>
  <ChainsList>
    {project.chains.map(chain => (
      <ChainCard chain={chain} variant="horizontal" />
    ))}
  </ChainsList>
</ChainsMembershipSection>
```

#### `ProjectForm` (Create/Edit)
Add after hackathons field:
```tsx
<FormField>
  <Label>
    Publish to Chains (Optional)
    <InfoTooltip>Select up to 5 chains to publish your project in</InfoTooltip>
  </Label>
  <ChainSelector
    selected={formData.chains}
    onChange={handleChainsChange}
    maxSelections={5}
  />
  <HelpText>
    Some chains require approval from the chain owner
  </HelpText>
</FormField>
```

#### `UserProfile`
Add tab:
```tsx
<Tabs>
  <Tab>Projects</Tab>
  <Tab>Chains ({user.created_chains_count})</Tab>
  <Tab>Following</Tab>
</Tabs>

<TabPanel value="chains">
  <ChainsGrid chains={userChains} />
</TabPanel>
```

#### `Navbar`
Add notification bell:
```tsx
<NavbarRight>
  <NotificationBell />
  <UserMenu />
</NavbarRight>
```

---

## UI/UX Flows

### Flow 1: Create a Chain

1. User clicks "Create Chain" button on `/chains` page
2. Redirected to `/chains/create`
3. Fill form:
   - Name* (shows slug preview)
   - Description*
   - Upload banner (optional)
   - Upload logo (optional)
   - Select categories (optional)
   - Add rules (optional)
   - Add social links (optional)
   - Toggle privacy (public/private with info icon)
   - Toggle approval workflow (instant/requires approval with info icon)
4. Click "Create Chain"
5. Success toast: "Chain created!"
6. Redirect to `/chains/:slug`

### Flow 2: Add Project to Chain (Instant Add)

1. User creating/editing project
2. Scroll to "Publish to Chains" field
3. Click multi-select dropdown
4. Search/browse chains
5. Select chains (up to 5, shows counter "3/5")
6. Click "Save Project"
7. Project immediately added to selected chains
8. Success toast: "Project published to 3 chains!"
9. Notifications sent to chain owners

### Flow 3: Add Project to Chain (Requires Approval)

1. Same as Flow 2, but chain has `requires_approval: true`
2. Chain shown with "Requires Approval" badge in selector
3. User selects chain and submits
4. Success toast: "Request sent to [Chain Name] owner"
5. Request appears in chain owner's `/chains/:slug/requests`
6. Chain owner receives notification
7. Owner approves/rejects
8. Project owner receives notification of decision
9. If approved: project appears in chain

### Flow 4: Browse Chains

1. User visits `/chains`
2. See featured chains at top
3. Use filters: search, category, sort
4. Browse chain cards in grid
5. Click chain card → `/chains/:slug`

### Flow 5: View Chain Detail

1. User visits `/chains/:slug`
2. See chain header (banner, logo, stats)
3. Click "Follow" button → Following (button changes to "Following")
4. Browse projects in "Projects" tab
5. Click "About" to see full description, rules
6. Click "Followers" to see who follows
7. If owner: see "Edit" button and "Requests" tab

### Flow 6: Follow Chain & Receive Notifications

1. User follows chain (Flow 5)
2. New project added to chain
3. User receives notification (bell icon shows red dot)
4. Click bell → see popup with notification
5. Click notification → redirect to `/chains/:slug`
6. Notification marked as read

### Flow 7: Chain Owner Manages Requests

1. New request arrives
2. Owner receives notification
3. Click notification → `/chains/:slug/requests`
4. See request with project preview, requester, message
5. Click "Approve" → Project added, requester notified
6. OR click "Reject" → Requester notified

### Flow 8: Remove Project from Chain

**As Project Owner:**
1. Go to project edit page
2. See "Currently in chains" section
3. Click "X" on chain badge
4. Confirmation modal
5. Click "Remove"
6. Project removed, chain owner notified

**As Chain Owner:**
1. On chain detail page
2. See project in list
3. Click "⋮" menu → "Remove from chain"
4. Confirmation modal
5. Click "Remove"
6. Project removed, project owner notified

---

## Implementation Phases

### Phase 1: Database & Backend Core (Week 1)
**Goal:** Database schema + core CRUD endpoints

- [ ] Create migration for Chain model
- [ ] Create migration for ChainProject model
- [ ] Create migration for ChainProjectRequest model
- [ ] Create migration for ChainFollower model
- [ ] Extend/create Notification model
- [ ] Create Chain schema (Marshmallow)
- [ ] Implement Chain CRUD routes:
  - [ ] POST /api/chains (create)
  - [ ] GET /api/chains (list with filters)
  - [ ] GET /api/chains/:slug (detail)
  - [ ] PUT /api/chains/:slug (update)
  - [ ] DELETE /api/chains/:slug (delete)
- [ ] Implement slug generation utility
- [ ] Write unit tests for Chain model
- [ ] Write API tests for Chain endpoints

### Phase 2: Chain-Project Association (Week 1-2)
**Goal:** Projects can be added to chains

- [ ] Implement ChainProject routes:
  - [ ] POST /api/chains/:slug/projects (add project)
  - [ ] DELETE /api/chains/:slug/projects/:project_id (remove)
  - [ ] GET /api/chains/:slug/projects (list with filters)
  - [ ] POST /api/chains/:slug/projects/:project_id/pin (pin)
- [ ] Implement business logic:
  - [ ] Max 5 chains per project validation
  - [ ] Instant add vs approval workflow
  - [ ] Permission checks (owner, private chain access)
- [ ] Update Project model:
  - [ ] Add `chains` relationship
  - [ ] Update project list endpoint to include chains
- [ ] Write tests for association logic

### Phase 3: Approval Workflow (Week 2)
**Goal:** Chains with requires_approval work correctly

- [ ] Implement ChainProjectRequest routes:
  - [ ] GET /api/chains/:slug/requests (list pending)
  - [ ] POST /api/chains/:slug/requests/:id/approve
  - [ ] POST /api/chains/:slug/requests/:id/reject
- [ ] Implement request creation logic (when adding to approval-required chain)
- [ ] Implement approval logic (create ChainProject, delete request)
- [ ] Implement rejection logic (update request status)
- [ ] Write tests for approval workflow

### Phase 4: Following & Notifications (Week 2-3)
**Goal:** Users can follow chains and receive notifications

- [ ] Implement ChainFollower routes:
  - [ ] POST /api/chains/:slug/follow
  - [ ] DELETE /api/chains/:slug/follow
  - [ ] GET /api/chains/:slug/followers
- [ ] Implement notification creation utility
- [ ] Implement notification routes:
  - [ ] GET /api/notifications
  - [ ] PUT /api/notifications/:id/read
  - [ ] POST /api/notifications/read-all
- [ ] Implement WebSocket notification events
- [ ] Create notification triggers for all 8 types
- [ ] Write tests for notifications

### Phase 5: Frontend Core UI (Week 3-4)
**Goal:** Basic chain browsing and viewing

- [ ] Create `types/chain.ts` (TypeScript interfaces)
- [ ] Create `services/chainApi.ts` (API service)
- [ ] Create `hooks/useChains.ts` (React Query hooks)
- [ ] Create pages:
  - [ ] `/chains` - ChainsListPage
  - [ ] `/chains/:slug` - ChainDetailPage
- [ ] Create components:
  - [ ] ChainCard
  - [ ] ChainBadge
  - [ ] ChainHeader
  - [ ] ChainFilters
  - [ ] FeaturedChainsSection
- [ ] Add routing in App.tsx
- [ ] Implement responsive design

### Phase 6: Chain Creation & Management (Week 4)
**Goal:** Users can create and manage chains

- [ ] Create pages:
  - [ ] `/chains/create` - CreateChainPage
  - [ ] `/chains/:slug/edit` - EditChainPage
  - [ ] `/chains/:slug/requests` - ChainRequestsPage
- [ ] Create components:
  - [ ] ChainForm
  - [ ] RequestCard
- [ ] Implement image upload (banner, logo) via IPFS
- [ ] Implement form validation (Zod schemas)
- [ ] Implement delete chain flow with confirmation
- [ ] Add owner-only UI elements (edit button, requests tab)

### Phase 7: Project Integration (Week 4-5)
**Goal:** Projects can be published to chains

- [ ] Update `ProjectForm` component:
  - [ ] Add ChainSelector component
  - [ ] Implement max 5 chains validation
  - [ ] Show approval-required badges
- [ ] Update `ProjectCard` component:
  - [ ] Show chain badges
- [ ] Update `ProjectDetailPage`:
  - [ ] Add chains membership section
  - [ ] Show full chain list
- [ ] Implement add/remove project from chain flows
- [ ] Handle approval requests UI (toast messages)

### Phase 8: Notification System UI (Week 5)
**Goal:** Users can view and manage notifications

- [ ] Create `hooks/useNotifications.ts`
- [ ] Create components:
  - [ ] NotificationBell
  - [ ] NotificationPopup
  - [ ] NotificationItem
  - [ ] NotificationList
- [ ] Add NotificationBell to Navbar
- [ ] Create `/notifications` page
- [ ] Implement real-time notifications via WebSocket
- [ ] Implement notification click → redirect logic
- [ ] Implement mark as read functionality
- [ ] Add notification sound (optional)

### Phase 9: Following & User Profiles (Week 5)
**Goal:** Users can follow chains, see followed chains

- [ ] Implement follow/unfollow button in ChainDetailPage
- [ ] Update UserProfile page:
  - [ ] Add "Chains" tab (created chains)
  - [ ] Add "Following" tab (followed chains)
- [ ] Create `FollowedChainsPage` (or integrate in profile)
- [ ] Show follow status in chain cards
- [ ] Implement followers list page

### Phase 10: Advanced Features (Week 6)
**Goal:** Polish and advanced functionality

- [ ] Implement chain search with autocomplete
- [ ] Implement chain analytics page (owner view)
- [ ] Implement featured chains (admin UI)
- [ ] Implement pin/unpin projects in chain
- [ ] Add "Suggest chains" when creating project
- [ ] Implement chain privacy UI (private chains)
- [ ] Add info tooltips for privacy/approval settings
- [ ] Implement trending algorithm for chains
- [ ] Add share chain functionality

### Phase 11: Testing & Polish (Week 6-7)
**Goal:** Production-ready

- [ ] Write E2E tests (Cypress/Playwright)
- [ ] Test all user flows
- [ ] Test permissions thoroughly
- [ ] Test notification delivery
- [ ] Performance testing (large chains)
- [ ] Responsive design testing
- [ ] Accessibility audit
- [ ] Security audit (SQL injection, XSS, etc.)
- [ ] Load testing (concurrent requests)
- [ ] Bug fixes and refinements

### Phase 12: Deployment & Monitoring (Week 7)
**Goal:** Launch feature

- [ ] Database migration on production
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Set up alerts for notification delivery
- [ ] Create admin dashboard for chains
- [ ] Write user documentation
- [ ] Announce feature to users

---

## Success Metrics

### KPIs to Track
1. **Chains Created:** Total number of chains (target: 100+ in first month)
2. **Active Chains:** Chains with 3+ projects (target: 50+ in first month)
3. **Chain Followers:** Total follows (target: 500+ in first month)
4. **Project-Chain Associations:** Total projects in chains (target: 300+ in first month)
5. **Chain Views:** Total chain page views
6. **Notification Engagement:** Click-through rate on chain notifications
7. **Approval Workflow Usage:** % of chains using requires_approval
8. **Private Chains Usage:** % of chains set to private
9. **Multi-Chain Projects:** % of projects in 2+ chains
10. **User Retention:** Do chain creators/followers return more often?

### Analytics to Collect
- Most followed chains
- Most active chains (projects added per week)
- Most viewed chains
- Average projects per chain
- Average chains per project
- Approval accept/reject rates
- Time to approve requests
- Notification delivery success rate
- Top chain categories

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Chain Moderators:** Owners can assign co-moderators
2. **Chain Rules Enforcement:** Auto-reject projects not matching criteria
3. **Chain Themes:** Custom CSS/branding for chain pages
4. **Chain Events:** Announce events within chains
5. **Chain Leaderboards:** Top projects within chain
6. **Chain Discussions:** Dedicated discussion threads
7. **Cross-Chain Discovery:** "Projects also in these chains"
8. **Chain Recommendations:** AI-powered chain suggestions
9. **Chain Verification:** Verified badge for official chains
10. **Chain NFTs:** Mint NFTs for chain membership
11. **Chain Tokens:** Token-gated chains (must hold NFT to add project)
12. **Chain DAOs:** Governance for chain direction
13. **Chain Merging:** Merge two chains
14. **Chain Forking:** Create chain based on another
15. **Chain Import/Export:** Bulk add projects via CSV

---

## Open Questions & Decisions Needed

### Resolved ✅
1. ✅ Who can add projects to chains? → Project owners
2. ✅ Max chains per project? → 5
3. ✅ Can chain owners remove projects? → Yes
4. ✅ Approval workflow? → Chain owner's choice
5. ✅ Public/private chains? → Chain owner's choice
6. ✅ Following feature? → Yes
7. ✅ Notifications? → Yes, with bell icon

### Still TBD 🤔
1. **Private Chain Access:** How do users get access to private chains?
   - Option A: Anyone can follow, but content hidden until owner approves follower
   - Option B: Invite-only (owner sends invites)
   - Option C: Public viewing, but only approved users can add projects
   - **Recommendation:** Start with Option A (follow → owner approves → access granted)

2. **Chain Ownership Transfer:** Should owners be able to transfer chain ownership?
   - **Recommendation:** Yes, implement in Phase 10

3. **Chain Limits:** Should there be a limit on chains per user?
   - **Recommendation:** No limit initially, monitor for abuse

4. **Chain URL Structure:**
   - Option A: `/chains/:slug`
   - Option B: `/c/:slug` (shorter)
   - **Recommendation:** `/chains/:slug` (clearer)

5. **SEO & Meta Tags:** Each chain should have OG tags for social sharing
   - **Recommendation:** Yes, implement in Phase 10

6. **Chain Subscription Emails:** Weekly digest of new projects in followed chains?
   - **Recommendation:** Phase 2 feature

---

## Technical Considerations

### Performance
- Index all foreign keys (chain_id, project_id, user_id)
- Cache chain details in Redis (TTL: 5 minutes)
- Cache project counts, follower counts
- Paginate all list endpoints
- Optimize N+1 queries with eager loading (SQLAlchemy joinedload)

### Security
- Validate slug uniqueness
- Sanitize chain names, descriptions (prevent XSS)
- Rate limit chain creation (5 per hour per user)
- Rate limit notification creation
- Verify permissions on all operations
- Prevent SQL injection (use parameterized queries)

### Scalability
- Use background jobs for notification delivery (Celery)
- Use WebSocket rooms for real-time chain updates
- Archive old notifications (90 days)
- Consider read replicas for chain list queries

### Data Integrity
- Use transactions for multi-step operations
- Cascade deletes properly
- Update counts atomically
- Handle race conditions (unique constraints)

---

## Appendix

### Sample SQL Migration (Chain Table)

```sql
-- Migration: Create chains table
CREATE TABLE chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    banner_url VARCHAR(500),
    logo_url VARCHAR(500),
    categories TEXT[],
    rules TEXT,
    social_links JSONB DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    project_count INTEGER NOT NULL DEFAULT 0,
    follower_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chain_slug ON chains(slug);
CREATE INDEX idx_chain_creator ON chains(creator_id);
CREATE INDEX idx_chain_public_active ON chains(is_public, is_active);
CREATE INDEX idx_chain_featured ON chains(is_featured) WHERE is_featured = true;
```

### Sample API Response (Chain Detail)

```json
{
  "success": true,
  "chain": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "ETHGlobal 2024",
    "slug": "ethglobal-2024",
    "creator": {
      "id": "user-uuid",
      "username": "vitalik",
      "display_name": "Vitalik Buterin",
      "avatar_url": "https://...",
      "is_validator": true
    },
    "description": "All amazing projects from ETHGlobal hackathon 2024. Join us to showcase your Ethereum innovations!",
    "banner_url": "https://ipfs.io/ipfs/Qm...",
    "logo_url": "https://ipfs.io/ipfs/Qm...",
    "categories": ["Hackathon", "Ethereum", "DeFi"],
    "rules": "1. Must be from ETHGlobal 2024\n2. Must be Ethereum-based\n3. No scams or rug pulls",
    "social_links": {
      "twitter": "https://twitter.com/ethglobal",
      "website": "https://ethglobal.com",
      "discord": "https://discord.gg/ethglobal"
    },
    "is_public": true,
    "requires_approval": false,
    "project_count": 42,
    "follower_count": 128,
    "view_count": 1543,
    "is_featured": true,
    "is_active": true,
    "is_following": true,
    "is_owner": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "stats": {
    "total_views": 1543,
    "total_upvotes": 2341,
    "avg_proof_score": 75.3,
    "top_tech_stacks": ["React", "Solidity", "IPFS"],
    "top_contributors": [
      {
        "user": { user object },
        "project_count": 3
      }
    ]
  }
}
```

---

## Changelog

**v1.0** (2025-11-04)
- Initial feature specification
- Defined all models, endpoints, and UI components
- Established business rules and implementation phases

---

**End of Specification**

This document serves as the comprehensive blueprint for implementing the Chains feature. All stakeholders should refer to this document during development, and any changes should be documented in the Changelog section.
