# Frontend Refactoring Plan - Remove Zer0 References & Align with TripIt

**Date:** December 2, 2025
**Status:** Planning Phase
**Scope:** Complete frontend cleanup and TripIt alignment

## Overview

The frontend currently contains mixed references to:
- **Old Project (Zer0)**: Chains, Projects, Investors, Validators, Admin interfaces
- **New Project (TripIt)**: Itineraries, Travel Groups, Women Guides, Safety Ratings

**Goal**: Remove all Zer0 references and create a clean TripIt-focused frontend

## Current State Analysis

### Pages (37 total)
#### Zer0-Specific (TO REMOVE - 20 pages)
- AdminChains.tsx - Chain admin management
- AdminRescore.tsx - Admin project rescoring
- AdminValidator.tsx - Admin validator management
- ChainAnalytics.tsx - Chain analytics
- ChainDetailPage.tsx - Chain details
- ChainRequestsPage.tsx - Chain requests
- ChainsListPage.tsx - Chain directory
- CreateChainPage.tsx - Create chain
- EditChainPage.tsx - Edit chain
- EditProject.tsx - Edit project (reuse for itinerary)
- Gallery.tsx - Project gallery
- GalleryView.tsx - Gallery view
- InvestorDashboard.tsx - Investor dashboard
- InvestorDirectory.tsx - Investor directory
- InvestorPlans.tsx - Investor plan pricing
- Investors.tsx - Investor directory
- Leaderboard.tsx - Project leaderboard
- MyProjects.tsx - My projects list (reuse for itineraries)
- ProjectDetail.tsx - Project detail (reuse for itinerary detail)
- Validator.tsx - Validator interface

#### TripIt-Specific (KEEP/ENHANCE - 10 pages)
- About.tsx ✓
- Admin.tsx - Repurpose for TripIt admin
- AuthCallback.tsx ✓
- Dashboard.tsx ✓
- DirectMessages.tsx - Enhance for group chat
- Feed.tsx ✓
- Intros.tsx - Repurpose or remove
- Login.tsx ✓
- NotFound.tsx ✓
- NotificationsPage.tsx ✓
- Profile.tsx ✓
- Publish.tsx ✓
- Register.tsx ✓
- Search.tsx ✓
- Settings.tsx ✓
- UserProfile.tsx ✓
- NetworkIssue.tsx ✓

#### New Pages to Create (7 pages)
1. **ItinerariesList.tsx** - Browse all itineraries
2. **ItineraryDetail.tsx** - View single itinerary
3. **ItineraryEdit.tsx** - Create/edit itinerary
4. **TravelGroupsList.tsx** - Browse travel groups
5. **TravelGroupDetail.tsx** - View group details
6. **WomenGuidesDirectory.tsx** - Browse women guides
7. **SafetyHub.tsx** - Safety ratings & resources

### Components (100+ components)

#### Zer0-Specific Components (TO REMOVE - 30+)
- Chain* components (15+)
- Project* components (8+)
- Admin* components (5+)
- Investor* components (5+)
- FeedTopInvestor* (3+)

#### TripIt Components (KEEP - 10+)
- Itinerary* (3)
- TravelGroup* (3)
- WomenGuide* (3)
- SafetyRating* (2)

#### Utility Components (KEEP - 60+)
- Layout, navigation, UI components
- Modals, loaders, error handling

### Routes (Current - 40+ routes)

#### Zer0 Routes (TO REMOVE)
```
/layerz                 - Chain directory
/layerz/:slug           - Chain detail
/layerz/:slug/edit      - Edit chain
/layerz/:slug/requests  - Chain requests
/layerz/:slug/analytics - Chain analytics
/layerz/create          - Create chain
/investors              - Investor directory
/investor-directory     - Investor directory (protected)
/investor-plans         - Investor plans
/investor-dashboard     - Investor dashboard
/gallery/*              - Project gallery
/leaderboard            - Project leaderboard
```

#### TripIt Routes (KEEP & CLEAN)
```
/                       - Home/Feed
/feed                   - Feed
/dashboard              - User dashboard
/profile                - User profile
/settings               - User settings
/publish                - Create itinerary
/itinerary/:id          - Itinerary detail
/itinerary/:id/edit     - Edit itinerary
/search                 - Search
/messages               - Direct messages
/notifications          - Notifications
/about                  - About page
```

