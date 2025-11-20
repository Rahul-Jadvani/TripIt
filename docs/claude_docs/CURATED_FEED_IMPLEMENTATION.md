# Curated Feed Implementation - Complete Guide

## Overview

Implemented a personalized project feed for investors that shows matching projects at the top based on their profile preferences. The system works silently in the background - investors don't see match scores in the feed, only in their dashboard.

---

## How It Works

### Backend Logic

**For Investors (Page 1 only):**
1. System detects user is an approved investor
2. Loads investor's profile preferences (industries, stages, location, ticket size)
3. Scores all projects based on match with preferences (0-100 scale)
4. Returns top 5 matches at the beginning of feed with `is_curated: true` flag
5. Regular trending projects follow after curated section

**For Non-Investors or Page 2+:**
- Standard trending feed
- No personalization

### Matching Algorithm

The algorithm scores projects 0-100 based on:

**1. Industry/Category Match (90 points - PRIMARY FACTOR)**
- Exact match: If investor interested in "AI/ML" and project has "AI/ML" category → 90 points
- Partial match: If "AI" matches part of "AI/ML" → 45 points
- No match: 0 points

**2. Quality Bonus (10 points)**
- High proof score (≥70): +3 points
- Popular (≥20 upvotes): +3 points
- Engaging (≥10 comments): +2 points
- High visibility (≥500 views): +2 points

**Minimum threshold:** 30 points (projects below this are filtered out)

---

## API Endpoints

### 1. Feed Endpoint (Personalized)

**GET** `/api/projects?page=1`

**Response for Investors (Page 1):**
```json
{
  "status": "success",
  "message": "Personalized feed retrieved",
  "data": [
    {
      "id": "...",
      "title": "AI Analytics Platform",
      "categories": ["AI/ML", "SaaS"],
      "is_curated": true,
      // ... normal project fields
    },
    // ... 4 more curated projects

    {
      "id": "...",
      "title": "Gaming Platform",
      "categories": ["Gaming"],
      // ... normal project fields (no is_curated flag)
    },
    // ... rest of trending feed
  ],
  "curated_count": 5,
  "has_curated_section": true,
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 52,
    "has_next": true
  }
}
```

**Response for Non-Investors or Page 2+:**
```json
{
  "status": "success",
  "data": [
    // ... regular trending projects
  ],
  "pagination": {...}
  // No curated_count or has_curated_section
}
```

### 2. Dashboard Endpoint (With Match Scores)

**GET** `/api/prefetch/dashboard-data`

**Response:**
```json
{
  "status": "success",
  "data": {
    "stats": {...},
    "unread": {...},
    "projects": [...],
    "role_data": {
      "investor": {
        "received_intro_requests": 3,
        "sent_intro_requests": 5,
        "matched_projects": [
          {
            "id": "...",
            "title": "AI Analytics Platform",
            "categories": ["AI/ML", "SaaS"],
            "match_score": 90.0,
            "match_breakdown": {
              "industry_match": 90,
              "quality_bonus": 0
            },
            // ... normal project fields
          },
          // ... up to 10 matched projects
        ]
      }
    }
  }
}
```

---

## Implementation Details

### Files Created

**`backend/services/investor_matching.py`**
- Core matching algorithm
- `calculate_match_score()` - Scores a single project
- `get_matched_projects()` - Returns list of matched projects
  - `include_score=False` for feed (scores hidden)
  - `include_score=True` for dashboard (scores visible)

### Files Modified

**`backend/routes/projects.py` (lines 43-97)**
- Added investor personalization logic to main feed endpoint
- Only applies to page 1 when no filters active
- Falls back to regular feed if anything fails

**`backend/routes/projects.py` (line 1253)**
- Fixed CORS for categories with slashes (AI/ML, Web3/Blockchain)
- Changed from `<category>` to `<path:category>`

**`backend/routes/prefetch.py` (lines 269-283)**
- Added matched projects to investor dashboard data
- Uses `include_score=True` to show match percentages

