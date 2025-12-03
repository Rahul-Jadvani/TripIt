# Chain to Community Refactoring Guide

## Executive Summary

This document provides a comprehensive analysis and refactoring plan for converting the Chain/Layerz functionality from Zer0 (blockchain/projects platform) to TripIt (social travel platform). The refactoring involves 18 files across pages, components, hooks, and services.

### Core Concept Transformations

| Original (Zer0) | New (TripIt) | Context |
|-----------------|--------------|---------|
| Chain | Community | Noun form for groups/collections |
| Layerz | Travel Communities / Communities | Brand term |
| Builder | Traveler | User role |
| Project | Itinerary | Core content type |
| Proof Score | Trust Score / Verification Level | Credibility metric |
| Tech Stack | Travel Style / Destination Tags | Classification system |

---

## File-by-File Refactoring Plan

### 1. **frontend/src/pages/Leaderboard.tsx**

**Priority**: Medium
**Dependencies**: None

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 8 | `useBuildersLeaderboard` | `useTravelersLeaderboard` | Hook name |
| 10 | `'builders'` | `'travelers'` | Type definition |
| 14 | `'builders'` | `'travelers'` | Initial tab |
| 17 | `'builders'` | `'travelers'` | Tab value |
| 22 | `buildersData`, `buildersLoading`, `buildersError` | `travelersData`, `travelersLoading`, `travelersError` | Variable names |
| 40 | "Top itineraries and builders on Zer0" | "Top itineraries and travelers on TripIt" | Description |
| 55 | `value="builders"` | `value="travelers"` | Tab trigger |
| 58 | "Builders" | "Travelers" | Tab label |
| 104 | `/project/${item.id}` | `/itinerary/${item.id}` | Link path |
| 120 | "Be the first to publish a project!" | "Be the first to share an itinerary!" | Empty state |
| 127 | `{tab === 'builders' && (` | `{tab === 'travelers' && (` | Conditional |
| 159 | `{item.itineraries} itineraries` | `{item.itineraries} itineraries` | No change needed |
| 171 | "No builders yet" | "No travelers yet" | Empty state |
| 172 | "Be the first to join the community!" | "Be the first to join the community!" | No change needed |
| 221 | `/project/${item.id}` | `/itinerary/${item.id}` | Link path |
| 227 | "Featured on Zer0" | "Featured on TripIt" | Tagline |
| 238 | "No featured itineraries yet" | "No featured itineraries yet" | No change needed |

#### Semantic Changes:
- Update the leaderboard to show travel metrics (destinations visited, reviews given, trips completed)
- Consider adding "Top Destinations" or "Top Travel Communities" as additional tabs

---

### 2. **frontend/src/pages/ChainDetailPage.tsx**

**Priority**: High
**Dependencies**: ChainHeader, ChainPostList, AddProjectToChainDialog, useChains hooks

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 3-10 | `useChain`, `useChainProjects`, `useFollowChain`, `useUnfollowChain` | Keep hooks (will update in useChains.ts) | Hook imports |
| 4 | `useBanChain`, `useSuspendChain`, `useUnbanChain`, `useDeleteChainAdmin`, `useToggleChainFeatured` | Keep hooks (will update in admin hooks) | Admin imports |
| 5-6 | `ChainHeader`, `ChainHeaderSkeleton` | Keep component names | Component imports |
| 9 | `AddProjectToChainDialog` | `AddItineraryToCommunityDialog` | Component import |
| 10 | `ChainPostList` | `CommunityPostList` | Component import |
| 22 | `ChainDetailPage` | `CommunityDetailPage` | Function name |
| 23-94 | `chain`, `chainData`, `chainLoading`, `chainError` | `community`, `communityData`, `communityLoading`, `communityError` | Variable renaming |
| 44 | `useChain` | Keep (updates in hook file) | Hook call |
| 45-53 | `useChainProjects` | Keep (updates in hook file) | Hook call |
| 55 | `chain` | `community` | Variable |
| 56 | `projects` | `itineraries` | Variable |
| 58-59 | `followMutation`, `unfollowMutation` | Keep | Mutations |
| 62 | `handleAdminAction` | Keep | Function |
| 63 | `chain` | `community` | Variable |
| 70 | `banChainMutation` | `banCommunityMutation` | Variable |
| 76 | `suspendChainMutation` | `suspendCommunityMutation` | Variable |
| 84 | `unbanChainMutation` | `unbanCommunityMutation` | Variable |
| 88 | `"${chain.name}"` | `"${community.name}"` | String |
| 93 | `deleteChainMutation` | `deleteCommunityMutation` | Variable |
| 94 | `/layerz` | `/communities` | Navigation path |
| 99 | `toggleFeaturedMutation` | Keep | Mutation |
| 107-108 | `chain` | `community` | Variables |
| 114 | `/layerz` | `/communities` | Link path |
| 116 | "Back to layerz" | "Back to communities" | Link text |
| 120 | `ChainHeaderSkeleton` | Keep | Component |
| 138 | "Chain not found or failed to load" | "Community not found or failed to load" | Error message |
| 140 | `/layerz` | `/communities` | Link path |
| 142 | "Back to layerz" | "Back to communities" | Link text |
| 154 | `/layerz` | `/communities` | Link path |
| 156 | "Back to layerz" | "Back to communities" | Link text |
| 161 | `ChainHeader chain={chain}` | `CommunityHeader community={community}` | Component prop |
| 169-187 | `chain.is_following`, `chain.slug` | `community.is_following`, `community.slug` | Props |
| 217 | "Suspend" | "Suspend" | No change |
| 254 | `/admin/chains` | `/admin/communities` | Link path |
| 255 | "Admin Panel" | "Admin Panel" | No change |
| 268 | "Chain Owner Tools" | "Community Owner Tools" | Title |
| 271 | `/layerz/${slug}/analytics` | `/communities/${slug}/analytics` | Link path |
| 277 | `/layerz/${slug}/requests` | `/communities/${slug}/requests` | Link path |
| 278 | `chain.pending_requests` | `community.pending_requests` | Prop |
| 294 | "Projects" | "Itineraries" | Tab label |
| 294 | `chain.project_count` | `community.itinerary_count` | Prop |
| 345 | "No projects yet" | "No itineraries yet" | Empty state |
| 348 | "Be the first to add a project to this chain!" | "Be the first to add an itinerary to this community!" | Empty state |
| 351 | "Add Project" | "Add Itinerary" | Button text |
| 358 | `ProjectCard` | `ItineraryCard` | Component |
| 403 | `ChainPostList` | `CommunityPostList` | Component |
| 411 | `chain.description` | `community.description` | Prop |
| 414-418 | `chain.rules` | `community.rules` | Props |
| 421-435 | `chain.categories` | `community.categories` | Props |
| 442-453 | `chain.is_public`, `chain.requires_approval` | `community.is_public`, `community.requires_approval` | Props |
| 464 | "About {chain.name}" | "About {community.name}" | Title |
| 466-467 | `chain.description` | `community.description` | Prop |
| 470-481 | `chain.categories` | `community.categories` | Props |
| 485-495 | `chain.project_count`, `chain.follower_count`, `chain.view_count` | `community.itinerary_count`, `community.follower_count`, `community.view_count` | Stats |
| 486 | "projects" | "itineraries" | Label |
| 498-513 | `chain.social_links` | `community.social_links` | Props |
| 517-521 | `chain.creator` | `community.creator` | Props |
| 526-530 | `chain.rules` | `community.rules` | Props |
| 550 | `AddProjectToChainDialog` | `AddItineraryToCommunityDialog` | Component |
| 554 | `chain.name`, `chain.requires_approval` | `community.name`, `community.requires_approval` | Props |

