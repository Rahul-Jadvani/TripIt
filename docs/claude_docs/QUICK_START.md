# Quick Start Guide - Interactive Features

## ⚡ 5-Minute Overview

The 0x.ship frontend now has **fully functional interactive components** ready to use.

### What's Implemented

✅ **Voting System** - Upvote/downvote projects
✅ **Comments** - Post, delete, and vote on comments
✅ **Badges** - Award validation badges (admin only)
✅ **Wallet Connection** - MetaMask/WalletConnect integration
✅ **Intro Requests** - Connect with builders
✅ **Form Validation** - Type-safe with Zod schemas
✅ **Real-time Updates** - Powered by React Query

---

## 🚀 Getting Started

### 1. Setup Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_KAIA_KAIROS_RPC=https://public-en-kairos.node.kaia.io
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 2. Install & Run
```bash
npm install
npm run dev
```

### 3. Test Features
- **Voting**: Go to any project → click vote buttons
- **Comments**: Scroll to comments section → type & submit
- **Badges**: Login as admin → click "Award Badge"
- **Wallet**: Click "Connect Wallet" in navbar
- **Intros**: Go to project → click "Request Intro"

---

## 📦 File Locations

```
frontend/
├── src/
│   ├── services/
│   │   └── api.ts              # API client & service methods
│   ├── hooks/
│   │   ├── useProjects.ts
│   │   ├── useVotes.ts
│   │   ├── useComments.ts
│   │   ├── useBadges.ts
│   │   ├── useWallet.ts
│   │   ├── useIntros.ts
│   │   └── useSearch.ts
│   ├── components/
│   │   ├── VoteButtons.tsx
│   │   ├── CommentSection.tsx
│   │   ├── BadgeAwarder.tsx
│   │   ├── ConnectWallet.tsx
│   │   └── IntroRequest.tsx
│   ├── lib/
│   │   └── schemas.ts          # Zod validation schemas
│   └── pages/
│       ├── Publish.tsx         # ✅ Updated with validation
│       ├── ProjectDetail.tsx   # ✅ Updated with components
│
├── INTERACTIVE_FEATURES.md     # Full documentation
├── IMPLEMENTATION_SUMMARY.md   # What was built
└── QUICK_START.md              # This file
```

---

## 💻 Common Usage Examples

### Use Voting in a Component
```tsx
import { VoteButtons } from '@/components/VoteButtons';

<VoteButtons
  projectId={project.id}
  voteCount={project.voteCount}
  userVote={userVote}
/>
```

### Use Comments
```tsx
import { CommentSection } from '@/components/CommentSection';

<CommentSection projectId={project.id} />
```

### Use Badge Awarding (Admin Only)
```tsx
import { BadgeAwarder } from '@/components/BadgeAwarder';

<BadgeAwarder projectId={project.id} />
```

### Use Wallet Connection
```tsx
import { ConnectWallet } from '@/components/ConnectWallet';

<ConnectWallet />
```

### Use Form Validation
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publishProjectSchema } from '@/lib/schemas';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(publishProjectSchema),
});
```

---

## 🔌 API Endpoints Required

Your backend should implement these endpoints (see IMPLEMENTATION_SUMMARY.md for details):

**Essential**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/projects` with sort/pagination
- `GET /api/projects/:id`
- `POST /api/projects`

**Voting**
- `POST /api/projects/:id/upvote`
- `POST /api/projects/:id/downvote`
- `DELETE /api/projects/:id/vote`

**Comments**
- `GET /api/projects/:id/comments`
- `POST /api/projects/:id/comments`
- `DELETE /api/comments/:id`

**Badges**
- `POST /api/projects/:id/badges` (admin only)

**Wallet & Intros**
- `POST /api/blockchain/verify-cert`
- `POST /api/intros`

See IMPLEMENTATION_SUMMARY.md for the complete endpoint list.

---

## ✨ Key Features

