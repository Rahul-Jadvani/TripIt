# Travel Groups Components - Visual Guide

## Component Layout Reference

### 1. TravelGroupCard (Reusable Card)

```
┌─────────────────────────────────────────────┐
│  ⭐ Himalayan Trekkers     [Shield Icon]    │
│  📍 Manali, Himachal Pradesh    Score: 4.5  │
│                                             │
│  Join fellow adventurers for an epic...    │
│                                             │
│  📅 Mar 15 - Mar 25, 2024                   │
│                                             │
│  [Pink: Women Only] [Interest Based]        │
│  [Trekking] [Photography] [Adventure] [+2]  │
│                                             │
│  👤👤👤  5/10      [Join Group Button]       │
└─────────────────────────────────────────────┘
```

**States**:
- Join Button → "Join Group" (default)
- Join Button → "Pending" (yellow, after request)
- Join Button → "Leave" (outline, after joining)
- Join Button → "Full" (disabled, when capacity reached)
- Badge → "Organizer" (for group creator)
- Badge → "Featured" (⭐ for featured groups)

---

### 2. TravelGroupDiscovery (Browse Page)

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 Discover Travel Groups                 [Create Group] Button│
│  Find and join travel groups for your next adventure            │
│                                                                  │
│  🔍 [Search groups...]  [Filter by dest...]  [Sort: Newest ▼]  │
│  [Filters Button (3)]  ← Shows active filter count              │
│                                                                  │
│  ┌─ Advanced Filters (Collapsible) ────────────────────┐       │
│  │  Group Type: [Dropdown]                              │       │
│  │  Activities: [Trekking] [Food] [Culture] [+12 more] │       │
│  │  Quick Filters: [Women Safe Only] [Has Availability]│       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │  Card 1  │  │  Card 2  │  │  Card 3  │                     │
│  │          │  │          │  │          │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │  Card 4  │  │  Card 5  │  │  Card 6  │                     │
│  │          │  │          │  │          │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                  │
│         [Previous]  Page 1 of 5  [Next]                         │
└─────────────────────────────────────────────────────────────────┘
```

**No Results State**:
```
┌─────────────────────────────────────┐
│        👥 (Large Icon)              │
│                                     │
│      No groups found                │
│  Be the first to create a travel   │
│  group for this destination!        │
│                                     │
│      [Create Group Button]          │
└─────────────────────────────────────┘
```

---

### 3. TravelGroupForm (Create/Edit)

```
┌────────────────────────────────────────────────────────┐
│  Group Name *                                          │
│  [Enter group name (e.g., Himalayan Trekkers)]        │
│                                                        │
│  Description                                           │
│  [Describe your travel group...]                      │
│  [Multiple lines textarea]                            │
│                                                        │
│  Destination *                                         │
│  [e.g., Manali, Himachal Pradesh, India]             │
│                                                        │
│  📅 Start Date *        📅 End Date *                 │
│  [2024-03-15]           [2024-03-25]                  │
│                                                        │
│  Maximum Members * (2-50)                             │
│  [10]                                                  │
│                                                        │
│  Group Type *                                          │
│  ○ Interest Based                                      │
│    Connect with travelers who share your interests     │
│  ○ Safety Focused                                      │
│    Priority on safety and security during travel       │
│  ● Women Only                                          │
│    Exclusive group for women travelers                 │
│  ○ Location Based                                      │
│    Based on specific locations or regions              │
│                                                        │
│  Activity Tags * (Select at least one)                 │
│  [Trekking] [Photography] [Food] [Culture]            │
│  [Adventure] [Wildlife] [Beach] [+8 more]             │
│                                                        │
│  ┌───────────────────────────────────────────┐       │
│  │ ☐ Women Only Group                        │       │
│  │   Restrict group membership to women      │       │
│  │   travelers only for enhanced safety      │       │
│  └───────────────────────────────────────────┘       │
│                                                        │
│                        [Cancel]  [Create Group]        │
└────────────────────────────────────────────────────────┘
```

**Validation Errors**:
- Red border on invalid fields
- Error message below field: "End date must be after start date"
- Toast notification: "Please fix the form errors"

---

### 4. TravelGroupDetail (Full Page View)

```
┌───────────────────────────────────────────────────────────────┐
│  Himalayan Trekkers                                           │
│  📍 Manali, Himachal Pradesh                                  │
│  👤 Organized by @john_explorer                               │
│                                                               │
│               [Share] [Edit] [Delete]  [Join Group] Button    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Join fellow adventurers for an epic trek through... │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 📅 Dates │  │👥 Members│  │🛡️ Type   │  │⚠️ Status │   │
│  │          │  │          │  │          │  │          │   │
│  │ Mar 15 - │  │  5 / 10  │  │ Women    │  │ Active   │   │
│  │ Mar 25   │  │ ████▒▒▒▒ │  │ Only     │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  [Pink: Women Only] [Featured] [Trekking] [Photography] ...  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [Members (5)] [Activity] [Itineraries]               │   │
│  │─────────────────────────────────────────────────────│   │
│  │                                                       │   │
│  │  [Members Tab Content - See TravelGroupMembers]      │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

**Action Button States**:
- Non-member: [Join Group] (primary button)
- Pending: [⏰ Pending Approval] (disabled)
- Member: [Leave Group] (outline button)
- Full: [Group Full] (disabled)
- Creator: No join button, shows "Organizer" badge

---

### 5. TravelGroupMembers (Members Tab)

