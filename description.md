# 0x.Discovery-ship — Complete Technical Documentation
**Platform Version:** 2.0
**Last Updated:** 2025
**Status:** Production
**Philosophy:** Proof-Weighted Discovery • Expert Validation • Community-Driven Innovation

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Frontend Architecture](#frontend-architecture)
8. [Real-Time Features](#real-time-features)
9. [Scoring & Algorithms](#scoring--algorithms)
10. [Deployment Guide](#deployment-guide)

---

## Executive Summary

### What is 0x.Discovery-ship?

0x.Discovery-ship is a comprehensive hackathon project discovery and validation platform that combines:
- **Reddit-style social discovery** with voting and nested comments
- **Expert validation system** with multi-tier badges
- **Chain-based organization** (subreddit-style collections)
- **Investor networking** with two-way introduction system
- **Blockchain verification** via wallet connection and 0xCert NFTs
- **Real-time collaboration** with Socket.IO-powered live updates

### Core Value Proposition

Traditional hackathon projects get lost after events end. 0x.Discovery-ship provides:

1. **For Builders:**
   - Persistent showcase for projects beyond hackathons
   - Proof score system that combines community + expert validation
   - Direct access to investors and industry experts
   - Real-time feedback and engagement

2. **For Investors:**
   - Curated discovery of validated projects
   - Advanced filtering by tech stack, category, score
   - Direct introduction to builders
   - Track record of hackathon wins and achievements

3. **For Validators:**
   - Tools to evaluate and award badges systematically
   - Category-based assignment system
   - Reputation building through quality assessments

4. **For Community:**
   - Organize projects into themed Chains
   - Follow specific technology areas or hackathons
   - Discover and support innovation

---

## User Roles & Permissions

### 1. Visitor (Unauthenticated)
**Access Level:** Read-only public content

**Can do:**
- Browse all public projects in feed
- View project details and proof scores
- Read comments and see vote counts
- View chains and their projects
- Browse investor directory (public profiles)
- View leaderboard
- Search projects and users
- Access about/help pages

**Cannot do:**
- Vote, comment, or engage
- Save projects
- Request introductions
- Create content

---

### 2. Regular User / Builder
**Access Level:** Full platform features (free)

**Account Creation:**
- Email + password registration
- Email verification (adds 5pts verification score)
- Optional GitHub OAuth connection (adds 5pts)
- Optional wallet connection (adds 10pts if has 0xCert NFT)

**Can do:**

**Project Management:**
- Create unlimited projects
- Edit/delete own projects
- Upload screenshots (up to 5 per project)
- Add projects to chains (max 5 chains per project)
- Track project views, votes, comments
- Post project updates (milestones, wins, partnerships)

**Engagement:**
- Upvote/downvote projects (one vote per project)
- Comment on any project with nested replies (Reddit-style)
- Edit/delete own comments
- Save/bookmark favorite projects
- Share projects (tracked count)

**Chains (Subreddit-style Collections):**
- Create unlimited chains
- Customize chain with banner, logo, description, rules
- Set privacy (public/private) and approval workflow
- Add/remove projects from owned chains
- Pin important projects in chains
- Follow other chains for updates
- Approve/reject project requests to owned chains

**Social Features:**
- Follow chains for discovery
- Send direct messages to other users
- Request introductions to investors (via projects)
- Customize profile (avatar, bio, display name)
- View own analytics dashboard

**Blockchain:**
- Connect Ethereum wallet
- Mint/verify 0xCert NFT (platform certificate)
- Display wallet address on profile

**Investor Access Requests:**
- Apply to become investor (requires approval)
- Two types: Individual or Organization
- Provide investment thesis, track record, focus areas

---

### 3. Investor
**Access Level:** All Builder permissions + investor-specific features

**How to Become:**
- Submit investor application via `/investor-dashboard`
- Admin reviews and approves
- Three plan tiers: Free, Professional ($99/mo), Enterprise ($299/mo)

**Additional Permissions:**

**Profile:**
- Enhanced profile with investment thesis
- Track record and portfolio showcase
- Ticket size range ($10K-$10M+)
- Investment stages (Pre-seed, Seed, Series A, etc.)
- Industry focus areas
- Geography preferences
- Notable deals and exits
- Value adds (mentorship, network, expertise)

**Visibility Controls:**
- Toggle public directory listing
- Toggle accepting introduction requests
- Social links (Twitter, LinkedIn, booking calendar)

**Introduction System:**
- Receive intro requests from builders
- Send intro requests to builders (reverse flow)
- Accept/decline requests with notes
- Exchange contact info on acceptance

**Analytics:**
- View projects by investment criteria
- Advanced filtering and search
- Export project lists

---

### 4. Validator
**Access Level:** All Builder permissions + validation-specific features

**How to Become:**
- Apply via platform (admin reviews)
- Admin assigns validator status
- Can have category/domain specialization

**Granular Permissions System:**
```json
{
  "can_validate_all": false,  // Can validate any project
  "allowed_badge_types": ["stone", "silver", "gold"],  // Which badges can award
  "allowed_categories": ["AI/ML", "Web3", "DeFi"],  // Domains of expertise
  "allowed_project_ids": ["uuid1", "uuid2"]  // Specific projects assigned
}
```

**Badge Types:**
- **Stone Badge:** 5 points (Basic validation)
- **Silver Badge:** 10 points (Good quality)
- **Gold Badge:** 15 points (Excellent)
- **Platinum Badge:** 20 points (Outstanding)
- **Demerit Badge:** -10 points (Quality issues)
- **Custom Badges:** Admin-created special badges

**Validator Workflow:**
1. Admin assigns projects to validator (by category or manual)
2. Validator reviews assigned projects in dashboard
3. Awards badge with rationale text
4. Badge adds to project's validation score
5. Assignment marked as validated
6. Project owner receives notification

**Validator Dashboard:**
- View assigned projects queue
- Filter by priority (low, normal, high, urgent)
- Filter by status (pending, in_review, validated)
- Track validation history
- Reputation stats (badges awarded, accuracy)

---

### 5. Admin
**Access Level:** Full platform control

**User Management:**
- View all users with advanced filters
- Grant/revoke admin status
- Grant/revoke validator status
- Ban/unban users (toggles is_active flag)
- View user activity logs

**Investor Management:**
- Review investor applications queue
- Approve/reject with admin notes
- View investor tiers and subscriptions

**Validator Management:**
- Approve validator applications
- Assign projects to validators
- Set validator permissions (granular)
- Set assignment priority levels
- Remove validator status

**Content Moderation:**
- Feature/unfeature projects
- Feature/unfeature chains
- Soft-delete inappropriate projects
- Remove spam/abusive comments
- Review user feedback/reports
- Handle reported content

**Badge System:**
- Create custom badge types
- Award any badge to any project
- Override badge permissions

**Analytics:**
- Platform-wide statistics
- User growth metrics
- Project quality trends
- Engagement analytics
- Validator performance

**Platform Settings:**
- Manage system configurations
- Control feature flags
- Set rate limits

---

## Core Features

### A. Project Management System

#### Project Creation & Publishing

**Basic Information:**
```typescript
{
  title: string (max 200 chars, required)
  tagline: string (max 300 chars, optional)
  description: string (min 200 chars for quality points, required)
  project_story: text (optional) - Journey and how it started
  inspiration: text (optional) - What inspired this
  pitch_deck_url: string (IPFS URL, optional) - PDF deck
  market_comparison: text (optional) - vs similar products
  novelty_factor: text (optional) - What makes it unique
}
```

**Media & Links:**
```typescript
{
  screenshots: array (max 5, IPFS URLs)
  demo_url: string (live demo link)
  github_url: string (repository link)
}
```

**Categorization:**
```typescript
{
  categories: array (AI/ML, Web3, DeFi, DAO, Gaming, etc.)
  tech_stack: array (React, Python, Solidity, etc.)
  hackathons: array [{
    name: string,
    date: date,
    prize: string,
    track: string,
    is_winner: boolean,
    rank: number
  }]
}
```

**Team:**
```typescript
{
  team_members: array [{
    name: string,
    role: string (Founder, Developer, Designer, etc.)
  }]
}
```

**Chain Publishing:**
- Add to up to 5 chains during creation
- Instant add (if chain allows) or request approval
- Project owners can remove from chains anytime
- Chain owners can also remove projects

#### Project Updates System

**Update Types:**
```typescript
type UpdateType =
  | 'investment'      // Funding announcement
  | 'hackathon_win'   // Competition success
  | 'milestone'       // Product milestone
  | 'feature_launch'  // New feature
  | 'partnership'     // Partnership announcement
```

**Update Metadata:**
```typescript
{
  type: UpdateType,
  title: string,
  description: string,
  metadata: {
    amount?: string,        // For investment
    investor?: string,      // For investment
    prize?: string,         // For hackathon_win
    hackathon?: string,     // For hackathon_win
    metric?: string,        // For milestone
    partner?: string,       // For partnership
  },
  color: string (yellow | blue | green | pink | purple)
}
```

**Visual Display:**
- Sticker-style badges on project cards
- Color-coded by type
- Hover shows full details
- Timeline view on project detail page

#### Project Scoring System

**Total Proof Score: 0-100 Points**

**1. Verification Score (Max 20 pts):**
```
Email Verified:           5 pts
0xCert NFT Verified:     10 pts
GitHub Connected:         5 pts
```

**2. Community Score (Max 30 pts):**
```
Upvote Ratio:            0-20 pts = (upvotes / total_votes) × 20
Comment Engagement:      0-10 pts = min(comment_count × 0.5, 10)
```

**3. Validation Score (Max 30 pts):**
```
Stone Badge(s):          5 pts each
Silver Badge(s):        10 pts each
Gold Badge(s):          15 pts each
Platinum Badge(s):      20 pts each
Demerit Badge(s):      -10 pts each

Note: Multiple badges cumulative, max 30pts validation score
```

**4. Quality Score (Max 20 pts):**
```
Has Live Demo:           5 pts
Has GitHub Link:         5 pts
Has Screenshots:         5 pts
Description 200+ chars:  5 pts
```

**Trending Algorithm (Reddit-style Hot Score):**
```python
from datetime import datetime
from math import log

def calculate_trending_score(project):
    """
    Reddit-style hot ranking algorithm

    Formula: log10(votes) + (time_factor / 45000)

    - Early votes count more than later votes (log)
    - Recent projects rank higher than old ones (time decay)
    - Featured projects get 2x boost
    """

    # Vote score (log scale favors early votes)
    votes = max(project.upvotes - project.downvotes, 1)
    vote_score = log(votes, 10) if votes > 0 else 0

    # Time score (newer = higher)
    epoch = datetime(1970, 1, 1)
    time_diff = (project.created_at - epoch).total_seconds()
    time_score = time_diff / 45000  # Decay over ~12.5 hours

    # Engagement boost
    engagement_multiplier = 1 + (project.comment_count * 0.01)

    # Featured boost
    featured_multiplier = 2 if project.is_featured else 1

    trending_score = (vote_score + time_score) * engagement_multiplier * featured_multiplier

    return round(trending_score, 4)
```

#### Project Views Tracking

**View Counting Logic:**
- **Logged-in users:** Track by `user_id` (one view per user)
- **Anonymous users:** Track by `session_id` (one view per session)
- Table: `ProjectView` with unique constraint on `(project_id, user_id, session_id)`
- Increments `project.view_count` on unique view

**Implementation:**
```python
# backend/routes/projects.py

@projects_bp.route('/<project_id>/view', methods=['POST'])
@optional_auth()
def track_view(project_id):
    user_id = get_jwt_identity() if is_authenticated() else None
    session_id = request.json.get('session_id') if not user_id else None

    # Check if already viewed
    existing = ProjectView.query.filter_by(
        project_id=project_id,
        user_id=user_id,
        session_id=session_id
    ).first()

    if not existing:
        view = ProjectView(
            project_id=project_id,
            user_id=user_id,
            session_id=session_id
        )
        db.session.add(view)

        project = Project.query.get(project_id)
        project.view_count += 1

        db.session.commit()

    return jsonify({'success': True})
```

---

### B. Chains Feature (Subreddit-Style Collections)

#### Overview
Chains are user-created collections for organizing projects around themes, technologies, or communities. Think of them as subreddits for hackathon projects.

#### Chain Properties

**Core Fields:**
```typescript
{
  id: uuid,
  creator_id: uuid,
  name: string (max 100, unique),
  slug: string (URL-friendly, unique),
  description: text (required),

  // Optional branding
  banner_url: string (IPFS),
  logo_url: string (IPFS),

  // Organization
  categories: array (tags like 'AI', 'DeFi', etc.),
  rules: text (chain guidelines),
  social_links: {
    twitter?: string,
    website?: string,
    discord?: string,
    telegram?: string
  },

  // Privacy settings
  is_public: boolean (default: true),
  requires_approval: boolean (default: false),

  // Stats
  project_count: integer,
  follower_count: integer,
  view_count: integer,

  // Platform flags
  is_featured: boolean (admin-set),
  is_active: boolean (soft delete),

  // Timestamps
  created_at: datetime,
  updated_at: datetime
}
```

#### Chain Privacy & Workflows

**Public Chains (`is_public: true`):**
- Visible to everyone in browse/search
- Projects visible to all visitors
- Anyone can follow

**Private Chains (`is_public: false`):**
- Visible only to:
  - Chain owner
  - Chain followers
  - Admins
- Projects in private chains not shown in main feed (only chain page)

**Approval Workflow (`requires_approval`):**

**Instant Add (requires_approval: false):**
- Project owner adds project → immediately appears in chain
- No review needed
- Notification sent to chain owner

**Approval Required (requires_approval: true):**
- Project owner sends request with optional message
- Creates `ChainProjectRequest` with status='pending'
- Chain owner reviews in `/chains/:slug/requests`
- Can approve or reject with reason
- Notification sent to requester
- On approval: Creates `ChainProject` association

#### Chain-Project Association

**Limitations:**
- Each project can be in max **5 chains**
- No duplicates (unique constraint on chain_id + project_id)
- Both project owner and chain owner can remove association

**Pinning:**
- Chain owner can pin important projects
- Pinned projects appear at top of chain feed
- Boolean flag `is_pinned` on `ChainProject`

**Ordering:**
- Projects have `order_index` for custom sorting
- Chain owner can reorder projects
- Default: newest first

#### Chain Following

**Follow System:**
- Users follow chains for updates
- Creates `ChainFollower` record
- Increments chain's `follower_count`
- Notification sent to chain owner

**Follower Benefits:**
- Receive notifications when:
  - New project added to chain
  - Chain featured by admin
  - Project in chain receives major badge
- Private chain access
- Chain appears in user's "Following" tab

#### Chain Notifications

**Notification Types:**

1. **`chain_new_project`** → Chain followers
   - Title: "New project in [Chain Name]"
   - Message: "[Project Title] was added to [Chain Name]"
   - Redirect: `/project/:id`

2. **`project_added_to_chain`** → Chain owner
   - Title: "Project added to your chain"
   - Message: "[Username] added [Project Title] to [Chain Name]"
   - Redirect: `/chains/:slug`

3. **`chain_project_request`** → Chain owner
   - Title: "New project request"
   - Message: "[Username] wants to add [Project Title] to [Chain Name]"
   - Redirect: `/chains/:slug/requests`

4. **`chain_request_approved`** → Requester
   - Title: "Project request approved"
   - Message: "[Project Title] was approved for [Chain Name]"
   - Redirect: `/project/:id`

5. **`chain_request_rejected`** → Requester
   - Title: "Project request rejected"
   - Message: "[Project Title] was rejected for [Chain Name]"
   - Redirect: `/chains/:slug`

6. **`project_removed_from_chain`** → Project owner
   - Title: "Project removed from chain"
   - Message: "[Project Title] was removed from [Chain Name]"
   - Redirect: `/project/:id`

7. **`chain_follower`** → Chain owner
   - Title: "New follower"
   - Message: "[Username] started following [Chain Name]"
   - Redirect: `/chains/:slug`

8. **`chain_featured`** → Chain owner
   - Title: "Your chain was featured!"
   - Message: "[Chain Name] is now featured on the platform"
   - Redirect: `/chains/:slug`

#### Chain Discovery & Browsing

**Browse Page (`/chains`):**

**Filters:**
- Categories (AI/ML, Web3, DeFi, etc.)
- Featured only toggle
- Public/Private (if logged in)

**Sort Options:**
- **Trending:** By recent activity + follower growth
- **Newest:** By created_at DESC
- **Most Projects:** By project_count DESC
- **Most Followers:** By follower_count DESC
- **Alphabetical:** By name ASC

**Featured Section:**
- Admin-curated chains appear at top
- Special badge/highlight
- Rotates periodically

**Search:**
- Full-text search on name + description
- Fuzzy matching
- Real-time results

#### Chain Detail Page (`/chains/:slug`)

**Layout Sections:**

1. **Header:**
   - Banner image (full-width)
   - Logo (circular overlay)
   - Chain name, description
   - Stats: Projects, Followers, Views
   - Follow/Unfollow button
   - Edit button (if owner)
   - Feature button (if admin)

2. **Tabs:**
   - **Projects:** All projects in chain
   - **About:** Rules, description, social links
   - **Requests:** Pending requests (owner only)

3. **Project Feed:**
   - Pinned projects first (special badge)
   - Sort: Newest, Top Rated, Most Voted
   - Project cards with chain badge removed
   - Infinite scroll pagination

4. **Sidebar (Optional):**
   - Top contributors
   - Chain statistics
   - Related chains
   - Chain rules

#### Chain Management

**Creating a Chain (`POST /api/chains`):**
```typescript
{
  name: string (required, unique),
  description: string (required),
  categories?: string[],
  rules?: string,
  banner_url?: string,
  logo_url?: string,
  social_links?: object,
  is_public?: boolean (default: true),
  requires_approval?: boolean (default: false)
}
```

**Editing Chain (`PUT /api/chains/:slug`):**
- Only owner or admin can edit
- Can update all fields except slug
- Slug changes require admin approval (prevents URL breaking)

**Deleting Chain (`DELETE /api/chains/:slug`):**
- Soft delete (sets is_active = false)
- Removes all ChainProject associations
- Sends notification to all followers
- Retains data for admin review

**Adding Project to Chain:**
```typescript
POST /api/chains/:slug/projects
{
  project_id: uuid
}

Response:
- If instant: ChainProject created
- If approval required: ChainProjectRequest created
```

**Removing Project:**
```typescript
DELETE /api/chains/:slug/projects/:project_id

Allowed if:
- Request user is project owner, OR
- Request user is chain owner, OR
- Request user is admin
```

**Pinning Project:**
```typescript
POST /api/chains/:slug/projects/:project_id/pin

Only allowed for chain owner or admin
Toggles is_pinned flag
```

---

### C. Validation System

#### Overview
The validation system allows domain experts (validators) to review and award badges to projects, adding credibility through expert assessment.

#### Validator Assignment System

**Assignment Creation:**
Admin assigns validators to projects using:
```typescript
POST /api/admin/validator-assignments
{
  validator_id: uuid,
  project_id: uuid,
  category: string (optional),
  priority: 'low' | 'normal' | 'high' | 'urgent',
  notes: string (optional)
}
```

**Assignment Statuses:**
- `pending` - Assigned, not started
- `in_review` - Validator working on it
- `validated` - Badge awarded, complete
- `rejected` - Validator declined/flagged issue

**Auto-Assignment (Future):**
Based on:
- Validator's `allowed_categories` matching project categories
- Validator's workload (count of pending assignments)
- Project priority level
- Validator's historical performance in category

#### Validator Permissions

**Permission Model:**
```typescript
{
  validator_id: uuid,
  can_validate_all: boolean,  // Override - can validate any project

  allowed_badge_types: string[],  // ['stone', 'silver', 'gold', 'platinum', 'demerit', 'custom']

  allowed_categories: string[],  // ['AI/ML', 'Web3', 'DeFi', 'DAO', 'Gaming', ...]

  allowed_project_ids: uuid[],  // Specific projects they can validate

  is_active: boolean  // Can be suspended by admin
}
```

**Permission Checks:**
```python
def can_validator_badge_project(validator, project, badge_type):
    """Check if validator can award badge to project"""

    # Admin override
    if validator.is_admin:
        return True

    # Not active
    if not validator.validator_permissions.is_active:
        return False

    # Can validate all
    if validator.validator_permissions.can_validate_all:
        # But check badge type permission
        return badge_type in validator.validator_permissions.allowed_badge_types

    # Check badge type
    if badge_type not in validator.validator_permissions.allowed_badge_types:
        return False

    # Check if project in allowed projects
    if project.id in validator.validator_permissions.allowed_project_ids:
        return True

    # Check if project category matches validator categories
    project_categories = set(project.categories or [])
    validator_categories = set(validator.validator_permissions.allowed_categories or [])

    if project_categories & validator_categories:  # Intersection
        return True

    return False
```

#### Badge Awarding Workflow

**Step 1: Validator Reviews Project**
- Accesses validator dashboard
- Views assigned projects
- Clicks project to open detail view
- Reviews project thoroughly:
  - Code quality (if GitHub available)
  - Demo functionality (if demo available)
  - Innovation/novelty
  - Completeness
  - Impact potential

**Step 2: Award Badge**
```typescript
POST /api/badges
{
  project_id: uuid,
  badge_type: 'stone' | 'silver' | 'gold' | 'platinum' | 'demerit',
  rationale: string (required, min 50 chars)
}
```

**Backend Processing:**
1. Validate validator permissions
2. Create `ValidationBadge` record
3. Update project's `validation_score`:
   ```python
   project.validation_score = min(
       sum([badge.points for badge in project.badges]),
       30  # Max validation score
   )
   ```
4. Recalculate project's total `proof_score`
5. Update project's `trending_score`
6. Mark `ValidatorAssignment` as validated
7. Create notification for project owner
8. Broadcast via Socket.IO
9. Invalidate caches

**Step 3: Notification Sent**
```json
{
  "type": "badge",
  "title": "Badge awarded!",
  "message": "[Validator Name] awarded a [Badge Type] badge to [Project Title]",
  "redirect_url": "/project/:id",
  "actor_id": "validator_id"
}
```

#### Badge Display

**On Project Card:**
```
┌──────────────────────────────────┐
│ Project Title                    │
│ Score: 85 | 🥇 Platinum          │
│ [🪨Stone] [🥈Silver] [🥇Gold]    │
└──────────────────────────────────┘
```

**On Project Detail:**
```
Validation (25 pts)
──────────────────
🥇 Platinum Badge (20 pts)
   Awarded by: @validator_alice
   "Exceptional innovation in AI/ML space. Clean architecture,
    well-documented, and solves a real problem. Demo is polished."

🥈 Silver Badge (10 pts)
   Awarded by: @validator_bob
   "Solid implementation, good UX. Could improve test coverage."
```

**Badge Types Reference:**

| Badge | Points | Color | Criteria |
|-------|--------|-------|----------|
| 🪨 Stone | +5 | Gray | Basic validation, meets minimum standards |
| 🥈 Silver | +10 | Silver | Good quality, above average |
| 🥇 Gold | +15 | Gold | Excellent project, high impact potential |
| 💎 Platinum | +20 | Purple | Outstanding, industry-grade quality |
| ⚠️ Demerit | -10 | Red | Quality issues, incomplete, or spam |
| 🌟 Custom | Variable | Custom | Admin-created special badges |

---

### D. Investor Ecosystem

#### Investor Application System

**Application Process:**

**Step 1: User Applies (`POST /api/investor-requests`)**
```typescript
{
  type: 'individual' | 'organization',

  // Individual
  full_name?: string,
  position?: string,

  // Organization
  organization_name?: string,
  organization_type?: string,  // VC, Angel Network, Corporate VC, Family Office

  // Contact
  location: string,
  linkedin_url: string,

  // Investment Details
  investment_stages: string[],  // Pre-seed, Seed, Series A, B, C+
  industries: string[],  // AI/ML, Web3, DeFi, FinTech, HealthTech, etc.
  ticket_size_min: number,
  ticket_size_max: number,
  geography: string[],  // Global, US, Europe, Asia, etc.

  // Track Record
  number_of_investments: number,
  notable_deals: string,  // Free text
  portfolio_companies: string,  // Comma-separated or JSON array
  exits: string,  // Description of exits/acquisitions

  // Value Proposition
  value_adds: string[],  // Mentorship, Network, Marketing, Hiring, etc.
  thesis: text,  // Investment thesis (500+ chars)

  // Visibility
  public_profile: boolean,  // Show in directory
  accepting_requests: boolean,  // Accept intro requests

  // Plan Selection
  plan: 'free' | 'professional' | 'enterprise',

  // Social
  twitter_url?: string,
  website_url?: string,
  calendar_url?: string  // Calendly/similar
}
```

**Step 2: Admin Reviews**
- Accesses `/admin` dashboard
- Views pending investor requests
- Checks LinkedIn profile, track record
- Verifies legitimacy
- Approves or rejects with notes

**Step 3: Approval/Rejection**
```typescript
POST /api/admin/investor-requests/:id/approve
{
  admin_notes?: string
}

or

POST /api/admin/investor-requests/:id/reject
{
  rejection_reason: string
}
```

**Step 4: User Receives Notification**
- Email sent with decision
- In-app notification created
- If approved: Redirected to investor dashboard
- If rejected: Can reapply after 30 days

#### Investor Plans

**Free Plan (Lifetime Free):**
- Basic profile in directory
- Can browse projects
- Limited intro requests (5/month)
- Basic search filters
- Standard support

**Professional Plan ($99/month):**
- Enhanced profile with full track record
- Unlimited intro requests
- Advanced search & filters
- Saved searches
- Analytics dashboard
- Priority support
- Remove "Free plan" badge

**Enterprise Plan ($299/month):**
- All Professional features
- Team access (up to 5 members)
- API access for integrations
- Custom branding
- Dedicated account manager
- Early access to new features
- White-glove onboarding

#### Investor Directory

**Public Directory (`/investors`):**

**Filters:**
- Investment stage (Pre-seed, Seed, Series A+)
- Industry focus (AI/ML, Web3, DeFi, etc.)
- Ticket size range ($10K-$10M+)
- Geography (Global, US, Europe, Asia)
- Investor type (Individual, VC, Angel Network, Corporate)
- Accepting requests only

**Sort Options:**
- Newest first
- Most active (by intro count)
- Ticket size (high to low)
- Alphabetical

**Investor Card:**
```
┌──────────────────────────────────────┐
│ [Avatar] John Doe                    │
│          Partner @ Acme VC           │
│          📍 San Francisco, CA        │
│                                      │
│ 💰 $100K - $2M • Seed, Series A      │
│ 🎯 AI/ML, DeFi, Web3                 │
│ ✅ Accepting requests                │
│                                      │
│ 15 investments • 3 exits             │
│                                      │
│ [View Profile] [Request Intro]       │
└──────────────────────────────────────┘
```

#### Investor Profile Page

**Sections:**

1. **Header:**
   - Avatar, name, position, organization
   - Location, social links
   - Accepting requests badge
   - Contact button (if accepting)

2. **Investment Focus:**
   - Stages, industries, geography
   - Ticket size range
   - Investment thesis (full text)

3. **Track Record:**
   - Number of investments
   - Notable deals with descriptions
   - Portfolio companies list
   - Successful exits

4. **Value Adds:**
   - What investor brings beyond capital
   - Expertise areas
   - Network access
   - Operational support

5. **Activity:**
   - Recent projects viewed
   - Recent intro requests (if public)
   - Badges awarded (if validator too)

#### Introduction System

**Builder → Investor Intro Request:**

**Step 1: Builder Clicks "Request Intro" on Project**
```typescript
POST /api/intros
{
  project_id: uuid,
  investor_id: uuid,
  message: string (optional, max 500 chars)
}
```

**Step 2: Investor Receives Notification**
- Email: "Builder wants to connect about [Project Title]"
- In-app notification with project preview
- Redirect to `/intros`

**Step 3: Investor Reviews Request**
- Views project details
- Reads builder's message
- Checks proof score, badges, traction

**Step 4: Investor Responds**
```typescript
PUT /api/intros/:id/accept
{
  contact_info: string  // Email, phone, calendar link
}

or

PUT /api/intros/:id/decline
{
  reason?: string
}
```

**Step 5: Builder Receives Response**
- If accepted: Builder gets investor's contact info
- If declined: Notification with optional reason
- Status tracked for analytics

**Investor → Builder Intro Request (Reverse Flow):**

**Step 1: Investor Clicks "Request Intro" on Project**
```typescript
POST /api/intro-requests
{
  project_id: uuid,
  message: string (required, why interested)
}
```

**Step 2-5:** Same workflow, reversed roles

**Introduction Statuses:**
- `pending` - Awaiting response
- `accepted` - Contact info exchanged
- `declined` - Request rejected
- `expired` - No response after 30 days

---

### E. Engagement System

#### Voting

**Vote Types:**
- `up` - Upvote (👍)
- `down` - Downvote (👎)

**Rules:**
- One vote per user per project
- User can change vote (up → down or vice versa)
- User can remove vote (→ neutral)
- User cannot vote on own projects
- Anonymous users cannot vote

**Implementation:**
```typescript
POST /api/votes
{
  project_id: uuid,
  vote_type: 'up' | 'down'
}

// Changes existing vote if present
PUT /api/votes/:vote_id
{
  vote_type: 'up' | 'down'
}

// Removes vote
DELETE /api/votes/:vote_id
```

**Backend Processing:**
1. Check if user has existing vote
2. If exists:
   - Undo old vote counts
   - Update vote type
   - Apply new vote counts
3. If new:
   - Create vote record
   - Apply vote counts
4. Recalculate project community_score
5. Recalculate trending_score
6. Broadcast via Socket.IO (Instagram-style optimistic update)
7. Create notification for project owner (batched, max 1/hour)

**Vote Display:**
```
[↑ 45] [↓ 3] (94% upvoted)
```

**Real-Time Updates:**
Frontend uses optimistic updates:
```typescript
// On button click:
1. Immediately update UI (upvote count +1, button highlighted)
2. Send API request in background
3. If request fails, revert UI
4. If request succeeds, keep UI as-is
5. Socket.IO broadcasts vote update to other clients
```

#### Comments

**Comment Structure:**
```typescript
{
  id: uuid,
  project_id: uuid,
  user_id: uuid,
  parent_id: uuid | null,  // For nested replies
  content: string (max 2000 chars),
  upvotes: number,
  downvotes: number,
  is_deleted: boolean,  // Soft delete
  created_at: datetime,
  updated_at: datetime
}
```

**Comment Features:**
- **Nested Replies:** Reddit-style threading (unlimited depth)
- **Voting:** Upvote/downvote comments
- **Editing:** Edit own comments (shows "edited" tag)
- **Deleting:** Soft delete (shows "[deleted]" but preserves replies)
- **Mentions:** @username mentions (frontend parsing)
- **Markdown:** Basic markdown support (bold, italic, links, code)

**API Endpoints:**
```typescript
// Create comment
POST /api/comments
{
  project_id: uuid,
  content: string,
  parent_id?: uuid  // For replies
}

// Edit comment
PUT /api/comments/:id
{
  content: string
}

// Delete comment
DELETE /api/comments/:id

// Vote on comment
POST /api/comments/:id/vote
{
  vote_type: 'up' | 'down'
}

// Get project comments (with nested structure)
GET /api/projects/:id/comments
```

**Backend Processing:**
1. Validate content (not empty, max length)
2. Create comment record
3. Increment project's `comment_count`
4. Update community_score (+0.5 pts per comment, max 10)
5. Create notification for:
   - Project owner (if top-level comment)
   - Parent comment author (if reply)
6. Broadcast via Socket.IO
7. Cache invalidation

**Comment Display (Frontend):**
```
┌──────────────────────────────────────┐
│ @alice • 2 hours ago                 │
│ This is a great project! Love the UX │
│ [↑ 12] [↓ 1] [Reply]                 │
│                                      │
│   └─ @bob • 1 hour ago               │
│      Thanks! We spent a lot of time  │
│      on the design.                  │
│      [↑ 5] [↓ 0] [Reply]             │
│                                      │
│ @charlie • 30 minutes ago            │
│ How does this compare to [Product X]?│
│ [↑ 3] [↓ 0] [Reply]                  │
└──────────────────────────────────────┘
```

**Real-Time Comment Updates:**
- Socket.IO event: `new_comment`
- Payload: Comment object with user data
- Frontend appends to comment list
- Shows toast notification if user is active on different tab

#### Saved Projects

**Bookmarking:**
```typescript
POST /api/saved-projects
{
  project_id: uuid
}

DELETE /api/saved-projects/:project_id

GET /api/saved-projects
// Returns user's saved projects
```

**Use Cases:**
- Save interesting projects for later
- Create personal collections
- Track favorites
- Export saved projects (CSV)

**Display:**
- Heart icon on project cards
- Filled if saved, outline if not
- Count visible to project owner only

---

### F. Notifications System

#### Architecture

**Notification Model:**
```typescript
{
  id: uuid,
  user_id: uuid,
  notification_type: string,
  title: string (max 200),
  message: text,

  // Related entities (nullable)
  project_id?: uuid,
  chain_id?: uuid,
  actor_id?: uuid,  // Who triggered this

  redirect_url?: string,

  is_read: boolean,
  read_at?: datetime,
  created_at: datetime
}
```

**Notification Types (16 total):**

**Chain Notifications:**
1. `chain_new_project` - New project in followed chain
2. `chain_request_approved` - Your project request approved
3. `chain_request_rejected` - Your project request rejected
4. `project_added_to_chain` - Project added to your chain
5. `project_removed_from_chain` - Your project removed from chain
6. `chain_follower` - New follower on your chain
7. `chain_featured` - Your chain featured by admin
8. `chain_project_request` - New project request for your chain

**Engagement Notifications:**
9. `vote` - Someone voted on your project (batched)
10. `comment` - New comment on your project
11. `badge` - Badge awarded to your project

**Introduction Notifications:**
12. `intro_request` - New intro request (builder→investor or investor→builder)
13. `intro_accepted` - Intro request accepted
14. `intro_declined` - Intro request declined

**Validator Notifications:**
15. `validator_assignment` - New project assigned for validation

**System Notifications:**
16. `system` - Admin messages, platform updates

#### Notification Delivery

**Channels:**
1. **In-App:** Notification bell in navbar
2. **Email:** Optional email delivery (user settings)
3. **Push:** Browser push notifications (future)

**In-App Delivery:**
- Real-time via Socket.IO
- Event: `new_notification`
- Payload: Full notification object
- Frontend shows toast + updates bell badge count

**Batching (Anti-Spam):**
Certain notifications are batched to prevent spam:

**Vote Notifications:**
- Max 1 notification per project per hour
- Message: "3 new votes on [Project Title]"
- Aggregates multiple votes

**Comment Notifications:**
- Immediate for first comment
- Batched after 3 comments in 10 minutes
- Message: "5 new comments on [Project Title]"

#### Notification UI

**Bell Icon (Navbar):**
```
[🔔 3]  ← Unread count badge

Dropdown:
┌────────────────────────────────────────┐
│ Notifications                [Mark all]│
├────────────────────────────────────────┤
│ • @alice awarded Gold badge to         │
│   "AI Project"                  2m ago │
│                                        │
│ • New project in "AI/ML Chain"  5m ago │
│                                        │
│   @bob commented on "DeFi App" 1h ago  │
│   (read, gray text)                    │
│                                        │
│ [View All]                             │
└────────────────────────────────────────┘
```

**Notifications Page (`/notifications`):**

**Filters:**
- All / Unread Only
- By type (Chains, Engagement, Intros, System)
- By date range

**Sort:**
- Newest first (default)
- Oldest first
- Unread first

**Actions:**
- Mark individual as read
- Mark all as read
- Delete notification (soft delete)
- Batch actions (select multiple)

**Notification Item:**
```
┌──────────────────────────────────────────────┐
│ [Avatar] Badge awarded!              2h ago   │
│                                               │
│ Alice Chen awarded a Gold badge to            │
│ "AI Code Reviewer"                            │
│                                               │
│ "Excellent implementation, clean code,        │
│  well-documented."                            │
│                                               │
│ [View Project →]                    [Mark Read]│
└──────────────────────────────────────────────┘
```

#### Notification Settings (User Preferences)

**Settings Page (`/settings` → Notifications tab):**
```
Email Notifications:
─────────────────────
[✓] New comments on my projects
[✓] Badges awarded to my projects
[✓] Intro requests
[ ] Votes on my projects (muted - too noisy)
[✓] Projects added to my chains
[✓] Chain request responses
[ ] New followers (muted)
[✓] Weekly digest

In-App Notifications:
─────────────────────
[✓] Enable all in-app notifications
[✓] Show desktop notifications
[✓] Sound effects

Digest Settings:
────────────────
Frequency: [Weekly ▼]
Day: [Monday ▼]
Time: [9:00 AM ▼]
```

---

### G. Events System

#### Overview
Events represent hackathons, conferences, competitions, and showcases. Projects can be associated with events to track participation and wins.

#### Event Model

```typescript
{
  id: uuid,
  organizer_id: uuid,  // User who created event

  // Basic Info
  name: string (max 200),
  slug: string (URL-friendly, unique),
  tagline: string (max 300),
  description: text,

  // Branding
  banner_url: string (IPFS),
  logo_url: string (IPFS),

  // Details
  event_type: 'hackathon' | 'conference' | 'competition' | 'showcase',
  start_date: date,
  end_date: date,
  location: string,  // "Virtual", "San Francisco, CA", etc.
  website_url: string,

  // Hackathon-specific
  prize_pool?: string,  // "$50,000"
  categories?: string[],  // Tracks/verticals

  // Platform flags
  is_verified: boolean,  // Official event
  is_featured: boolean,

  // Stats
  project_count: integer,
  subscriber_count: integer,

  // Timestamps
  created_at: datetime,
  updated_at: datetime
}
```

#### Event-Project Association

**Association Model:**
```typescript
{
  id: uuid,
  event_id: uuid,
  project_id: uuid,

  // Participation details
  track?: string,  // Which track/category participated in
  prize_won?: string,  // "1st Place", "$10,000", etc.
  rank?: number,  // 1, 2, 3, etc.
  is_winner: boolean,
  is_finalist: boolean,

  // Metadata
  submission_date?: datetime,
  demo_day_date?: datetime,

  created_at: datetime
}
```

**Adding Project to Event:**
```typescript
POST /api/events/:slug/projects
{
  project_id: uuid,
  track?: string,
  prize_won?: string,
  rank?: number
}
```

**Use Cases:**
- Project owner tags project with hackathons attended
- Event organizer can verify winners
- Investors filter projects by specific hackathons
- Leaderboard shows top hackathon winners

#### Event Discovery

**Browse Events (`/events`):**

**Filters:**
- Event type (Hackathon, Conference, etc.)
- Date range (Upcoming, Past, Ongoing)
- Location (Virtual, In-person, Hybrid)
- Verified only

**Sort:**
- Upcoming first
- Largest prize pool
- Most projects
- Most subscribers

**Event Card:**
```
┌────────────────────────────────────┐
│ [Banner]                           │
│                                    │
│ [Logo] ETHGlobal Waterloo 2024    │
│        Jun 21-23 • Waterloo, ON   │
│                                    │
│ 💰 $50,000 in prizes               │
│ 🏗️ 42 projects • 156 subscribers  │
│ ✓ Verified event                  │
│                                    │
│ [View Projects] [Subscribe]        │
└────────────────────────────────────┘
```

#### Event Detail Page

**Sections:**

1. **Hero:**
   - Banner image
   - Event name, tagline
   - Dates, location
   - Subscribe button
   - Share button

2. **About:**
   - Full description
   - Prize pool breakdown
   - Tracks/categories
   - Rules and eligibility
   - Website link

3. **Projects Tab:**
   - All projects from this event
   - Filter by track, winners only
   - Sort by prize, score, votes
   - Project cards with rank badges

4. **Winners Tab:**
   - Podium view (1st, 2nd, 3rd)
   - All winners list
   - Prize amounts
   - Category winners

5. **Statistics:**
   - Total participants
   - Projects by category
   - Tech stack distribution
   - Geographic breakdown

---

### H. Direct Messaging

#### Overview
Simple user-to-user messaging for collaboration and networking.

#### Message Model

```typescript
{
  id: uuid,
  sender_id: uuid,
  recipient_id: uuid,
  content: text (max 2000 chars),
  is_read: boolean,
  read_at?: datetime,
  created_at: datetime
}
```

#### Messaging UI

**Inbox Page (`/messages`):**

**Layout:**
```
┌─────────────┬───────────────────────────────────┐
│ Conversations│ Chat with @alice                 │
├─────────────┼───────────────────────────────────┤
│ @alice    🟢│ [Messages thread]                │
│ Hey! Love   │                                   │
│ your...  2m │ @alice: Hey! Love your AI project│
│             │ [1h ago]                          │
│ @bob        │                                   │
│ Thanks for  │ You: Thanks for reaching out!    │
│ the...   1h │ [30m ago]                         │
│             │                                   │
│ @charlie    │ @alice: Can we schedule a call?  │
│ Quick       │ [5m ago]                          │
│ question 5h │                                   │
│             │ ┌─────────────────────────────┐  │
│ [+ New]     │ │ Type a message...           │  │
│             │ └─────────────────────────────┘  │
└─────────────┴───────────────────────────────────┘
```

**Features:**
- Real-time delivery via Socket.IO
- Read receipts
- Typing indicators (future)
- Message search
- Unread count badge in navbar

**API Endpoints:**
```typescript
POST /api/direct-messages
{
  recipient_id: uuid,
  content: string
}

GET /api/direct-messages/conversations
// Returns list of conversations with last message

GET /api/direct-messages/:user_id
// Returns all messages with specific user

PUT /api/direct-messages/:id/read
// Mark message as read
```

---

### I. Search & Discovery

#### Global Search

**Search Endpoint:**
```typescript
GET /api/search?q=keyword&type=projects&filters={...}
```

**Search Types:**
- `projects` (default)
- `users`
- `chains`
- `events`

**Project Search Filters:**
```typescript
{
  q: string,  // Search query
  categories: string[],
  tech_stack: string[],
  hackathon: string,
  min_score: number (0-100),
  max_score: number (0-100),
  has_demo: boolean,
  has_github: boolean,
  is_featured: boolean,
  badge_type: 'stone' | 'silver' | 'gold' | 'platinum',
  sort: 'trending' | 'newest' | 'top_rated' | 'most_voted'
}
```

**Search Implementation:**
- Full-text search on title, description, tagline
- PostgreSQL `tsvector` with GIN index
- Fuzzy matching (Levenshtein distance)
- Weighted: title (A) > tagline (B) > description (C)

**Search Results:**
```
┌──────────────────────────────────────────────────┐
│ Search: "AI machine learning"       42 results   │
├──────────────────────────────────────────────────┤
│                                                  │
│ Projects (35)                                    │
│ ────────────────────────────────────────────── │
│ [Project Card 1] AI Code Reviewer               │
│ Score: 88 • @alice • 💎 Platinum                │
│ Matches: title, AI/ML category                  │
│                                                  │
│ [Project Card 2] ML Training Dashboard          │
│ Score: 75 • @bob • 🥇 Gold                      │
│ Matches: description, tech_stack (TensorFlow)   │
│                                                  │
│ Chains (5)                                       │
│ ────────────────────────────────────────────── │
│ [Chain Card] AI/ML Innovations                  │
│ 23 projects • 145 followers                     │
│                                                  │
│ Users (2)                                        │
│ ────────────────────────────────────────────── │
│ [@aidev] Alice - AI/ML Engineer                 │
│ 5 projects • 234 karma                          │
└──────────────────────────────────────────────────┘
```

#### Advanced Filters UI

**Filter Sidebar:**
```
Filters
───────

Category
[ ] AI/ML
[ ] Web3
[ ] DeFi
[ ] Gaming
[✓] All categories

Tech Stack
[✓] React
[ ] Python
[✓] Solidity
[ ] TypeScript

Proof Score
[0] ━━━━●━━━━ [100]
    Currently: 60-100

Badges
[ ] Stone or higher
[✓] Silver or higher
[ ] Gold or higher
[ ] Platinum only

Other
[✓] Has live demo
[ ] Has GitHub
[ ] Featured only
[ ] From ETHGlobal

[Clear Filters] [Apply]
```

---

## Technical Architecture

### Backend Stack

**Framework & Core:**
- **Python:** 3.11+
- **Flask:** 3.x (web framework)
- **Flask-CORS:** Cross-origin resource sharing
- **Flask-JWT-Extended:** JWT authentication
- **Flask-SQLAlchemy:** ORM for PostgreSQL
- **Flask-Migrate:** Database migrations (Alembic)
- **Flask-Marshmallow:** Serialization/validation
- **Flask-SocketIO:** WebSocket support for real-time

**Database & Caching:**
- **PostgreSQL:** 15+ (primary database via Neon)
- **Redis:** Caching and rate limiting (Upstash)

**Blockchain & Web3:**
- **Web3.py:** Ethereum interaction
- **Wagmi:** Wallet connection (frontend)
- **IPFS:** Decentralized file storage (Pinata/Infura)

**Services & Utilities:**
- **Marshmallow:** Schema validation
- **Python-dotenv:** Environment variables
- **Gunicorn:** Production WSGI server
- **Python-jose:** JWT encoding/decoding
- **Bcrypt:** Password hashing

**Development:**
- **pytest:** Testing framework
- **Black:** Code formatting
- **pylint:** Linting
- **mypy:** Type checking

### Frontend Stack

**Core Framework:**
- **React:** 18.x with TypeScript
- **Vite:** Build tool and dev server
- **React Router:** v6 (routing)

**State Management:**
- **TanStack Query (React Query):** Server state management
  - Caching strategy: 5min stale time, 30min garbage collection
  - Automatic refetch on window focus and reconnect
  - Optimistic updates for better UX
- **Context API:** Authentication state
- **Zustand:** Local UI state (future)

**UI & Styling:**
- **Tailwind CSS:** Utility-first CSS
- **shadcn/ui:** Component library (Radix UI primitives)
- **Lucide Icons:** Icon library
- **Framer Motion:** Animations (future)

**Forms & Validation:**
- **React Hook Form:** Form state management
- **Zod:** Schema validation

**Web3 & Blockchain:**
- **Wagmi:** React hooks for Ethereum
- **Viem:** TypeScript interface for Ethereum
- **WalletConnect:** Multi-wallet support

**Real-Time:**
- **Socket.IO Client:** WebSocket communication

**Utilities:**
- **date-fns:** Date manipulation
- **clsx:** Conditional classnames
- **react-hot-toast / sonner:** Toast notifications

### API Architecture

**RESTful Design Principles:**
- Resources: `/api/projects`, `/api/chains`, `/api/users`
- HTTP methods: GET (read), POST (create), PUT (update), DELETE (delete)
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)

**Response Format:**
```typescript
// Success
{
  "success": true,
  "data": { /* resource */ },
  "message": "Optional success message"
}

// Error
{
  "success": false,
  "error": "Error message",
  "details": { /* optional error details */ }
}

// Paginated
{
  "success": true,
  "data": [ /* items */ ],
  "page": 1,
  "per_page": 20,
  "total": 142,
  "total_pages": 8,
  "has_next": true,
  "has_prev": false
}
```

**Authentication:**
- JWT tokens in `Authorization: Bearer <token>` header
- Access token expiration: 30 days
- Refresh tokens: Not implemented (future)
- `@jwt_required()` decorator for protected routes
- `@optional_auth()` decorator for routes with optional auth (includes user data if logged in)

**Rate Limiting:**
- Redis-based rate limiting
- Default: 100 requests/minute per IP
- Stricter for sensitive endpoints:
  - Login: 5 attempts/minute
  - Register: 3 attempts/minute
  - Badge awarding: 10/hour per validator

**Caching Strategy:**
```python
# Cache layer (Redis)
from services.cache import CacheService

cache = CacheService()

# Feed caching (5 min TTL)
@cache.cached(timeout=300, key_prefix='feed:hot')
def get_hot_projects(page=1):
    # ...

# Project detail caching (10 min TTL)
@cache.cached(timeout=600, key_prefix=lambda id: f'project:{id}')
def get_project(project_id):
    # ...

# Cache invalidation on update
def update_project(project_id, data):
    project = Project.query.get(project_id)
    # ... update logic
    cache.delete(f'project:{project_id}')
    cache.delete('feed:*')  # Wildcard delete
```

---

## Database Schema

### Complete Entity-Relationship Diagram

**Core Entities (24 tables):**

1. **users** - User accounts and authentication
2. **projects** - Hackathon projects
3. **project_screenshots** - Project images
4. **votes** - Project upvotes/downvotes
5. **comments** - Nested comment threads
6. **saved_projects** - User bookmarks
7. **project_views** - View tracking
8. **project_updates** - Project milestone updates
9. **validation_badges** - Expert validation badges
10. **validator_assignments** - Validator-project assignments
11. **validator_permissions** - Validator access control
12. **chains** - Project collections
13. **chain_projects** - Chain-project junction
14. **chain_project_requests** - Chain approval workflow
15. **chain_followers** - Chain subscriptions
16. **investor_requests** - Investor applications
17. **intros** - Builder→Investor introductions
18. **intro_requests** - Investor→Builder introductions
19. **events** - Hackathons and conferences
20. **event_projects** - Event-project associations
21. **event_subscribers** - Event subscriptions
22. **direct_messages** - User messaging
23. **notifications** - System notifications
24. **feedback** - User feedback and reports

### Detailed Schema

#### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255) NOT NULL,

  -- Profile
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),

  -- Blockchain
  wallet_address VARCHAR(42) UNIQUE,
  has_oxcert BOOLEAN DEFAULT FALSE,
  oxcert_token_id VARCHAR(100),
  oxcert_tx_hash VARCHAR(66),

  -- GitHub
  github_username VARCHAR(255),
  github_connected BOOLEAN DEFAULT FALSE,

  -- Stats
  karma INTEGER DEFAULT 0,
  project_count INTEGER DEFAULT 0,
  badge_count INTEGER DEFAULT 0,

  -- Roles
  is_admin BOOLEAN DEFAULT FALSE,
  is_validator BOOLEAN DEFAULT FALSE,
  is_investor BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  banned_at TIMESTAMP,
  banned_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX idx_users_is_validator ON users(is_validator) WHERE is_validator = TRUE;
CREATE INDEX idx_users_karma ON users(karma DESC);
```

#### projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  tagline VARCHAR(300),
  description TEXT NOT NULL,

  -- Extended Info
  project_story TEXT,
  inspiration TEXT,
  pitch_deck_url TEXT,
  market_comparison TEXT,
  novelty_factor TEXT,

  -- Links
  demo_url TEXT,
  github_url TEXT,

  -- Categorization
  categories JSONB DEFAULT '[]',
  tech_stack VARCHAR(50)[] DEFAULT '{}',
  hackathon_name VARCHAR(200),
  hackathon_date DATE,
  hackathons JSONB DEFAULT '[]',

  -- Team
  team_members JSONB DEFAULT '[]',

  -- Proof Score Components
  proof_score INTEGER DEFAULT 0,
  verification_score INTEGER DEFAULT 0,
  community_score INTEGER DEFAULT 0,
  validation_score INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0.0,

  -- Engagement Metrics
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- Status
  is_featured BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  featured_at TIMESTAMP,
  featured_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_proof_score ON projects(proof_score DESC);
CREATE INDEX idx_projects_trending_score ON projects(trending_score DESC);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_is_featured ON projects(is_featured, featured_at DESC);
CREATE INDEX idx_projects_is_deleted ON projects(is_deleted);
CREATE INDEX idx_projects_categories ON projects USING GIN(categories);
CREATE INDEX idx_projects_tech_stack ON projects USING GIN(tech_stack);

-- Full-text search
CREATE INDEX idx_projects_search ON projects USING GIN(
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(tagline, '') || ' ' ||
    coalesce(description, '')
  )
);
```

#### chains

```sql
CREATE TABLE chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Core Properties
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,

  -- Branding
  banner_url TEXT,
  logo_url TEXT,

  -- Organization
  categories VARCHAR(50)[] DEFAULT '{}',
  rules TEXT,
  social_links JSONB DEFAULT '{}',

  -- Privacy & Moderation
  is_public BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT FALSE,

  -- Stats
  project_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Platform Flags
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chains_name ON chains(name);
CREATE INDEX idx_chains_slug ON chains(slug);
CREATE INDEX idx_chains_creator_id ON chains(creator_id);
CREATE INDEX idx_chains_is_public ON chains(is_public);
CREATE INDEX idx_chains_is_featured ON chains(is_featured);
CREATE INDEX idx_chains_project_count ON chains(project_count DESC);
CREATE INDEX idx_chains_follower_count ON chains(follower_count DESC);
CREATE INDEX idx_chains_categories ON chains USING GIN(categories);
```

#### validation_badges

```sql
CREATE TABLE validation_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  validator_id UUID REFERENCES users(id) NOT NULL,

  -- Badge Details
  badge_type VARCHAR(20) CHECK (badge_type IN ('stone', 'silver', 'gold', 'platinum', 'demerit', 'custom')) NOT NULL,
  rationale TEXT NOT NULL,
  points INTEGER NOT NULL,

  -- Custom badge (if badge_type = 'custom')
  custom_name VARCHAR(50),
  custom_icon VARCHAR(100),
  custom_color VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_badges_project_id ON validation_badges(project_id);
CREATE INDEX idx_badges_validator_id ON validation_badges(validator_id);
CREATE INDEX idx_badges_badge_type ON validation_badges(badge_type);
CREATE INDEX idx_badges_created_at ON validation_badges(created_at DESC);
```

#### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Type & Content
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  -- Related Entities
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chain_id UUID REFERENCES chains(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Navigation
  redirect_url VARCHAR(500),

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### Database Migrations

**Migration Files (backend/migrations/):**
```
migrations/
├── env.py
├── script.py.mako
└── versions/
    ├── 001_initial_schema.py
    ├── 002_add_chains_feature.py
    ├── 003_add_notifications.py
    ├── 004_add_events.py
    ├── 005_add_project_updates.py
    └── create_chains_and_notifications.py (pending)
```

**Running Migrations:**
```bash
# Create new migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback
flask db downgrade

# View migration history
flask db history
```

---

## API Documentation

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "display_name": "John Doe"
}

Response 201:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe",
      "username": "user_abc123",
      "is_admin": false,
      "is_validator": false,
      "created_at": "2025-01-15T10:30:00"
    }
  },
  "message": "Registration successful. Please verify your email."
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "user": { /* same as register */ }
  }
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "user_abc123",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Builder and founder",
    "wallet_address": "0x742d35...",
    "has_oxcert": true,
    "github_connected": true,
    "karma": 234,
    "project_count": 5,
    "badge_count": 12,
    "is_admin": false,
    "is_validator": false,
    "is_investor": false,
    "created_at": "2024-06-15T10:30:00"
  }
}
```

### Project Endpoints

#### List Projects (Feed)
```
GET /api/projects?sort=trending&page=1&per_page=20&category=AI/ML

