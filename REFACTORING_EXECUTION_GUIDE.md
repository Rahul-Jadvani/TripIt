# Frontend Refactoring - Execution Guide

**Quick Links:**
- 📋 Executive Summary: `FRONTEND_REFACTORING_SUMMARY.md`
- 📝 Detailed Plan: `FRONTEND_REFACTORING_PLAN.md`
- 📊 Project Status: Check todo list or `SESSION_SUMMARY.md`

## Quick Start

### For Developers Starting the Refactoring

```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b frontend/refactor/remove-zer0

# 2. Start with Phase 1: Delete Zer0 files
# See "Phase 1 Quick Checklist" below

# 3. Make frequent commits
git add src/pages/SomeZer0Page.tsx
git commit -m "Remove Zer0 page: [FileName]"

# 4. After each phase, test the app
npm run dev
# Check: http://localhost:3000 for errors

# 5. Before pushing
git push origin frontend/refactor/remove-zer0
# Create PR with description of phase completed
```

## Phase 1 Quick Checklist: Remove Zer0 (2 days)

### Pages to Delete (20 files)
```bash
rm -rf src/pages/AdminChains.tsx
rm -rf src/pages/AdminRescore.tsx
rm -rf src/pages/AdminValidator.tsx
rm -rf src/pages/ChainAnalytics.tsx
rm -rf src/pages/ChainDetailPage.tsx
rm -rf src/pages/ChainRequestsPage.tsx
rm -rf src/pages/ChainsListPage.tsx
rm -rf src/pages/CreateChainPage.tsx
rm -rf src/pages/EditChainPage.tsx
rm -rf src/pages/EditProject.tsx
rm -rf src/pages/Gallery.tsx
rm -rf src/pages/GalleryView.tsx
rm -rf src/pages/InvestorDashboard.tsx
rm -rf src/pages/InvestorDirectory.tsx
rm -rf src/pages/InvestorPlans.tsx
rm -rf src/pages/Investors.tsx
rm -rf src/pages/Leaderboard.tsx
rm -rf src/pages/MyProjects.tsx
rm -rf src/pages/ProjectDetail.tsx
rm -rf src/pages/Validator.tsx
```

### Components to Delete (30+ files)
```bash
# Chain components
rm -rf src/components/Chain*.tsx

# Project components
rm -rf src/components/Project*.tsx

# Investor components
rm -rf src/components/Investor*.tsx
rm -rf src/components/FeedTopInvestor*.tsx

# Admin components
rm -rf src/components/Admin*.tsx

# Gallery/Leaderboard
rm -rf src/components/Featured*.tsx
rm -rf src/components/FeedLeaderTag*.tsx
```

### Quick Compile Check
```bash
npm run build
# Should compile with NO "cannot find module" errors
# (Some unused imports are ok)
```

### Next: Clean Up Imports
```bash
# Find all broken imports
grep -r "AdminChains\|ChainDetailPage\|ProjectDetail\|Investors" src/

# Fix them in:
# - src/App.tsx (main route file)
# - src/components/Navbar.tsx
# - Any other component that imports deleted files
```

## Phase 2 Quick Checklist: Rename & Organize (2 days)

### Update App.tsx Routes
```tsx
// Remove these import lines:
const AdminChains = lazy(() => import("./pages/AdminChains"));
const ChainDetailPage = lazy(() => import("./pages/ChainDetailPage"));
// ... (all 20 Zer0 pages)

// Remove these route definitions:
<Route path="/layerz" element={<ChainsListPage />} />
<Route path="/layerz/:slug" element={<ChainDetailPage />} />
// ... (all Zer0 routes)

// Add new TripIt routes:
const ItinerariesList = lazy(() => import("./pages/ItinerariesList"));
const ItineraryDetail = lazy(() => import("./pages/ItineraryDetail"));
const TravelGroupsList = lazy(() => import("./pages/TravelGroupsList"));
// ... (all new TripIt pages)

<Route path="/itineraries" element={<ItinerariesList />} />
<Route path="/itineraries/:id" element={<ItineraryDetail />} />
<Route path="/travel-groups" element={<TravelGroupsList />} />
// ... (all new TripIt routes)
```

### Update Navigation
```tsx
// src/components/Navbar.tsx

// Old links to remove:
<a href="/investors">Investors</a>
<a href="/layerz">Chains</a>
<a href="/gallery">Gallery</a>
<a href="/leaderboard">Leaderboard</a>

// New links to add:
<a href="/itineraries">Itineraries</a>
<a href="/travel-groups">Travel Groups</a>
<a href="/women-guides">Women Guides</a>
<a href="/safety">Safety Resources</a>
```

## Phase 3 Quick Checklist: Create New Pages (2 days)