#### Semantic Changes:
- Update "Projects" tab to "Itineraries"
- Change project-related stats to itinerary-related stats
- Update empty states to reflect travel content
- Change admin actions from chain management to community management

---

### 3. **frontend/src/pages/ChainsListPage.tsx**

**Priority**: High
**Dependencies**: ChainCard, ChainFilters, useChains

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 3 | `useChains` | Keep (updates in hook file) | Hook import |
| 4 | `ChainCard` | `CommunityCard` | Component import |
| 5 | `ChainFilters` | `CommunityFilters` | Component import |
| 12 | `ChainsListPage` | `CommunitiesListPage` | Function name |
| 20 | `useChains` | Keep | Hook call |
| 29 | `chains` | `communities` | Variable |
| 37 | "SubZer0 Layerz" | "TripIt Travel Communities" | Page title |
| 39 | "Discover and join project layerz" | "Discover and join travel communities" | Description |
| 44 | `/layerz/create` | `/communities/create` | Link path |
| 46 | "Create layerz" | "Create Community" | Button text |
| 53 | `ChainFilters` | `CommunityFilters` | Component |
| 69 | "Failed to load layerz. Please try again." | "Failed to load communities. Please try again." | Error message |
| 73 | "No layerz found" | "No communities found" | Empty state |
| 81 | `/layerz/create` | `/communities/create` | Link path |
| 83 | "Create the first layerz" | "Create the first community" | Button text |
| 91-92 | `chains.map((chain) =>`, `ChainCard key={chain.id} chain={chain}` | `communities.map((community) =>`, `CommunityCard key={community.id} community={community}` | Map and component |

#### Semantic Changes:
- Update page title to emphasize travel communities
- Change filters to use travel-related categories
- Update empty states with travel-friendly messaging

---

### 4. **frontend/src/pages/CreateChainPage.tsx**

**Priority**: High
**Dependencies**: ChainForm, useCreateChain

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2 | `useCreateChain` | `useCreateCommunity` | Hook import |
| 3 | `ChainForm`, `ChainFormData` | `CommunityForm`, `CommunityFormData` | Component import |
| 10 | `CreateChainPage` | `CreateCommunityPage` | Function name |
| 13 | `createChainMutation` | `createCommunityMutation` | Variable |
| 20 | "You must be logged in to create a chain" | "You must be logged in to create a community" | Error message |
| 33 | "layerz created successfully!" | "Community created successfully!" | Toast message |
| 34 | `/layerz/${result.data.slug}` | `/communities/${result.data.slug}` | Navigation path |
| 36 | "Create layerz error:" | "Create community error:" | Console log |
| 37 | "Failed to create layerz" | "Failed to create community" | Error toast |
| 46 | `/layerz` | `/communities` | Link path |
| 48 | "Back to layerz" | "Back to communities" | Link text |
| 53 | "Create layerz" | "Create Community" | Page title |
| 55 | "Create a new collection to organize and showcase projects" | "Create a new travel community to connect with travelers and share experiences" | Description |
| 61 | `ChainForm` | `CommunityForm` | Component |

#### Semantic Changes:
- Update form description to emphasize travel community building
- Change success messaging to reflect community creation

---

### 5. **frontend/src/pages/EditChainPage.tsx**

**Priority**: High
**Dependencies**: ChainForm, useChain, useUpdateChain

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2 | `useChain`, `useUpdateChain` | Keep (updates in hooks file) | Hook imports |
| 3 | `ChainForm`, `ChainFormData` | `CommunityForm`, `CommunityFormData` | Component import |
| 10 | `EditChainPage` | `EditCommunityPage` | Function name |
| 15 | `chainData`, `isLoading`, `error` | `communityData`, `isLoading`, `error` | Variables |
| 16 | `updateChainMutation` | `updateCommunityMutation` | Variable |
| 18 | `chain` | `community` | Variable |
| 21 | `chain` | `community` | Variable |
| 35 | "layerz not found or failed to load" | "Community not found or failed to load" | Error message |
| 37 | `/layerz` | `/communities` | Link path |
| 39 | "Back to layerz" | "Back to communities" | Link text |
| 52 | "You don't have permission to edit this layerz" | "You don't have permission to edit this community" | Error message |
| 55 | `/layerz/${slug}` | `/communities/${slug}` | Link path |
| 55 | "View layerz" | "View Community" | Link text |
| 65 | "layerz updated successfully!" | "Community updated successfully!" | Toast message |
| 66 | `/layerz/${slug}` | `/communities/${slug}` | Navigation path |
| 68 | "Update layerz error:" | "Update community error:" | Console log |
| 69 | "Failed to update layerz" | "Failed to update community" | Error toast |
| 78 | `/layerz/${slug}` | `/communities/${slug}` | Link path |
| 80 | "Back to layerz" | "Back to communities" | Link text |
| 85 | "Edit layerz" | "Edit Community" | Page title |
| 87 | "Update your layerz's information and settings" | "Update your community's information and settings" | Description |
| 93-94 | `ChainForm`, `chain` | `CommunityForm`, `community` | Component and prop |

#### Semantic Changes:
- Update form to use travel-related terminology
- Change permission messaging to community context

---

### 6. **frontend/src/components/ChainBadge.tsx**

**Priority**: Medium
**Dependencies**: None (standalone component)

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 6 | `ChainBadgeProps` | `CommunityBadgeProps` | Interface name |
| 7 | `chain` | `community` | Property name |
| 18 | `ChainBadge` | `CommunityBadge` | Function name |
| 18 | `{ chain, size, showPin }` | `{ community, size, showPin }` | Props |
| 45 | `/layerz/${chain.slug}` | `/communities/${community.slug}` | Navigation path |
| 54 | `chain.logo_url` | `community.logo_url` | Property |
| 56-58 | `chain.name` | `community.name` | Properties |
| 62-66 | `chain.name` | `community.name` | Properties |
| 68 | `chain.name` | `community.name` | Property |
| 69-70 | `chain.is_pinned` | `community.is_pinned` | Property |

#### Semantic Changes:
- Component shows community badges throughout the app
- No semantic logic changes needed

---

### 7. **frontend/src/components/ChainCard.tsx**

