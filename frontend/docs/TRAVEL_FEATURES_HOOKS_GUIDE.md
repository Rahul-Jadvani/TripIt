# Travel Features React Query Hooks Guide

This guide covers all React Query hooks for TripIt's Travel Groups and Women's Safety features.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Travel Groups Hooks](#travel-groups-hooks)
3. [Women's Safety Hooks](#womens-safety-hooks)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

---

## Installation & Setup

All hooks are located in:
- `frontend/src/hooks/useTravelGroups.ts` - Travel Groups hooks
- `frontend/src/hooks/useWomenSafety.ts` - Women's Safety hooks
- `frontend/src/hooks/useTravelFeatures.ts` - Combined exports

### Import

```typescript
// Import individual hooks
import { useTravelGroups, useJoinTravelGroup } from '@/hooks/useTravelGroups';
import { useWomenGuides, useBookGuide } from '@/hooks/useWomenSafety';

// Or import from combined file
import { useTravelGroups, useWomenGuides } from '@/hooks/useTravelFeatures';
```

---

## Travel Groups Hooks

### 1. `useTravelGroups(filters?, page?)`

Lists all travel groups with filtering, sorting, and pagination.

**Parameters:**
- `filters?: TravelGroupFilters` - Optional filters
  - `search?: string` - Text search
  - `destination?: string` - Filter by destination
  - `type?: string` - Group type (interest_based, destination_based, activity_based, women_only)
  - `activity?: string[]` - Filter by activities
  - `women_safe?: boolean` - Women-only groups
  - `has_availability?: boolean` - Groups accepting new members
  - `sort?: string` - Sort order (newest, popular, starting_soon)
- `page?: number` - Page number (default: 1)

**Returns:**
- `data` - Groups data with pagination
- `isLoading` - Loading state
- `error` - Error object
- `refetch` - Manual refetch function

**Cache Strategy:**
- Stale time: 10 minutes
- GC time: 30 minutes
- No automatic refetch on focus/reconnect

**Example:**
```typescript
const { data, isLoading, error } = useTravelGroups({
  destination: 'Tokyo',
  activity: ['hiking', 'culture'],
  has_availability: true,
  sort: 'starting_soon'
}, 1);

if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;

const groups = data?.data?.groups || [];
const pagination = data?.data?.pagination;
```

---

### 2. `useInfiniteTravelGroups(filters?)`

Infinite scroll version of travel groups list.

**Parameters:**
- `filters?: TravelGroupFilters` - Same as `useTravelGroups`

**Returns:**
- `data` - Paginated groups data
- `fetchNextPage` - Load more function
- `hasNextPage` - Boolean indicating more pages
- `isFetchingNextPage` - Loading state for next page
- `isLoading` - Initial loading state
- `error` - Error object

**Example:**
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading
} = useInfiniteTravelGroups({
  women_safe: true,
  sort: 'popular'
});

// All pages combined
const allGroups = data?.pages.flatMap(page => page.data.groups) || [];

// Load more button
<button onClick={() => fetchNextPage()} disabled={!hasNextPage}>
  {isFetchingNextPage ? 'Loading...' : 'Load More'}
</button>
```

---

### 3. `useTravelGroup(groupId)`

Get single travel group with full details including members.

**Parameters:**
- `groupId: string` - Group ID

**Returns:**
- `data` - Group data including:
  - Basic info (name, destination, dates)
  - Members list
  - `is_member` - Whether current user is member
  - `user_role` - User's role (organizer, moderator, member, null)
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 5 minutes
- Refetch on mount if stale
- Refetch on window focus if stale

**Example:**
```typescript
const { data: group, isLoading } = useTravelGroup(groupId);

if (isLoading) return <Spinner />;

return (
  <div>
    <h1>{group?.name}</h1>
    <p>{group?.description}</p>
    <p>Members: {group?.current_members_count} / {group?.max_members}</p>
    {group?.is_member && <Badge>You're a member</Badge>}
    {group?.user_role === 'organizer' && <EditButton />}
  </div>
);
```

---

### 4. `useTravelGroupMembers(groupId, page?)`

Get members of a travel group with pagination.

**Parameters:**
- `groupId: string` - Group ID
- `page?: number` - Page number (default: 1)

**Returns:**
- `data` - Members data with pagination
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 5 minutes
- No automatic refetch

**Example:**
```typescript
const { data, isLoading } = useTravelGroupMembers(groupId, 1);

const members = data?.data?.members || [];

return (
  <div>
    {members.map(member => (
      <MemberCard
        key={member.id}
        name={member.traveler?.display_name}
        role={member.role}
        reputation={member.traveler?.traveler_reputation_score}
      />
    ))}
  </div>
);
```

---

### 5. `useMatchingTravelGroups(page?)`

Get personalized group matches based on user's preferences.

**Parameters:**
- `page?: number` - Page number (default: 1)

**Returns:**
- `data` - Matched groups with pagination
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 15 minutes (matches change slowly)
- No automatic refetch

**Example:**
```typescript
const { data, isLoading } = useMatchingTravelGroups();

const matches = data?.data?.matched_groups || [];

return (
  <section>
    <h2>Groups You Might Like</h2>
    {matches.map(group => (
      <GroupCard key={group.id} group={group} />
    ))}
  </section>
);
```

---

### 6. `useCreateTravelGroup()`

Create a new travel group.

**Returns:**
- `mutate(data)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Invalidates:**
- All `travel-groups` queries
- `travel-groups-matching` queries

**Example:**
```typescript
const createGroup = useCreateTravelGroup();

const handleSubmit = (formData) => {
  createGroup.mutate({
    name: formData.name,
    description: formData.description,
    destination: formData.destination,
    start_date: formData.startDate,
    end_date: formData.endDate,
    group_type: 'interest_based',
    max_members: 10,
    activity_tags: ['hiking', 'photography'],
    is_women_only: false,
    require_identity_verification: true
  });
};

<button onClick={handleSubmit} disabled={createGroup.isLoading}>
  {createGroup.isLoading ? 'Creating...' : 'Create Group'}
</button>
```

---

### 7. `useUpdateTravelGroup(groupId)`

Update an existing travel group (organizers only).

**Parameters:**
- `groupId: string` - Group ID

**Returns:**
- `mutate(data)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Invalidates:**
- Specific group query
- All `travel-groups` list queries

**Example:**
```typescript
const updateGroup = useUpdateTravelGroup(groupId);

const handleUpdate = () => {
  updateGroup.mutate({
    description: 'Updated description',
    max_members: 15,
    activity_tags: ['hiking', 'camping', 'photography']
  });
};
```

---

### 8. `useDeleteTravelGroup()`

Delete a travel group (soft delete, creator only).

**Returns:**
- `mutate(groupId)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Invalidates:**
- All `travel-groups` queries
- Specific group query

**Example:**
```typescript
const deleteGroup = useDeleteTravelGroup();

const handleDelete = () => {
  if (confirm('Are you sure?')) {
    deleteGroup.mutate(groupId);
  }
};

<button onClick={handleDelete} disabled={deleteGroup.isLoading}>
  Delete Group
</button>
```

---

### 9. `useJoinTravelGroup()`

Join a travel group.

**Returns:**
- `mutate(groupId)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Features:**
- **Optimistic updates** - UI updates instantly
- **Automatic rollback** on error
- Updates member count and membership status

**Invalidates:**
- Specific group query
- Group members query
- All `travel-groups` lists
- Matching groups

**Example:**
```typescript
const joinGroup = useJoinTravelGroup();

const handleJoin = () => {
  joinGroup.mutate(groupId);
};

<button onClick={handleJoin} disabled={joinGroup.isLoading}>
  {joinGroup.isLoading ? 'Joining...' : 'Join Group'}
</button>
```

---

### 10. `useLeaveTravelGroup()`

Leave a travel group.

**Returns:**
- `mutate(groupId)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Features:**
- **Optimistic updates**
- **Automatic rollback** on error
- Cannot leave if you're the creator

**Example:**
```typescript
const leaveGroup = useLeaveTravelGroup();

const handleLeave = () => {
  if (confirm('Are you sure you want to leave?')) {
    leaveGroup.mutate(groupId);
  }
};
```

---

### 11. `useInviteToTravelGroup(groupId)`

Invite a traveler to join the group (organizers/moderators only).

**Parameters:**
- `groupId: string` - Group ID

**Returns:**
- `mutate(travelerId)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Invalidates:**
- Group members query

**Example:**
```typescript
const inviteMember = useInviteToTravelGroup(groupId);

const handleInvite = (userId) => {
  inviteMember.mutate(userId);
};
```

---

## Women's Safety Hooks

### 12. `useWomenGuides(filters?, page?)`

List verified women travel guides with filtering.

**Parameters:**
- `filters?: WomenGuideFilters` - Optional filters
  - `search?: string` - Text search
  - `location?: string` - Service location
  - `specialization?: string` - Guide specialization
  - `language?: string` - Languages spoken
  - `min_rating?: number` - Minimum average rating
  - `verified_only?: boolean` - Only verified guides (default: true)
  - `available_only?: boolean` - Only available guides (default: true)
  - `featured?: boolean` - Featured guides only
- `page?: number` - Page number (default: 1)

**Returns:**
- `data` - Guides data with pagination
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 15 minutes
- No automatic refetch

**Example:**
```typescript
const { data, isLoading } = useWomenGuides({
  location: 'Tokyo',
  specialization: 'cultural_tours',
  language: 'english',
  min_rating: 4.0,
  available_only: true
}, 1);

const guides = data?.data?.guides || [];

return (
  <div className="guides-grid">
    {guides.map(guide => (
      <GuideCard
        key={guide.id}
        name={guide.traveler?.display_name}
        rating={guide.average_rating}
        reviews={guide.total_reviews}
        hourlyRate={guide.hourly_rate_usd}
        verified={guide.is_verified}
      />
    ))}
  </div>
);
```

---

### 13. `useInfiniteWomenGuides(filters?)`

Infinite scroll version of women guides list.

**Parameters:**
- `filters?: WomenGuideFilters` - Same as `useWomenGuides`

**Returns:**
- Standard infinite query returns

**Example:**
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteWomenGuides({
  location: 'Paris',
  verified_only: true
});

const allGuides = data?.pages.flatMap(page => page.data.guides) || [];
```

---

### 14. `useWomenGuide(guideId)`

Get single guide profile with full details and reviews.

**Parameters:**
- `guideId: string` - Guide ID

**Returns:**
- `data` - Guide data including:
  - Profile information
  - Reviews array
  - Availability status
  - `user_has_pending_booking` - Whether user has pending booking
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 10 minutes
- Refetch on mount and window focus if stale

**Example:**
```typescript
const { data: guide, isLoading } = useWomenGuide(guideId);

if (isLoading) return <Spinner />;

return (
  <div>
    <GuideProfile
      name={guide?.traveler?.display_name}
      bio={guide?.bio}
      rating={guide?.average_rating}
      reviews={guide?.total_reviews}
      locations={guide?.service_locations}
      specializations={guide?.specializations}
      languages={guide?.languages_spoken}
      verified={guide?.is_verified}
    />

    <ReviewsList reviews={guide?.reviews} />

    {guide?.user_has_pending_booking ? (
      <Alert>You have a pending booking with this guide</Alert>
    ) : (
      <BookButton guideId={guideId} />
    )}
  </div>
);
```

---

### 15. `useBookGuide()`

Book a women travel guide.

**Returns:**
- `mutate({ guideId, data })` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Invalidates:**
- Specific guide query
- All `women-guides` list queries

**Example:**
```typescript
const bookGuide = useBookGuide();

const handleBooking = (bookingData) => {
  bookGuide.mutate({
    guideId: guideId,
    data: {
      destination: 'Tokyo',
      start_date: '2024-03-01',
      end_date: '2024-03-05',
      group_size: 2,
      activity_type: 'cultural_tour',
      special_requirements: 'Vegetarian meals preferred',
      notes: 'Interested in traditional temples and gardens'
    }
  });
};

<BookingForm onSubmit={handleBooking} loading={bookGuide.isLoading} />
```

---

### 16. `useGuideReview(guideId)`

Submit a review for a guide after completing a booking.

**Parameters:**
- `guideId: string` - Guide ID

**Returns:**
- `mutate(data)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Features:**
- **Optimistic updates** - Review appears instantly
- **Rating recalculation** - Updates guide's average rating
- **Automatic rollback** on error

**Invalidates:**
- Specific guide query
- All `women-guides` list queries

**Example:**
```typescript
const submitReview = useGuideReview(guideId);

const handleSubmitReview = (formData) => {
  submitReview.mutate({
    rating: formData.overallRating,
    review_title: formData.title,
    review_text: formData.reviewText,
    safety_rating: formData.safetyRating,
    knowledge_rating: formData.knowledgeRating,
    communication_rating: formData.communicationRating,
    professionalism_rating: formData.professionalismRating,
    value_for_money_rating: formData.valueRating
  });
};

<ReviewForm onSubmit={handleSubmitReview} loading={submitReview.isLoading} />
```

---

### 17. `useSafetyResources(filters?, page?)`

List women safety tips, guides, and resources.

**Parameters:**
- `filters?: SafetyResourceFilters` - Optional filters
  - `category?: string` - Resource category (tips, emergency, legal, health, packing, cultural, navigation)
  - `region?: string` - Target region
  - `language?: string` - Resource language (default: 'en')
  - `featured?: boolean` - Featured resources only
- `page?: number` - Page number (default: 1)

**Returns:**
- `data` - Resources data with pagination and categories list
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 30 minutes (resources change rarely)
- GC time: 1 hour

**Example:**
```typescript
const { data, isLoading } = useSafetyResources({
  category: 'emergency',
  region: 'Southeast Asia',
  language: 'en'
}, 1);

const resources = data?.data?.resources || [];
const categories = data?.data?.categories || [];

return (
  <div>
    <CategoryTabs categories={categories} />

    <ResourcesList>
      {resources.map(resource => (
        <ResourceCard
          key={resource.id}
          title={resource.title}
          summary={resource.summary}
          content={resource.content}
          category={resource.category}
          helpful={resource.helpful_count}
          views={resource.view_count}
          featured={resource.is_featured}
          pinned={resource.is_pinned}
        />
      ))}
    </ResourcesList>
  </div>
);
```

---

### 18. `useMarkResourceHelpful(resourceId)`

Mark a safety resource as helpful.

**Parameters:**
- `resourceId: string` - Resource ID

**Returns:**
- `mutate()` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Features:**
- **Optimistic updates** - Count increments instantly
- **Automatic rollback** on error

**Example:**
```typescript
const markHelpful = useMarkResourceHelpful(resourceId);

<button onClick={() => markHelpful.mutate()}>
  Helpful ({helpfulCount})
</button>
```

---

### 19. `useWomenSafetySettings()`

Get current user's women safety settings.

**Returns:**
- `data` - Safety settings including:
  - `women_only_group_preference` - Prefer women-only groups
  - `location_sharing_enabled` - GPS tracking enabled
  - `emergency_contacts` - Emergency contact list
  - `insurance_provider` - Travel insurance info
- `isLoading` - Loading state
- `error` - Error object

**Cache Strategy:**
- Stale time: 1 hour (settings change rarely)
- GC time: 2 hours

**Example:**
```typescript
const { data: settings, isLoading } = useWomenSafetySettings();

if (isLoading) return <Spinner />;

return (
  <SettingsPanel>
    <Toggle
      label="Women-only groups preference"
      checked={settings?.women_only_group_preference}
    />
    <Toggle
      label="Location sharing"
      checked={settings?.location_sharing_enabled}
    />
    <EmergencyContactsList contacts={settings?.emergency_contacts} />
  </SettingsPanel>
);
```

---

### 20. `useUpdateWomenSafetySettings()`

Update women safety settings.

**Returns:**
- `mutate(data)` - Mutation function
- `isLoading` - Loading state
- `error` - Error object

**Features:**
- **Optimistic updates** - UI updates instantly
- **Automatic rollback** on error

**Invalidates:**
- `women-safety-settings` query

**Example:**
```typescript
const updateSettings = useUpdateWomenSafetySettings();

const handleUpdate = (newSettings) => {
  updateSettings.mutate({
    women_only_group_preference: newSettings.womenOnlyPreference,
    location_sharing_enabled: newSettings.locationSharing,
    emergency_contacts: [
      {
        name: newSettings.contact1Name,
        phone: newSettings.contact1Phone
      },
      {
        name: newSettings.contact2Name,
        phone: newSettings.contact2Phone
      }
    ],
    insurance_provider: newSettings.insuranceProvider
  });
};

<SettingsForm onSubmit={handleUpdate} loading={updateSettings.isLoading} />
```

---

## Usage Examples

### Complete Travel Groups Page

```typescript
import { useState } from 'react';
import {
  useTravelGroups,
  useJoinTravelGroup,
  type TravelGroupFilters
} from '@/hooks/useTravelGroups';

export function TravelGroupsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TravelGroupFilters>({
    sort: 'starting_soon',
    has_availability: true
  });

  const { data, isLoading, error } = useTravelGroups(filters, page);
  const joinGroup = useJoinTravelGroup();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  const groups = data?.data?.groups || [];
  const pagination = data?.data?.pagination;

  return (
    <div>
      <FilterPanel filters={filters} onChange={setFilters} />

      <GroupsGrid>
        {groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            onJoin={() => joinGroup.mutate(group.id)}
            joining={joinGroup.isLoading}
          />
        ))}
      </GroupsGrid>

      <Pagination
        current={page}
        total={pagination?.total_pages}
        onChange={setPage}
      />
    </div>
  );
}
```

---

### Complete Women Guides Page

```typescript
import {
  useWomenGuides,
  useWomenGuide,
  useBookGuide
} from '@/hooks/useWomenSafety';

