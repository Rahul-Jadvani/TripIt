# Chain Forum Feature - Complete Implementation Guide

## Overview

A fully functional Reddit-style discussion forum has been added to Chains. Users can create discussion posts, reply with nested comments, upvote/downvote, and chain owners have moderation capabilities.

## Features Implemented

### ✅ Backend (Python/Flask/PostgreSQL)

#### Database Models
- **ChainPost**: Discussion posts with nested threading support
  - Fields: title, content, images, vote counts, timestamps
  - Support for pinning, locking, soft deletion
  - Activity tracking for hot/trending algorithms

- **ChainPostReaction**: Upvote/downvote system
  - One reaction per user per post
  - Automatic count updates via PostgreSQL triggers

#### API Endpoints
All endpoints under `/api/chains/:slug/posts`:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new post/reply | ✅ |
| GET | `/` | List all posts (top-level) | Optional |
| GET | `/:id` | Get single post with replies | Optional |
| GET | `/:id/replies` | Get paginated replies | Optional |
| PUT | `/:id` | Update post (author only) | ✅ |
| DELETE | `/:id` | Delete post (author/owner) | ✅ |
| POST | `/:id/react` | Upvote/downvote | ✅ |
| POST | `/:id/pin` | Pin/unpin post (owner only) | ✅ |
| POST | `/:id/lock` | Lock/unlock post (owner only) | ✅ |

#### Sorting Options
- **Hot**: Trending algorithm (upvotes + time decay)
- **New**: Most recent first
- **Top**: Highest upvoted
- **Active**: Most recently active (includes replies)

#### PostgreSQL Triggers
Automatic database triggers handle:
- Vote count increments/decrements
- Reply count updates (direct + total)
- Activity timestamp updates
- Parent post cascading updates

### ✅ Frontend (React/TypeScript/TanStack Query)

#### Components Created

1. **ChainPostCard** (`src/components/ChainPostCard.tsx`)
   - Main post display component
   - Shows author, timestamps, content, images
   - Vote buttons with optimistic updates
   - Edit/delete/pin/lock actions for owners
   - Nested reply display (expandable)
   - Markdown content rendering

2. **ChainPostList** (`src/components/ChainPostList.tsx`)
   - List view with sorting dropdown
   - Pagination support
   - Empty state handling

3. **CreatePostDialog** (`src/components/CreatePostDialog.tsx`)
   - Dialog for creating new top-level posts
   - Title + content fields
   - Image upload support (up to 4 images)
   - Markdown support hint

4. **EditPostDialog** (`src/components/EditPostDialog.tsx`)
   - Edit existing posts/replies
   - Preserves original structure
   - Validation and error handling

5. **ReplyForm** (`src/components/ReplyForm.tsx`)
   - Inline reply form component
   - Quick reply functionality
   - Cancel/submit actions

6. **MarkdownContent** (`src/components/MarkdownContent.tsx`)
   - Renders markdown with GFM (GitHub Flavored Markdown)
   - Sanitized HTML output
   - Custom styling for links, code blocks, quotes

#### Custom Hooks

**`src/hooks/useChainPosts.ts`**:
- `useChainPosts(slug, filters)` - Fetch posts list
- `useChainPost(slug, postId)` - Fetch single post
- `useChainPostReplies(slug, postId, filters)` - Fetch replies
- `useCreateChainPost(slug)` - Create post mutation
- `useUpdateChainPost(slug, postId)` - Update post mutation
- `useDeleteChainPost(slug)` - Delete post mutation
- `useReactToPost(slug)` - Upvote/downvote with optimistic updates
- `useTogglePinPost(slug)` - Pin/unpin mutation
- `useToggleLockPost(slug)` - Lock/unlock mutation

#### API Service

**`src/services/chainPostApi.ts`**:
Complete API client with typed responses

#### Type Definitions

**`src/types/index.ts`**:
```typescript
interface ChainPost {
  id: string;
  chain_id: string;
  author_id: string;
  parent_id?: string;
  title?: string;
  content: string;
  image_urls: string[];
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  total_replies: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  author?: User;
  chain?: Chain;
  user_reaction?: 'upvote' | 'downvote' | null;
  is_author?: boolean;
  replies?: ChainPost[];
}
```

### ✅ User Interface

#### Forum Tab in ChainDetailPage
Navigate to any chain and click the "Forum" tab to access discussions.

#### Features:
- **Create Post**: Click "New Discussion" button (authenticated users)
- **Sort Posts**: Dropdown to sort by Hot/New/Top/Active
- **Vote**: Click up/down arrows to vote
- **Reply**: Click "Reply" button to add a comment
- **Edit**: Authors can edit their own posts
- **Delete**: Authors and chain owners can delete posts
- **Pin**: Chain owners can pin important posts
- **Lock**: Chain owners can lock posts (prevents new replies)
- **Markdown**: Full markdown support in post content
- **Images**: Upload up to 4 images per post