**Priority**: High
**Dependencies**: None (standalone component)

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 3 | `Chain` | Keep type name | Type import |
| 8 | `chainApi` | `communityApi` | API import |
| 10 | `ChainCardProps` | `CommunityCardProps` | Interface name |
| 11 | `chain` | `community` | Property |
| 14 | `ChainCard` | `CommunityCard` | Function name |
| 14 | `{ chain }` | `{ community }` | Props |
| 18 | `['chain', chain.slug]` | `['community', community.slug]` | Query key |
| 20 | `chainApi.getChain(chain.slug)` | `communityApi.getCommunity(community.slug)` | API call |
| 26 | `['chainProjects', chain.slug, ...]` | `['communityItineraries', community.slug, ...]` | Query key |
| 27 | `chainApi.getChainProjects(chain.slug, ...)` | `communityApi.getCommunityItineraries(community.slug, ...)` | API call |
| 34 | `/layerz/${chain.slug}` | `/communities/${community.slug}` | Link path |
| 37-48 | `chain.banner_url`, `chain.name` | `community.banner_url`, `community.name` | Properties |
| 54-60 | `chain.logo_url`, `chain.name` | `community.logo_url`, `community.name` | Properties |
| 65-74 | `chain.name`, `chain.is_featured`, `chain.is_public` | `community.name`, `community.is_featured`, `community.is_public` | Properties |
| 79-80 | `chain.description` | `community.description` | Property |
| 84-96 | `chain.categories` | `community.categories` | Properties |
| 103-112 | `chain.project_count`, `chain.follower_count`, `chain.view_count` | `community.itinerary_count`, `community.follower_count`, `community.view_count` | Properties |
| 103 | "projects" | "itineraries" | Stat label |
| 116-119 | `chain.creator` | `community.creator` | Properties |

#### Semantic Changes:
- Update Folder icon (line 102) to maybe a Map or Globe icon for travel context
- Consider changing "projects" stat label to "itineraries"

---

### 8. **frontend/src/components/ChainCardSkeleton.tsx**

**Priority**: Low
**Dependencies**: None

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 4 | `ChainCardSkeleton` | `CommunityCardSkeleton` | Function name |
| 62 | `ChainCardSkeletonGrid` | `CommunityCardSkeletonGrid` | Function name |

#### Semantic Changes:
- No semantic changes needed (pure UI skeleton)

---

### 9. **frontend/src/components/ChainFilters.tsx**

**Priority**: High
**Dependencies**: None

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 7 | `ChainFiltersProps` | `CommunityFiltersProps` | Interface name |
| 18-29 | CATEGORIES array | Update to travel categories (see below) | Constants |
| 31 | `ChainFilters` | `CommunityFilters` | Function name |
| 47 | "Search layerz..." | "Search communities..." | Placeholder |
| 85 | "Most Projects" | "Most Itineraries" | Select item label |
| 86 | `<Folder className="h-4 w-4" />` | Consider Globe or Map icon | Icon |

#### Updated CATEGORIES (lines 18-29):

```typescript
const CATEGORIES = [
  'Adventure',
  'Beach & Coast',
  'City Breaks',
  'Cultural',
  'Family Travel',
  'Food & Wine',
  'Luxury',
  'Nature',
  'Road Trips',
  'Solo Travel',
  'Budget',
  'Backpacking',
];
```

#### Semantic Changes:
- Replace tech/project categories with travel styles and themes
- Update icon from Folder to travel-related icon

---

### 10. **frontend/src/components/ChainForm.tsx**

**Priority**: High
**Dependencies**: Chain type, chainSchema

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 4 | `chainSchema`, `ChainFormInput` | `communitySchema`, `CommunityFormInput` | Schema import |
| 5 | `Chain` | `Community` | Type import |
| 17 | `ChainFormProps` | `CommunityFormProps` | Interface name |
| 18 | `chain` | `community` | Property |
| 23 | `ChainFormData` | `CommunityFormData` | Interface name |
| 39-50 | AVAILABLE_CATEGORIES | Update to travel categories (see ChainFilters) | Constants |
| 52 | `ChainForm` | `CommunityForm` | Function name |
| 52 | `{ chain, onSubmit, isLoading }` | `{ community, onSubmit, isLoading }` | Props |
| 53-93 | `chain` variable | `community` variable | Throughout function |
| 67 | `chainSchema` | `communitySchema` | Resolver |
| 69-76 | `chain?.name`, `chain?.description`, etc. | `community?.name`, `community?.description`, etc. | Default values |
| 80-94 | `chain` | `community` | Conditional logic |
| 199 | "Provide essential details about your chain" | "Provide essential details about your community" | Card description |
| 206 | "Layerz Name" | "Community Name" | Label |
| 210 | "e.g., Web3 Builders" | "e.g., Digital Nomads in Bali" | Placeholder |
| 226 | "Describe what your chain is about..." | "Describe what your community is about..." | Placeholder |
| 238 | "Rules & Guidelines (Optional)" | "Community Guidelines (Optional)" | Label |
| 241 | "Set community guidelines and rules for your chain..." | "Set guidelines for your travel community..." | Placeholder |
| 250 | "These will be shown to users when they publish projects to this chain" | "These will be shown to members when they join your community" | Help text |
| 261 | "Upload banner and logo images for your chain" | "Upload banner and logo images for your community" | Card description |
| 387 | "Select categories that best describe your chain" | "Select categories that best describe your community" | Card description |
| 412 | "Add social media and external links for your chain" | "Add social media and external links for your community" | Card description |
| 456 | "Layerz Settings" | "Community Settings" | Card title |
| 466 | "Public layerz" | "Public Community" | Label |
| 474 | "Public layerz are visible to everyone. Private layerz are only visible to followers and the owner." | "Public communities are visible to everyone. Private communities are only visible to members and the owner." | Tooltip |
| 482 | "Make this chain visible to everyone" | "Make this community visible to everyone" | Help text |
| 503-506 | "When enabled, projects must be approved by you before they appear in this chain. Otherwise, projects are added instantly." | "When enabled, itineraries must be approved by you before they appear in this community. Otherwise, itineraries are added instantly." | Tooltip |
| 512 | "Manually approve projects before they appear in this chain" | "Manually approve itineraries before they appear in this community" | Help text |
| 530-533 | `chain ? 'Saving...' : 'Creating...'`, `chain ? 'Save Changes' : 'Create layerz'` | `community ? 'Saving...' : 'Creating...'`, `community ? 'Save Changes' : 'Create Community'` | Button text |

#### Semantic Changes:
- Update all form labels and help text to reflect travel communities
- Replace tech categories with travel categories
- Update approval messaging to reflect itinerary sharing instead of project publishing

---

### 11. **frontend/src/components/ChainHeader.tsx**