```
┌─────────────────────────────────────────────────────────┐
│  Manage Members                [Invite Members] Button  │
│  5 active members                                        │
│                                                          │
│  🛡️ Pending Approvals (2)                              │
│  ┌────────────────────────────────────────────────┐    │
│  │ 👤 @sarah_travels                              │    │
│  │    Requested Mar 1, 2024                       │    │
│  │                    [Approve]  [Decline]        │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 👤 @mike_adventure                             │    │
│  │    Requested Mar 2, 2024                       │    │
│  │                    [Approve]  [Decline]        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Active Members (5)                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │ 👤 @john_explorer                              │    │
│  │    [👑 Organizer]                              │    │
│  │    Joined Feb 15, 2024  ⭐ Reputation: 95      │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 👤 @alice_wanderer                       [⋮]   │    │
│  │    [🛡️ Moderator]                              │    │
│  │    Joined Feb 20, 2024  ⭐ Reputation: 82      │    │
│  │         ┌─────────────────────────┐            │    │
│  │         │ Make Organizer          │            │    │
│  │         │ Make Member             │            │    │
│  │         │ Remove Member (Red)     │            │    │
│  │         └─────────────────────────┘            │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 👤 @bob_explorer                         [⋮]   │    │
│  │    [Member]                                     │    │
│  │    Joined Feb 22, 2024  ⭐ Reputation: 78      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Role Management**:
- Only organizers see the [⋮] menu
- Creator cannot be modified
- Current user cannot modify themselves

---

### 6. TravelGroupInviteDialog (Modal)

```
┌──────────────────────────────────────────────────────────┐
│  Invite Members                                     [×]  │
│  Search for travelers by username or email and send      │
│  them an invite to join your group.                      │
│                                                          │
│  🔍 [Search by username or email...]    [Search] Button │
│                                                          │
│  ┌─ Selected Traveler ─────────────────────────────┐   │
│  │ 👤 @sarah_travels                              │   │
│  │    ⭐ Reputation: 88                             │   │
│  │             [📤 Send Invite]  [×]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Search Results (3)                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ┌────────────────────────────────────────────┐  │  │
│  │ │ 👤 @sarah_travels                          │  │  │
│  │ │    Adventure seeker and photographer       │  │  │
│  │ │    ⭐ Reputation: 88                        │  │  │
│  │ ├────────────────────────────────────────────┤  │  │
│  │ │ 👤 @mike_explorer    [Invited Badge]       │  │  │
│  │ │    Mountain lover                          │  │  │
│  │ │    ⭐ Reputation: 76                        │  │  │
│  │ └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ────────────────────────────────────────────────────── │
│                                                          │
│  ⏰ Pending Invites (2)                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ 👤 @alex_wanderer                        [×]   │    │
│  │    Invited Mar 1, 2024                         │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 👤 @emma_travels                         [×]   │    │
│  │    Invited Mar 2, 2024                         │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**Interaction Flow**:
1. User types in search box
2. Clicks [Search] button
3. Results appear in scrollable list
4. Click on a traveler to select (moves to "Selected Traveler" card)
5. Click [Send Invite] to send invitation
6. Invited user appears in "Pending Invites" section
7. Click [×] on pending invite to cancel

**States**:
- Empty search: "No travelers found matching 'query'"
- Already invited: Shows "Invited" badge, disabled click
- Pending invites: Cancellable with [×] button

---

## Color Coding & Icons

### Badges
- **Women Only**: Pink background (#ec4899/20), pink text (#be185d)
- **Featured**: Yellow background (#eab308/20), yellow text (#a16207)
- **Group Type**: Secondary variant (gray)
- **Activity Tags**: Outline variant (border only)
- **Role Badges**:
  - Organizer: Default variant (primary color) with Crown icon
  - Moderator: Default variant with Shield icon
  - Member: Secondary variant
  - Guest: Outline variant

### Status Indicators
- **Active**: Green background/text
- **Pending**: Yellow background/text
- **Full**: Red background/text (disabled button)
- **Inactive**: Gray background/text

### Icons (Lucide React)
- Users: 👥
- Calendar: 📅
- MapPin: 📍
- Shield: 🛡️
- Star: ⭐
- Search: 🔍
- Plus: ➕
- Edit: ✏️
- Trash: 🗑️
- Share: 📤
- Send: 📧
- Clock: ⏰
- Crown: 👑
- Award: 🏆
- AlertCircle: ⚠️
- CheckCircle: ✅
- XCircle: ❌
- MoreVertical: ⋮

---

## Responsive Breakpoints

### Mobile (< 640px)
- Discovery grid: 1 column
- Form: Full width inputs
- Detail page: Stacked layout
- Members list: Single column
- Dialog: Full screen height

### Tablet (640px - 1024px)
- Discovery grid: 2 columns
- Form: Same as mobile
- Detail page: 2-column info grid
- Members list: Single column with larger cards

### Desktop (> 1024px)
- Discovery grid: 3 columns
- Form: Max width 768px centered
- Detail page: 4-column info grid
- Members list: Single column with max width
- Dialog: 672px max width

---

## Animation & Transitions

All components use consistent transitions:
- **Hover effects**: 200ms ease-in-out
- **Button states**: 300ms scale and shadow transitions
- **Card hover**: Slight lift with shadow increase
- **Dialog open**: Fade in + zoom in animation
- **Loading states**: Pulse animation on skeletons
- **Progress bar**: Smooth width transitions

---

## Accessibility Features

✅ **Keyboard Navigation**: All interactive elements accessible via Tab
✅ **ARIA Labels**: Proper labels for screen readers
✅ **Focus States**: Visible focus rings on all focusable elements
✅ **Color Contrast**: WCAG AA compliant text contrast
✅ **Loading States**: Announces loading to screen readers
✅ **Error Messages**: Linked to form fields with aria-describedby
✅ **Dialog Management**: Proper focus trap and escape key handling

---

This visual guide provides a clear reference for how each component appears and behaves in the UI!
