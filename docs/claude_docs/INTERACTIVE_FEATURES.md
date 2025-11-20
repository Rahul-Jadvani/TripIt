# 0x.ship Frontend - Interactive Features Guide

## Overview

This document describes the interactive features implemented in the 0x.ship frontend MVP.

## Implemented Interactive Features

### 1. **Voting System** (VoteButtons Component)
- **Location**: `src/components/VoteButtons.tsx`
- **Features**:
  - Upvote/downvote projects
  - Vote count display
  - Toggle vote state
  - Authentication protection (redirects to login if not signed in)
  - Real-time vote count updates via React Query

**Usage**:
```tsx
import { VoteButtons } from '@/components/VoteButtons';

<VoteButtons
  projectId="project-123"
  voteCount={234}
  userVote={0}
  onVoteChange={() => console.log('vote changed')}
/>
```

---

### 2. **Comments System** (CommentSection Component)
- **Location**: `src/components/CommentSection.tsx`
- **Features**:
  - Post new comments
  - Delete comments (own only)
  - Vote on comments
  - Nested replies (future)
  - Real-time comment updates
  - Authentication protection

**Usage**:
```tsx
import { CommentSection } from '@/components/CommentSection';

<CommentSection projectId="project-123" />
```

---

### 3. **Badge Awarding System** (BadgeAwarder Component)
- **Location**: `src/components/BadgeAwarder.tsx`
- **Features**:
  - Award Silver/Gold/Platinum badges
  - Admin-only functionality
  - Badge rationale (optional)
  - Real-time badge updates
  - Dialog-based UI

**Usage**:
```tsx
import { BadgeAwarder } from '@/components/BadgeAwarder';

<BadgeAwarder projectId="project-123" />
```

**Badge Points**:
- 🥈 Silver: 10 points
- 🥇 Gold: 15 points
- 💎 Platinum: 20 points

---

### 4. **Wallet Connection** (ConnectWallet Component)
- **Location**: `src/components/ConnectWallet.tsx`
- **Features**:
  - MetaMask/WalletConnect integration (via Wagmi)
  - 0xCerts verification
  - Display connected wallet address
  - Disconnect functionality
  - Real-time cert verification

**Usage**:
```tsx
import { ConnectWallet } from '@/components/ConnectWallet';

<ConnectWallet />
```

**Setup Required**:
1. Add Wagmi config to `src/config/wagmi.ts`
2. Set `VITE_WALLETCONNECT_PROJECT_ID` in `.env`
3. Wrap app with WagmiConfig provider

---

### 5. **Intro Request System** (IntroRequest Component)
- **Location**: `src/components/IntroRequest.tsx`
- **Features**:
  - Send intro requests to builders
  - Message validation (10-1000 chars)
  - Dialog-based UI
  - Authentication protection
  - Real-time request updates

**Usage**:
```tsx
import { IntroRequest } from '@/components/IntroRequest';

<IntroRequest projectId="project-123" builderId="builder-456" />
```

---

## API Service Layer

### Location
`src/services/api.ts`

### Available Services

#### Projects
```typescript
projectsService.getAll(sort, page)
projectsService.getById(id)
projectsService.create(data)
projectsService.update(id, data)
projectsService.delete(id)
projectsService.getByUser(userId)
```

#### Voting
```typescript
votesService.upvote(projectId)
votesService.downvote(projectId)
votesService.removeVote(projectId)
```

#### Comments
```typescript
commentsService.getByProject(projectId)
commentsService.create(projectId, data)
commentsService.update(commentId, data)
commentsService.delete(commentId)
commentsService.voteComment(commentId, voteType)
```

#### Badges
```typescript
badgesService.award(projectId, data)
badgesService.getByProject(projectId)
```

#### Wallet
```typescript
walletService.verifyCert(walletAddress)
walletService.connectWallet(userId, walletAddress)
```

#### Intros
```typescript
introsService.create(data)
introsService.getReceived()
introsService.getSent()
introsService.accept(id)
introsService.decline(id)
```

---

## Custom Hooks

All hooks support React Query features (caching, refetching, etc.)

### Projects Hooks
- `useProjects(sort, page)` - Fetch all projects
- `useProjectById(id)` - Fetch single project
- `useUserProjects(userId)` - Fetch user's projects
- `useCreateProject()` - Create new project mutation
- `useUpdateProject(projectId)` - Update project mutation
- `useDeleteProject()` - Delete project mutation

### Voting Hooks
- `useUpvote(projectId)` - Upvote mutation
- `useDownvote(projectId)` - Downvote mutation
- `useRemoveVote(projectId)` - Remove vote mutation

### Comments Hooks
- `useComments(projectId)` - Fetch comments query
- `useCreateComment(projectId)` - Create comment mutation
- `useUpdateComment(commentId, projectId)` - Update comment mutation
- `useDeleteComment(commentId, projectId)` - Delete comment mutation
- `useVoteComment(commentId, projectId)` - Vote on comment mutation

### Badge Hooks
- `useBadges(projectId)` - Fetch badges query
- `useAwardBadge(projectId)` - Award badge mutation