**Priority**: High
**Dependencies**: Chain type, useFollowChain, useUnfollowChain

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 1 | `Chain` | Keep type | Type import |
| 11 | `useFollowChain`, `useUnfollowChain` | Keep (updates in hooks) | Hook imports |
| 13 | `ChainHeaderProps` | `CommunityHeaderProps` | Interface name |
| 14 | `chain` | `community` | Property |
| 18 | `avg_proof_score` | `avg_trust_score` | Property |
| 22 | `ChainHeader` | `CommunityHeader` | Function name |
| 22 | `{ chain, stats }` | `{ community, stats }` | Props |
| 27-49 | `chain` variable | `community` variable | Throughout component |
| 36 | `chain.slug` | `community.slug` | Property |
| 38 | `chain.slug` | `community.slug` | Property |
| 46-52 | `chain.banner_url`, `chain.name` | `community.banner_url`, `community.name` | Properties |
| 58-66 | `chain.logo_url`, `chain.name` | `community.logo_url`, `community.name` | Properties |
| 72-87 | `chain.name`, `chain.is_featured`, `chain.is_public`, `chain.requires_approval` | `community.name`, `community.is_featured`, `community.is_public`, `community.requires_approval` | Properties |
| 94-106 | `chain.project_count`, `chain.follower_count`, `chain.view_count` | `community.itinerary_count`, `community.follower_count`, `community.view_count` | Properties |
| 95 | "projects" | "itineraries" | Label |
| 110-117 | `chain.categories` | `community.categories` | Properties |
| 124-159 | `chain.slug`, `chain.requires_approval` | `community.slug`, `community.requires_approval` | Properties |
| 146 | `/layerz/${chain.slug}/edit` | `/communities/${community.slug}/edit` | Link path |
| 153 | `/layerz/${chain.slug}/requests` | `/communities/${community.slug}/requests` | Link path |
| 165 | `chain.description` | `community.description` | Property |
| 169-194 | `chain.social_links` | `community.social_links` | Properties |
| 199-208 | `chain.creator` | `community.creator` | Properties |

#### Semantic Changes:
- Update stats labels to reflect travel context
- Change "projects" to "itineraries" in the stats display
- Update icon from Folder (line 93) to a travel-related icon

---

### 12. **frontend/src/components/ChainHeaderSkeleton.tsx**

**Priority**: Low
**Dependencies**: None

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 4 | `ChainHeaderSkeleton` | `CommunityHeaderSkeleton` | Function name |

#### Semantic Changes:
- No semantic changes needed (pure UI skeleton)

---

### 13. **frontend/src/components/ChainPostCard.tsx**

**Priority**: Medium
**Dependencies**: ChainPost type, useTogglePinPost, useToggleLockPost, useDeleteChainPost, useChainPostReplies

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2 | `ChainPost` | `CommunityPost` | Type import |
| 17 | `useTogglePinPost`, `useToggleLockPost`, `useDeleteChainPost`, `useChainPostReplies` | Keep (updates in hooks) | Hook imports |
| 24 | `ChainPostCardProps` | `CommunityPostCardProps` | Interface name |
| 25 | `chainSlug` | `communitySlug` | Property |
| 34 | `ChainPostCard` | `CommunityPostCard` | Function name |
| 35-42 | `chainSlug` | `communitySlug` | Props |
| 48-51 | `chainSlug` | `communitySlug` | Hook calls |
| 93 | "No discussions yet" | "No discussions yet" | No change |
| 93 | "Be the first to start a discussion in this chain!" | "Be the first to start a discussion in this community!" | Empty state |
| 238 | `chainSlug` | `communitySlug` | Prop |
| 254-261 | `chainSlug` | `communitySlug` | Component props |
| 278 | `chainSlug` | `communitySlug` | Prop |

#### Semantic Changes:
- Update discussion empty states to reflect travel community context
- No major logic changes needed

---

### 14. **frontend/src/components/ChainPostList.tsx**

**Priority**: Medium
**Dependencies**: ChainPostCard, useChainPosts

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2 | `ChainPostCard` | `CommunityPostCard` | Component import |
| 7 | `useChainPosts` | `useCommunityPosts` | Hook import |
| 9 | `ChainPostListProps` | `CommunityPostListProps` | Interface name |
| 10 | `chainSlug` | `communitySlug` | Property |
| 14 | `ChainPostList` | `CommunityPostList` | Function name |
| 14 | `{ chainSlug, isOwner }` | `{ communitySlug, isOwner }` | Props |
| 18-22 | `chainSlug` | `communitySlug` | Variable usage |
| 24 | `useChainPosts(chainSlug, ...)` | `useCommunityPosts(communitySlug, ...)` | Hook call |
| 98 | `ChainPostCard` | `CommunityPostCard` | Component |
| 98 | `chainSlug={chainSlug}` | `communitySlug={communitySlug}` | Prop |

#### Semantic Changes:
- No major semantic changes, just variable renaming

---

### 15. **frontend/src/components/ChainSelector.tsx**

**Priority**: High
**Dependencies**: useChains, useChainRecommendations, Chain type

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2 | `useChains`, `useChainRecommendations` | Keep (updates in hooks) | Hook imports |
| 3 | `Chain` | `Community` | Type import |
| 15 | `ChainSelectorProps` | `CommunitySelectorProps` | Interface name |
| 16 | `selectedChainIds` | `selectedCommunityIds` | Property |
| 19 | `projectCategories` | `itineraryTags` | Property |
| 22 | `ChainSelector` | `CommunitySelector` | Function name |
| 23-27 | `selectedChainIds`, `onSelectionChange`, `maxSelections`, `projectCategories` | `selectedCommunityIds`, `onSelectionChange`, `maxSelections`, `itineraryTags` | Props |
| 31-40 | `useChains`, `useChainRecommendations` | Keep | Hook calls |
| 38-40 | `projectCategories` | `itineraryTags` | Variable |
| 42-49 | `chains`, `recommendations`, `selectedChains` | `communities`, `recommendations`, `selectedCommunities` | Variables |
| 44 | `selectedChains` | `selectedCommunities` | Variable |
| 45 | `selectedChainIds` | `selectedCommunityIds` | Variable |
| 48-50 | `recommendations`, `selectedChainIds` | `recommendations`, `selectedCommunityIds` | Variables |
| 52 | `handleToggle`, `chainId` | `handleToggle`, `communityId` | Function and parameter |
| 53-58 | `selectedChainIds`, `chainId` | `selectedCommunityIds`, `communityId` | Variables |
| 63 | "Publish to layerz (Optional)" | "Share in Communities (Optional)" | Label |
| 70 | "Select up to {maxSelections} layerz to publish your project in. Some layerz may require approval from the layerz owner." | "Select up to {maxSelections} communities to share your itinerary in. Some communities may require approval from the community owner." | Tooltip |
| 76-104 | `selectedChains` | `selectedCommunities` | Variable |
| 78-103 | `chain` variable | `community` variable | Map iteration |
| 91-92 | `chain.requires_approval` | `community.requires_approval` | Property |
| 111 | "Add to layerz" | "Add to Communities" | Button text |
| 112 | `selectedChainIds.length` | `selectedCommunityIds.length` | Property |
| 120 | "Search layerz..." | "Search communities..." | Placeholder |
| 131 | "Loading layerz..." | "Loading communities..." | Loading text |
| 135 | "No layerz found" | "No communities found" | Empty state |
| 146-195 | `chain` variable | `community` variable | Suggested section |
| 205 | "All layerz" | "All Communities" | Section title |
| 208-257 | `chain` variable | `community` variable | All chains section |
| 265 | `/layerz/create` | `/communities/create` | Link path |
| 270 | "Create new layerz" | "Create new community" | Link text |
| 277 | "Maximum of {maxSelections} layerz reached" | "Maximum of {maxSelections} communities reached" | Message |
| 282-286 | `selectedChains`, "layerz" | `selectedCommunities`, "communities" | Approval message |