#### New Routes to Add
```
/itineraries            - Browse itineraries
/travel-groups          - Browse travel groups
/travel-groups/:id      - View group
/travel-groups/create   - Create group
/women-guides           - Directory of women guides
/women-guides/:id       - Guide detail
/safety                 - Safety hub
/u/:username            - User profile (keep)
```

## Refactoring Tasks

### Phase 1: Remove Zer0 Components (High Priority)
**Task ID**: FRONTEND-001

1. **Delete Zer0-specific pages** (20 pages)
   - [ ] Remove AdminChains.tsx
   - [ ] Remove AdminValidator.tsx
   - [ ] Remove AdminRescore.tsx
   - [ ] Remove ChainAnalytics.tsx
   - [ ] Remove ChainDetailPage.tsx
   - [ ] Remove ChainRequestsPage.tsx
   - [ ] Remove ChainsListPage.tsx
   - [ ] Remove CreateChainPage.tsx
   - [ ] Remove EditChainPage.tsx
   - [ ] Remove Gallery.tsx
   - [ ] Remove GalleryView.tsx
   - [ ] Remove InvestorDashboard.tsx
   - [ ] Remove InvestorDirectory.tsx
   - [ ] Remove InvestorPlans.tsx
   - [ ] Remove Investors.tsx
   - [ ] Remove Leaderboard.tsx
   - [ ] Remove MyProjects.tsx (or rename to ItinerariesList)
   - [ ] Remove ProjectDetail.tsx (or rename to ItineraryDetail)

2. **Delete Zer0-specific components** (30+ components)
   - [ ] Remove all Chain* components
   - [ ] Remove all Project* components
   - [ ] Remove Investor* components
   - [ ] Remove FeedTopInvestor* components
   - [ ] Remove Admin scoring components

3. **Clean up imports** in remaining files
   - [ ] Search for "Chain" imports and remove
   - [ ] Search for "Project" imports and remove
   - [ ] Search for "Investor" imports and remove

### Phase 2: Rename Pages for Clarity (Medium Priority)
**Task ID**: FRONTEND-002

1. **Rename TripIt pages for consistency**
   - [ ] EditProject.tsx → ItineraryForm.tsx
   - [ ] MyProjects.tsx → ItinerariesList.tsx
   - [ ] ProjectDetail.tsx → ItineraryDetail.tsx
   - [ ] Publish.tsx → CreateItinerary.tsx (or keep as is)

2. **Update route paths** for consistency
   - [ ] /itinerary/:id → /itineraries/:id (keep both for backward compat)
   - [ ] /itinerary/:id/edit → /itineraries/:id/edit
   - [ ] /my-projects → /itineraries
   - [ ] /publish → /create-itinerary (or /itineraries/new)

### Phase 3: Create New TripIt Pages (Medium Priority)
**Task ID**: FRONTEND-003

1. **Create TripIt-specific pages**
   - [ ] Create ItinerariesList.tsx
   - [ ] Create ItineraryDetail.tsx
   - [ ] Create TravelGroupsList.tsx
   - [ ] Create TravelGroupDetail.tsx
   - [ ] Create TravelGroupForm.tsx
   - [ ] Create WomenGuidesDirectory.tsx
   - [ ] Create WomenGuideDetail.tsx
   - [ ] Create SafetyHub.tsx
   - [ ] Create SafetyResourcesPage.tsx
   - [ ] Create WomenSafetySettingsPage.tsx

2. **Create TripIt-specific components**
   - [ ] ItineraryCard.tsx (already exists - verify)
   - [ ] ItineraryGrid.tsx
   - [ ] TravelGroupCard.tsx (already exists - verify)
   - [ ] TravelGroupForm.tsx (already exists - verify)
   - [ ] WomenGuideCard.tsx (already exists - verify)
   - [ ] SafetyRatingCard.tsx (already exists - verify)
   - [ ] SafetyResourceCard.tsx

### Phase 4: Update App.tsx Routes (Medium Priority)
**Task ID**: FRONTEND-004

1. **Remove Zer0 route imports**
   - [ ] Remove AdminChains
   - [ ] Remove AdminValidator
   - [ ] Remove all Chain routes
   - [ ] Remove all Investor routes
   - [ ] Remove Gallery routes
   - [ ] Remove Leaderboard route
   - [ ] Remove MyProjects (move to new ItinerariesList)