Query Parameters:
- sort: trending | newest | top_rated | most_voted
- page: integer (default: 1)
- per_page: integer (default: 20, max: 100)
- category: string (filter by category)
- tech_stack: string (filter by tech)
- hackathon: string (filter by hackathon)
- min_score: integer (0-100)
- is_featured: boolean

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "AI Code Reviewer",
      "tagline": "AI-powered code review assistant",
      "description": "...",
      "demo_url": "https://...",
      "github_url": "https://github.com/...",
      "proof_score": 88,
      "verification_score": 20,
      "community_score": 28,
      "validation_score": 20,
      "quality_score": 20,
      "upvotes": 45,
      "downvotes": 3,
      "upvote_ratio": 93.75,
      "comment_count": 12,
      "view_count": 342,
      "is_featured": true,
      "screenshots": [...],
      "badges": [
        {
          "badge_type": "platinum",
          "rationale": "Exceptional quality...",
          "validator": {
            "username": "validator_alice",
            "display_name": "Alice Chen"
          },
          "created_at": "2025-01-10T14:20:00"
        }
      ],
      "chains": [
        {
          "id": "chain-uuid",
          "name": "AI/ML Innovations",
          "slug": "ai-ml-innovations",
          "logo_url": "https://...",
          "is_pinned": true
        }
      ],
      "creator": {
        "id": "user-uuid",
        "username": "alice",
        "display_name": "Alice",
        "avatar_url": "https://..."
      },
      "user_vote": "up",  // If authenticated
      "created_at": "2025-01-01T10:00:00"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 142,
  "total_pages": 8,
  "has_next": true
}
```

#### Create Project
```
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "AI Code Reviewer",
  "tagline": "AI-powered code review assistant",
  "description": "A comprehensive description of at least 200 characters...",
  "project_story": "I started this project because...",
  "demo_url": "https://demo.example.com",
  "github_url": "https://github.com/user/repo",
  "categories": ["AI/ML", "Developer Tools"],
  "tech_stack": ["React", "Python", "TensorFlow"],
  "hackathons": [
    {
      "name": "ETHGlobal Waterloo 2024",
      "date": "2024-06-21",
      "prize": "1st Place - $10,000",
      "track": "AI Track"
    }
  ],
  "team_members": [
    {"name": "Alice", "role": "Founder & Lead Dev"},
    {"name": "Bob", "role": "AI Engineer"}
  ],
  "screenshots": [
    "https://ipfs.io/ipfs/Qm...",
    "https://ipfs.io/ipfs/Qm..."
  ],
  "chain_ids": ["chain-uuid-1", "chain-uuid-2"]  // Add to chains
}