#### Semantic Changes:
- Update from "publishing projects to chains" to "sharing itineraries in communities"
- Change approval messaging to reflect community context
- Update recommendations to be based on travel style instead of tech categories

---

### 16. **frontend/src/components/AddProjectToChainDialog.tsx**

**Priority**: High
**Dependencies**: useUserProjects, useAddProjectToChain

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 3 | `useUserProjects` | `useUserItineraries` | Hook import |
| 4 | `useAddProjectToChain` | `useAddItineraryToCommunity` | Hook import |
| 24 | `AddProjectToChainDialogProps` | `AddItineraryToCommunityDialogProps` | Interface name |
| 27 | `chainSlug`, `chainName` | `communitySlug`, `communityName` | Properties |
| 32 | `AddProjectToChainDialog` | `AddItineraryToCommunityDialog` | Function name |
| 33-38 | `chainSlug`, `chainName` | `communitySlug`, `communityName` | Props |
| 41 | `selectedProjectId` | `selectedItineraryId` | Variable |
| 44 | `useUserProjects` | `useUserItineraries` | Hook call |
| 45 | `addProjectMutation` | `addItineraryMutation` | Variable |
| 47 | `projects`, `projectsData`, `projectsLoading` | `itineraries`, `itinerariesData`, `itinerariesLoading` | Variables |
| 48-50 | `filteredProjects`, `projects`, `project` | `filteredItineraries`, `itineraries`, `itinerary` | Variables |
| 52 | `selectedProject`, `projects`, `selectedProjectId` | `selectedItinerary`, `itineraries`, `selectedItineraryId` | Variables |
| 54-80 | `selectedProjectId`, `addProjectMutation` | `selectedItineraryId`, `addItineraryMutation` | Variables |
| 56 | "Please select a project" | "Please select an itinerary" | Error message |
| 61-65 | `slug: chainSlug`, `projectId: selectedProjectId` | `slug: communitySlug`, `itineraryId: selectedItineraryId` | API call |
| 68 | "Request submitted for approval!" | "Request submitted for approval!" | No change |
| 70 | "Project added to chain!" | "Itinerary added to community!" | Toast message |
| 73-76 | `selectedProjectId` | `selectedItineraryId` | Variables |
| 78 | "Add project error:" | "Add itinerary error:" | Console log |
| 87 | "Add Project to {chainName}" | "Add Itinerary to {communityName}" | Dialog title |
| 89-91 | "Select one of your published projects to submit for approval", "Select one of your published projects to add to this chain" | "Select one of your published itineraries to submit for approval", "Select one of your published itineraries to add to this community" | Dialog description |
| 100 | "Search your projects..." | "Search your itineraries..." | Placeholder |
| 113-173 | `filteredProjects`, `projectsLoading`, `project`, `selectedProjectId` | `filteredItineraries`, `itinerariesLoading`, `itinerary`, `selectedItineraryId` | Variables |
| 116 | "No projects found matching your search", "You have no published projects yet" | "No itineraries found matching your search", "You have no published itineraries yet" | Empty states |
| 124-171 | `project` variable | `itinerary` variable | Map iteration |
| 126-130 | `selectedProjectId === project.id` | `selectedItineraryId === itinerary.id` | Conditionals |
| 138-145 | `selectedProjectId === project.id` | `selectedItineraryId === itinerary.id` | Conditionals |
| 152-168 | `project.title`, `project.isFeatured`, `project.tagline` | `itinerary.title`, `itinerary.isFeatured`, `itinerary.tagline` | Properties |
| 165-167 | `getProjectScore(project)`, `project.voteCount`, `project.commentCount` | `getItineraryScore(itinerary)`, `itinerary.voteCount`, `itinerary.commentCount` | Properties |
| 178 | `selectedProjectId` | `selectedItineraryId` | Variable |
| 180-181 | "Message" | "Message" | No change |
| 186-188 | "Add a message for the chain owner", "Add a note about why this project fits this chain" | "Add a message for the community owner", "Add a note about why this itinerary fits this community" | Placeholders |
| 204 | `!selectedProjectId`, `addProjectMutation.isPending` | `!selectedItineraryId`, `addItineraryMutation.isPending` | Conditionals |
| 206-214 | `addProjectMutation.isPending` | `addItineraryMutation.isPending` | Variables and button text |
| 214 | "Add to layerz" | "Add to Community" | Button text |

#### Semantic Changes:
- Update from projects to itineraries throughout
- Change approval messaging from "chain owner" to "community owner"
- Update score display to reflect travel metrics instead of proof score

---

### 17. **frontend/src/hooks/useChains.ts**