### Real-Time Feedback
All actions show toast notifications:
```typescript
toast.success('Comment posted!');
toast.error('Failed to vote');
```

### Automatic State Management
React Query handles:
- Caching
- Auto-refetching
- Optimistic updates
- Loading/error states

### Type Safety
- TypeScript throughout
- Zod schema validation
- Inferred input types
- Full IDE autocomplete

### Authentication
- JWT token management
- Protected components
- Auto-redirect to login
- Request interceptors

---

## 🎯 Component Status

| Feature | Component | Status | Notes |
|---------|-----------|--------|-------|
| Voting | VoteButtons | ✅ Complete | Real-time updates |
| Comments | CommentSection | ✅ Complete | Full CRUD support |
| Badges | BadgeAwarder | ✅ Complete | Admin only |
| Wallet | ConnectWallet | ✅ Complete | Wagmi + 0xCerts |
| Intros | IntroRequest | ✅ Complete | With message validation |
| Forms | Publish Page | ✅ Complete | Zod + React Hook Form |

---

## 🚧 Page Implementation Status

| Page | Status | Features |
|------|--------|----------|
| ProjectDetail | ✅ Updated | Voting, comments, badges, intros |
| Publish | ✅ Updated | Form validation, tech stack |
| Navbar | ✅ Updated | Wallet connection, user menu |
| Feed | 🟡 Partial | Routing works, no fetching |
| Dashboard | 🟡 Partial | Routing works, stub content |
| MyProjects | 🟡 Partial | Routing works, stub content |
| Login | 🟡 Partial | Form exists, validation todo |
| Register | 🟡 Partial | Form exists, validation todo |
| Search | 🟡 Partial | Routing works, stub content |
| Leaderboard | 🟡 Partial | Routing works, stub content |

---

## 🔗 Integration Checklist

- [ ] Backend API endpoints implemented
- [ ] Environment variables configured
- [ ] WalletConnect project ID set
- [ ] 0xCerts contract deployed
- [ ] Database migrations run
- [ ] JWT token generation working
- [ ] CORS configured on backend
- [ ] Test all voting interactions
- [ ] Test all comment interactions
- [ ] Test wallet connection
- [ ] Test badge awarding
- [ ] Test intro requests

---

## 📚 Documentation

- **INTERACTIVE_FEATURES.md** - Complete feature guide with examples
- **IMPLEMENTATION_SUMMARY.md** - What was built and why
- **Component source files** - JSDoc comments in each file

---

## ❓ Common Questions

**Q: How do I add a new interactive feature?**
A: 1) Create hook in `src/hooks/`, 2) Create component in `src/components/`, 3) Use in pages

**Q: How do I test voting without a backend?**
A: Update `src/services/api.ts` to use mock data temporarily

**Q: How do I customize validation rules?**
A: Edit schemas in `src/lib/schemas.ts` (uses Zod)

**Q: Where are error messages displayed?**
A: Each form field shows errors below + toast notifications for actions

---

## 🆘 Troubleshooting

**Wallet connection not working?**
- Check WalletConnect project ID in `.env`
- Ensure MetaMask is installed
- Check browser console for errors

**Comments not loading?**
- Check API_URL in `.env`
- Verify backend `/api/projects/:id/comments` endpoint
- Check network tab in DevTools

**Form validation not showing?**
- Ensure Zod schema is imported correctly
- Check that `zodResolver` is passed to `useForm`

---

## 🎓 Architecture Highlights

- **React Query** for data fetching & caching
- **Zod** for type-safe validation
- **React Hook Form** for lightweight forms
- **Wagmi** for wallet connections
- **Shadcn/ui** for components
- **Sonner** for toast notifications

---

## 📞 Need Help?

1. Check component source files (they have JSDoc comments)
2. Read INTERACTIVE_FEATURES.md for detailed documentation
3. Review IMPLEMENTATION_SUMMARY.md for architecture overview
4. Check browser console for error messages

---

**Last Updated**: October 2025
**Status**: 🟢 Ready for Backend Integration