Response 201:
{
  "success": true,
  "data": { /* full project object */ },
  "message": "Project created successfully"
}
```

#### Get Project Detail
```
GET /api/projects/:id
Authorization: Bearer <token> (optional)

Response 200:
{
  "success": true,
  "data": { /* full project object with all relations */ }
}
```

#### Update Project
```
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description..."
  // ... other fields
}

Response 200:
{
  "success": true,
  "data": { /* updated project */ },
  "message": "Project updated successfully"
}
```

#### Delete Project
```
DELETE /api/projects/:id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Chain Endpoints

#### List Chains
```
GET /api/chains?sort=trending&category=AI

Query Parameters:
- sort: trending | newest | most_projects | most_followers | alphabetical
- category: string
- is_featured: boolean
- page: integer
- per_page: integer

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "AI/ML Innovations",
      "slug": "ai-ml-innovations",
      "description": "Cutting-edge AI and ML projects",
      "banner_url": "https://...",
      "logo_url": "https://...",
      "categories": ["AI/ML", "Machine Learning"],
      "project_count": 23,
      "follower_count": 145,
      "is_featured": true,
      "is_following": true,  // If authenticated
      "is_owner": false,
      "creator": { /* user object */ },
      "created_at": "2024-12-01T10:00:00"
    }
  ]
}
```