**Priority**: High (affects all other files)
**Dependencies**: chainApi (which also needs updating)

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2 | `chainApi`, `CreateChainData` | `communityApi`, `CreateCommunityData` | Import |
| 3 | `ChainFilters` | `CommunityFilters` | Import |
| 11 | `useChains` | `useCommunities` | Function name |
| 11-16 | `ChainFilters`, `['chains', filters]`, `chainApi.getChains` | `CommunityFilters`, `['communities', filters]`, `communityApi.getCommunities` | Function body |
| 19 | `useChain` | `useCommunity` | Function name |
| 20-25 | `['chain', slug]`, `chainApi.getChain(slug)` | `['community', slug]`, `communityApi.getCommunity(slug)` | Function body |
| 28 | `useCreateChain` | `useCreateCommunity` | Function name |
| 31-40 | `CreateChainData`, `chainApi.createChain`, `['chains']`, "Chain created successfully!" | `CreateCommunityData`, `communityApi.createCommunity`, `['communities']`, "Community created successfully!" | Function body |
| 43 | `useUpdateChain` | `useUpdateCommunity` | Function name |
| 46-56 | `CreateChainData`, `chainApi.updateChain`, `['chain', slug]`, `['chains']`, "Chain updated successfully!" | `CreateCommunityData`, `communityApi.updateCommunity`, `['community', slug]`, `['communities']`, "Community updated successfully!" | Function body |
| 59 | `useDeleteChain` | `useDeleteCommunity` | Function name |
| 62-71 | `chainApi.deleteChain`, `['chains']`, "Chain deleted successfully" | `communityApi.deleteCommunity`, `['communities']`, "Community deleted successfully" | Function body |
| 78 | `useChainProjects` | `useCommunityItineraries` | Function name |
| 79-96 | `['chainProjects', slug, filters]`, `chainApi.getChainProjects`, `projects` | `['communityItineraries', slug, filters]`, `communityApi.getCommunityItineraries`, `itineraries` | Function body |
| 99 | `useAddProjectToChain` | `useAddItineraryToCommunity` | Function name |
| 102-119 | `{ slug, projectId, message }`, `chainApi.addProjectToChain`, `['chainProjects', variables.slug]`, `['chain', variables.slug]`, `['project', variables.projectId]`, "Project added to chain!" | `{ slug, itineraryId, message }`, `communityApi.addItineraryToCommunity`, `['communityItineraries', variables.slug]`, `['community', variables.slug]`, `['itinerary', variables.itineraryId]`, "Itinerary added to community!" | Function body |
| 122 | `useRemoveProjectFromChain` | `useRemoveItineraryFromCommunity` | Function name |
| 125-138 | `{ slug, projectId }`, `chainApi.removeProjectFromChain`, `['chainProjects', variables.slug]`, `['chain', variables.slug]`, `['project', variables.projectId]`, "Project removed from chain" | `{ slug, itineraryId }`, `communityApi.removeItineraryFromCommunity`, `['communityItineraries', variables.slug]`, `['community', variables.slug]`, `['itinerary', variables.itineraryId]`, "Itinerary removed from community" | Function body |
| 140 | `useTogglePinProject` | `useTogglePinItinerary` | Function name |
| 143-154 | `{ slug, projectId }`, `chainApi.togglePinProject`, `['chainProjects', variables.slug]` | `{ slug, itineraryId }`, `communityApi.togglePinItinerary`, `['communityItineraries', variables.slug]` | Function body |
| 160 | `useChainRequests` | `useCommunityRequests` | Function name |
| 161-166 | `['chainRequests', slug, status]`, `chainApi.getChainRequests` | `['communityRequests', slug, status]`, `communityApi.getCommunityRequests` | Function body |
| 169 | `useApproveRequest` | Keep | Function name |
| 172-184 | `chainApi.approveRequest`, `['chainRequests', variables.slug]`, `['chainProjects', variables.slug]`, `['chain', variables.slug]` | `communityApi.approveRequest`, `['communityRequests', variables.slug]`, `['communityItineraries', variables.slug]`, `['community', variables.slug]` | Function body |
| 187 | `useRejectRequest` | Keep | Function name |
| 190-200 | `chainApi.rejectRequest`, `['chainRequests', variables.slug]` | `communityApi.rejectRequest`, `['communityRequests', variables.slug]` | Function body |
| 207 | `useFollowChain` | `useFollowCommunity` | Function name |
| 210-220 | `chainApi.followChain`, `['chain', slug]`, `['chains']`, "Following chain!" | `communityApi.followCommunity`, `['community', slug]`, `['communities']`, "Following community!" | Function body |
| 223 | `useUnfollowChain` | `useUnfollowCommunity` | Function name |
| 226-236 | `chainApi.unfollowChain`, `['chain', slug]`, `['chains']`, "Unfollowed chain" | `communityApi.unfollowCommunity`, `['community', slug]`, `['communities']`, "Unfollowed community" | Function body |
| 239 | `useChainFollowers` | `useCommunityFollowers` | Function name |
| 240-245 | `['chainFollowers', slug, page, limit]`, `chainApi.getChainFollowers` | `['communityFollowers', slug, page, limit]`, `communityApi.getCommunityFollowers` | Function body |
| 252 | `useToggleFeatureChain` | `useToggleFeatureCommunity` | Function name |
| 255-265 | `chainApi.toggleFeatureChain`, `['chain', slug]`, `['chains']` | `communityApi.toggleFeatureCommunity`, `['community', slug]`, `['communities']` | Function body |
| 272 | `useUserOwnedChains` | `useUserOwnedCommunities` | Function name |
| 273-278 | `['userOwnedChains', userId]`, `chainApi.getChains` | `['userOwnedCommunities', userId]`, `communityApi.getCommunities` | Function body |
| 281 | `useUserFollowingChains` | `useUserFollowingCommunities` | Function name |
| 282-288 | `['userFollowingChains', userId, page, limit]`, `chainApi.getUserFollowingChains` | `['userFollowingCommunities', userId, page, limit]`, `communityApi.getUserFollowingCommunities` | Function body |
| 293 | `useChainAnalytics` | `useCommunityAnalytics` | Function name |
| 294-301 | `['chainAnalytics', slug]`, `chainApi.getChainAnalytics` | `['communityAnalytics', slug]`, `communityApi.getCommunityAnalytics` | Function body |
| 306 | `useChainRecommendations` | `useCommunityRecommendations` | Function name |
| 307-312 | `['chainRecommendations', categories]`, `chainApi.getChainRecommendations` | `['communityRecommendations', categories]`, `communityApi.getCommunityRecommendations` | Function body |

#### Semantic Changes:
- All query keys need to be updated from 'chain' to 'community' and 'project' to 'itinerary'
- Toast messages need to reflect community context instead of chain context
- Success/error messages should use travel-friendly language

---

### 18. **frontend/src/services/chainApi.ts**

**Priority**: High (affects all hooks)
**Dependencies**: types from ../types

#### Terminology Changes:

