# Chain Forum Feature - Complete Specification

## 📋 Table of Contents
1. [Feature Overview](#feature-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Permissions & Settings](#permissions--settings)
6. [UI/UX Specifications](#uiux-specifications)
7. [Implementation Plan](#implementation-plan)

---

## 1. Feature Overview

### Purpose
Add a community discussion forum to each chain where users can create posts, reply to discussions, and engage with chain content.

### Key Features
- **Rich Text Posts**: Full WYSIWYG editor with formatting (bold, italic, links, lists, etc.)
- **Image Support**: Up to 3 images per post/reply
- **Nested Replies**: Up to 2 levels of nesting (Post → Reply → Sub-reply)
- **Reactions**: Like/heart reactions on posts and replies
- **Pinned Posts**: Chain owners can pin up to 3 posts to the top
- **Moderation**: Chain owner controls who can post and moderate content
- **Notifications**: Real-time notifications for replies and reactions
- **Sorting & Filtering**: Sort by newest, trending, most replies, pinned first

---

## 2. Database Schema

### 2.1 ChainPost Model
```python
class ChainPost(db.Model):
    __tablename__ = 'chain_posts'

    # Primary Key
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))

    # Foreign Keys
    chain_id = db.Column(db.String(36), db.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    parent_post_id = db.Column(db.String(36), db.ForeignKey('chain_posts.id', ondelete='CASCADE'), nullable=True, index=True)

    # Content
    title = db.Column(db.String(200), nullable=True)  # Optional
    content = db.Column(db.Text, nullable=False)  # Rich text/HTML content
    images = db.Column(JSON, default=list)  # Array of image URLs (max 3)

    # Metadata
    is_pinned = db.Column(db.Boolean, default=False, index=True)
    pin_order = db.Column(db.Integer, nullable=True)  # 1, 2, or 3 for pinned posts
    reply_count = db.Column(db.Integer, default=0)
    reaction_count = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)

    # Soft Delete
    is_deleted = db.Column(db.Boolean, default=False, index=True)

    # Relationships
    chain = db.relationship('Chain', backref=db.backref('forum_posts', lazy='dynamic'))
    author = db.relationship('User', backref=db.backref('chain_posts', lazy='dynamic'))
    parent_post = db.relationship('ChainPost', remote_side=[id], backref=db.backref('replies', lazy='dynamic'))
    reactions = db.relationship('ChainPostReaction', backref='post', lazy='dynamic', cascade='all, delete-orphan')

    # Indexes
    __table_args__ = (
        db.Index('idx_chain_posts_chain_created', 'chain_id', 'created_at'),
        db.Index('idx_chain_posts_author', 'author_id', 'created_at'),
        db.Index('idx_chain_posts_parent', 'parent_post_id', 'created_at'),
    )
```

### 2.2 ChainPostReaction Model
```python
class ChainPostReaction(db.Model):
    __tablename__ = 'chain_post_reactions'

    # Primary Key
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))

    # Foreign Keys
    post_id = db.Column(db.String(36), db.ForeignKey('chain_posts.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Reaction Type
    reaction_type = db.Column(db.String(20), default='like')  # 'like', 'heart', etc.

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Unique Constraint: One reaction per user per post
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='uq_post_user_reaction'),
        db.Index('idx_post_reactions', 'post_id', 'user_id'),
    )
```

### 2.3 Chain Model Updates
```python
# Add to Chain model:
forum_enabled = db.Column(db.Boolean, default=True)
forum_post_permission = db.Column(db.String(20), default='anyone')  # 'anyone', 'followers', 'owner'
```

---

## 3. API Endpoints

### 3.1 Forum Posts Endpoints

#### GET /api/chains/:slug/forum
**Description**: Get all forum posts for a chain
**Auth**: Optional (public chains) / Required (private chains)
**Query Params**:
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `sort` (string): 'newest' | 'trending' | 'most_replies' | 'pinned_first'
- `parent_id` (string): Filter by parent post (get replies)

**Response**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "chain_id": "uuid",
        "author": {
          "id": "uuid",
          "username": "string",
          "display_name": "string",
          "avatar_url": "string"
        },
        "parent_post_id": null,
        "title": "string",
        "content": "html string",
        "images": ["url1", "url2"],
        "is_pinned": false,
        "pin_order": null,
        "reply_count": 5,
        "reaction_count": 12,
        "user_reaction": "like",
        "created_at": "iso8601",
        "updated_at": "iso8601",
        "edited_at": "iso8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### POST /api/chains/:slug/forum
**Description**: Create a new forum post
**Auth**: Required
**Body**:
```json
{
  "title": "string (optional)",
  "content": "html string",
  "images": ["url1", "url2", "url3"],
  "parent_post_id": "uuid (optional)"
}
```

**Validation**:
- Content required (min 10 chars)
- Max 3 images
- Parent post must exist (if provided)
- Max nesting depth of 2 levels
- User must have permission to post

**Response**: Created post object

#### GET /api/chains/:slug/forum/:post_id
**Description**: Get a specific forum post with replies
**Auth**: Optional
**Response**: Post object with nested replies (up to 2 levels)

#### PUT /api/chains/:slug/forum/:post_id
**Description**: Edit a forum post
**Auth**: Required (must be post author)
**Body**: Same as POST
**Validation**:
- User must be author
- Edit within 24 hours (configurable)

#### DELETE /api/chains/:slug/forum/:post_id
**Description**: Delete a forum post (soft delete)
**Auth**: Required (author or chain owner)
**Response**: Success message

#### POST /api/chains/:slug/forum/:post_id/pin
**Description**: Pin/unpin a post (toggle)
**Auth**: Required (chain owner only)
**Validation**:
- Max 3 pinned posts
- Only chain owner can pin

**Response**:
```json
{
  "success": true,
  "data": {
    "is_pinned": true,
    "pin_order": 1
  }
}
```

#### POST /api/chains/:slug/forum/:post_id/react
**Description**: Add/remove reaction to a post
**Auth**: Required
**Body**:
```json
{
  "reaction_type": "like"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reacted": true,
    "reaction_count": 13
  }
}
```

#### GET /api/chains/:slug/forum/:post_id/reactions
**Description**: Get users who reacted to a post
**Auth**: Optional
**Query Params**: `page`, `limit`

**Response**:
```json
{
  "success": true,
  "data": {
    "reactions": [
      {
        "user": {
          "id": "uuid",
          "username": "string",
          "avatar_url": "string"
        },
        "reaction_type": "like",
        "created_at": "iso8601"
      }
    ],
    "pagination": {...}
  }
}
```

### 3.2 Forum Settings Endpoints

#### PUT /api/chains/:slug/forum/settings
**Description**: Update forum settings
**Auth**: Required (chain owner)
**Body**:
```json
{
  "forum_enabled": true,
  "forum_post_permission": "anyone"
}
```

---

## 4. Frontend Components

### 4.1 Component Structure
```
components/
├── forum/
│   ├── ForumTab.tsx                    # Main forum container
│   ├── ForumPostList.tsx               # List of posts with sorting
│   ├── ForumPostCard.tsx               # Individual post card
│   ├── ForumPostModal.tsx              # Expanded post view with replies
│   ├── ForumPostEditor.tsx             # Rich text editor for creating/editing
│   ├── ForumReplySection.tsx           # Reply list and form
│   ├── ForumReactionButton.tsx         # Like/reaction button
│   ├── ForumImageGallery.tsx           # Image preview/gallery
│   ├── ForumPinnedPosts.tsx            # Pinned posts section
│   └── ForumEmptyState.tsx             # Empty state UI
```

### 4.2 Key Component Props

#### ForumTab
```typescript
interface ForumTabProps {
  chainSlug: string;
  chainOwnerId: string;
  forumEnabled: boolean;
  forumPostPermission: 'anyone' | 'followers' | 'owner';
}
```

#### ForumPostCard
```typescript
interface ForumPostCardProps {
  post: ForumPost;
  isChainOwner: boolean;
  onPostClick: (postId: string) => void;
  onReact: (postId: string) => void;
  onPin?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}
```

#### ForumPostEditor
```typescript
interface ForumPostEditorProps {
  chainSlug: string;
  parentPostId?: string;
  editingPost?: ForumPost;
  onSuccess: () => void;
  onCancel: () => void;
}
```

---

## 5. Permissions & Settings

### 5.1 Post Permissions

**Chain Owner Controls** (in chain settings):
- `anyone` - Anyone can post (default)
- `followers` - Only chain followers can post
- `owner` - Only chain owner can post

### 5.2 Action Permissions

| Action | Permission |
|--------|-----------|
| View posts | Public: Anyone, Private: Followers/Owner |
| Create post | Based on chain `forum_post_permission` |
| Edit own post | Author (within 24 hours) |
| Delete own post | Author (anytime) |
| Delete any post | Chain owner |
| Pin post | Chain owner only |
| React to post | Authenticated users |
| Reply to post | Same as create post |

### 5.3 Validation Rules

- **Content**: Min 10 characters, Max 10,000 characters
- **Title**: Optional, Max 200 characters
- **Images**: Max 3 per post, Max 10MB each
- **Reply Depth**: Max 2 levels (Post → Reply → Sub-reply)
- **Pinned Posts**: Max 3 per chain
- **Edit Time**: 24 hours after posting

---

## 6. UI/UX Specifications

### 6.1 Forum Tab Layout
```
┌─────────────────────────────────────────┐
│  Projects | About | Forum               │  ← Tabs
├─────────────────────────────────────────┤
│  Sort: [Newest ▼]  [Search]             │  ← Controls
├─────────────────────────────────────────┤
│  📌 PINNED POSTS                        │
│  ┌─────────────────────────────────┐   │
│  │ Post Card (Pinned)              │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  ALL POSTS                              │
│  ┌─────────────────────────────────┐   │
│  │ Post Card                       │   │
│  │ 💬 5 replies  ❤️ 12            │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Post Card                       │   │
│  └─────────────────────────────────┘   │
│                                  [+]    │  ← Floating button
└─────────────────────────────────────────┘
```

### 6.2 Post Card Design
```
┌──────────────────────────────────────────┐
│ 👤 @username • 2 hours ago        [📌][🗑] │  ← Author + Actions
├──────────────────────────────────────────┤
│ Post Title (if exists)                   │  ← Title (bold)
│                                          │
│ Content preview (first 200 chars)...    │  ← Content preview
│                                          │
│ [img] [img] [img]                       │  ← Image thumbnails
├──────────────────────────────────────────┤
│ ❤️ 12  💬 5 replies                     │  ← Engagement stats
└──────────────────────────────────────────┘
```

### 6.3 Expanded Post Modal
```
┌────────────────────────────────────────────┐
│  [X]                                       │  ← Close button
│                                            │
│  👤 @username • 2 hours ago          [•••] │  ← Author + Menu
│                                            │
│  Post Title                                │  ← Title
│                                            │
│  Full content with rich text formatting   │  ← Full content
│  - Bold, italic, links                    │
│  - Lists, quotes, etc.                    │
│                                            │
│  [Image Gallery]                           │  ← Images
│                                            │
│  ❤️ 12 reactions  [❤️ Like]               │  ← Reactions
│                                            │
├────────────────────────────────────────────┤
│  💬 5 REPLIES                              │  ← Reply section
│                                            │
│  ┌──────────────────────────────────┐     │
│  │ Reply 1                          │     │
│  │   ┌────────────────────────┐     │     │
│  │   │ Sub-reply 1            │     │     │  ← Nested reply
│  │   └────────────────────────┘     │     │
│  └──────────────────────────────────┘     │
│                                            │
│  [+ Write a reply...]                      │  ← Reply button
└────────────────────────────────────────────┘
```

### 6.4 Rich Text Editor
**Toolbar**:
- **Formatting**: Bold, Italic, Underline, Strikethrough
- **Structure**: Headings (H2, H3), Lists (Bullet, Numbered)
- **Insert**: Link, Image (max 3)
- **Alignment**: Left, Center, Right
- **Clear Formatting**

**Features**:
- Auto-save draft (localStorage)
- Character counter
- Image upload to IPFS
- Paste image from clipboard
- Link preview

### 6.5 Empty States

**No Posts**:
```
┌─────────────────────────────────┐
│         💬                      │
│   No discussions yet            │
│                                 │
│   Be the first to start a      │
│   conversation in this forum!  │
│                                 │
│     [Start Discussion]          │
└─────────────────────────────────┘
```

**No Replies**:
```
No replies yet. Be the first to reply!
```

---

## 7. Implementation Plan

### Phase 1: Backend Foundation
**Files to Create**:
1. `backend/models/chain_forum.py` - ChainPost, ChainPostReaction models
2. `backend/routes/chain_forum.py` - All forum API endpoints
3. `backend/migrations/xxx_add_chain_forum.py` - Database migration

**Database Migration**:
```python
# Create chain_posts table
# Create chain_post_reactions table
# Add forum columns to chains table
```

**Estimated Time**: 3-4 hours

### Phase 2: Backend Logic & Permissions
**Tasks**:
1. Implement post CRUD operations
2. Implement reply system with depth validation
3. Implement reactions system
4. Implement pin/unpin logic
5. Add permission checks
6. Add notification triggers

**Estimated Time**: 4-5 hours

### Phase 3: Frontend Components (Basic)
**Files to Create**:
1. `frontend/src/hooks/useChainForum.ts` - React Query hooks
2. `frontend/src/services/chainForumApi.ts` - API client
3. `frontend/src/components/forum/ForumTab.tsx` - Main container
4. `frontend/src/components/forum/ForumPostCard.tsx` - Post card
5. `frontend/src/components/forum/ForumPostList.tsx` - Post list

**Estimated Time**: 3-4 hours

### Phase 4: Rich Text Editor & Image Upload
**Tasks**:
1. Integrate TipTap or similar WYSIWYG editor
2. Implement image upload to IPFS
3. Add image preview/gallery
4. Create ForumPostEditor component

**Estimated Time**: 3-4 hours

### Phase 5: Advanced Features
**Tasks**:
1. Implement nested replies UI
2. Add reactions system
3. Add pin/unpin functionality
4. Add real-time notifications
5. Add sorting and filtering

**Estimated Time**: 4-5 hours

### Phase 6: Polish & Testing
**Tasks**:
1. Empty states
2. Loading states
3. Error handling
4. Responsive design
5. Performance optimization
6. End-to-end testing

**Estimated Time**: 2-3 hours

### Total Estimated Time: 19-25 hours

---

## 8. Technical Dependencies

### Backend
- Flask-SQLAlchemy (already installed)
- Marshmallow for validation (already installed)
- Socket.IO for real-time (already installed)

### Frontend
- **Rich Text Editor**: TipTap or Quill.js
  ```bash
  npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
  ```
- React Query (already installed)
- Axios (already installed)

---

## 9. Future Enhancements (Post-MVP)

1. **Rich Mentions**: @mention users with autocomplete
2. **Markdown Support**: Alternative to WYSIWYG
3. **Code Blocks**: Syntax highlighting for code snippets
4. **Polls**: Create polls in forum posts
5. **Post Templates**: Pre-defined templates for common post types
6. **Bookmarks**: Save favorite posts
7. **Post Reports**: Flag inappropriate content
8. **Moderation Tools**: Mute users, auto-moderation
9. **Analytics**: Track engagement metrics
10. **RSS Feed**: Subscribe to forum updates

---

## 10. Success Metrics

**Engagement Metrics**:
- Number of posts per chain
- Number of replies per post
- Reaction rate (reactions/views)
- Active contributors per chain
- Average time to first reply

**User Metrics**:
- % of chains with forum enabled
- % of users who create forum posts
- Daily/weekly active forum users
- User retention on chains with active forums

---

## Document Version: 1.0
**Created**: 2025-01-04
**Last Updated**: 2025-01-04
**Status**: Ready for Implementation

---

## Quick Reference

### Key Constraints
- Max nesting depth: 2 levels
- Max images per post: 3
- Max pinned posts: 3
- Edit time limit: 24 hours
- Content length: 10-10,000 chars

### Default Settings
- Forum enabled: `true`
- Post permission: `'anyone'`
- Sort order: `'pinned_first'` then `'newest'`
- Pagination: 20 posts per page

### Important Routes
- Forum tab: `/chains/:slug` (Forum tab)
- Direct post: `/chains/:slug/forum/:post_id`
- Create post: Floating + button
- View replies: Click on post card

---

**END OF SPECIFICATION**