#### Create Chain
```
POST /api/chains
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "AI/ML Innovations",
  "description": "A community for cutting-edge AI projects",
  "categories": ["AI/ML", "Machine Learning"],
  "rules": "1. Projects must be AI-related\n2. Be respectful\n3. No spam",
  "banner_url": "https://ipfs.io/ipfs/Qm...",
  "logo_url": "https://ipfs.io/ipfs/Qm...",
  "social_links": {
    "twitter": "https://twitter.com/...",
    "discord": "https://discord.gg/..."
  },
  "is_public": true,
  "requires_approval": false
}

Response 201:
{
  "success": true,
  "data": { /* chain object */ },
  "message": "Chain created successfully"
}
```

#### Get Chain Detail
```
GET /api/chains/:slug
Authorization: Bearer <token> (optional)

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "AI/ML Innovations",
    "slug": "ai-ml-innovations",
    "description": "...",
    "project_count": 23,
    "follower_count": 145,
    "is_following": true,
    "is_owner": false,
    "creator": { /* user */ },
    // ... all chain fields
  }
}
```

#### Add Project to Chain
```
POST /api/chains/:slug/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "project-uuid"
}

Response 201 (if instant add):
{
  "success": true,
  "data": {
    "id": "chain-project-uuid",
    "chain_id": "chain-uuid",
    "project_id": "project-uuid",
    "is_pinned": false,
    "added_at": "2025-01-15T10:30:00"
  },
  "message": "Project added to chain"
}

Response 201 (if approval required):
{
  "success": true,
  "data": {
    "id": "request-uuid",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00"
  },
  "message": "Project request submitted for approval"
}
```