2. **Add TripIt routes**
   - [ ] Add /itineraries route
   - [ ] Add /itineraries/:id/edit route
   - [ ] Add /travel-groups route
   - [ ] Add /travel-groups/:id route
   - [ ] Add /travel-groups/create route
   - [ ] Add /women-guides route
   - [ ] Add /women-guides/:id route
   - [ ] Add /safety route

3. **Update protected routes**
   - [ ] Update dashboard routes for TripIt users
   - [ ] Update navigation for TripIt features

### Phase 5: Create TypeScript Types (Medium Priority)
**Task ID**: FRONTEND-005

1. **Create types/index.ts** with all TripIt models
   - [ ] Traveler interface
   - [ ] Itinerary interface
   - [ ] DayPlan interface
   - [ ] TravelGroup interface
   - [ ] SafetyRating interface
   - [ ] WomenGuide interface
   - [ ] GuideBooking interface
   - [ ] GuideReview interface
   - [ ] WomenSafetyResource interface
   - [ ] All API response types

### Phase 6: Create React Query Hooks (Medium Priority)
**Task ID**: FRONTEND-006

1. **Create hooks for Itineraries**
   - [ ] useItineraries() - list all
   - [ ] useItinerary(id) - get single
   - [ ] useCreateItinerary()
   - [ ] useUpdateItinerary()
   - [ ] useDeleteItinerary()
   - [ ] useItineraryRatings()
   - [ ] useRateItinerary()

2. **Create hooks for Travel Groups**
   - [ ] useTravelGroups() - list
   - [ ] useTravelGroup(id) - single
   - [ ] useCreateGroup()
   - [ ] useUpdateGroup()
   - [ ] useJoinGroup()
   - [ ] useLeaveGroup()
   - [ ] useGroupMembers()

3. **Create hooks for Women Guides**
   - [ ] useWomenGuides() - list
   - [ ] useWomenGuide(id) - single
   - [ ] useBookGuide()
   - [ ] useGuideReviews()
   - [ ] useSubmitGuideReview()

4. **Create hooks for Safety**
   - [ ] useSafetyRatings()
   - [ ] useSafetyResources()
   - [ ] useWomenSafetySettings()

### Phase 7: Update API Client (Medium Priority)
**Task ID**: FRONTEND-007

1. **Create API service methods**
   - [ ] Itinerary endpoints
   - [ ] Travel Group endpoints
   - [ ] Women Guide endpoints
   - [ ] Safety endpoints
   - [ ] Remove all old Zer0 endpoints

### Phase 8: Update Navigation & Menus (Medium Priority)
**Task ID**: FRONTEND-008

1. **Update Navbar.tsx**
   - [ ] Remove Chain links
   - [ ] Remove Investor links
   - [ ] Add TripIt feature links
   - [ ] Update menu structure

2. **Update Footer.tsx**
   - [ ] Update links
   - [ ] Update copy

3. **Create TripIt menu items**
   - [ ] Browse Itineraries
   - [ ] My Itineraries
   - [ ] Travel Groups
   - [ ] Women Guides
   - [ ] Safety Resources

### Phase 9: Clean Up Utilities (Low Priority)
**Task ID**: FRONTEND-009

1. **Remove Zer0-specific utilities**
   - [ ] Remove chain-related utils
   - [ ] Remove project scoring utils
   - [ ] Remove investor-specific utils

2. **Update API client**
   - [ ] Remove old endpoints
   - [ ] Add new endpoints

## Naming Convention Guide

### Pages
```
Format: [Entity][Action].tsx
Examples:
- ItinerariesList.tsx       ✓
- ItineraryDetail.tsx       ✓
- ItineraryForm.tsx         ✓
- TravelGroupsList.tsx      ✓
- WomenGuidesDirectory.tsx  ✓
```

### Components
```
Format: [Entity][ComponentType].tsx
Examples:
- ItineraryCard.tsx         ✓
- TravelGroupCard.tsx       ✓
- WomenGuideCard.tsx        ✓
- SafetyRatingCard.tsx      ✓
- TravelGroupForm.tsx       ✓
- GuideBookingDialog.tsx    ✓
```

