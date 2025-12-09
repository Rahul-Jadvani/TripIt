# Backend Routes & Database Reference

**Platform:** TripIt (formerly Zer0)
**Last Updated:** December 2025
**Purpose:** Complete reference for all backend routes, database tables, and their relationships

---

## 🎯 CURRENT ACTIVE SYSTEM: TRAVEL/ITINERARY

### Primary Table: `itineraries`
**Purpose:** Stores travel itineraries (replaced the old `projects` table concept)

**Active Routes:** `/api/itineraries/*`

---

## 📋 COMPLETE ROUTE MAPPING

### 1. ITINERARIES (✅ ACTIVE - PRIMARY)
**Base Path:** `/api/itineraries`
**Blueprint:** `itineraries_bp` (backend/routes/itineraries.py)
**Primary Table:** `itineraries`
**Related Tables:**
- `travelers` (creator relationship via `created_by_traveler_id`)
- `day_plans` (itinerary details)
- `embedded_businesses` (local businesses in itinerary)
- `hidden_gems` (hidden spots)
- `safety_alerts` (safety warnings)
- `safety_ratings` (community safety ratings)
- `travel_intel` (travel intelligence/tips)
- `travel_groups` (group travel associations)

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/itineraries` | Get all published itineraries (feed) | No |
| GET | `/api/itineraries/<id>` | Get single itinerary by ID | No |
| POST | `/api/itineraries` | Create new itinerary | Yes |
| PUT/PATCH | `/api/itineraries/<id>` | Update itinerary | Yes (owner only) |
| DELETE | `/api/itineraries/<id>` | Soft delete itinerary | Yes (owner only) |
| POST | `/api/itineraries/<id>/view` | Increment view count | No |
| POST | `/api/itineraries/<id>/publish` | Publish itinerary | Yes (owner only) |
| POST | `/api/itineraries/<id>/upvote` | Upvote itinerary | Yes |
| POST | `/api/itineraries/<id>/downvote` | Downvote itinerary | Yes |

**Used By (Frontend):**
- `frontend/src/services/api.ts` → `itinerariesService`
- `frontend/src/hooks/useItineraries.ts`
- `frontend/src/pages/Publish.tsx` (create)
- `frontend/src/pages/ProjectDetail.tsx` (display)
- `frontend/src/pages/Home.tsx` (feed)

---

### 2. PROJECTS (⚠️ LEGACY - DEPRECATED)
**Base Path:** `/api/projects`
**Blueprint:** `projects_bp` (backend/routes/projects.py)
**Primary Table:** `projects` (if exists)
**Status:** 🔴 DEPRECATED - Being phased out

**Note:** The platform migrated from hackathon/project focus to travel itineraries. Old project routes may still exist in codebase but should NOT be used for new features.

**Migration Path:**
- Old: `/api/projects` → New: `/api/itineraries`
- Old: `projects` table → New: `itineraries` table
- Old: `users` → New: `travelers`

---

### 3. TRAVELERS (✅ ACTIVE)
**Base Path:** `/api/travelers` or `/api/auth`
**Blueprint:** `travelers_bp` / `auth_bp`
**Primary Table:** `travelers`
**Purpose:** User accounts for the platform (replaces old `users` table)

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new traveler | No |
| POST | `/api/auth/login` | Login traveler | No |
| GET | `/api/auth/me` | Get current traveler profile | Yes |
| PUT | `/api/travelers/<id>` | Update traveler profile | Yes (self only) |
| GET | `/api/travelers/<id>` | Get public traveler profile | No |
| GET | `/api/travelers/search` | Search travelers | Yes |

**Used By (Frontend):**
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/services/api.ts` → `authService`
- `frontend/src/components/UserSearchSelect.tsx`

---

### 4. SAFETY RATINGS (✅ ACTIVE)
**Base Path:** `/api/safety-ratings`
**Blueprint:** `safety_ratings_bp`
**Primary Table:** `safety_ratings`
**Related To:** `itineraries` (via `itinerary_id`)