#### Follow Chain
```
POST /api/chains/:slug/follow
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Now following AI/ML Innovations"
}
```

#### Unfollow Chain
```
DELETE /api/chains/:slug/follow
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Unfollowed AI/ML Innovations"
}
```

### Vote Endpoints

#### Create/Update Vote
```
POST /api/votes
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "uuid",
  "vote_type": "up"  // or "down"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "vote-uuid",
    "vote_type": "up",
    "created_at": "2025-01-15T10:30:00"
  },
  "message": "Vote recorded"
}
```

#### Delete Vote
```
DELETE /api/votes/:vote_id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Vote removed"
}
```

### Comment Endpoints

#### Get Project Comments
```
GET /api/projects/:id/comments

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "comment-uuid",
      "content": "This is a great project!",
      "upvotes": 12,
      "downvotes": 1,
      "is_deleted": false,
      "created_at": "2025-01-15T10:00:00",
      "updated_at": "2025-01-15T10:00:00",
      "user": {
        "username": "alice",
        "display_name": "Alice",
        "avatar_url": "https://..."
      },
      "replies": [
        {
          "id": "reply-uuid",
          "content": "Thanks!",
          "parent_id": "comment-uuid",
          // ... same structure
        }
      ]
    }
  ]
}
```

#### Create Comment
```
POST /api/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "uuid",
  "content": "Great project! Love the UX.",
  "parent_id": "uuid"  // Optional, for replies
}

Response 201:
{
  "success": true,
  "data": { /* comment object */ },
  "message": "Comment posted"
}
```