| Line(s) | Current | Replace With | Context |
|---------|---------|--------------|---------|
| 2-10 | `Chain`, `ChainFilters`, `ChainStats`, `ChainProjectRequest` | `Community`, `CommunityFilters`, `CommunityStats`, `CommunityItineraryRequest` | Type imports |
| 16 | `CreateChainData` | `CreateCommunityData` | Interface name |
| 32 | `chainApi` | `communityApi` | Export name |
| 33-36 | `createChain`, `CreateChainData`, `{ data: { chain: Chain } }`, `/chains` | `createCommunity`, `CreateCommunityData`, `{ data: { community: Community } }`, `/communities` | Function signature |
| 39-62 | `getChains`, `ChainFilters`, `chains: Chain[]`, `/chains` | `getCommunities`, `CommunityFilters`, `communities: Community[]`, `/communities` | Function signature |
| 65-73 | `getChain`, `chain: Chain`, `stats: ChainStats`, `/chains/${slug}` | `getCommunity`, `community: Community`, `stats: CommunityStats`, `/communities/${slug}` | Function signature |
| 76-79 | `updateChain`, `CreateChainData`, `{ data: { chain: Chain } }`, `/chains/${slug}` | `updateCommunity`, `CreateCommunityData`, `{ data: { community: Community } }`, `/communities/${slug}` | Function signature |
| 82-85 | `deleteChain`, `/chains/${slug}` | `deleteCommunity`, `/communities/${slug}` | Function signature |
| 92-101 | `addProjectToChain`, `project_id`, `/chains/${slug}/projects` | `addItineraryToCommunity`, `itinerary_id`, `/communities/${slug}/itineraries` | Function signature |
| 104-107 | `removeProjectFromChain`, `projectId`, `/chains/${slug}/projects/${projectId}` | `removeItineraryFromCommunity`, `itineraryId`, `/communities/${slug}/itineraries/${itineraryId}` | Function signature |
| 110-141 | `getChainProjects`, `projects: Project[]`, `/chains/${slug}/projects`, `tech_stack`, `min_proof_score` | `getCommunityItineraries`, `itineraries: Itinerary[]`, `/communities/${slug}/itineraries`, `travel_style`, `min_trust_score` | Function signature and filters |
| 144-147 | `togglePinProject`, `projectId`, `/chains/${slug}/projects/${projectId}/pin` | `togglePinItinerary`, `itineraryId`, `/communities/${slug}/itineraries/${itineraryId}/pin` | Function signature |
| 154-161 | `getChainRequests`, `ChainProjectRequest[]`, `/chains/${slug}/requests` | `getCommunityRequests`, `CommunityItineraryRequest[]`, `/communities/${slug}/requests` | Function signature |
| 164-167 | `approveRequest`, `/chains/${slug}/requests/${requestId}/approve` | `approveRequest`, `/communities/${slug}/requests/${requestId}/approve` | Function signature |
| 170-177 | `rejectRequest`, `/chains/${slug}/requests/${requestId}/reject` | `rejectRequest`, `/communities/${slug}/requests/${requestId}/reject` | Function signature |
| 184-187 | `followChain`, `/chains/${slug}/follow` | `followCommunity`, `/communities/${slug}/follow` | Function signature |
| 190-193 | `unfollowChain`, `/chains/${slug}/follow` | `unfollowCommunity`, `/communities/${slug}/follow` | Function signature |
| 196-216 | `getChainFollowers`, `/chains/${slug}/followers` | `getCommunityFollowers`, `/communities/${slug}/followers` | Function signature |
| 219-237 | `getUserFollowingChains`, `chains: Chain[]`, `/chains/user/${userId}/following` | `getUserFollowingCommunities`, `communities: Community[]`, `/communities/user/${userId}/following` | Function signature |
| 243-287 | `getChainAnalytics`, `total_projects`, `average_project_score`, `top_projects`, `proof_score`, `/chains/${slug}/analytics` | `getCommunityAnalytics`, `total_itineraries`, `average_itinerary_score`, `top_itineraries`, `trust_score`, `/communities/${slug}/analytics` | Function signature and response shape |
| 290-303 | `getChainRecommendations`, `chains: Chain[]`, `/chains/recommendations` | `getCommunityRecommendations`, `communities: Community[]`, `/communities/recommendations` | Function signature |
| 309-313 | `toggleFeatureChain`, `/chains/${slug}/feature` | `toggleFeatureCommunity`, `/communities/${slug}/feature` | Function signature |
| 316 | `export default chainApi` | `export default communityApi` | Export |

#### Semantic Changes:
- All endpoint paths need to be updated from `/chains` to `/communities`
- Project-related endpoints need to change to itinerary-related endpoints
- Filter parameters need to be updated (e.g., `tech_stack` → `travel_style`, `min_proof_score` → `min_trust_score`)
- Analytics response shape needs to reflect itinerary metrics instead of project metrics

---

## Refactoring Order (Dependency Tree)

Execute refactoring in this order to maintain working code:

### Phase 1: Types and Services (Bottom-up approach)
1. **frontend/src/types/index.ts** (or equivalent) - Update `Chain` → `Community`, `Project` → `Itinerary` types
2. **frontend/src/services/chainApi.ts** → **communityApi.ts** - Update API service layer
3. **frontend/src/hooks/useChains.ts** → **useCommunities.ts** - Update hooks layer

### Phase 2: Standalone Components (No dependencies)
4. **frontend/src/components/ChainCardSkeleton.tsx** → **CommunityCardSkeleton.tsx**
5. **frontend/src/components/ChainHeaderSkeleton.tsx** → **CommunityHeaderSkeleton.tsx**
6. **frontend/src/components/ChainBadge.tsx** → **CommunityBadge.tsx**

### Phase 3: Form and Filter Components
7. **frontend/src/components/ChainFilters.tsx** → **CommunityFilters.tsx**
8. **frontend/src/components/ChainForm.tsx** → **CommunityForm.tsx**

### Phase 4: Display Components
9. **frontend/src/components/ChainCard.tsx** → **CommunityCard.tsx**
10. **frontend/src/components/ChainHeader.tsx** → **CommunityHeader.tsx**

### Phase 5: Post/Discussion Components
11. **frontend/src/components/ChainPostCard.tsx** → **CommunityPostCard.tsx**
12. **frontend/src/components/ChainPostList.tsx** → **CommunityPostList.tsx**

### Phase 6: Selector and Dialog Components
13. **frontend/src/components/ChainSelector.tsx** → **CommunitySelector.tsx**
14. **frontend/src/components/AddProjectToChainDialog.tsx** → **AddItineraryToCommunityDialog.tsx**

### Phase 7: Pages (Top-level components)
15. **frontend/src/pages/CreateChainPage.tsx** → **CreateCommunityPage.tsx**
16. **frontend/src/pages/EditChainPage.tsx** → **EditCommunityPage.tsx**
17. **frontend/src/pages/ChainDetailPage.tsx** → **CommunityDetailPage.tsx**
18. **frontend/src/pages/ChainsListPage.tsx** → **CommunitiesListPage.tsx**
19. **frontend/src/pages/Leaderboard.tsx** - Update in place (keep filename)

### Phase 8: Routing and Navigation
20. Update routing configuration (e.g., `/layerz/*` → `/communities/*`)
21. Update navigation components and links throughout the app

---

## Special Cases and Logic Changes

### 1. **Categories/Tags Transformation**

**Current Tech Categories** (Zer0):
- Hackathon, DeFi, NFT, Gaming, AI/ML, Web3, Social, Tools, Education, Infrastructure

**New Travel Categories** (TripIt):
- Adventure, Beach & Coast, City Breaks, Cultural, Family Travel, Food & Wine, Luxury, Nature, Road Trips, Solo Travel, Budget, Backpacking

**Files Affected**:
- `ChainFilters.tsx` (lines 18-29)
- `ChainForm.tsx` (lines 39-50)

### 2. **Metrics and Scoring Transformation**

| Current Metric | New Metric | Context |
|----------------|------------|---------|
| Proof Score | Trust Score / Verification Level | User credibility |
| Builder Score | Traveler Rating | User reputation |
| Project Score | Itinerary Rating | Content quality |
| Tech Stack | Travel Style / Destination | Classification |
| Average Proof Score | Average Trust Score | Community analytics |

**Files Affected**:
- `ChainHeader.tsx` (line 18)
- `chainApi.ts` (analytics section, lines 243-287)
- `AddProjectToChainDialog.tsx` (score display, line 165)

### 3. **URL Path Transformations**

| Current Path | New Path |
|--------------|----------|
| `/layerz` | `/communities` |
| `/layerz/create` | `/communities/create` |
| `/layerz/:slug` | `/communities/:slug` |
| `/layerz/:slug/edit` | `/communities/:slug/edit` |
| `/layerz/:slug/analytics` | `/communities/:slug/analytics` |
| `/layerz/:slug/requests` | `/communities/:slug/requests` |
| `/project/:id` | `/itinerary/:id` |
| `/admin/chains` | `/admin/communities` |