### Create Each Page
```bash
# 1. Create directories if needed
mkdir -p src/pages

# 2. Create pages one by one from template below
touch src/pages/ItinerariesList.tsx
touch src/pages/ItineraryDetail.tsx
touch src/pages/TravelGroupsList.tsx
# ... etc

# 3. Test each page
npm run dev
# Navigate to /itineraries, /travel-groups, etc
```

### Page Template
```tsx
// src/pages/ItinerariesList.tsx
import { useItineraries } from "@/hooks/useItineraries";
import { CoffeeLoader } from "@/components/CoffeeLoader";
import { ItineraryCard } from "@/components/ItineraryCard";

export default function ItinerariesList() {
  const { data: itineraries, isLoading, error } = useItineraries();

  if (isLoading) return <CoffeeLoader message="Loading itineraries..." />;
  if (error) return <div>Error loading itineraries</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Itineraries</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {itineraries?.map((itinerary) => (
          <ItineraryCard key={itinerary.id} itinerary={itinerary} />
        ))}
      </div>
    </div>
  );
}
```

## Phase 4 Quick Checklist: Create Hooks & Types (2 days)

### Create TypeScript Types
```tsx
// src/types/index.ts

export interface Itinerary {
  id: string;
  traveler_id: string;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  is_public: boolean;
  budget_usd: number;
  travel_style: string;
  budget_category: string;
  // ... more fields from backend model
}

export interface TravelGroup {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  max_members: number;
  group_type: string;
  travel_pace: string;
  budget_range: string;
  // ... more fields
}

// Add all other models similarly
```

### Create React Query Hooks
```tsx
// src/hooks/useItineraries.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Itinerary } from "@/types";

export function useItineraries() {
  return useQuery({
    queryKey: ["itineraries"],
    queryFn: () => api.get<Itinerary[]>("/api/itineraries"),
  });
}

export function useItinerary(id: string) {
  return useQuery({
    queryKey: ["itinerary", id],
    queryFn: () => api.get<Itinerary>(`/api/itineraries/${id}`),
  });
}

export function useCreateItinerary() {
  return useMutation({
    mutationFn: (data: Partial<Itinerary>) =>
      api.post("/api/itineraries", data),
  });
}

export function useUpdateItinerary(id: string) {
  return useMutation({
    mutationFn: (data: Partial<Itinerary>) =>
      api.put(`/api/itineraries/${id}`, data),
  });
}

export function useDeleteItinerary(id: string) {
  return useMutation({
    mutationFn: () => api.delete(`/api/itineraries/${id}`),
  });
}
```

## Phase 5 Quick Checklist: Connect to API (1-2 days)

### Update API Service
```tsx
// src/services/api.ts
// Add these methods (remove old Zer0 methods)

export const api = {
  // Itineraries
  getItineraries: () => get("/api/itineraries"),
  getItinerary: (id: string) => get(`/api/itineraries/${id}`),
  createItinerary: (data) => post("/api/itineraries", data),
  updateItinerary: (id: string, data) => put(`/api/itineraries/${id}`, data),
  deleteItinerary: (id: string) => delete(`/api/itineraries/${id}`),
  rateItinerary: (id: string, rating: number) => post(`/api/itineraries/${id}/rating`, { rating }),

  // Travel Groups
  getTravelGroups: () => get("/api/travel-groups"),
  getTravelGroup: (id: string) => get(`/api/travel-groups/${id}`),
  createTravelGroup: (data) => post("/api/travel-groups", data),
  joinGroup: (id: string) => post(`/api/travel-groups/${id}/join`),
  leaveGroup: (id: string) => post(`/api/travel-groups/${id}/leave`),

  // Women Guides
  getWomenGuides: () => get("/api/women-safety/guides"),
  getWomenGuide: (id: string) => get(`/api/women-safety/guides/${id}`),
  bookGuide: (id: string, data) => post(`/api/women-safety/guides/${id}/book`, data),

  // Safety
  getSafetyRatings: () => get("/api/safety-ratings"),
  getSafetyResources: () => get("/api/women-safety/resources"),
};
```

### Test Each Hook
```tsx
// In your page/component
import { useItineraries } from "@/hooks/useItineraries";

export default function TestPage() {
  const { data, isLoading, error } = useItineraries();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

## Testing Checklist

### After Each Phase
```bash
# 1. Test compilation
npm run build
# Must complete without errors

# 2. Test development server
npm run dev
# Should start without errors

# 3. Test navigation
# Visit: http://localhost:3000
# Click all links
# Verify no 404 errors

# 4. Test new features
# If page was added, test it works
# Check console for errors
# Verify data loads correctly
```

### Final Comprehensive Test
```bash
# 1. Fresh build
npm run build

# 2. All routes working
# / → Feed
# /dashboard → Dashboard
# /itineraries → Itineraries list
# /itineraries/:id → Itinerary detail
# /travel-groups → Travel groups
# /women-guides → Women guides
# /safety → Safety hub

# 3. No console errors
# Open DevTools (F12)
# Check Console tab
# Should show 0 errors (0 warnings is better)