export function WomenGuidesPage() {
  const [selectedGuideId, setSelectedGuideId] = useState(null);

  const { data: guidesList } = useWomenGuides({
    location: 'Tokyo',
    verified_only: true,
    available_only: true
  });

  const { data: selectedGuide } = useWomenGuide(selectedGuideId);
  const bookGuide = useBookGuide();

  const handleBook = (bookingData) => {
    bookGuide.mutate({
      guideId: selectedGuideId,
      data: bookingData
    });
  };

  return (
    <div className="guides-page">
      <GuidesListPanel
        guides={guidesList?.data?.guides}
        onSelect={setSelectedGuideId}
      />

      {selectedGuide && (
        <GuideDetailPanel
          guide={selectedGuide}
          onBook={handleBook}
          booking={bookGuide.isLoading}
        />
      )}
    </div>
  );
}
```

---

### Infinite Scroll Example

```typescript
import { useInfiniteTravelGroups } from '@/hooks/useTravelGroups';
import { useInView } from 'react-intersection-observer';

export function InfiniteGroupsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteTravelGroups({
    sort: 'popular'
  });

  const { ref, inView } = useInView();

  // Auto-load more when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage]);

  const allGroups = data?.pages.flatMap(page => page.data.groups) || [];

  return (
    <div>
      {allGroups.map(group => (
        <GroupCard key={group.id} group={group} />
      ))}

      {/* Sentinel element */}
      {hasNextPage && (
        <div ref={ref}>
          {isFetchingNextPage ? <Spinner /> : 'Load more'}
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Cache Management

```typescript
// Use appropriate stale times based on data volatility
// - Frequently changing data: 1-5 minutes
// - Moderate changes: 10-15 minutes
// - Rarely changing: 30-60 minutes

// Groups list (moderate)
useTravelGroups() // 10 min stale time

// Safety resources (rare)
useSafetyResources() // 30 min stale time
```

### 2. Optimistic Updates

```typescript
// Always use optimistic updates for instant UX
// Hooks that include optimistic updates:
// - useJoinTravelGroup
// - useLeaveTravelGroup
// - useGuideReview
// - useMarkResourceHelpful
// - useUpdateWomenSafetySettings

const joinGroup = useJoinTravelGroup();
// UI updates instantly, rolls back on error automatically
```

### 3. Error Handling

```typescript
const { data, isLoading, error } = useTravelGroups();

if (error) {
  // Errors are automatically toasted
  // Additional UI feedback:
  return (
    <ErrorBoundary
      error={error}
      onRetry={() => refetch()}
    />
  );
}
```

### 4. Loading States

```typescript
const createGroup = useCreateTravelGroup();

return (
  <button
    onClick={handleCreate}
    disabled={createGroup.isLoading}
  >
    {createGroup.isLoading ? (
      <>
        <Spinner size="sm" />
        Creating...
      </>
    ) : (
      'Create Group'
    )}
  </button>
);
```

### 5. Pagination

```typescript
// Use regular queries for cursor-based pagination
const [page, setPage] = useState(1);
const { data } = useTravelGroups(filters, page);

// Use infinite queries for infinite scroll
const { fetchNextPage, hasNextPage } = useInfiniteTravelGroups();
```

### 6. Type Safety

```typescript
// Import types for full type safety
import type {
  TravelGroup,
  CreateTravelGroupData,
  WomenGuide,
  BookGuideData
} from '@/hooks/useTravelFeatures';

const handleCreate = (data: CreateTravelGroupData) => {
  createGroup.mutate(data);
};
```

---

## API Endpoint Reference

All hooks use these backend endpoints:

### Travel Groups
- `GET /api/travel-groups` - List groups
- `GET /api/travel-groups/:id` - Get single group
- `POST /api/travel-groups` - Create group
- `PUT /api/travel-groups/:id` - Update group
- `DELETE /api/travel-groups/:id` - Delete group
- `POST /api/travel-groups/:id/join` - Join group
- `POST /api/travel-groups/:id/leave` - Leave group
- `GET /api/travel-groups/:id/members` - Get members
- `POST /api/travel-groups/:id/invite` - Invite member
- `GET /api/travel-groups/matching` - Get matches

### Women Safety
- `GET /api/women-safety/guides` - List guides
- `GET /api/women-safety/guides/:id` - Get guide
- `POST /api/women-safety/guides/:id/book` - Book guide
- `POST /api/women-safety/guides/:id/reviews` - Submit review
- `GET /api/women-safety/resources` - List resources
- `POST /api/women-safety/resources/:id/helpful` - Mark helpful
- `GET /api/women-safety/settings` - Get settings
- `PUT /api/women-safety/settings` - Update settings

---

## Support

For issues or questions:
1. Check backend API documentation: `backend/docs/QUICK_REFERENCE.md`
2. Review Postman collection: `backend/docs/TripIt_Postman_Collection.json`
3. Check existing hook patterns: `frontend/src/hooks/useProjects.ts`

---

**Last Updated:** 2025-12-02
**Version:** 1.0.0