#### Update Comment
```
PUT /api/comments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated comment text"
}

Response 200:
{
  "success": true,
  "data": { /* updated comment */ },
  "message": "Comment updated"
}
```

#### Delete Comment
```
DELETE /api/comments/:id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Comment deleted"
}
```

### Notification Endpoints

#### Get Notifications
```
GET /api/notifications?unread_only=true&page=1

Query Parameters:
- unread_only: boolean
- type: string (filter by notification_type)
- page: integer
- per_page: integer

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "notification_type": "badge",
      "title": "Badge awarded!",
      "message": "Alice Chen awarded a Gold badge to AI Code Reviewer",
      "project_id": "project-uuid",
      "chain_id": null,
      "actor_id": "user-uuid",
      "redirect_url": "/project/project-uuid",
      "is_read": false,
      "created_at": "2025-01-15T10:30:00",
      "actor": {
        "username": "alice",
        "display_name": "Alice Chen",
        "avatar_url": "https://..."
      },
      "project": {
        "id": "uuid",
        "title": "AI Code Reviewer",
        "tagline": "..."
      }
    }
  ],
  "unread_count": 5
}
```

#### Mark as Read
```
PUT /api/notifications/:id/read
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### Mark All as Read
```
POST /api/notifications/read-all
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### Admin Endpoints

#### Get All Users
```
GET /api/admin/users?page=1&search=alice&role=validator
Authorization: Bearer <token> (admin only)

Query Parameters:
- search: string (search username, email, display_name)
- role: admin | validator | investor
- is_active: boolean
- page: integer

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "alice",
      "email": "alice@example.com",
      "display_name": "Alice Chen",
      "is_admin": false,
      "is_validator": true,
      "is_investor": false,
      "is_active": true,
      "project_count": 5,
      "karma": 234,
      "created_at": "2024-06-15T10:30:00"
    }
  ],
  "total": 1234
}
```

#### Toggle Admin Status
```
POST /api/admin/users/:id/toggle-admin
Authorization: Bearer <token> (admin only)

Response 200:
{
  "success": true,
  "data": {
    "is_admin": true
  },
  "message": "Admin status updated"
}
```

#### Ban User
```
POST /api/admin/users/:id/ban
Authorization: Bearer <token> (admin only)
Content-Type: application/json

{
  "reason": "Spam and inappropriate content"
}

Response 200:
{
  "success": true,
  "message": "User banned successfully"
}
```

#### Feature Project
```
POST /api/projects/:id/feature
Authorization: Bearer <token> (admin only)

Response 200:
{
  "success": true,
  "message": "Project featured"
}
```

---

## Frontend Architecture

### Route Structure

**Complete Route Map (31 pages):**