# 4. No broken imports
# Search for: "cannot find module"
# Result: 0 matches

# 5. TypeScript strict
# npm run type-check
# Must pass with 0 errors
```

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution:**
```bash
# 1. Find the import
grep -r "from.*DeletedFile" src/

# 2. Remove or replace it
# Edit the importing file
# Delete or replace the import line

# 3. Test again
npm run build
```

### Issue: "Unused variable"
**Solution:**
```tsx
// Either remove it:
// const unused = something; ❌

// Or use it:
// const data = useHook();
return <div>{data}</div>; ✅
```

### Issue: "Component not found"
**Solution:**
```bash
# Check file exists:
ls src/pages/ItinerariesList.tsx
# ls: cannot access 'src/pages/ItinerariesList.tsx': No such file

# Create it if missing:
touch src/pages/ItinerariesList.tsx
```

### Issue: Routes not working
**Solution:**
```tsx
// Check App.tsx:
// 1. Is the import there?
const ItinerariesList = lazy(() => import("./pages/ItinerariesList"));

// 2. Is the route there?
<Route path="/itineraries" element={<ItinerariesList />} />

// 3. Is it inside MainLayout?
<Route element={<MainLayout />}>
  <Route path="/itineraries" element={<ItinerariesList />} />
</Route>
```

## Performance Tips

### Bundle Size Check
```bash
npm run build
# Look for: "dist/index.js"
# Note the size
# Should be smaller after removing Zer0 code

# To analyze:
npm run build -- --profile
```

### Code Splitting
Keep these patterns for lazy loading:
```tsx
// Good - lazy load pages
const ItinerariesList = lazy(() => import("./pages/ItinerariesList"));

// Good - load common components normally
import { Navbar } from "./components/Navbar";
import { CoffeeLoader } from "./components/CoffeeLoader";
```

## Git Workflow

### Make Frequent Commits
```bash
# After deleting each file or group
git add src/pages/DeletedPage.tsx
git commit -m "Remove Zer0 page: DeletedPage"

# After creating new page
git add src/pages/NewTripItPage.tsx
git commit -m "Add TripIt page: NewTripItPage"

# After updating routes
git add src/App.tsx src/components/Navbar.tsx
git commit -m "Update routes: Remove Zer0, add TripIt routes"
```

### Before Creating PR
```bash
# 1. Update from main
git fetch origin
git rebase origin/main

# 2. Test everything
npm run build
npm run dev
# Manual testing

# 3. Check TypeScript
npm run type-check

# 4. Push to branch
git push origin frontend/refactor/remove-zer0

# 5. Create PR
# Go to GitHub
# Create PR from your branch to main
# Add detailed description of work done
```

## PR Template

```markdown
## Frontend Refactoring - Phase X Complete

### Changes Made
- [ ] Deleted 20 Zer0 pages
- [ ] Deleted 30+ Zer0 components
- [ ] Created 7 new TripIt pages
- [ ] Updated App.tsx routes
- [ ] Created TypeScript types
- [ ] Created React Query hooks

### Testing Done
- [x] npm run build ✅
- [x] npm run dev ✅
- [x] Manual route testing ✅
- [x] No console errors ✅
- [x] TypeScript strict mode ✅

### Files Changed
- src/App.tsx: Updated routes (40 lines changed)
- src/pages/: 20 deleted, 7 created
- src/components/: 30+ deleted
- src/hooks/: 15+ created
- src/types/: Created

### Checklist
- [ ] Code builds without errors
- [ ] All routes working
- [ ] No Zer0 references remain
- [ ] TypeScript types complete
- [ ] React Query hooks working
- [ ] Responsive design verified
- [ ] No breaking changes

### Related
- Closes #ISSUE_NUMBER
- Related to: Cleanup: Remove blockchain/legacy references
```

## Success Indicators

✅ When you know you're done:
- No import errors in build
- All Zer0 pages/components deleted
- All TripIt pages/components created
- App compiles successfully
- No console errors
- All routes navigate correctly
- TypeScript strict mode passes
- Bundle size reduced by ~60%
- Navigation menu updated
- Zero "Zer0" references in code

## Need Help?

### Documentation
1. **Executive Summary**: `FRONTEND_REFACTORING_SUMMARY.md`
2. **Detailed Plan**: `FRONTEND_REFACTORING_PLAN.md`
3. **This Guide**: `REFACTORING_EXECUTION_GUIDE.md`

### During Execution
1. Check Phase checklist above
2. Reference PR template
3. Review testing checklist
4. Fix common issues

### After Completion
1. Celebrate! 🎉
2. Create detailed PR
3. Request code review
4. Merge to main
5. Deploy to staging

---

**Ready to start?**

1. Create feature branch: `git checkout -b frontend/refactor/remove-zer0`
2. Start Phase 1: Delete Zer0 files
3. Make frequent commits
4. Test after each phase
5. Create PR when done

Good luck! 🚀