---

## Frontend Integration Guide

### Step 1: Detect Curated Section

```typescript
// In useFeed.ts or Feed.tsx
const { data: feedData } = useFeed(page);

const hasCuratedSection = feedData?.has_curated_section === true;
const curatedCount = feedData?.curated_count || 0;
```

### Step 2: Show "Curated For You" Header

```tsx
// Only on page 1 if curated section exists
{hasCuratedSection && page === 1 && (
  <div className="curated-header mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
    <div className="flex items-center gap-2">
      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <h2 className="text-xl font-semibold text-gray-800">Curated For You</h2>
    </div>
    <p className="text-sm text-gray-600 mt-1">
      Projects matching your investment criteria
    </p>
  </div>
)}
```

### Step 3: Render Projects with Visual Separator

```tsx
{feedData?.data?.map((project, index) => {
  const isCurated = project.is_curated === true;

  return (
    <div key={project.id}>
      {/* Optional: Add badge to curated projects */}
      <ProjectCard
        {...project}
        badge={isCurated ? (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            Recommended
          </span>
        ) : null}
      />

      {/* Separator after last curated project */}
      {isCurated && index === curatedCount - 1 && (
        <div className="my-8 border-t-2 border-gray-200 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4">
            <p className="text-sm text-gray-500 font-medium">More Projects</p>
          </div>
        </div>
      )}
    </div>
  );
})}
```

### Step 4: Dashboard Match Display

```tsx
// In InvestorDashboard.tsx
const { data } = useDashboardData();
const matchedProjects = data?.role_data?.investor?.matched_projects || [];

{matchedProjects.length > 0 && (
  <Section title="Projects That Match Your Criteria" icon={<TargetIcon />}>
    <div className="grid gap-4">
      {matchedProjects.map(project => (
        <div key={project.id} className="border rounded-lg p-4 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{project.title}</h3>
            <Badge variant="success" size="lg">
              {project.match_score}% Match
            </Badge>
          </div>

          <div className="flex gap-2 mb-3">
            {project.categories?.slice(0, 3).map(cat => (
              <span key={cat} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {cat}
              </span>
            ))}
          </div>

          {/* Optional: Show match breakdown on hover */}
          <Tooltip content={
            <div>
              <p>Industry Match: {project.match_breakdown?.industry_match}pts</p>
              <p>Quality Bonus: {project.match_breakdown?.quality_bonus}pts</p>
            </div>
          }>
            <InfoIcon className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>
      ))}
    </div>
  </Section>
)}
```

---

## Testing Instructions

### Setup Test Investor

1. **Create investor account** (if not exists)
2. **Apply for investor access** via the platform
3. **Admin approves** the request
4. **Run preferences script:**

```bash
cd backend
python add_investor_preferences.py
```

This will add test preferences:
- Industries: ["AI/ML", "SaaS", "Healthcare"]
- Stages: ["Seed", "Series A", "Pre-seed"]
- Location: ["North America", "Europe"]
- Ticket Size: $50,000 - $500,000

### Test Curated Feed

1. **Log in as investor** (User ID: `d0c0514c-30a1-43b6-a112-29524fdd7a4f`)
2. **Go to home page**
3. **Verify:**
   - See "Curated For You" section at top
   - First 5 projects match investor preferences (AI/ML, SaaS, Healthcare)
   - Visual separator after curated section
   - Regular projects follow
4. **Go to page 2**
   - Should NOT see curated section
   - Only regular trending projects

### Test Dashboard

1. **Go to investor dashboard**
2. **Verify:**
   - "Projects That Match Your Criteria" section exists
   - Up to 10 matched projects shown
   - Each shows match percentage (e.g., "90% Match")
   - Can click to see match breakdown

### Test Non-Investor

1. **Log in as regular user** (non-investor)
2. **Go to home page**
3. **Verify:**
   - NO curated section
   - Regular trending feed only
   - No match scores anywhere

