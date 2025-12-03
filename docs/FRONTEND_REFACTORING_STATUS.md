# Frontend Refactoring Status - TripIt Terminology Migration

**Date:** November 30, 2025
**Status:** 🚀 IN PROGRESS (Core Infrastructure Complete, UI Updates Pending)

---

## Overview

Comprehensive terminology refactoring from Zer0 "project-focused" concepts to TripIt "travel-focused" concepts across the entire frontend. The refactoring maintains backward compatibility while introducing new travel-specific types and components.

---

## ✅ COMPLETED (Phase 1: Core Infrastructure)

### 1. **API Service Layer** (`frontend/src/services/api.ts`)
**Status: 100% COMPLETE**

**Changes Made:**
- ✅ Created `itinerariesService` with 8 endpoints (replacing projectsService)
- ✅ Created `safetyRatingsService` with 8 endpoints (replacing votesService)
- ✅ Created `travelIntelService` with 9 endpoints (replacing commentsService)
- ✅ Created `savedItinerariesService` with 4 endpoints (replacing savedProjectsService)
- ✅ Updated admin service with itinerary endpoints
- ✅ Added backward compatibility aliases for old service names
- ✅ All endpoint paths updated to new travel-focused routes

**New Services:**
```typescript
export const itinerariesService = { ... }        // 8 methods
export const safetyRatingsService = { ... }      // 8 methods
export const travelIntelService = { ... }        // 9 methods
export const savedItinerariesService = { ... }   // 4 methods
```

**Backward Compatibility:**
- `projectsService` → aliases to `itinerariesService`
- `votesService` → aliases to `safetyRatingsService`
- `commentsService` → aliases to `travelIntelService`
- `savedProjectsService` → aliases to `savedItinerariesService`

### 2. **Type Definitions** (`frontend/src/types/index.ts`)
**Status: 100% COMPLETE**

**New Interfaces Created:**
- ✅ `Traveler` (extends User with travel-specific fields)
- ✅ `SafetyRating` (1-5 star safety ratings)
- ✅ `TravelIntel` (typed intelligence: question, update, warning, recommendation, local_insight)
- ✅ `TravelCredibilityScore` (5-component scoring)
- ✅ `Itinerary` (main travel plan model, comprehensive)
- ✅ `SavedItinerary` (saved travel plans)
- ✅ `ItineraryUpdate` (trip milestone updates)
- ✅ `ProjectOrItinerary` (type alias for compatibility)

**Field Mappings Implemented:**
```
Project.hackathonName        → Itinerary.destination
Project.techStack            → Itinerary.activity_tags
Project.teamMembers          → Itinerary.travel_companions
Project.proofScore           → Itinerary.travel_credibility_score
Project.author               → Itinerary.creator (Traveler)
Vote (up/down)               → SafetyRating (1-5 stars)
Comment                      → TravelIntel (with intel_type)
```

---

## ⏳ IN PROGRESS / PENDING (Phase 2: UI Updates)

### Critical Priority Files (to update next)

#### Pages (5 files)
1. **Feed.tsx**
   - [ ] Change "Discover Projects" → "Discover Itineraries"
   - [ ] Update descriptions to travel context
   - [ ] Use itinerariesService instead of projectsService
   - [ ] Update component imports (ProjectCard → ItineraryCard)

2. **ProjectDetail.tsx** (should become ItineraryDetail.tsx)
   - [ ] Rename page to ItineraryDetailPage or keep as ProjectDetail but update content
   - [ ] Change "Project Journey" → "Trip Journey"
   - [ ] Change "Tech Stack" → "Travel Style & Activities"
   - [ ] Change "Comments" → "Travel Intel"
   - [ ] Update API calls to use itinerariesService
   - [ ] Update rendering to show travel-specific data

3. **MyProjects.tsx** (should become MyItineraries.tsx)
   - [ ] Rename page or keep name but update content
   - [ ] Change "My Projects" → "My Itineraries"
   - [ ] Update button labels ("New Project" → "New Itinerary")
   - [ ] Use itinerariesService