**Purpose:** Community-driven safety ratings for itineraries

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/safety-ratings` | Submit safety rating | Yes |
| GET | `/api/safety-ratings/<itinerary_id>` | Get ratings for itinerary | No |
| PUT | `/api/safety-ratings/<id>` | Update rating | Yes (owner only) |

---

### 5. TRAVEL GROUPS (✅ ACTIVE)
**Base Path:** `/api/travel-groups`
**Blueprint:** `travel_groups_bp`
**Primary Table:** `travel_groups`
**Related Tables:**
- `travel_group_members` (many-to-many with travelers)
- `travel_group_itineraries` (many-to-many with itineraries)

**Purpose:** Group travel planning and coordination

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/travel-groups` | Create travel group | Yes |
| GET | `/api/travel-groups/<id>` | Get group details | No |
| POST | `/api/travel-groups/<id>/join` | Join group | Yes |
| POST | `/api/travel-groups/<id>/leave` | Leave group | Yes |
| POST | `/api/travel-groups/<id>/itineraries` | Add itinerary to group | Yes (member only) |

---

### 6. WOMEN'S SAFETY (✅ ACTIVE)
**Base Path:** `/api/womens-safety`
**Blueprint:** `womens_safety_bp`
**Primary Table:** `womens_safety_guides`
**Related Tables:**
- `womens_safety_bookings`
- `womens_safety_resources`
- `womens_safety_settings`

**Purpose:** Women-specific safety features and verified guides

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/womens-safety/guides` | Get verified women guides | No |
| POST | `/api/womens-safety/guides` | Register as guide | Yes |
| GET | `/api/womens-safety/resources` | Get safety resources | No |
| POST | `/api/womens-safety/bookings` | Book verified guide | Yes |

---

### 7. COMMENTS (✅ ACTIVE)
**Base Path:** `/api/comments`
**Blueprint:** `comments_bp` (backend/routes/comments.py)
**Primary Table:** `comments`
**Related To:**
- `itineraries` (via `project_id` foreign key - named for compatibility)
- `travelers` (via `user_id` foreign key - named for compatibility)

**Purpose:** Community discussion on itineraries

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/comments?project_id=<id>` | Get comments for itinerary | No |
| POST | `/api/comments` | Create comment | Yes |
| PUT | `/api/comments/<id>` | Update comment | Yes (owner only) |
| DELETE | `/api/comments/<id>` | Delete comment (soft) | Yes (owner only) |
| POST | `/api/comments/<id>/vote` | Vote on comment | Yes |

**Note:** Column names `project_id` and `user_id` retained for frontend compatibility, but foreign keys now correctly reference `itineraries` and `travelers` tables.

---

### 8. UPLOAD (✅ ACTIVE)
**Base Path:** `/api/upload`
**Blueprint:** `upload_bp`
**Purpose:** File uploads (screenshots, photos, GPX files)
**Storage:** IPFS / Cloud storage

