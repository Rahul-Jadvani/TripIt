# TripIt Database Architecture

## Dual-Table System Overview

TripIt uses a **dual-table architecture** to support both legacy (Zer0) and new (TripIt) functionality.

### System 1: OLD/ZER0 SYSTEM (Hackathon Projects)
```
users (email/password auth)
  ↓ (user_id)
projects (hackathon submissions)
```

**Tables:**
- `users` - User accounts with email/password authentication
- `projects` - Hackathon project submissions

**Relationships:**
- `projects.user_id` → `users.id`

### System 2: NEW/TRIPIT SYSTEM (Travel Itineraries)
```
travelers (Google OAuth auth)
  ↓ (created_by_traveler_id)
itineraries (travel plans)
```

**Tables:**
- `travelers` - Traveler accounts with Google OAuth authentication
- `itineraries` - Travel plans and experiences

**Relationships:**
- `itineraries.created_by_traveler_id` → `travelers.id`

---

## Shared Tables (Used by Both Systems)

These tables work with BOTH user types:

- `votes` - Can vote on both projects and itineraries
- `comments` - Can comment on both content types
- `notifications` - Notifications for all users
- `direct_messages` - Messaging between all users
- `intro_requests` - Introductions between all users
- `badges` - Awarded to all users
- `chains` (layerz) - Communities for all users

---

## Query Strategy

### ✅ CORRECT: Unified Queries

When querying users or content, **ALWAYS check BOTH tables**:

```python
# ✅ Get user from either table
from utils.user_utils import get_user_by_id
user = get_user_by_id(user_id)  # Checks travelers first, then users

# ✅ Search users across both tables
from utils.user_utils import search_users
users = search_users("john")  # Returns from both tables

# ✅ Get content from both systems
projects = Project.query.all()
itineraries = Itinerary.query.all()
all_content = projects + itineraries  # Combine results
```

### ❌ WRONG: Single Table Queries

```python
# ❌ Only gets email/password users, misses Google OAuth users
user = User.query.get(user_id)

# ❌ Only gets projects, misses itineraries
content = Project.query.all()
```

---

## Utility Functions

Use these helpers to ensure queries work across both systems:

### `utils/user_utils.py`
- `get_user_by_id(user_id)` - Get user from either table
- `get_user_by_username_or_email(identifier)` - Find user by username/email
- `search_users(query, limit)` - Search across both user tables
- `get_all_active_users(limit)` - Get all users from both tables

### `utils/decorators.py`
All authentication decorators automatically check both tables:
- `@token_required`
- `@admin_required`
- `@validator_required`
- `@optional_auth`

---

## Migration Notes

### Why Dual Tables?

1. **Legacy Support**: Keep existing Zer0 users and projects intact
2. **Clean Separation**: TripIt has different data models (travelers vs users)
3. **Authentication**: Support both email/password and Google OAuth
4. **Gradual Migration**: Can migrate users over time

### Future Consolidation

Options for consolidating:
1. **Migrate all users → travelers table** (Recommended)
2. **Migrate all projects → itineraries table** (Requires data transformation)
3. **Create unified views** (Database-level abstraction)

---

## Developer Guidelines

### When Writing New Features:

1. **Authentication**: Use decorators (they handle both tables automatically)
2. **User Queries**: Use `utils/user_utils.py` functions
3. **Content Queries**: Query both `Project` and `Itinerary` models
4. **Search**: Always search both user tables and both content tables
5. **Relationships**: Be aware of which table the FK points to

### Common Pitfalls to Avoid:

❌ `User.query.get(user_id)` → Use `get_user_by_id(user_id)`
❌ `User.query.filter_by(...)` → Use `search_users(...)` or check both tables
❌ Only querying `Project` → Also query `Itinerary`
❌ Assuming all users in `users` table → Check `travelers` too

---

## Table Summary

| Table | Purpose | Auth Type | Content Type |
|-------|---------|-----------|--------------|
| `users` | User accounts | Email/Password | N/A |
| `travelers` | Traveler accounts | Google OAuth | N/A |
| `projects` | Hackathon projects | N/A | Old System |
| `itineraries` | Travel plans | N/A | New System |
| `votes` | Voting | Both | Both |
| `comments` | Comments | Both | Both |
| `notifications` | Notifications | Both | Both |
| `direct_messages` | Messaging | Both | N/A |
| `chains` | Communities (Layerz) | Both | N/A |
| `badges` | Achievements | Both | N/A |

---

## Testing Checklist

When testing features:

- [ ] Test with email/password user
- [ ] Test with Google OAuth user
- [ ] Test with projects (old system)
- [ ] Test with itineraries (new system)
- [ ] Test search across both tables
- [ ] Test user interactions between systems

---

Last Updated: 2025-12-04