### Routes
```
Format: /[entity] or /[entity]/[action]
Examples:
- /itineraries                  ✓
- /itineraries/:id              ✓
- /itineraries/:id/edit         ✓
- /travel-groups                ✓
- /travel-groups/:id            ✓
- /women-guides                 ✓
```

### Hooks
```
Format: use[Entity][Action]
Examples:
- useItineraries()              ✓
- useItinerary(id)              ✓
- useCreateItinerary()          ✓
- useTravelGroups()             ✓
- useWomenGuides()              ✓
```

### Types
```
Location: src/types/index.ts
Format: [Entity]Interface or [Entity]Type
Examples:
- Itinerary (interface)         ✓
- TravelGroup (interface)       ✓
- WomenGuide (interface)        ✓
- SafetyRating (interface)      ✓
```

## Execution Strategy

### Step 1: Preparation
- [ ] Create feature branch: `frontend/refactor/remove-zer0`
- [ ] Back up current state
- [ ] Run tests to establish baseline

### Step 2: Remove Legacy (Days 1-2)
- [ ] Delete 20+ Zer0 pages
- [ ] Delete 30+ Zer0 components
- [ ] Clean up imports in remaining files
- [ ] Test that app still compiles

### Step 3: Create New (Days 3-4)
- [ ] Create new TripIt pages
- [ ] Create new TripIt components
- [ ] Create TypeScript types
- [ ] Create React Query hooks

### Step 4: Update Routes (Days 4-5)
- [ ] Update App.tsx routes
- [ ] Update navigation menus
- [ ] Update links throughout app
- [ ] Test routing

### Step 5: API Integration (Days 5-6)
- [ ] Update API client
- [ ] Connect hooks to API
- [ ] Test API calls
- [ ] Handle errors

### Step 6: Testing & Polish (Days 6-7)
- [ ] Manual testing of all pages
- [ ] Fix styling issues
- [ ] Update responsive design
- [ ] Performance optimization

### Step 7: Cleanup & Documentation (Day 7)
- [ ] Remove dead code
- [ ] Update README
- [ ] Document new patterns
- [ ] Create PR with detailed description

## Expected Outcome

### Before
- 37 pages (20 Zer0, 17 other)
- 100+ components (30 Zer0, 70 other)
- 40+ routes (half Zer0, half other)
- Mixed naming conventions
- Zer0 references throughout

### After
- 27 pages (0 Zer0, 27 TripIt)
- 70+ components (0 Zer0, 70 TripIt)
- 25+ routes (all TripIt-focused)
- Consistent naming conventions
- Zero Zer0 references
- Complete TripIt feature coverage
- TypeScript types for all models
- React Query hooks for all endpoints

## Risk Assessment

### Low Risk
- Removing Zer0 pages (no TripIt users depend on them)
- Removing Zer0 components (not used in current features)
- Adding new pages/components (no conflicts)

### Medium Risk
- Updating App.tsx routes (potential redirect issues)
- Renaming existing pages (backward compatibility)
- API changes (need to maintain compatibility)

### High Risk
- None identified - Zer0 and TripIt are separate features

## Dependencies

### Must Complete Before This
- Phase 7: API Testing ✓ (COMPLETE)
- Backend API endpoints fully functional ✓ (COMPLETE)

### Enables After This
- Phase 8: Deployment (uses cleaned frontend)
- Frontend testing
- E2E testing with TripIt features

## Success Criteria

- [ ] 0 references to "Zer0", "Chain", "Project", "Investor"
- [ ] All 60+ TripIt API endpoints have UI pages
- [ ] All TripIt components created and working
- [ ] All routes follow naming convention
- [ ] TypeScript types for all models
- [ ] React Query hooks for all endpoints
- [ ] No console errors or warnings
- [ ] App compiles and builds successfully
- [ ] All pages are responsive
- [ ] Navigation works correctly

## Estimated Effort

- **Development**: 40-50 hours
- **Testing**: 10-15 hours
- **Code Review**: 5-10 hours
- **Total**: 55-75 hours (7-10 working days)

## Notes

- Keep utility components (loaders, modals, etc.)
- Reuse existing UI component library
- Maintain authentication/authorization patterns
- Keep error handling patterns
- Preserve caching and prefetch strategies