**Endpoints:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/upload` | Upload file | Yes |

---

## 🗄️ DATABASE TABLES REFERENCE

### Core Tables (Active)

#### 1. `itineraries`
**Purpose:** Main itinerary/travel plan storage
**Key Columns:**
```sql
id (PK)
uuid
created_by_traveler_id (FK → travelers.id)
title
tagline
description
destination
duration_days
budget_amount
route_map_url
demo_url (booking/reference link)
travel_style
activity_tags (JSON)
travel_companions (JSON)
screenshots (JSON)
trip_highlights (TEXT)
trip_journey (TEXT)
day_by_day_plan (TEXT)
safety_tips (TEXT)
hidden_gems (TEXT)
unique_highlights (TEXT)
safety_score
proof_score
is_published
is_deleted
created_at
updated_at
```

**Relationships:**
- `creator` → travelers (via created_by_traveler_id)
- `day_plans_list` → day_plans
- `safety_ratings_list` → safety_ratings
- `hidden_gems_list` → hidden_gems
- `embedded_businesses_list` → embedded_businesses

**Note:** All relationship names have `_list` suffix to avoid conflicts with column names.

---

#### 2. `travelers`
**Purpose:** User accounts
**Key Columns:**
```sql
id (PK)
uuid
username (unique)
email (unique)
password_hash
display_name
bio
avatar_url
github_username
travel_score
is_verified
created_at
```

**Relationships:**
- `itineraries` → created itineraries
- `travel_groups` → joined groups
- `safety_ratings` → submitted ratings

---

#### 3. `safety_ratings`
**Purpose:** Community safety ratings for itineraries
**Key Columns:**
```sql
id (PK)
itinerary_id (FK → itineraries.id)
traveler_id (FK → travelers.id)
safety_score (1-10)
women_safety_score (1-10)
is_verified
evidence_photos (JSON)
created_at
```

---

#### 4. `travel_groups`
**Purpose:** Group travel coordination
**Key Columns:**
```sql
id (PK)
name
description
created_by_traveler_id (FK)
is_public
member_count
created_at
```

---

#### 5. `day_plans`
**Purpose:** Detailed day-by-day itinerary breakdown
**Key Columns:**
```sql
id (PK)
itinerary_id (FK → itineraries.id)
day_number
description
activities (JSON)
```

---

#### 6. `hidden_gems`
**Purpose:** Hidden spots/gems in itineraries
**Key Columns:**
```sql
id (PK)
itinerary_id (FK)
name
description
location_gps
```

---

#### 7. `embedded_businesses`
**Purpose:** Local businesses featured in itineraries
**Key Columns:**
```sql
id (PK)
itinerary_id (FK)
business_name
business_type
contact_info
```

#### 8. `comments`
**Purpose:** Community discussion on itineraries
**Key Columns:**
```sql
id (PK)
project_id (FK → itineraries.id) -- Named for compatibility
user_id (FK → travelers.id) -- Named for compatibility
parent_id (FK → comments.id) -- For nested replies
content (TEXT)
upvotes (INT)
downvotes (INT)
is_deleted (BOOLEAN)
created_at
updated_at
```

**Relationships:**
- `itinerary` → itineraries (via project_id)
- `author` → travelers (via user_id)
- `replies` → comments (self-referential via parent_id)

**Note:** Column names kept as `project_id` and `user_id` for frontend compatibility.

---

### Legacy Tables (Deprecated)

#### `projects` (🔴 DEPRECATED)
**Old Purpose:** Hackathon projects
**Replaced By:** `itineraries`
**Action:** Do not use. Migrate any remaining data to itineraries.

#### `users` (🔴 DEPRECATED)
**Old Purpose:** User accounts
**Replaced By:** `travelers`
**Action:** Do not use. All users migrated to travelers table.

---

## 🔄 FRONTEND → BACKEND → DATABASE FLOW

### Example: Publishing an Itinerary

**1. User fills form:**
- `frontend/src/pages/Publish.tsx`

**2. Form submission:**
```typescript
// frontend/src/hooks/useItineraries.ts
const payload = {
  title: "Solo Trek to Kedarkantha",
  destination: "Uttarakhand",
  trip_highlights: "...",
  safety_tips: "...",
  demo_url: "https://booking-link.com"
}
itinerariesService.create(payload)
```

**3. API call:**
```
POST /api/itineraries
Authorization: Bearer <token>
Body: payload
```

**4. Backend processing:**
```python
# backend/routes/itineraries.py
@itineraries_bp.route('', methods=['POST'])
@token_required
def create_itinerary(user_id):
    validated_data = schema.load(data)
    itinerary = Itinerary(
        created_by_traveler_id=user_id,
        title=validated_data['title'],
        demo_url=validated_data.get('demo_url'),
        safety_tips=validated_data.get('safety_tips'),
        # ...
    )
    db.session.add(itinerary)
    db.session.commit()