## Usage Examples

### Creating a Post

```typescript
const { mutate } = useCreateChainPost('my-chain-slug');

mutate({
  title: 'Welcome to our chain!',
  content: 'This is a **markdown** formatted post',
  image_urls: ['ipfs://...'],
});
```

### Replying to a Post

```typescript
const { mutate } = useCreateChainPost('my-chain-slug');

mutate({
  parent_id: 'post-id-here',
  content: 'This is my reply!',
});
```

### Upvoting

```typescript
const { mutate } = useReactToPost('my-chain-slug');

mutate({
  postId: 'post-id',
  reactionType: 'upvote',
});
```

## Database Schema

### chain_posts table
```sql
CREATE TABLE chain_posts (
  id VARCHAR(36) PRIMARY KEY,
  chain_id VARCHAR(36) REFERENCES chains(id),
  author_id VARCHAR(36) REFERENCES users(id),
  parent_id VARCHAR(36) REFERENCES chain_posts(id),
  title VARCHAR(300),
  content TEXT NOT NULL,
  image_urls TEXT[],
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);
```

### chain_post_reactions table
```sql
CREATE TABLE chain_post_reactions (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) REFERENCES chain_posts(id),
  user_id VARCHAR(36) REFERENCES users(id),
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

## Performance Optimizations

1. **Optimistic UI Updates**: Votes update instantly before server confirmation
2. **Query Caching**: TanStack Query caches responses for 5 minutes
3. **Pagination**: All lists support pagination to handle large datasets
4. **Database Indexes**: Comprehensive indexes on common query patterns
5. **Triggers**: Automatic count updates via database triggers (no extra queries)

## Security Features

1. **Authentication**: All mutations require valid JWT token
2. **Authorization**: Users can only edit/delete their own posts
3. **Chain Owner Controls**: Special permissions for pinning/locking
4. **Markdown Sanitization**: rehype-sanitize prevents XSS attacks
5. **Input Validation**: Schema validation on both frontend and backend
6. **SQL Injection Protection**: SQLAlchemy ORM with parameterized queries

## Testing the Feature

### 1. Run Backend
```bash
cd backend
python app.py
```

### 2. Run Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Workflow
1. Navigate to any chain (e.g., `/chains/web3-builders`)
2. Click "Forum" tab
3. Click "New Discussion" to create a post
4. Add content with markdown: `**bold**, *italic*, [link](url)`
5. Upload images if desired
6. Submit and see it appear in the list
7. Click upvote/downvote to react
8. Click "Reply" to add a comment
9. Test sorting options (Hot/New/Top/Active)
10. As chain owner, test Pin and Lock features

## Troubleshooting

### Posts not appearing?
- Check backend console for errors
- Verify JWT token is valid
- Check chain status is 'active'

### Images not uploading?
- Ensure IPFS upload endpoint is working
- Check file size (max 10MB)
- Verify file type (PNG, JPG, GIF, WebP)

### Votes not updating?
- Check browser console for errors
- Verify user is authenticated
- Check optimistic update logic

## Future Enhancements (Optional)

- [ ] Rich text WYSIWYG editor
- [ ] Emoji reactions (beyond upvote/downvote)
- [ ] Real-time updates via Socket.IO
- [ ] Notifications for replies/mentions
- [ ] User mentions (@username)
- [ ] Search within discussions
- [ ] Moderation queue for reported posts
- [ ] Post flairs/tags
- [ ] Sorting by awards/gilding

## Files Modified/Created

### Backend
- ✅ `models/chain_post.py` (NEW)
- ✅ `routes/chain_posts.py` (NEW)
- ✅ `migrations/create_chain_posts.py` (NEW)
- ✅ `app.py` (MODIFIED - added imports and blueprint)
- ✅ `models/__init__.py` (MODIFIED - added exports)

### Frontend
- ✅ `components/ChainPostCard.tsx` (NEW)
- ✅ `components/ChainPostList.tsx` (NEW)
- ✅ `components/CreatePostDialog.tsx` (NEW)
- ✅ `components/EditPostDialog.tsx` (NEW)
- ✅ `components/ReplyForm.tsx` (NEW)
- ✅ `components/MarkdownContent.tsx` (NEW)
- ✅ `hooks/useChainPosts.ts` (NEW)
- ✅ `services/chainPostApi.ts` (NEW)
- ✅ `types/index.ts` (MODIFIED - added ChainPost types)
- ✅ `pages/ChainDetailPage.tsx` (MODIFIED - added forum tab)

### Dependencies
- ✅ `react-markdown` - Markdown rendering
- ✅ `remark-gfm` - GitHub Flavored Markdown
- ✅ `rehype-sanitize` - HTML sanitization

## Status: ✅ COMPLETE & PRODUCTION READY

All functionality has been implemented, tested, and is working seamlessly. The feature is ready for production use with no known bugs or issues.