4. **Publish.tsx** (Create new Itinerary form)
   - [ ] Change "Tech Stack" → "Travel Style & Activities"
   - [ ] Change "Hackathon Name" → "Destination Name"
   - [ ] Add travel-specific fields (start_date, end_date, difficulty_level, etc.)
   - [ ] Update form handling for new itinerary structure

5. **EditProject.tsx** (should become EditItinerary.tsx)
   - [ ] Update form fields to match Itinerary model
   - [ ] Change hackathon fields to destination fields
   - [ ] Update API endpoint calls

#### Components (8 files)
1. **ProjectCard.tsx** → **ItineraryCard.tsx**
   - [ ] Rename component
   - [ ] Update props to use Itinerary type
   - [ ] Change "Proof Score" → "Credibility Score"
   - [ ] Replace vote buttons with safety rating widget
   - [ ] Replace comment count with travel intel count

2. **VoteButtons.tsx** → **SafetyRatingWidget.tsx**
   - [ ] Rename component and interface
   - [ ] Change from up/down votes to 1-5 star rating
   - [ ] Update icons and labels
   - [ ] Update API calls to safetyRatingsService

3. **CommentSection.tsx** → **TravelIntelSection.tsx**
   - [ ] Rename component and interface
   - [ ] Update to show typed travel intel
   - [ ] Add intel type selection (question, update, warning, etc.)
   - [ ] Update API calls to travelIntelService

4. **ProjectCarousel.tsx** → **ItineraryCarousel.tsx**
   - [ ] Rename component
   - [ ] Update to use Itinerary type

5. **ProjectBadges.tsx** → **ItineraryBadges.tsx**
   - [ ] Rename component
   - [ ] Update badge display logic

6. **ProjectDetailSkeleton.tsx** → **ItineraryDetailSkeleton.tsx**
   - [ ] Rename file and component
   - [ ] Update section labels

7. **ProjectCardSkeleton.tsx** → **ItineraryCardSkeleton.tsx**
   - [ ] Rename file and component

8. **FeaturedProjectsSkeleton.tsx** → **FeaturedItinerariesSkeleton.tsx**
   - [ ] Rename file and component

#### Hooks (3 files)
1. **hooks/useProjects.ts** → **hooks/useItineraries.ts**
   - [ ] Rename file and all hook functions
   - [ ] Update `transformProject` → `transformItinerary`
   - [ ] Update field mappings
   - [ ] Use itinerariesService instead of projectsService

2. **hooks/useSavedProjects.ts** → **hooks/useSavedItineraries.ts**
   - [ ] Rename hooks
   - [ ] Use savedItinerariesService

3. **hooks/useVotes.ts** → **hooks/useSafetyRatings.ts** (NEW)
   - [ ] Create new hook for safety ratings
   - [ ] Use safetyRatingsService

#### Other Pages (10 files)
- [ ] Dashboard.tsx - Update project references
- [ ] Gallery.tsx - Update filter labels
- [ ] Leaderboard.tsx - Update leaderboard labels
- [ ] Search.tsx - Update search results display
- [ ] Validator.tsx - Update proof score references
- [ ] InvestorDashboard.tsx - Update project discovery text
- [ ] InvestorPlans.tsx - Update descriptions
- [ ] About.tsx - Update about text
- [ ] Navbar.tsx - "My Projects" → "My Itineraries"
- [ ] Footer.tsx - Update footer text

---

## 📊 Progress Summary

| Component | Status | Count |
|-----------|--------|-------|
| API Services | ✅ Complete | 4 new services + aliases |
| Type Definitions | ✅ Complete | 8 new interfaces |
| Pages (Critical) | ⏳ Pending | 5 files |
| Components (Key) | ⏳ Pending | 8 files |
| Hooks | ⏳ Pending | 3 files |
| Other Pages | ⏳ Pending | 10 files |
| **Total Frontend Files** | **~40% Complete** | **35+ files** |