```

**5. Database insert:**
```sql
INSERT INTO itineraries (
  id, created_by_traveler_id, title, destination,
  demo_url, safety_tips, trip_highlights, ...
) VALUES (...)
```

**6. Response returned:**
```python
return success_response(itinerary.to_dict(include_creator=True), 201)
```

**7. Frontend displays:**
- Navigate to `/project/<id>`
- `frontend/src/pages/ProjectDetail.tsx` fetches and displays

---

## 📊 QUICK REFERENCE TABLE

| Feature | Frontend Route | API Endpoint | Database Table | Status |
|---------|---------------|--------------|----------------|--------|
| Itinerary Feed | `/` | `GET /api/itineraries` | `itineraries` | ✅ Active |
| Itinerary Detail | `/project/:id` | `GET /api/itineraries/:id` | `itineraries` | ✅ Active |
| Publish Itinerary | `/publish` | `POST /api/itineraries` | `itineraries` | ✅ Active |
| User Profile | `/profile/:id` | `GET /api/travelers/:id` | `travelers` | ✅ Active |
| Safety Ratings | `/project/:id` | `GET /api/safety-ratings/:id` | `safety_ratings` | ✅ Active |
| Travel Groups | `/groups/:id` | `GET /api/travel-groups/:id` | `travel_groups` | ✅ Active |
| ~~Old Projects~~ | ~~/projects~~ | ~~/api/projects~~ | ~~projects~~ | 🔴 Deprecated |

---

## 🚨 IMPORTANT NOTES

### 1. Field Name Consistency
**Backend (snake_case):**
- `demo_url`, `route_map_url`, `safety_tips`, `trip_highlights`

**Frontend (camelCase in state, snake_case in API):**
```typescript
// Form state
const [safetyTips, setSafetyTips] = useState('');

// API payload
payload.safety_tips = safetyTips;

// Display (transformed)
project.safety_tips  // or project.safetyTips (both work)
```

### 2. Relationship Naming
All SQLAlchemy relationships end with `_list` to avoid column conflicts:
- ✅ `itinerary.safety_ratings_list` (relationship)
- ✅ `itinerary.safety_tips` (column - TEXT)
- ❌ ~~`itinerary.safety_ratings`~~ (would conflict with column)

### 3. Soft Deletes
Itineraries use soft delete:
```python
is_deleted = db.Column(db.Boolean, default=False)
```
Always filter: `Itinerary.query.filter_by(is_deleted=False)`

### 4. Authentication
Token required endpoints need header:
```
Authorization: Bearer <JWT_token>
```

---

## 🔍 TROUBLESHOOTING GUIDE

### "Route not found" Error
1. Check if using old `/api/projects/*` → should be `/api/itineraries/*`
2. Verify blueprint is registered in `app.py`
3. Check route path matches exactly

### "Column does not exist" Error
1. Check if migration was run
2. Verify column name is snake_case in database
3. Check model definition matches database schema

### "Relationship error" Error
1. Verify relationship name has `_list` suffix if conflicts with column
2. Check foreign key exists and is correct
3. Verify backref names are unique

---

## 📝 CHANGELOG

**December 2025:**
- ✅ **CRITICAL:** Fixed auth routes - Now create `Traveler` records instead of `User` records
- ✅ Fixed comments system: Updated foreign keys from `projects/users` → `itineraries/travelers`
- ✅ Consolidated safety fields: `safety_intelligence` merged into `safety_tips`
- ✅ Added `demo_url` column to itineraries table
- ✅ Removed duplicate safety field from publish form
- ✅ Updated detail page to show single safety card
- ✅ Updated comments route to use `Itinerary` instead of `Project` model
- ✅ All User.query references replaced with Traveler.query in auth.py

**Previous:**
- Platform migration from Zer0 (projects) to TripIt (itineraries)
- Renamed `users` → `travelers`
- Added women's safety features
- Implemented travel groups

---

## 🎯 FOR FUTURE DEVELOPMENT

**When adding new features:**
1. Update this document with new routes
2. Add table schema to database section
3. Document frontend → backend → database flow
4. Update quick reference table
5. Add any special considerations to notes

**When deprecating features:**
1. Mark as 🔴 DEPRECATED in this doc
2. Add migration path if applicable
3. Update frontend to stop using deprecated routes
4. Plan data migration timeline