```typescript
// Public Routes
/ - Feed (main landing)
/feed - Project feed
/gallery/:category - Category galleries
/project/:id - Project detail
/u/:username - User profile
/search - Advanced search
/leaderboard - Top projects/users
/about - Platform info
/chains - Browse chains
/chains/:slug - Chain detail
/investor-plans - Investor pricing
/investors - Investor directory

// Auth Routes (No MainLayout)
/login - Sign in
/register - Sign up

// Protected Routes (Login Required)
/dashboard - User dashboard
/profile - Edit profile
/settings - Account settings
/my-projects - User's projects
/publish - Create project
/project/:id/edit - Edit project
/edit-project/:id - Edit project (alias)
/intros - Introduction requests
/investor-dashboard - Investor tools
/messages - Direct messages
/chains/create - Create chain
/chains/:slug/edit - Edit chain
/chains/:slug/requests - Chain requests
/notifications - All notifications

// Admin Routes
/admin - Admin dashboard

// Validator Routes
/validator - Validator dashboard

// Legacy (Deprecated)
/admin+validator - Combined view

// Error Routes
* - 404 Not Found
```

### Component Organization

```
frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Navbar.tsx          # Main navigation
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── project/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectCarousel.tsx
│   │   ├── ProjectDetailSkeleton.tsx
│   │   ├── ProjectCardSkeleton.tsx
│   │   ├── ProjectUpdateSticker.tsx
│   │   ├── ValidationStatusCard.tsx
│   │   └── VoteButtons.tsx
│   │
│   ├── chain/
│   │   ├── ChainCard.tsx
│   │   ├── ChainBadge.tsx
│   │   ├── ChainHeader.tsx
│   │   ├── ChainForm.tsx
│   │   ├── ChainSelector.tsx
│   │   ├── ChainFilters.tsx
│   │   └── AddProjectToChainDialog.tsx
│   │
│   ├── notification/
│   │   ├── NotificationBell.tsx
│   │   └── NotificationItem.tsx
│   │
│   ├── social/
│   │   ├── CommentSection.tsx
│   │   ├── IntroRequest.tsx
│   │   ├── ShareDialog.tsx
│   │   └── PostUpdateModal.tsx
│   │
│   ├── admin/
│   │   ├── BadgeAwarder.tsx
│   │   └── UserSearchSelect.tsx
│   │
│   ├── auth/
│   │   ├── ProtectedRoute.tsx
│   │   ├── AdminRoute.tsx
│   │   └── ValidatorRoute.tsx
│   │
│   ├── blockchain/
│   │   ├── ConnectWallet.tsx
│   │   └── WalletVerification.tsx
│   │
│   └── PageScrollBackground.tsx
│       InteractiveScrollBackground.tsx
│
├── pages/                     # All page components
│   ├── Feed.tsx
│   ├── ProjectDetail.tsx
│   ├── Dashboard.tsx
│   ├── ChainsListPage.tsx
│   └── ...
│
├── hooks/
│   ├── useAuth.ts            # Authentication
│   ├── useChains.ts          # Chain operations
│   ├── useNotifications.ts   # Notifications
│   ├── usePrefetch.ts        # Data prefetching
│   ├── useRealTimeUpdates.ts # Socket.IO
│   └── ...
│
├── services/
│   ├── api.ts                # Axios instance
│   ├── chainApi.ts
│   ├── notificationApi.ts
│   ├── projectApi.ts
│   └── ...
│
├── context/
│   └── AuthContext.tsx       # Global auth state
│
├── config/
│   └── wagmi.ts              # Web3 configuration
│
├── lib/
│   ├── utils.ts              # Helper functions
│   └── schemas.ts            # Zod validation schemas
│
├── types/
│   └── index.ts              # TypeScript types
│
└── App.tsx                   # Root component
```

### State Management Strategy

**Server State (TanStack Query):**
```typescript
// Example: Project fetching with caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetch project
const { data: project, isLoading } = useQuery({
  queryKey: ['project', projectId],
  queryFn: () => projectApi.getProject(projectId),
  staleTime: 1000 * 60 * 5,  // 5 min
  gcTime: 1000 * 60 * 30,    // 30 min cache
})

// Create project with optimistic update
const queryClient = useQueryClient()
const createMutation = useMutation({
  mutationFn: projectApi.createProject,
  onMutate: async (newProject) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['projects'] })

    // Snapshot previous value
    const previousProjects = queryClient.getQueryData(['projects'])

    // Optimistically update
    queryClient.setQueryData(['projects'], (old) => [...old, newProject])

    return { previousProjects }
  },
  onError: (err, newProject, context) => {
    // Rollback on error
    queryClient.setQueryData(['projects'], context.previousProjects)
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  },
})
```

**Authentication State (Context):**
```typescript
// context/AuthContext.tsx
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ... implementation

  return (
    <AuthContext.Provider value={{ user, isLoading, ... }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**Local UI State (Component State):**
```typescript
// For transient UI state like modals, tabs, form inputs
const [isOpen, setIsOpen] = useState(false)
const [activeTab, setActiveTab] = useState('projects')
```

### Real-Time Updates Architecture

**Socket.IO Client:**
```typescript
// hooks/useRealTimeUpdates.ts
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

export function useRealTimeUpdates() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    })

    // New vote event
    socket.on('vote_update', (data) => {
      queryClient.setQueryData(['project', data.project_id], (old) => ({
        ...old,
        upvotes: data.upvotes,
        downvotes: data.downvotes,
        community_score: data.community_score
      }))
    })

    // New comment event
    socket.on('new_comment', (comment) => {
      queryClient.setQueryData(['comments', comment.project_id], (old) =>
        [comment, ...old]
      )
    })

    // New notification event
    socket.on('new_notification', (notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      // Show toast
      toast({
        title: notification.title,
        description: notification.message,
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])
}
```

### Type Definitions

**Complete TypeScript Types:**
```typescript
// types/index.ts

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  location?: string
  wallet_address?: string
  has_oxcert: boolean
  github_username?: string
  github_connected: boolean
  karma: number
  project_count: number
  badge_count: number
  is_admin: boolean
  is_validator: boolean
  is_investor: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string
  tagline?: string
  description: string
  project_story?: string
  inspiration?: string
  pitch_deck_url?: string
  market_comparison?: string
  novelty_factor?: string
  demo_url?: string
  github_url?: string
  categories: string[]
  tech_stack: string[]
  hackathons: Hackathon[]
  team_members: TeamMember[]
  proof_score: number
  verification_score: number
  community_score: number
  validation_score: number
  quality_score: number
  trending_score: number
  upvotes: number
  downvotes: number
  upvote_ratio: number
  comment_count: number
  view_count: number
  share_count: number
  is_featured: boolean
  is_deleted: boolean
  screenshots: Screenshot[]
  badges: ValidationBadge[]
  badge_count: number
  chains: ChainMembership[]
  chain_count: number
  creator?: User
  author?: User
  user_vote?: 'up' | 'down' | null
  created_at: string
  updated_at: string
}

export interface Chain {
  id: string
  creator_id: string
  name: string
  slug: string
  description: string
  banner_url?: string
  logo_url?: string
  categories: string[]
  rules?: string
  social_links: {
    twitter?: string
    discord?: string
    telegram?: string
    website?: string
  }
  is_public: boolean
  requires_approval: boolean
  project_count: number
  follower_count: number
  view_count: number
  is_featured: boolean
  is_active: boolean
  creator?: User
  is_following: boolean
  is_owner: boolean
  created_at: string
  updated_at: string
}

export interface ValidationBadge {
  id: string
  project_id: string
  validator_id: string
  badge_type: 'stone' | 'silver' | 'gold' | 'platinum' | 'demerit' | 'custom'
  rationale: string
  points: number
  custom_name?: string
  custom_icon?: string
  custom_color?: string
  validator?: User
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  notification_type: string
  title: string
  message: string
  project_id?: string
  chain_id?: string
  actor_id?: string
  redirect_url?: string
  is_read: boolean
  read_at?: string
  actor?: User
  project?: {
    id: string
    title: string
    tagline?: string
  }
  chain?: {
    id: string
    name: string
    slug: string
    logo_url?: string
  }
  created_at: string
}

export interface Comment {
  id: string
  project_id: string
  user_id: string
  parent_id?: string
  content: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  user: User
  replies?: Comment[]
  created_at: string
  updated_at: string
}

// ... more types
```

---

## Real-Time Features

### Socket.IO Architecture

**Backend Server:**
```python
# backend/app.py
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token

socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    """Client connected"""
    token = request.args.get('token')
    if token:
        try:
            user_id = decode_token(token)['sub']
            join_room(f'user:{user_id}')  # Join personal room
            print(f'User {user_id} connected')
        except:
            return False
    return True

@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected"""
    print('Client disconnected')

# Broadcast vote update
def broadcast_vote_update(project):
    """Emit vote update to all connected clients"""
    socketio.emit('vote_update', {
        'project_id': project.id,
        'upvotes': project.upvotes,
        'downvotes': project.downvotes,
        'community_score': project.community_score,
        'upvote_ratio': project.get_upvote_ratio()
    }, broadcast=True)

# Send notification to specific user
def send_notification(user_id, notification):
    """Emit notification to user's room"""
    socketio.emit('new_notification',
        notification.to_dict(include_relations=True),
        room=f'user:{user_id}'
    )

# Broadcast new comment
def broadcast_new_comment(comment):
    """Emit new comment to project watchers"""
    socketio.emit('new_comment', {
        'project_id': comment.project_id,
        'comment': comment.to_dict(include_user=True)
    }, broadcast=True)
```

**Frontend Client:**
```typescript
// hooks/useRealTimeUpdates.ts
import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

let socket: Socket | null = null

export function useRealTimeUpdates() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    // Only connect if authenticated
    if (!user) return

    // Initialize socket once
    if (!socket) {
      socket = io(import.meta.env.VITE_API_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected')
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      // Vote update (Instagram-style)
      socket.on('vote_update', (data) => {
        queryClient.setQueryData(['project', data.project_id], (old: any) => {
          if (!old) return old
          return {
            ...old,
            upvotes: data.upvotes,
            downvotes: data.downvotes,
            upvote_ratio: data.upvote_ratio,
            community_score: data.community_score
          }
        })
      })

      // New comment
      socket.on('new_comment', (data) => {
        queryClient.setQueryData(['comments', data.project_id], (old: any) => {
          if (!old) return [data.comment]
          return [data.comment, ...old]
        })

        // Update project comment count
        queryClient.setQueryData(['project', data.project_id], (old: any) => {
          if (!old) return old
          return {
            ...old,
            comment_count: old.comment_count + 1
          }
        })
      })

      // New notification
      socket.on('new_notification', (notification) => {
        // Invalidate notifications query
        queryClient.invalidateQueries({ queryKey: ['notifications'] })

        // Update unread count
        queryClient.setQueryData(['unread_count'], (old: number = 0) => old + 1)

        // Show toast
        toast(notification.title, {
          description: notification.message,
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = notification.redirect_url
            }
          }
        })
      })

      // New direct message
      socket.on('new_message', (message) => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })

        toast('New message', {
          description: `${message.sender.display_name}: ${message.content.substring(0, 50)}...`
        })
      })

      // Project featured
      socket.on('project_featured', (data) => {
        queryClient.setQueryData(['project', data.project_id], (old: any) => ({
          ...old,
          is_featured: true,
          featured_at: data.featured_at
        }))
      })
    }

    return () => {
      // Don't disconnect on unmount (keep socket alive for app lifetime)
      // socket?.disconnect()
    }
  }, [user, queryClient])
}
```

### Optimistic Updates Strategy

**Instagram-Style Voting:**
```typescript
// components/VoteButtons.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { voteApi } from '@/services/api'