---

## Production Checklist

- [x] Matching algorithm implemented and tested
- [x] Feed endpoint returns curated section for investors
- [x] Dashboard shows matched projects with scores
- [x] CORS fixed for category routes
- [x] Falls back gracefully if investor has no preferences
- [x] Falls back gracefully if no matches found
- [x] No performance impact on non-investors
- [x] Scores hidden in feed (only in dashboard)
- [ ] Frontend UI implemented for curated section header
- [ ] Frontend UI implemented for visual separator
- [ ] Frontend UI implemented for dashboard match display
- [ ] User profile page allows editing investor preferences

---

## Key Technical Decisions

### Why Industry-Only Matching?

The algorithm focuses primarily on industry/category matching (90 points) because:
1. **Project data availability** - Most projects have categories, but many lack funding stage, location, or funding target
2. **User clarity** - Industry is the most intuitive matching factor for users
3. **Simplicity** - Easier to explain and debug
4. **Performance** - Single field filtering is fast

### Why Page 1 Only?

Curated section only appears on page 1 because:
1. **User attention** - First page gets the most views
2. **Performance** - Avoids scoring on every page load
3. **UX simplicity** - Clear separation between "personalized" and "browse all"

### Why Hide Scores in Feed?

Match scores are hidden in feed but shown in dashboard because:
1. **Feed cleanliness** - No clutter, just natural browsing
2. **Algorithm transparency** - Dashboard is for power users who want details
3. **User trust** - Silent matching feels organic, not algorithmic

---

## Troubleshooting

### Curated Section Not Appearing

**Check 1:** Is user an approved investor?
```sql
SELECT status FROM investor_requests WHERE user_id = 'USER_ID';
-- Should return 'approved'
```

**Check 2:** Does investor have preferences?
```sql
SELECT industries FROM investor_requests WHERE user_id = 'USER_ID';
-- Should return ["AI/ML", "SaaS", ...] not NULL
```

**Check 3:** Are there matching projects?
```sql
SELECT title, categories FROM projects
WHERE is_deleted = false
AND categories::text LIKE '%AI/ML%';
-- Should return projects
```

**Check 4:** Is page = 1?
- Curated section only shows on first page

### Dashboard Not Showing Matches

**Check backend logs:**
```bash
# In backend terminal, look for errors in prefetch.py
```

**Test matching directly:**
```bash
cd backend
python -c "
from app import create_app
from models.investor_request import InvestorRequest
from services.investor_matching import InvestorMatchingService

app = create_app()
with app.app_context():
    investor = InvestorRequest.query.filter_by(status='approved').first()
    matches = InvestorMatchingService.get_matched_projects(
        investor, limit=10, include_score=True
    )
    print(f'Found {len(matches)} matches')
"
```

---

## Future Enhancements

1. **Multi-factor matching** - Add back stage, location, funding range when project data improves
2. **Learning algorithm** - Track which curated projects investors click/save
3. **Preference UI** - Allow investors to edit preferences in profile
4. **Email digest** - Weekly email with new matching projects
5. **Save searches** - Let investors save custom matching criteria
6. **Collaborative filtering** - "Investors like you also viewed..."

---

## Performance Notes

- **Query optimization:** Pre-filters by industries before scoring (uses ILIKE with JSON casting)
- **Limit enforcement:** Max 5 curated in feed, max 10 in dashboard
- **Caching:** Uses existing project cache, no additional Redis keys needed
- **Fallback:** If matching fails, returns regular feed (no error to user)
- **Async-safe:** All queries use read-only operations, no locking

---

## Support

For questions or issues:
1. Check backend logs: Look for `[INVESTOR MATCHING]` messages
2. Test with script: `python add_investor_preferences.py`
3. Verify API response: Check for `has_curated_section` flag in feed response

---

**Status:** Backend Complete ✅ | Frontend Pending ⏳

Last Updated: 2025-11-19