### Wallet & Auth Hooks
- `useVerifyCert()` - Verify 0xCerts mutation
- `useConnectWallet(userId)` - Connect wallet mutation
- `useUpdateProfile(userId)` - Update profile mutation

### Intro Hooks
- `useReceivedIntros()` - Fetch received intro requests
- `useSentIntros()` - Fetch sent intro requests
- `useCreateIntro()` - Create intro request mutation
- `useAcceptIntro()` - Accept intro mutation
- `useDeclineIntro()` - Decline intro mutation

### Search & Leaderboard Hooks
- `useSearch(query, type)` - Search query
- `useLeaderboardProjects(timeframe)` - Fetch projects leaderboard
- `useLeaderboardBuilders(timeframe)` - Fetch builders leaderboard
- `useLeaderboardFeatured()` - Fetch featured projects

---

## Form Validation Schemas

### Location
`src/lib/schemas.ts`

All schemas use Zod for type-safe validation.

### Available Schemas
- `loginSchema` - Login form validation
- `registerSchema` - Registration form validation
- `publishProjectSchema` - Project publishing validation
- `commentSchema` - Comment validation
- `badgeSchema` - Badge awarding validation
- `introRequestSchema` - Intro request validation
- `profileUpdateSchema` - Profile update validation

### Example Usage
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publishProjectSchema, PublishProjectInput } from '@/lib/schemas';

const { register, handleSubmit, formState: { errors } } = useForm<PublishProjectInput>({
  resolver: zodResolver(publishProjectSchema),
});
```

---

## Integrated Pages

### ProjectDetail Page (`src/pages/ProjectDetail.tsx`)
- ✅ Voting buttons
- ✅ Comments section
- ✅ Badge awarding (admin only)
- ✅ Intro requests
- ✅ Proof score display
- ✅ Author information

### Publish Page (`src/pages/Publish.tsx`)
- ✅ Form validation with Zod
- ✅ Tech stack management
- ✅ Error messages
- ✅ Loading states
- ✅ Navigation on success

### Navbar (`src/components/Navbar.tsx`)
- ✅ Wallet connection button
- ✅ Intros link
- ✅ User dropdown menu
- ✅ My Projects link
- ✅ Responsive design

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Blockchain Configuration
VITE_KAIA_KAIROS_RPC=https://public-en-kairos.node.kaia.io
VITE_KAIA_CHAIN_ID=1001

# 0xCerts Contract (Kaia Testnet)
VITE_OXCERTS_ADDRESS=0x...
VITE_OXCERTS_ABI=[]

# Wallet Connection
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Feature Flags
VITE_ENABLE_WALLET_CONNECTION=true
VITE_ENABLE_0XCERTS_VERIFICATION=true
VITE_ENABLE_COMMENTS=true
VITE_ENABLE_INTROS=true
VITE_ENABLE_BADGES=true
```

---

## Error Handling

All interactive components use `sonner` toast notifications for user feedback:

```typescript
import { toast } from 'sonner';

toast.success('Action successful!');
toast.error('Something went wrong');
toast.info('Information message');
```

---

## Next Steps / TODO

- [ ] Complete Login/Register page forms
- [ ] Implement Profile editing
- [ ] Implement Settings page
- [ ] Implement Dashboard with stats
- [ ] Implement MyProjects management
- [ ] Implement Intros management pages
- [ ] Implement Search with filters
- [ ] Implement Leaderboard display
- [ ] Add image upload for screenshots
- [ ] Add image upload for profile avatar
- [ ] Implement project edit functionality
- [ ] Add real-time notifications
- [ ] Add admin dashboard features
- [ ] Performance optimization (lazy loading, pagination)
- [ ] Add unit tests for hooks and components

---

## Testing the Features

### Test Voting
1. Navigate to any project detail page
2. Click upvote/downvote buttons
3. See vote count update in real-time

### Test Comments
1. Scroll to comments section
2. Login (if not already)
3. Type a comment and submit
4. See comment appear immediately

### Test Badge Awarding (Admin Only)
1. Login as admin user
2. Go to project detail
3. Click "Award Badge"
4. Select badge type and submit

### Test Wallet Connection
1. Click "Connect Wallet" in navbar
2. Select MetaMask or WalletConnect
3. Approve connection
4. Click "Verify 0xCerts"

### Test Intro Requests
1. Go to project detail
2. Click "Request Intro"
3. Add message
4. Submit
5. Check intros page

---

## Architecture Decisions

1. **React Query for Data Fetching**: Provides automatic caching, refetching, and state management
2. **Zod for Validation**: Type-safe schema validation with inference
3. **React Hook Form**: Lightweight form management with excellent DX
4. **Wagmi for Wallet**: Most popular Ethereum wallet connector
5. **Sonner for Toasts**: Beautiful, accessible toast notifications
6. **Custom Hooks Pattern**: Encapsulates API logic for reusability

---

## Support

For issues or questions about interactive features:
1. Check component documentation in source files
2. Review hook implementations in `src/hooks/`
3. Check API service definitions in `src/services/`