### 4. **API Endpoint Transformations**

| Current Endpoint | New Endpoint |
|------------------|--------------|
| `/api/chains` | `/api/communities` |
| `/api/chains/:slug` | `/api/communities/:slug` |
| `/api/chains/:slug/projects` | `/api/communities/:slug/itineraries` |
| `/api/chains/:slug/follow` | `/api/communities/:slug/follow` |
| `/api/chains/:slug/analytics` | `/api/communities/:slug/analytics` |
| `/api/chains/:slug/requests` | `/api/communities/:slug/requests` |

### 5. **Query Key Transformations** (React Query)

| Current Query Key | New Query Key |
|-------------------|---------------|
| `['chains', ...]` | `['communities', ...]` |
| `['chain', slug]` | `['community', slug]` |
| `['chainProjects', slug]` | `['communityItineraries', slug]` |
| `['chainFollowers', slug]` | `['communityFollowers', slug]` |
| `['chainAnalytics', slug]` | `['communityAnalytics', slug]` |
| `['chainRecommendations', ...]` | `['communityRecommendations', ...]` |
| `['project', id]` | `['itinerary', id]` |
| `['userOwnedChains', userId]` | `['userOwnedCommunities', userId]` |

### 6. **Admin Actions Renaming**

| Current Action | New Action | Context |
|----------------|------------|---------|
| Ban Chain | Ban Community | Moderation |
| Suspend Chain | Suspend Community | Moderation |
| Feature Chain | Feature Community | Promotion |
| Delete Chain | Delete Community | Removal |

### 7. **Empty State Messages**

Update all empty states to reflect travel context:

| Current Message | New Message |
|-----------------|-------------|
| "No projects yet" | "No itineraries yet" |
| "Be the first to publish a project!" | "Be the first to share an itinerary!" |
| "No builders yet" | "No travelers yet" |
| "No layerz found" | "No communities found" |
| "Be the first to add a project to this chain!" | "Be the first to add an itinerary to this community!" |
| "Be the first to start a discussion in this chain!" | "Be the first to start a discussion in this community!" |

### 8. **Component Prop Name Changes**

Key prop renamings that cascade through components:

- `chain` → `community`
- `chainSlug` → `communitySlug`
- `chainName` → `communityName`
- `projectId` → `itineraryId`
- `selectedChainIds` → `selectedCommunityIds`
- `projectCategories` → `itineraryTags`

### 9. **Icon Considerations**

Consider updating icons to match travel context:

| Current Icon | Suggested Replacement |
|--------------|----------------------|
| Folder (projects count) | Map or Globe (itineraries) |
| Various tech-related icons | Travel-related icons (Plane, Compass, MapPin, etc.) |

---

## Post-Refactoring Checklist

After completing all refactoring:

- [ ] All files renamed from Chain* to Community*
- [ ] All URL paths updated from /layerz to /communities
- [ ] All API endpoints updated on backend to match new paths
- [ ] All React Query keys updated
- [ ] All TypeScript types updated (Chain → Community, Project → Itinerary)
- [ ] All empty states and user-facing messages updated
- [ ] All admin actions renamed
- [ ] Categories updated to travel categories
- [ ] Metrics renamed (Proof Score → Trust Score, etc.)
- [ ] Test all CRUD operations for communities
- [ ] Test all itinerary sharing to communities
- [ ] Test community following/unfollowing
- [ ] Test community analytics (if owner)
- [ ] Test community search and filters
- [ ] Test community posts/discussions
- [ ] Test approval workflow for restricted communities
- [ ] Test admin moderation actions
- [ ] Update any documentation or README files
- [ ] Clear local storage/cache if needed
- [ ] Verify no broken links or 404s
- [ ] Run linter and fix any issues
- [ ] Update any E2E or integration tests

---

## Backend Changes Required

This refactoring plan focuses on frontend, but backend changes are also required:

1. **Database**: Rename `chains` table to `communities`, `chain_projects` to `community_itineraries`
2. **API Routes**: Update all `/api/chains/*` routes to `/api/communities/*`
3. **Models**: Rename Chain model to Community, update relationships
4. **Controllers**: Update all chain controllers to community controllers
5. **Validators**: Update schema validators for community data
6. **Seeds/Migrations**: Update with travel categories instead of tech categories

---

## Risk Assessment

### High Risk Areas:
1. **API Endpoints**: Ensure backend is updated simultaneously or use API versioning
2. **Query Keys**: Must update all React Query invalidations to prevent stale data
3. **Type Safety**: TypeScript will catch most issues, but watch for `any` types
4. **Routing**: Must update all navigation and Link components

### Medium Risk Areas:
1. **Component Props**: Cascading prop changes across many components
2. **Empty States**: Easy to miss some user-facing messages
3. **Admin Features**: Less frequently used, easier to miss in testing

### Low Risk Areas:
1. **Skeleton Components**: Purely visual, no logic
2. **Icons**: Cosmetic changes
3. **Categories**: Well-contained to a few components

---

## Testing Strategy

### Unit Testing:
- Test each refactored component in isolation
- Verify prop changes are correctly typed
- Test all API calls with new endpoints

### Integration Testing:
- Test full flow: create community → add itinerary → view community
- Test approval workflow for restricted communities
- Test following/unfollowing communities
- Test community search and filtering

### E2E Testing:
- User journey: discover communities → join → share itinerary → participate in discussions
- Admin journey: create community → moderate → feature community
- Owner journey: create → manage requests → view analytics

### Manual Testing Checklist:
1. Browse communities list page
2. Search and filter communities
3. View community detail page
4. Join/leave a community
5. Share an itinerary to a community
6. Create a new community
7. Edit an existing community (as owner)
8. View community analytics (as owner)
9. Approve/reject itinerary requests (as owner)
10. Admin actions (ban, suspend, feature)

---

## Estimated Effort

**Total Estimated Time**: 12-16 hours

- Phase 1 (Types & Services): 2-3 hours
- Phase 2 (Standalone Components): 1 hour
- Phase 3 (Form & Filters): 2 hours
- Phase 4 (Display Components): 1.5 hours
- Phase 5 (Post Components): 1 hour
- Phase 6 (Selector & Dialog): 2 hours
- Phase 7 (Pages): 2-3 hours
- Phase 8 (Routing): 0.5 hours
- Testing & Bug Fixes: 2-3 hours

---

## Notes

- This is a comprehensive rename and rebrand, not just a terminology change
- The core functionality remains the same (collections/groups of content with social features)
- Travel categories should be reviewed with product/design team before implementation
- Consider creating a "legacy redirect" for old `/layerz` URLs if SEO is a concern
- Backend migration should be coordinated with frontend deployment
- Consider feature flags to roll out changes gradually

---

**Document Version**: 1.0
**Last Updated**: 2025-12-02
**Author**: Claude Code Analysis Agent