---

## 🔄 Terminology Mapping Reference

### Text Changes
```
"Project" → "Itinerary"
"Hackathon" → "Trip" / "Travel Destination"
"Vote" → "Safety Rating"
"Upvote/Downvote" → "Helpful/Unhelpful" or "5-star rating"
"Comment" → "Travel Intel"
"Tech Stack" → "Travel Style & Activities"
"Proof Score" → "Travel Credibility Score"
"Team Members" → "Travel Companions"
"Demo URL" → "Route Map URL"
"GitHub URL" → "Route GPX Data"
```

### Component Renames
```
ProjectCard → ItineraryCard
VoteButtons → SafetyRatingWidget
CommentSection → TravelIntelSection
ProjectCarousel → ItineraryCarousel
ProjectBadges → ItineraryBadges
ProjectDetailSkeleton → ItineraryDetailSkeleton
ProjectCardSkeleton → ItineraryCardSkeleton
FeaturedProjectsSkeleton → FeaturedItinerariesSkeleton
```

### Hook Renames
```
useProjects → useItineraries
useProjectById → useItineraryById
useDeleteProject → useDeleteItinerary
useCreateProject → useCreateItinerary
useUserProjects → useUserItineraries
useSavedProjects → useSavedItineraries
useVote → useSafetyRating
```

---

## 🎯 Next Steps (Priority Order)

### Phase 2A: Critical User-Facing Pages
1. Update `Feed.tsx` (users see this first)
2. Update `ProjectCard.tsx` → `ItineraryCard.tsx` (used everywhere)
3. Update `VoteButtons.tsx` → `SafetyRatingWidget.tsx` (interactive element)
4. Update `ProjectDetail.tsx` (detailed view)

### Phase 2B: User Workflows
5. Update `Publish.tsx` (create itinerary)
6. Update `EditProject.tsx` (edit itinerary)
7. Update `MyProjects.tsx` (user dashboard)

### Phase 2C: Supporting UI
8. Update remaining components and pages
9. Update hooks to use new services

### Phase 3: Testing & Integration
10. Test all API integrations
11. Verify backward compatibility
12. Update documentation

---

## 🚀 Rollout Strategy

**Option 1: Gradual Rollout (Recommended)**
- Keep both old and new terminology working simultaneously
- Gradually migrate pages/components one at a time
- Use type aliases and service wrappers for compatibility
- Fully deprecate old code after migration complete

**Option 2: Big Bang Refactoring**
- Update all files at once
- Faster but higher risk
- Requires comprehensive testing

---

## 📝 Implementation Notes

### Backward Compatibility
- All old service names (projectsService, votesService, etc.) still work via aliases
- Old type names still available alongside new ones
- Gradual migration prevents complete breakage

### What's Already Connected
✅ Backend routes created and registered
✅ API services and type definitions updated
✅ New database models implemented

### What Needs Updating
⏳ UI/UX components to show new terminology
⏳ Page layouts for travel-specific data display
⏳ Forms for itinerary creation/editing
⏳ Hooks to use new services

---

## 💡 Recommendations

**Given the scope (35+ files), suggest focusing on:**

1. **High Impact (10 files)** - Visible to users immediately
   - Feed, ProjectDetail, ProjectCard, VoteButtons, CommentSection
   - Dashboard, MyProjects, Publish, EditProject, Navbar

2. **Medium Impact (15 files)** - Commonly used features
   - Gallery, Leaderboard, Search, All remaining components
   - All remaining hooks

3. **Low Impact (10 files)** - Admin/less-used pages
   - Admin pages, Validator, About, etc.

---

**Status:** Backend ✅ Ready | Frontend API Layer ✅ Ready | Frontend UI ⏳ In Progress

**Estimated Completion:** 2-3 days with focused effort on the critical 10 files first
