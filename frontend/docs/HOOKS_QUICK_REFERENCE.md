# TripIt React Query Hooks - Quick Reference

## Travel Groups (12 hooks)

### Query Hooks
```typescript
// List groups with filters
useTravelGroups(filters?, page?)

// Infinite scroll
useInfiniteTravelGroups(filters?)

// Single group details
useTravelGroup(groupId)

// Group members
useTravelGroupMembers(groupId, page?)

// Personalized matches
useMatchingTravelGroups(page?)
```

### Mutation Hooks
```typescript
// Create group
useCreateTravelGroup()

// Update group
useUpdateTravelGroup(groupId)

// Delete group
useDeleteTravelGroup()

// Join group (optimistic)
useJoinTravelGroup()

// Leave group (optimistic)
useLeaveTravelGroup()

// Invite member
useInviteToTravelGroup(groupId)
```

---

## Women's Safety (9 hooks)

### Query Hooks
```typescript
// List guides
useWomenGuides(filters?, page?)

// Infinite scroll guides
useInfiniteWomenGuides(filters?)

// Single guide profile
useWomenGuide(guideId)

// Safety resources
useSafetyResources(filters?, page?)

// User safety settings
useWomenSafetySettings()
```

### Mutation Hooks
```typescript
// Book a guide
useBookGuide()

// Submit guide review (optimistic)
useGuideReview(guideId)

// Mark resource helpful (optimistic)
useMarkResourceHelpful(resourceId)

// Update safety settings (optimistic)
useUpdateWomenSafetySettings()
```

---

## Import Examples

```typescript
// Single import
import { useTravelGroups } from '@/hooks/useTravelGroups';
import { useWomenGuides } from '@/hooks/useWomenSafety';

// Combined import
import {
  useTravelGroups,
  useJoinTravelGroup,
  useWomenGuides,
  useBookGuide
} from '@/hooks/useTravelFeatures';
```

---

## Usage Examples

### List & Filter Groups
```typescript
const { data, isLoading } = useTravelGroups({
  destination: 'Tokyo',
  activity: ['hiking'],
  has_availability: true,
  sort: 'starting_soon'
}, 1);
```

### Join Group (Optimistic Update)
```typescript
const joinGroup = useJoinTravelGroup();
joinGroup.mutate(groupId);
```

### Create Group
```typescript
const createGroup = useCreateTravelGroup();
createGroup.mutate({
  name: 'Tokyo Hikers',
  destination: 'Tokyo',
  start_date: '2024-03-01',
  end_date: '2024-03-05',
  max_members: 10,
  activity_tags: ['hiking']
});
```

### List Women Guides
```typescript
const { data } = useWomenGuides({
  location: 'Tokyo',
  language: 'english',
  min_rating: 4.0,
  verified_only: true
});
```

### Book Guide
```typescript
const bookGuide = useBookGuide();
bookGuide.mutate({
  guideId: 'guide-123',
  data: {
    destination: 'Tokyo',
    start_date: '2024-03-01',
    end_date: '2024-03-05',
    group_size: 2
  }
});
```

### Submit Guide Review (Optimistic)
```typescript
const submitReview = useGuideReview(guideId);
submitReview.mutate({
  rating: 5,
  review_title: 'Amazing guide!',
  review_text: 'Very knowledgeable...',
  safety_rating: 5
});
```

---

## Cache Strategy Summary

| Hook | Stale Time | Notes |
|------|-----------|-------|
| useTravelGroups | 10 min | Moderate changes |
| useTravelGroup | 5 min | Refetch on mount |
| useMatchingTravelGroups | 15 min | Slow changes |
| useWomenGuides | 15 min | Guide availability |
| useWomenGuide | 10 min | Refetch on focus |
| useSafetyResources | 30 min | Rarely changes |
| useWomenSafetySettings | 1 hour | User settings |

---

## Optimistic Updates

These hooks update UI instantly and rollback on error:
- ✅ useJoinTravelGroup
- ✅ useLeaveTravelGroup
- ✅ useGuideReview
- ✅ useMarkResourceHelpful
- ✅ useUpdateWomenSafetySettings

---

## Files Location

```
frontend/src/hooks/
├── useTravelGroups.ts        # Travel groups hooks
├── useWomenSafety.ts          # Women's safety hooks
└── useTravelFeatures.ts       # Combined exports
```

---

## Full Documentation

See `TRAVEL_FEATURES_HOOKS_GUIDE.md` for complete documentation with examples.