export function VoteButtons({ project, userVote }: Props) {
  const queryClient = useQueryClient()

  const voteMutation = useMutation({
    mutationFn: ({ projectId, voteType }: VoteData) =>
      voteApi.vote(projectId, voteType),

    onMutate: async ({ projectId, voteType }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['project', projectId] })

      // Snapshot previous value
      const previousProject = queryClient.getQueryData(['project', projectId])

      // Calculate new values
      let upvoteDelta = 0
      let downvoteDelta = 0

      if (userVote === null) {
        // New vote
        if (voteType === 'up') upvoteDelta = 1
        else downvoteDelta = 1
      } else if (userVote === 'up') {
        // Changing from upvote
        if (voteType === 'down') {
          upvoteDelta = -1
          downvoteDelta = 1
        } else {
          upvoteDelta = -1  // Removing upvote
        }
      } else {
        // Changing from downvote
        if (voteType === 'up') {
          upvoteDelta = 1
          downvoteDelta = -1
        } else {
          downvoteDelta = -1  // Removing downvote
        }
      }

      // Optimistically update UI
      queryClient.setQueryData(['project', projectId], (old: any) => ({
        ...old,
        upvotes: old.upvotes + upvoteDelta,
        downvotes: old.downvotes + downvoteDelta,
        user_vote: voteType === userVote ? null : voteType
      }))

      return { previousProject }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['project', variables.projectId],
        context?.previousProject
      )

      toast.error('Failed to record vote')
    },

    onSuccess: () => {
      // Success feedback (optional, already updated optimistically)
      // toast.success('Vote recorded')
    }
  })

  const handleVote = (voteType: 'up' | 'down') => {
    voteMutation.mutate({ projectId: project.id, voteType })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={userVote === 'up' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote('up')}
        disabled={voteMutation.isPending}
      >
        ↑ {project.upvotes}
      </Button>

      <Button
        variant={userVote === 'down' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote('down')}
        disabled={voteMutation.isPending}
      >
        ↓ {project.downvotes}
      </Button>
    </div>
  )
}
```

---

## Scoring & Algorithms

### Proof Score Calculation

**Algorithm Implementation:**
```python
# backend/utils/scoring.py

def calculate_verification_score(user):
    """Calculate user's verification score (max 20 pts)"""
    score = 0

    if user.email_verified:
        score += 5

    if user.has_oxcert:
        score += 10

    if user.github_connected:
        score += 5

    return min(score, 20)

def calculate_community_score(project):
    """Calculate project's community score (max 30 pts)"""
    score = 0

    # Upvote ratio (0-20 pts)
    total_votes = project.upvotes + project.downvotes
    if total_votes > 0:
        ratio = project.upvotes / total_votes
        score += ratio * 20

    # Comment engagement (0-10 pts)
    score += min(project.comment_count * 0.5, 10)

    return min(int(score), 30)

def calculate_validation_score(project):
    """Calculate project's validation score (max 30 pts)"""
    from models import ValidationBadge

    badges = ValidationBadge.query.filter_by(project_id=project.id).all()

    score = sum([badge.points for badge in badges])

    return min(score, 30)

def calculate_quality_score(project):
    """Calculate project's quality score (max 20 pts)"""
    score = 0

    if project.demo_url:
        score += 5

    if project.github_url:
        score += 5

    if project.screenshots.count() > 0:
        score += 5

    if project.description and len(project.description) >= 200:
        score += 5

    return score

def update_proof_score(project_id):
    """Recalculate and update project's proof score"""
    from models import Project
    from extensions import db

    project = Project.query.get(project_id)
    if not project:
        return

    # Get user for verification score
    user = project.creator

    project.verification_score = calculate_verification_score(user)
    project.community_score = calculate_community_score(project)
    project.validation_score = calculate_validation_score(project)
    project.quality_score = calculate_quality_score(project)

    project.proof_score = (
        project.verification_score +
        project.community_score +
        project.validation_score +
        project.quality_score
    )

    # Update trending score too
    update_trending_score(project)

    db.session.commit()
```

### Trending Algorithm (Reddit Hot)

**Implementation:**
```python
# backend/utils/trending.py
from datetime import datetime
from math import log10

def calculate_trending_score(project):
    """
    Reddit-style hot ranking algorithm

    Based on: https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9

    Score = log10(max(|votes|, 1)) × sign(votes) + (created_time / 45000)

    - Log scale: Early votes matter more than later votes
    - Time component: Recent content ranked higher
    - Engagement boost: Comments add value
    - Featured boost: Platform curation
    """

    # Net votes
    votes = project.upvotes - project.downvotes

    # Vote score (logarithmic)
    if votes > 0:
        vote_score = log10(votes)
    elif votes < 0:
        vote_score = -log10(abs(votes))
    else:
        vote_score = 0

    # Time score (seconds since epoch / 45000 ≈ 12.5 hours decay)
    epoch = datetime(1970, 1, 1)
    time_diff = (project.created_at - epoch).total_seconds()
    time_score = time_diff / 45000

    # Engagement multiplier (comments add value)
    engagement_multiplier = 1 + (project.comment_count * 0.01)

    # Featured projects get 2x boost
    featured_multiplier = 2 if project.is_featured else 1

    # Quality boost for high proof scores
    quality_multiplier = 1 + (project.proof_score / 200)  # Max 1.5x

    # Final score
    trending_score = (
        (vote_score + time_score)
        * engagement_multiplier
        * featured_multiplier
        * quality_multiplier
    )

    return round(trending_score, 4)

def update_trending_score(project):
    """Update project's trending score"""
    project.trending_score = calculate_trending_score(project)
    db.session.commit()

def update_all_trending_scores():
    """
    Batch update all trending scores
    Run this via cron job every 30 minutes
    """
    from models import Project

    projects = Project.query.filter_by(is_deleted=False).all()

    for project in projects:
        project.trending_score = calculate_trending_score(project)

    db.session.commit()

    print(f'Updated trending scores for {len(projects)} projects')
```

**Cron Job (Scheduled Task):**
```python
# backend/tasks/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from utils.trending import update_all_trending_scores

scheduler = BackgroundScheduler()

# Update trending scores every 30 minutes
scheduler.add_job(
    func=update_all_trending_scores,
    trigger='interval',
    minutes=30,
    id='update_trending_scores',
    replace_existing=True
)

scheduler.start()
```

---

## Deployment Guide

### Environment Variables

**Backend (.env):**
```bash
# Flask
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=your-secret-key-change-this

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET_KEY=your-jwt-secret-change-this
JWT_ACCESS_TOKEN_EXPIRES=2592000  # 30 days

# Redis
REDIS_URL=redis://host:6379/0

# IPFS
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_API_KEY=your-ipfs-key
IPFS_API_SECRET=your-ipfs-secret

# Blockchain
KAIA_RPC_URL=https://public-en-kairos.node.kaia.io
OXCERTS_CONTRACT_ADDRESS=0x...
OXCERTS_CHAIN_ID=1001

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@0xship.com

# CORS
ALLOWED_ORIGINS=https://0xship.com,https://www.0xship.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=100/minute
```

**Frontend (.env):**
```bash
VITE_API_URL=https://api.0xship.com
VITE_SOCKET_URL=https://api.0xship.com
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-id
VITE_ENVIRONMENT=production
```

### Production Deployment

**Backend (Railway/Render):**

1. **Database Setup:**
   - Provision PostgreSQL on Neon
   - Run migrations: `flask db upgrade`
   - Create indexes (automatic via migrations)

2. **Redis Setup:**
   - Provision Redis on Upstash
   - Configure Redis URL in env

3. **Deploy Backend:**
   ```bash
   # Install dependencies
   pip install -r requirements.txt

   # Run migrations
   flask db upgrade

   # Start with Gunicorn
   gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
   ```

4. **Configure Scheduler:**
   - Ensure APScheduler starts with app
   - Or use external cron (Railway Cron, GitHub Actions)

**Frontend (Vercel/Netlify):**

1. **Build:**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy:**
   - Connect GitHub repo to Vercel
   - Set environment variables
   - Auto-deploy on push to main

3. **Configure:**
   ```json
   // vercel.json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

### Infrastructure

**Services Used:**
- **Database:** Neon PostgreSQL (serverless)
- **Cache:** Upstash Redis (serverless)
- **Backend:** Railway or Render
- **Frontend:** Vercel
- **Storage:** IPFS (Pinata/Infura)
- **Email:** SendGrid
- **Monitoring:** Sentry (error tracking)
- **Analytics:** PostHog or Mixpanel

**Estimated Costs (Monthly):**
- Neon PostgreSQL: $0-$20 (free tier → hobby)
- Upstash Redis: $0-$10 (free tier → standard)
- Railway/Render: $5-$20 (hobby plan)
- Vercel: $0 (free tier)
- IPFS (Pinata): $0-$20 (free tier → pro)
- SendGrid: $0-$15 (free tier → essentials)

**Total: $5-$85/month** (can start with $0-5 on free tiers)

---

## Future Enhancements

### Planned Features (Roadmap)

**Q1 2025:**
- [ ] Mobile apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] AI-powered project recommendations
- [ ] Team collaboration features
- [ ] Project templates

**Q2 2025:**
- [ ] NFT minting for badges
- [ ] On-chain proof scores
- [ ] DAO governance for platform decisions
- [ ] Token incentives for validators
- [ ] Hackathon organizer tools

**Q3 2025:**
- [ ] API marketplace
- [ ] White-label solutions for hackathons
- [ ] Investor syndicate features
- [ ] Portfolio tracking for investors
- [ ] Advanced filtering (ML-powered)

**Q4 2025:**
- [ ] Cross-chain support (Polygon, Base, Arbitrum)
- [ ] Video pitch support
- [ ] Live demo streaming
- [ ] AI code analysis for validation
- [ ] Reputation system (on-chain)

---

## Contributing

**Development Setup:**

1. **Clone repo:**
   ```bash
   git clone https://github.com/your-org/0x-discovery-ship.git
   cd 0x-discovery-ship
   ```

2. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your config
   flask db upgrade
   python app.py
   ```

3. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your config
   npm run dev
   ```

**Code Standards:**
- Backend: Black formatting, type hints, docstrings
- Frontend: ESLint, Prettier, TypeScript strict mode
- Git: Conventional commits (feat, fix, docs, etc.)
- PR: Require review from 1+ maintainer

---

## License

MIT License - see LICENSE file

---

## Support

**Documentation:** https://docs.0xship.com
**Discord:** https://discord.gg/0xship
**Email:** support@0xship.com
**GitHub Issues:** https://github.com/your-org/0x-discovery-ship/issues

---

**Built with ❤️ for the builder community**
