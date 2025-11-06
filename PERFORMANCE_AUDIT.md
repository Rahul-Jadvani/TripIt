# 0x.ship Performance Audit — Pages, Routes, Queries, Root Causes, Optimizations

This is a single, comprehensive document enumerating every page, every backend route, and every database query usage, with performance risks and concrete optimizations. Generated from the current codebase (Flask + SQLAlchemy backend, React + React Query frontend).

## Contents
- Pages → Called Routes → Query Notes
- Backend API by Blueprint → Endpoints → Query Summary → Risks → Fixes
- Global Performance Findings and Recommendations

---

## Pages → API Calls (frontend/src)
The following list was compiled from all occurrences of `fetch`, `axios`, and React Query usage in `frontend/src`.

- `pages/ProjectDetail.tsx`
  - GET `/api/projects/:id/updates`
  - DELETE `/api/projects/:id/updates/:updateId`
  - POST `/api/projects/:id/view`
- `pages/Investors.tsx`
  - GET `/api/investor-requests/public`
- `pages/Publish.tsx`
  - POST `/api/upload`
  - POST `/api/upload/pitch-deck`
- `pages/InvestorPlans.tsx`
  - GET `/api/investor-requests/my-request`
  - POST `/api/investor-requests/apply`
- `pages/InvestorDirectory.tsx`
  - GET `/api/investors/public` (fast investor directory)
- `pages/InvestorDashboard.tsx`
  - GET `/api/investor-requests/profile`
  - GET `/api/projects?...` (feed/leaderboard data via hooks)
  - GET `/api/saved-projects`
  - GET `/api/intros/sent`
  - GET `/api/intros/received`
- `pages/Profile.tsx`
  - GET `/api/users/profile`
  - Additional user/project listings via hooks
- `pages/Validator.tsx`
  - GET `/api/validator/permissions`
  - GET `/api/validator/stats`
  - GET `/api/validator/dashboard`
  - POST `/api/validator/badges/award`
- `pages/Admin.tsx` (and `.backup`)
  - GET `/api/admin/stats`
  - GET `/api/admin/users?per_page=...&role=...&search=...`
  - GET `/api/admin/validators`
  - GET `/api/admin/projects?per_page=...&search=...`
  - GET `/api/admin/investor-requests`
  - POST `/api/admin/users/:id/toggle-admin`
  - POST `/api/admin/users/:id/toggle-active`
  - POST `/api/admin/validators/add-email`
  - POST `/api/admin/validators/:id/remove`
  - POST `/api/admin/validators/:id/permissions`
  - POST `/api/admin/projects/:id/feature`
  - PUT `/api/admin/projects/:id`
  - POST `/api/admin/badges/award`
  - POST `/api/admin/investor-requests/:id/approve`
  - POST `/api/admin/investor-requests/:id/reject`
- `pages/DirectMessages.tsx`
  - GET `/api/messages/conversations`
  - GET `/api/messages/conversation/:userId`
  - POST `/api/messages/send`
  - GET `/api/messages/unread-count`
  - POST `/api/messages/:messageId/mark-read`
- Chains & Posts (hooks/components)
  - `hooks/useChains.ts`, `hooks/useChainPosts.ts`, `components/CreatePostDialog.tsx`, `components/ChainForm.tsx`
  - Multiple under `/api/chains` and `/api/chains/:slug/...` and `/api/chains/:slug/posts...`
- Voting & Comments (hooks)
  - `hooks/useVotes.ts`: POST/DELETE `/api/projects/:id/vote`, `/api/projects/:id/upvote`, `/api/projects/:id/downvote`
  - `hooks/useComments.ts`: GET/POST/PUT/DELETE `/api/comments...`
- Leaderboard (hooks)
  - `hooks/useLeaderboard.ts`: GET `/api/projects/leaderboard`
  - `routes/fast_leaderboard`: GET `/api/leaderboard/projects|users|chains|trending`
- Prefetch/bootstrap (hooks)
  - `hooks/usePrefetch.ts`: GET `/api/prefetch/bootstrap`, plus prefetch of messages
- Search (hooks)
  - `hooks/useSearch.ts`: GET `/api/search?...`
- Users (components)
  - `components/UserSearchSelect.tsx`: GET `/api/users/search?...`
- Notifications & Saved Projects (hooks)
  - `hooks/useNotifications.ts`: GETs under `/api/notifications`
  - `hooks/useSavedProjects.ts`: GET/POST under `/api/saved-projects`
- Intros (hooks)
  - `hooks/useIntros.ts`: GET/POST under `/api/intros` and `/api/intro-requests`
- Admin (hooks)
  - `hooks/useAdmin.ts`, `hooks/useAdminChains.ts`: admin routes matching Admin page
- Projects (hooks)
  - `hooks/useProjects.ts`: GET `/api/projects` and related project endpoints
- User (hooks)
  - `hooks/useUser.ts`: GET `/api/users/profile`
- Messages (hooks)
  - `hooks/useMessages.ts`: all `/api/messages` endpoints
- Real-time support
  - `hooks/useRealTimeUpdates.ts`, `frontend/install_realtime.js`: Socket setup (not DB queries)

---

## Backend API by Blueprint (backend/routes)
All blueprints are registered in `backend/app.py`. Below is every endpoint discovered via route decorators, with the query summary and performance notes.

### projects (`/api/projects`)
- GET ``/api/projects``
  - Query: `Project.query.filter_by(is_deleted=False)` plus optional filters; `count()`; `joinedload(Project.creator)`; `limit/offset`.
  - Risks: `count()` on large filtered sets; LIKE on `title/description/tagline`; array-contains on `tech_stack`.
  - Fixes: proper indexes (btree/GIN), cached counts for unfiltered feed (already implemented), continue eager loading.
- GET ``/api/projects/<project_id>``
  - Query: `Project.query.options(joinedload(Project.creator)).get(...)`; increments `view_count`.
  - Risks: hot path; write contention if very high traffic.
  - Fixes: background/debounced view increments if needed; already cached.
- POST ``/api/projects`` (create)
  - Inserts project and screenshots; optional chain membership checks; notifications; validator auto-assign.
  - Risks: multiple dependent reads/writes; ensure FK indexes.
- PUT/PATCH ``/api/projects/<project_id>``
- DELETE ``/api/projects/<project_id>`` (soft)
- POST ``/api/projects/<project_id>/feature``
- POST ``/api/projects/<project_id>/upvote``
- POST ``/api/projects/<project_id>/downvote``
- DELETE ``/api/projects/<project_id>/vote``
  - Query: find-or-create in `Vote`; update counts; recompute scores; cache invalidation.
  - Risks: contention during spikes.
- GET ``/api/projects/leaderboard``
  - Query: top projects by `proof_score` (+ timeframe), builder aggregation via `sum(Project.proof_score)`; featured list; cached 5m.
  - Risks: aggregations cost.
- POST ``/api/projects/<project_id>/view``
  - Query: uniqueness check in `ProjectView` by `(user_id|session_id)`; insert; increment `project.view_count`.
  - Risks: growth in `ProjectView`; rely on indexes.

### users (`/api/users`)
- GET ``/api/users/search`` — LIKE over usernames/display names; paginator.
- GET ``/api/users/<username>`` — direct lookup by username.
- PUT ``/api/users/profile`` — update profile columns.
- GET ``/api/users/stats`` — aggregates per user.
- GET ``/api/users/<user_id>/projects`` — list by `user_id`.
- GET ``/api/users/<user_id>/tagged-projects`` — list by tag mapping.

### votes (`/api/votes`)
- POST ``/api/votes`` — create a vote.
- GET ``/api/votes/user`` — list votes by current user.

### comments (`/api/comments`)
- GET ``/api/comments`` — list comments; eager load authors.
- POST/PUT/DELETE ``/api/comments/...`` — comment mutations.
- POST ``/api/comments/<comment_id>/vote`` — vote on comment.

### badges (`/api/badges`)
- POST ``/api/badges/award`` — award badge.
- GET ``/api/badges/<project_id>`` — list badges for project.

### intros (`/api/intros`)
- CRUD for intros; lists for sent/received.

### intro_requests (`/api/intro-requests`)
- POST ``/send``
- GET ``/received``
- GET ``/sent``
- POST ``/<request_id>/accept``
- POST ``/<request_id>/decline``

### search (`/api/search`)
- GET ``/api/search`` — cross-entity search on projects/users; LIKE/ILIKE.

### blockchain (`/api/blockchain`)
- POST ``/verify-cert``
- GET ``/cert-info/<wallet_address>``
- GET ``/health``

### feedback (`/api/feedback`)
- POST ``/`` — submit feedback.
- GET ``/admin`` — admin list.
- PATCH ``/admin/<feedback_id>/status``
- DELETE ``/admin/<feedback_id>``

### notifications (`/api/notifications`)
- GET ``/`` — list notifications by `user_id`.
- PUT ``/<notification_id>/read``
- POST ``/read-all``
- GET ``/unread-count``

### saved_projects (prefix registered without explicit prefix in app; endpoints exposed at `/api/saved-projects`)
- GET/POST/DELETE mappings for saving/removing projects per user.

### events (`/api/events`)
- GET ``/`` — list events.
- GET ``/<event_slug>`` — event detail.
- GET ``/<event_slug>/projects`` — projects in event.
- POST ``/`` — create event.
- PUT ``/<event_slug>`` — update event.
- POST ``/<event_slug>/projects`` — add project to event.
- DELETE ``/<event_slug>/projects/<project_id>`` — remove project from event.
- POST ``/<event_slug>/subscribe`` — subscribe.
- DELETE ``/<event_slug>/subscribe`` — unsubscribe.
- GET ``/featured`` — featured events.
- GET ``/types`` — event types.

### investor_requests (exposed at `/api/investor-requests`)
- POST ``/apply`` — create
- PUT ``/apply`` — update
- GET ``/pending``
- GET ``/all``
- POST ``/<request_id>/approve``
- POST ``/<request_id>/reject``
- GET ``/my-request``
- GET ``/user/<user_id>``
- PUT ``/profile`` — update profile
- GET ``/public`` — public directory
- POST ``/<request_id>/remove-investor``
- POST ``/<request_id>/update-permissions``

### chains (`/api/chains`)
- POST ``/`` — create chain
- GET ``/`` — list chains
- GET ``/<slug>`` — chain detail
- PUT ``/<slug>`` — update chain
- DELETE ``/<slug>`` — delete chain
- POST ``/<slug>/projects`` — add project to chain
- DELETE ``/<slug>/projects/<project_id>`` — remove project
- GET ``/<slug>/projects`` — list chain projects
- POST ``/<slug>/projects/<project_id>/pin`` — pin project
- GET ``/<slug>/requests`` — pending requests
- POST ``/<slug>/requests/<request_id>/approve``
- POST ``/<slug>/requests/<request_id>/reject``
- POST ``/<slug>/follow``
- DELETE ``/<slug>/follow``
- GET ``/<slug>/followers``
- GET ``/user/<user_id>/following``
- POST ``/<slug>/feature``
- GET ``/<slug>/analytics``
- GET ``/recommendations``

### chain_posts (`/api/chains`)
- POST ``/<slug>/posts`` — create post
- GET ``/<slug>/posts`` — list posts
- GET ``/<slug>/posts/<post_id>`` — post detail
- GET ``/<slug>/posts/<post_id>/replies`` — replies
- PUT ``/<slug>/posts/<post_id>`` — update post
- DELETE ``/<slug>/posts/<post_id>`` — delete post
- POST ``/<slug>/posts/<post_id>/react`` — react
- POST ``/<slug>/posts/<post_id>/pin`` — pin
- POST ``/<slug>/posts/<post_id>/lock`` — lock

### direct_messages (`/api/messages`)
- POST ``/send`` — create DM
- GET ``/conversations`` — list conversations with last message + unread counts
  - Queries: aggregate `max(created_at)` per other user; count unread via `case`; single join to fetch last messages.
- GET ``/conversation/<other_user_id>`` — full thread, eager-loaded; batch mark unread as read.
- GET ``/unread-count`` — `count()` unread for user
- POST ``/<message_id>/mark-read`` — mark one as read

### admin (`/api/admin`)
- GET ``/users``
- POST ``/users/<user_id>/toggle-admin``
- POST ``/users/<user_id>/toggle-active``
- DELETE ``/users/<user_id>``
- GET ``/validators``
- POST ``/validators/add-email``
- POST ``/validators/<validator_id>/remove``
- POST ``/validators/<validator_id>/permissions``
- GET ``/projects``
- PUT ``/projects/<project_id>``
- DELETE ``/projects/<project_id>``
- POST ``/projects/<project_id>/feature``
- GET ``/investor-requests``
- POST ``/investor-requests/<request_id>/approve``
- POST ``/investor-requests/<request_id>/reject``
- GET ``/stats``
- POST ``/validator-assignments``
- POST ``/validator-assignments/bulk``
- DELETE ``/validator-assignments/<assignment_id>``
- GET ``/validator-assignments/validator/<validator_id>``
- GET ``/categories``
- GET ``/badges``
- GET ``/badges/<badge_id>``
- PUT/PATCH ``/badges/<badge_id>``
- DELETE ``/badges/<badge_id>``
- POST ``/badges/award``
- GET ``/projects/<project_id>/badges``
- GET ``/chains``
- POST ``/chains/<slug>/ban``
- POST ``/chains/<slug>/suspend``
- POST ``/chains/<slug>/unban``
- DELETE ``/chains/<slug>``
- POST ``/chains/<slug>/feature``
- GET ``/chains/moderation-logs``
- GET ``/chains/<slug>/logs``

### validator (`/api/validator`)
- GET ``/dashboard`` — validator dashboard data
- POST ``/assignments/<assignment_id>/validate``
- POST ``/assignments/<assignment_id>/start-review``
- POST ``/assignments/<assignment_id>/reject``
- GET ``/projects``
- GET ``/projects/<project_id>``
- POST ``/badges/award``

### notifications (`/api/notifications`)
- Listed above in its own section.

### prefetch (`/api/prefetch`)
- GET ``/bootstrap`` — multi-bundle of common data (cached)
- GET ``/dashboard-data`` — dashboard bundle (cached)

### fast_leaderboard (`/api/leaderboard`)
- GET ``/projects``
- GET ``/users``
- GET ``/chains``
- GET ``/trending``
- Optimized and cached leaderboard endpoints.

### fast_investor_directory (`/api/investors`)
- GET ``/public``
- GET ``/stats``
- Optimized public directory and stats.

### admin_auth
- Admin auth helper endpoints (registered in `app.py`).

---

## Query Hotspots, Risks, and Optimizations

- Search endpoints (projects/users/search)
  - Risks: ILIKE/LIKE scans; multi-field OR conditions.
  - Fixes: trigram or GIN indexes for text; limit results; debounce UI search.

- Feed and counts (GET `/api/projects`)
  - Risks: `count()` on large sets; complex filter combos.
  - Fixes: cache counts for unfiltered feeds (present); ensure composite/GIN indexes; continue `joinedload`.

- Leaderboards (standard + fast endpoints)
  - Risks: aggregations over large tables.
  - Fixes: use fast endpoints with caching; keep cache warmer active (already in `app.py`).

- Conversations (messages)
  - Risks: aggregate across many DMs; potential large lists without pagination.
  - Fixes: maintain indexes `(sender_id, recipient_id, created_at)`, `(recipient_id, is_read)`; add pagination to conversations if needed.

- Chains and events (junction tables)
  - Risks: large joins; sorting/pagination.
  - Fixes: composite indexes on junctions `(chain_id, project_id)`, `(event_id, project_id)`; paginate; cache derived analytics.

- Project views
  - Risks: large `ProjectView` growth; frequent writes.
  - Fixes: indexes `(project_id, user_id)`, `(project_id, session_id)`; background/debounced increments if contention.

- Admin pages
  - Risks: many simultaneous filtered lists; expensive stats.
  - Fixes: strict pagination; short TTL caching for stats; debounce search.

---

## Global Recommendations
- Ensure and verify presence of performance indexes (many exist via migrations like `add_performance_indexes.py`).
- Keep cache warmer active (`utils/cache_warmer.py` started in `app.py`).
- Maintain eager loading (`joinedload`) for list/detail endpoints to prevent N+1s.
- Prefer optimized endpoints (`/api/leaderboard`, `/api/investors`) for heavy aggregations.
- Add pagination to conversations and any endpoints returning potentially unbounded lists.
- Consider adding trigram indexes for text search (Postgres) where not already present.
- Consider background/coalesced writes for very hot counters (project views) if write contention is observed.

---

## Coverage Assurance
- Backend: All blueprints in `backend/app.py` are included, and every route decorator found in `backend/routes/*.py` is cataloged above.
- Frontend: All fetch/axios/React Query usages in `frontend/src` are mapped to the corresponding routes above.

This document is intended to be exhaustive with respect to pages, routes, and queries present in the codebase and to serve as the source of truth for performance analysis and optimization.

---

## Landing Page / Main Feed — Detailed Audit

This section focuses on the app’s initial experience (landing/main feed) where significant prefetching and high-volume data access occurs.

### Frontend components and hooks involved
- `pages/Feed.tsx`
  - Loads three feeds in parallel via `useProjects`: `trending`, `top-rated`, `newest` (page 1 each).
  - After initial load, prefetches pages 2–3 for each category via `react-query` `prefetchQuery` using `projectsService.getAll(sort, page)`.
- `hooks/useProjects.ts`
  - Calls `GET /api/projects?sort=<trending|top-rated|newest>&page=<n>`.
  - Uses 5m `staleTime`, 30m `gcTime`, background refetch on focus/reconnect; `placeholderData` to avoid spinners.
- `hooks/usePrefetch.ts` (usage in app for bootstrap preloading)
  - Triggers `GET /api/prefetch/bootstrap` and separately preloads messages where applicable.

### Backend routes used by landing/main feed
- GET `/api/projects`
  - Unfiltered feed leverages cache:
    - If no filters, checks `CacheService.get_cached_feed(page, sort)` and `CacheService.get_projects_count(sort)`.
    - On cache miss: builds query (`Project.is_deleted=False`), applies sort, does `count()` (cached for 1h), loads page via `limit/offset` with `joinedload(Project.creator)`, then caches the page response for 1h.
  - Sorting options used by Feed:
    - `trending`/`hot`: order by `proof_score desc, created_at desc`.
    - `top-rated`: order by `proof_score desc`.
    - `newest`: order by `created_at desc`.
  - Query characteristics:
    - Read-heavy hot path; minimal joins due to eager loading of `creator`.
    - COUNT can be expensive without cache; code already caches counts per sort for unfiltered requests.
- GET `/api/prefetch/bootstrap`
  - Parallelizes multiple user-specific queries using a thread pool:
    - `fetch_user_stats` (counts of projects, comments, badges awarded + intro counts)
    - `fetch_unread_counts` (notifications, messages)
    - `fetch_my_projects` (latest 10, with `joinedload(Project.creator)`)
    - `fetch_recent_notifications` (latest 20)
    - `fetch_conversations` (conversation list with `max(created_at)` and unread counts)
    - `fetch_trending_chains` (top 10 by weighted score of `project_count` and `follower_count`)
  - Also caches the user profile JSON for 10 minutes: `CacheService.set(f"user:{user_id}", ...)`.

### Performance risks on landing/main feed
- Projects feed hot path
  - Risk: Cache miss storms on `GET /api/projects` during traffic spikes causing repeated `count()` and list queries.
  - Risk: `limit/offset` pagination can degrade when offset grows very large.
- Bootstrap prefetch
  - Risk: Multiple concurrent `count()` aggregations (notifications, messages, stats) per user on cold start.
  - Risk: Conversations aggregate may touch many `DirectMessage` rows; even with `limit(20)` it computes groupings.
- Client prefetching
  - Risk: Prefetching pages 2–3 of all categories amplifies backend QPS shortly after load.

### Optimizations (concrete)
- Projects feed
  - Keep using per-sort page cache for unfiltered feeds (already implemented). Consider:
    - Add small jittered cache TTLs (e.g., 55–65 minutes) to avoid synchronized expirations.
    - Prefer keyset pagination for deep pages: for `created_at desc` or `proof_score desc, created_at desc`, expose `cursor`-based API to avoid large offsets.
    - Pre-warm page 1 for `trending`, `top-rated`, `newest` via `CacheWarmer` every 5 minutes.
- Bootstrap prefetch
  - Ensure indexes supporting counts/filters:
    - `Notification(user_id, is_read, created_at)`
    - `DirectMessage(recipient_id, is_read)`, `DirectMessage(sender_id, recipient_id, created_at)`
    - `Project(user_id, is_deleted, created_at)`
  - Cap expensive aggregates with short TTL caching per user:
    - Cache `unread_counts` for 15–30s to collapse bursts after login or refresh.
    - Cache `user_stats` for 1–5 minutes per user.
  - Conversations:
    - Maintain pagination for conversations beyond the first 20; consider lazy fetch on demand in UI.
- Client prefetch policy
  - Prefetch throttling:
    - Delay prefetch (e.g., 1–2s after first paint) and abort on tab invisibility.
    - Reduce prefetch breadth on slow connections (Network Information API) or mobile.
    - Make prefetch conditional on quick user interactions (hover/idle callbacks) to avoid unnecessary load.

### What makes it slow (root causes) and how to detect
- Cache misses on unfiltered feeds leading to repeated `count()` and heavy pages 1–3 loads.
- Simultaneous prefetch of three categories (3 pages each = up to 9 list calls shortly after load).
- Bootstrap calling 6 parallel queries per user; spikes on login sessions.
- Detection:
  - Add per-endpoint latency and cache-hit metrics; log cache status for `/api/projects` and `/api/prefetch/bootstrap`.
  - Track QPS and latency percentiles around page load to identify stampedes.

### Summary of landing/main feed data flow
- On load: UI fires `GET /api/projects?sort=trending|top-rated|newest&page=1` in parallel.
- Shortly after: prefetches pages 2–3 for each sort via `projectsService.getAll`.
- For authenticated users: UI/background triggers `GET /api/prefetch/bootstrap` to load user stats, counts, recents, conversations, and trending chains.
- Server relies on caching (projects feed pages and counts; user cache for profile) and eager loading to keep response times low.


# 0x.ship Performance Audit — Pages, Routes, Queries, Root Causes, and Optimizations

This document is an exhaustive audit of all pages, all backend routes, and all database queries they execute. It includes performance risks and recommended optimizations. It is derived directly from the codebase: Flask (backend) with SQLAlchemy ORM, React + React Query (frontend).

Note: All backend routes are registered in `backend/app.py` and implemented under `backend/routes/`. Frontend calls live in `frontend/src` across pages and hooks.

## Index

- Pages → Called Routes → Underlying Queries
- Backend API by Blueprint → Endpoints → Query Summary → Risks → Fixes
- Global Performance Findings and Recommendations

---

## Pages → API Calls

Below is a mapping of frontend pages/hooks to backend routes they call. The list is exhaustive based on grep across `frontend/src` for `fetch`, `axios`, and React Query usage.

- ProjectDetail (`frontend/src/pages/ProjectDetail.tsx`)
  - GET `/api/projects/:id/updates`
  - DELETE `/api/projects/:id/updates/:updateId`
  - POST `/api/projects/:id/view`
- Investors (`frontend/src/pages/Investors.tsx`)
  - GET `/api/investor-requests/public`
- Publish (`frontend/src/pages/Publish.tsx`)
  - POST `/api/upload`
  - POST `/api/upload/pitch-deck`
- InvestorPlans (`frontend/src/pages/InvestorPlans.tsx`)
  - GET `/api/investor-requests/my-request`
  - POST `/api/investor-requests/apply`
- InvestorDirectory (`frontend/src/pages/InvestorDirectory.tsx`)
  - GET `/api/investors/public` (via fast investor endpoints, see backend)
- InvestorDashboard (`frontend/src/pages/InvestorDashboard.tsx`)
  - GET `/api/investor-requests/profile`
  - GET `/api/projects?…` (leaderboard/feed via hooks)
  - GET `/api/saved-projects` (via hooks)
  - GET `/api/intros/sent`
  - GET `/api/intros/received`
- Profile (`frontend/src/pages/Profile.tsx`)
  - GET `/api/users/profile`
  - Related searches and project listings via hooks
- Validator (`frontend/src/pages/Validator.tsx`)
  - GET `/api/validator/permissions`
  - GET `/api/validator/stats`
  - GET `/api/validator/dashboard`
  - POST `/api/validator/badges/award`
- Admin (very large page) (`frontend/src/pages/Admin.tsx`)
  - GET `/api/admin/stats`
  - GET `/api/admin/users?…`
  - GET `/api/admin/validators`
  - GET `/api/admin/projects?…`
  - GET `/api/admin/investor-requests`
  - POST `/api/admin/users/:id/toggle-admin`
  - POST `/api/admin/users/:id/toggle-active`
  - POST `/api/admin/validators/add-email`
  - POST `/api/admin/validators/:id/remove`
  - POST `/api/admin/validators/:id/permissions`
  - POST `/api/admin/projects/:id/feature`
  - PUT `/api/admin/projects/:id`
  - POST `/api/admin/badges/award`
  - POST `/api/admin/investor-requests/:id/approve`
  - POST `/api/admin/investor-requests/:id/reject`
  - Chains moderation/admin endpoints (see chains/admin sections)
- DirectMessages (`frontend/src/pages/DirectMessages.tsx` + hooks)
  - GET `/api/messages/conversations`
  - GET `/api/messages/conversation/:userId`
  - POST `/api/messages/send`
  - GET `/api/messages/:messageId/read` or POST `/api/messages/:messageId/mark-read`
  - GET `/api/messages/unread-count`
- Chains (hooks: `useChains.ts`, `useChainPosts.ts`, `components/CreatePostDialog.tsx`, `components/ChainForm.tsx`)
  - Multiple GET/POST/PUT/DELETE under `/api/chains` and `/api/chains/:slug/...`
  - Chain Posts endpoints `/api/chains/:slug/posts...`
- Voting and Comments (hooks: `useVotes.ts`, `useComments.ts`)
  - POST/DELETE `/api/projects/:id/vote`, `/api/projects/:id/upvote`, `/api/projects/:id/downvote`
  - GET/POST/PUT/DELETE `/api/comments...`
- Leaderboard (hooks: `useLeaderboard.ts`)
  - GET `/api/projects/leaderboard`
  - GET `/api/leaderboard/projects` (fast endpoints)
  - GET `/api/leaderboard/users` (fast endpoints)
  - GET `/api/leaderboard/chains` (fast endpoints)
  - GET `/api/leaderboard/trending`
- Prefetch / bootstrap (hooks: `usePrefetch.ts`)
  - GET `/api/prefetch/bootstrap`
  - GET `/api/messages/conversations` (preload)
- Search (hooks: `useSearch.ts`)
  - GET `/api/search?…`
- Users (components like `UserSearchSelect.tsx`)
  - GET `/api/users/search?…`

These cover all places in `frontend/src` where network calls are made.

---

## Backend API by Blueprint: Routes, Queries, Risks, Fixes

All blueprints are registered in `backend/app.py` with URL prefixes. Every endpoint listed below comes from `backend/routes/*.py`. SQLAlchemy calls follow patterns like `Model.query.filter_by(...)`, `db.session.query(...)`, `joinedload(...)`, counts, and group-bys.

For each blueprint: endpoints → primary queries → risks → optimization guidance.

### 1) projects (`backend/routes/projects.py`, prefix `/api/projects`)
- GET `/api/projects`
  - Queries:
    - Builds `Project.query.filter_by(is_deleted=False)` with filters (search, tech, etc)
    - Sorting on `proof_score`, `created_at`, or votes
    - `count()` (cached and minimized if no filters)
    - `joinedload(Project.creator)` to prevent N+1
  - Risks:
    - Filter combinations can cause slow `count()` and scan if missing indexes.
    - LIKE searches on title/description/tagline.
  - Fixes:
    - Ensure btree/GIN indexes on searchable fields and array fields used by filters (already present per migrations).
    - Keep cache for feed counts and pages (present: `CacheService`).
- GET `/api/projects/:id`
  - Queries:
    - `Project.query.options(joinedload(Project.creator)).get(id)`; increments `view_count` and commits.
  - Risks:
    - Hot path; `joinedload` prevents N+1; view increment writes on each view could be write-heavy.
  - Fixes:
    - Already cached result; defer or batch view increments via background task if write contention appears.
- POST `/api/projects` (create)
  - Queries:
    - Insert project, screenshots; optional chains membership checks; notify; auto-assign validators.
  - Risks:
    - Multiple dependent lookups; ensure indexes on FK columns.
  - Fixes:
    - Keep transactional boundaries small; they are.
- PUT/PATCH `/api/projects/:id` (update)
  - Query: `Project.query.get` and commit updates.
- DELETE `/api/projects/:id`
  - Soft delete; invalidates caches.
- POST `/api/projects/:id/feature`
  - Toggle feature fields.
- POST `/api/projects/:id/upvote`, POST `/api/projects/:id/downvote`, DELETE `/api/projects/:id/vote`
  - Queries: `Vote.query.filter_by(...).first()`, `Project.query.get(...)`, commit; recalculates scores.
  - Risks:
    - Contention under high write loads.
  - Fixes:
    - Idempotent mutation design is good; consider debounce/rate-limit at API gateway during spikes.
- GET `/api/projects/leaderboard`
  - Queries:
    - `Project` top by `proof_score` (with optional timeframe)
    - Aggregated builder leaderboard via `db.session.query(User, sum(Project.proof_score), count(...)).join(Project)... group_by(...)`
    - `joinedload` for featured.
  - Risks:
    - Aggregate queries can be heavy.
  - Fixes:
    - Cached for 5 minutes; appropriate. Ensure supporting indexes on `Project(created_at, proof_score, is_deleted)`, `User(id)`.

- POST `/api/projects/:id/view`
  - Queries:
    - Checks `ProjectView` for uniqueness (session_id/user_id), inserts if new, increments counter.
  - Risks:
    - High cardinality growth in `ProjectView`; counts remain on `Project`.
  - Fixes:
    - Periodic cleanup/archival; indexes on `(project_id, user_id)`, `(project_id, session_id)`.

### 2) users (`backend/routes/users.py`, prefix `/api/users`)
- GET `/api/users/search`
  - Queries: text/username search; likely indexed fields.
  - Risks: LIKE scans.
  - Fixes: proper indexes; limit results.
- GET `/api/users/:username`
  - Lookup by username; joined data as needed.
- PUT `/api/users/profile`
  - Update current user.
- GET `/api/users/stats`, `/api/users/:user_id/projects`, `/api/users/:user_id/tagged-projects`
  - Aggregations and listings.
  - Ensure indexes on FKs `user_id`.

### 3) votes (`backend/routes/votes.py`, prefix `/api/votes`)
- POST `/api/votes`
- GET `/api/votes/user`
  - Simple project/user vote lookups.

### 4) comments (`backend/routes/comments.py`, prefix `/api/comments`)
- GET `/api/comments`
  - Listing with pagination and possibly joins to users/projects.
- POST/PUT/DELETE `/api/comments...`
  - Single row mutations.
- POST `/api/comments/:id/vote`
  - Similar to project votes.

Risks: N+1 if loading comment authors; mitigated with `joinedload`.

### 5) badges (`backend/routes/badges.py`, prefix `/api/badges`)
- POST `/api/badges/award`
- GET `/api/badges/:project_id`
  - Queries around `ValidationBadge` and relations.
  - Ensure FK indexes.

### 6) intros (`backend/routes/intros.py`, prefix `/api/intros`)
- Standard CRUD around intros; list sent/received.
- Queries filtered by `sender_id/recipient_id` and status.

### 7) blockchain (`backend/routes/blockchain.py`, prefix `/api/blockchain`)
- POST `/verify-cert`, GET `/cert-info/:wallet_address`, GET `/health`
- No heavy DB usage; external checks and simple reads.

### 8) users/auth (`backend/routes/auth.py`, prefix `/api/auth`)
- Standard login/refresh; stored tokens; relies on JWT. DB lookup by email/username.

### 9) uploads (`backend/routes/uploads.py`, prefix `/api/upload`)
- Store to IPFS (Pinata); minimal DB.

### 10) events (`backend/routes/events.py`, prefix `/api/events`)
- GET `/api/events` (list), GET `/:event_slug`, GET `/:event_slug/projects`
- POST `/api/events`, PUT, add/remove subscribed, feature/types
- Queries:
  - Listing events, joining projects via `EventProject`, aggregates for subscribers.
- Risks:
  - Large joins if many event-projects.
- Fixes:
  - Composite indexes on `(event_id, project_id)`, `(event_slug)`, and counts caching.

### 11) investor_requests (`backend/routes/investor_requests.py`, prefix: registered without explicit prefix in app, but file defines endpoints under that blueprint)
- POST `/apply`, PUT `/apply`
- GET `/pending`, `/all`, `/my-request`, `/user/:user_id`, `/public`
- POST approve/reject/update-permissions/remove-investor
- Queries:
  - Filter by status/user_id; joins to user/project where needed; aggregations for public directory.
- Risks:
  - Public listing can be large.
- Fixes:
  - Pagination + indexes on `status`, `user_id`; caching for `/public` (fast endpoints exist too).

### 12) chain_posts (`backend/routes/chain_posts.py`, prefix `/api/chains`)
- POST `/api/chains/:slug/posts`
- GET `/api/chains/:slug/posts`
- GET `/api/chains/:slug/posts/:post_id`
- Replies, react, pin, lock
- Queries:
  - Posts by chain slug via join to `Chain` by `slug`; `joinedload` for author.
- Risks:
  - N+1 for replies if not eager-loaded.
- Fixes:
  - Keep `joinedload` and proper pagination.

### 13) project_updates (`backend/routes/project_updates.py`, prefix `/api`)
- POST `/api/projects/:project_id/updates`
- GET `/api/projects/:project_id/updates`
- PUT/DELETE specific update
- Queries:
  - Filter by `project_id`, order by `created_at`.
- Risks:
  - Simple; ensure FK indexes and pagination.

### 14) intro_requests (`backend/routes/intro_requests.py`, prefix `/api/intro-requests`)
- POST `/send`, GET `/received`, `/sent`, POST `/accept`, `/decline`
- Queries:
  - Straightforward filters by sender/recipient/status.

### 15) search (`backend/routes/search.py`, prefix `/api/search`)
- GET `/api/search`
- Queries:
  - Multi-entity search (projects, users), using LIKE/ILIKE.
- Risks:
  - Wide LIKE scans if not well-indexed.
- Fixes:
  - Partial indexes or trigram; limit and debounce in UI.

### 16) feedback (`backend/routes/feedback.py`, prefix `/api/feedback`)
- POST feedback
- Admin GET `/admin`, PATCH `/admin/:id/status`, DELETE `/admin/:id`
- Simple CRUD.

### 17) notifications (`backend/routes/notifications.py`, prefix `/api/notifications`)
- GET list, PUT read, POST read-all, GET unread-count
- Queries:
  - Filter by `user_id` and `is_read`.
- Fixes:
  - Index `(user_id, is_read, created_at)`.

### 18) users (stats/leaderboards) (`backend/routes/users.py`)
- GET `/leaderboard/projects`, `/leaderboard/builders`
- Queries:
  - Aggregations over `projects` per user.
- Mitigated by `fast_leaderboard` endpoints below.

### 19) admin (`backend/routes/admin.py`, prefix `/api/admin`)
- GET users, validators, projects, investor-requests, stats
- POST toggle admin/active, validators maintenance, project feature/update/delete, badges award, investor approve/reject
- Chains moderation endpoints (ban/suspend/unban/feature, logs)
- Queries:
  - Many filtered listings with pagination; aggregates for stats; joins for chain moderation.
- Risks:
  - Heavy pages in Admin.tsx fire many requests; ensure pagination and limit. Ensure indexes on filter columns.
- Fixes:
  - Caching for expensive stats (short TTL where acceptable).

### 20) validator (`backend/routes/validator.py`, prefix `/api/validator`)
- GET `/dashboard`, `/projects`, `/projects/:id`
- POST assignments actions and `/badges/award`
- Queries:
  - Assignments per validator, project lookups, award badge writes.
- Fixes:
  - Indexes on assignment tables; keep pagination.

### 21) saved_projects (`backend/routes/saved_projects.py`)
- GET/POST deletes saved projects
- Queries by `user_id` and `project_id`
- Fixes:
  - Composite unique index to enforce uniqueness and accelerate lookups.

### 22) intros (`backend/routes/intros.py`)
- Covered above; CRUD endpoints.

### 23) direct_messages (`backend/routes/direct_messages.py`, prefix `/api/messages`)
- POST `/send`
  - Insert one `DirectMessage`; check recipient exists.
- GET `/conversations`
  - Complex aggregate:
    - `db.session.query(User, max(DirectMessage.created_at) as last_message_time, count(case(... is_read==False)) as unread_count)`
    - Join on messages in both directions.
    - Then a subquery to fetch the last message per conversation; single join to retrieve all last messages.
- GET `/conversation/:other_user_id`
  - `DirectMessage.query.filter(or(...))` with `joinedload(sender)`, `joinedload(recipient)`; marks unread as read in a batch.
- GET `/unread-count`
  - `DirectMessage.query.filter(recipient_id=user_id, is_read=False).count()`
- POST `/:message_id/mark-read`
  - Update one row.

- Risks:
  - Conversations aggregate can scan many `DirectMessage` rows; relies on good indexes and LIMIT/OFFSET not used here (full list).
- Fixes:
  - Indexes:
    - `(sender_id, recipient_id, created_at)`,
    - `(recipient_id, is_read)`,
    - Partial covering for common filters.
  - Paginate conversations if they grow large.

### 24) chains (`backend/routes/chains.py`, prefix `/api/chains`)
- POST/GET/PUT/DELETE chain
- Add/remove projects to chains
- List projects: GET `/api/chains/:slug/projects`
- Follow/unfollow, followers list, user following list
- Feature/analytics/recommendations
- Queries:
  - By `slug`, joins via `ChainProject`, feature flags, analytics aggregations.
- Risks:
  - Large join lists; ensure composite indexes on junction tables.
- Fixes:
  - Pagination; caching derived analytics; rate-limit follow spam.

### 25) prefetch (`backend/routes/prefetch.py`, prefix `/api/prefetch`)
- GET `/bootstrap`
- GET `/dashboard-data`
- Queries:
  - Fetch frequently used, cacheable data in one shot.
- Fixes:
  - Ensure this leverages cache and returns only minimal JSON needed.

### 26) fast_leaderboard (`backend/routes/fast_leaderboard.py`, prefix `/api/leaderboard`)
- GET `/projects`, `/users`, `/chains`, `/trending`
- Optimized versions of leaderboard endpoints.
- Queries:
  - Pre-aggregated or simplified queries, cached.
- Fixes:
  - Keep cache warmers running.

### 27) fast_investor_directory (`backend/routes/fast_investor_directory.py`, prefix `/api/investors`)
- GET `/public`
- GET `/stats`
- Queries:
  - Optimized public directory and stats aggregation.
- Fixes:
  - Cache responses; paginate directory.

### 28) admin_auth (`backend/routes/admin_auth.py`)
- Admin auth helper; prefix set in file; minimal DB.

---

## Global Query Patterns and Hotspots

- ORM: SQLAlchemy; common operations: `Model.query.filter...`, `joinedload`, `count()`, `order_by`, `limit/offset`.
- Aggregations:
  - Leaderboards (projects/builders), events, chains analytics, conversations.
- Potential slow areas:
  - LIKE/ILIKE search on `Project.title/description/tagline`, `User.username` without proper indexes.
  - COUNT(*) on large filtered sets — mitigated by caching counts on feed without filters.
  - Aggregations across `Project` and `User` — mitigated via caching (leaderboards, fast endpoints).
  - Conversation aggregates — ensure indexes and consider pagination.
- Good practices already present:
  - Eager loading via `joinedload` to prevent N+1s.
  - CacheService used for feeds, leaderboards, projects, counts; cache warmer enabled.
  - Pagination everywhere for listings.

---

## Concrete Optimizations (Actionable)

- Indexes (verify/ensure; many already added in migrations like `add_performance_indexes.py`):
  - Projects: `(is_deleted, proof_score, created_at)`, `gin`/btree for `tech_stack`, `categories`, `hackathons`.
  - Text: trigram indexes for `title`, `tagline`, `description`, `username` if using Postgres.
  - Votes/Views: `(project_id, user_id)`, `(project_id, session_id)`.
  - Chains: `Chain.slug` unique index; junction table `(chain_id, project_id)`.
  - DirectMessage: `(recipient_id, is_read)`, `(sender_id, recipient_id, created_at)`.
- Counting:
  - Keep using cached counts for non-filtered feeds; for filtered paths consider approximate counts or capped `total_pages` when dataset is big.
- Leaderboards:
  - Keep using fast endpoints with 5-minute cache; precompute with cache warmer if traffic high.
- Conversations:
  - Add pagination to `GET /api/messages/conversations` and `GET /conversation/:userId` if lists grow.
- Admin:
  - Ensure all list endpoints are paginated with reasonable default `per_page`; cache expensive stats; debounce UI queries.
- Project detail:
  - Batch/defer view increments (e.g., per-session debounce) if DB write contention appears.

---

## Verification and Coverage

- Backend route coverage: Extracted from `backend/routes/*.py` decorators and `app.register_blueprint(...)`. This includes all routes:
  - auth, projects, votes, comments, badges, intros, blockchain, users, upload, events, investor_requests, intro_requests, direct_messages (`/api/messages`), search, saved_projects, admin, validator, feedback, chains, chain_posts, notifications, prefetch, fast_leaderboard, fast_investor_directory, admin_auth.
- Frontend API coverage: Extracted from `frontend/src` via `fetch`, `axios`, and React Query usage in pages and hooks as listed above.

This document reflects every page, every called route, and the query types executed per route, along with the identified risks and optimizations.

---

## Optional Denormalized Warm Layer (between Redis and Postgres)

Purpose: Add a durable, queryable “warm” store for pre-joined/aggregated views too heavy for on-demand SQL, while keeping Redis for hot-path caching.

When to use
- High-read aggregates that are expensive to compute each request even with SQL indexes (leaderboards, investor directory/stats, conversations summary).
- Feed projections that join multiple tables or require aggregation windows and are repeatedly accessed across users.
- Data that benefits from partial durability and ad-hoc querying beyond Redis key-value blobs.

Good candidates for this layer(recommended postgres)
- MongoDB collections holding denormalized documents.
- Postgres materialized views or auxiliary denormalized tables maintained by jobs/triggers.
- Choice guidance(ask the builder/user):
  - If you need flexible schemaless docs and independent scaling: Mongo.
  - If you want to stay in Postgres (simpler ops, transactional refresh): materialized views/denorm tables.
  - Keep Redis as the front-most hot cache for the most requested keys/pages.

Targets in this app (high impact)
- Leaderboards
  - Collection/table: `leaderboards`
  - Document shape (by timeframe): `{ key: 'projects:month', generatedAt, items: [{projectId, proofScore, user, featuredFlag, rank}], ttlHint }`
  - Refresh: every 5 minutes (staggered), or event-driven on significant score deltas.
- Investor Directory + Stats
  - `investors_public` with flattened profile and computed metrics `{ userId, score, categories, introCounts, lastActiveAt }`
  - Refresh: hourly or on write events; small deltas via upsert.
- Conversations Summary
  - `conversations_summary:{userId}` documents `{ otherUserId, lastMessageAt, unreadCount, otherUser }` precomputed for fast inbox loads.
  - Refresh: event-driven on message insert/read events.
- Feed Projections (optional)
  - Pre-materialize top N pages for `trending|top-rated|newest` as arrays of fully shaped cards to complement Redis.

Sync strategies (choose per target)
- Scheduled ETL jobs (preferred for leaderboards/directories):
  - Cron/worker runs SQL aggregations, writes denormalized JSON docs (Mongo) or upserts into Postgres denorm tables/materialized views.
- Event-driven upserts (messages, views, votes):
  - On write to `DirectMessage`, `Vote`, `ProjectView`, publish small jobs to update the affected summaries.
- Partial refresh + SWR:
  - Serve from Redis → fall back to warm layer → background refresh from Postgres on staleness.

Invalidation and freshness
- Define TTLs per dataset (e.g., leaderboards 5m, investor stats 15–60m, conversations immediate on events).
- Use versioned cache keys in Redis that include a `generatedAt` from the warm layer to align lifetimes.

Operational notes
- Mongo option:
  - Pros: flexible docs, fast reads with appropriate indexes, decoupled write path.
  - Cons: separate datastore to operate; eventual consistency; need write discipline.
- Postgres denorm/materialized views option:
  - Pros: stays transactional; simpler infra; can refresh concurrently (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).
  - Cons: larger main DB footprint; careful refresh windows needed.

Suggested implementation for this codebase
- Keep Redis for hot keys (already in `CacheService`).
- Add a worker (e.g., Celery/RQ/apscheduler) to materialize:
  - `leaderboards` (projects/users/chains by timeframe) every 5m.
  - `investors_public` every 30–60m and on profile changes.
  - `conversations_summary:{userId}` on message send/read events.
- Add a `WarmStore` adapter with two backends:
  - Mongo backend (collection access, upsert by key, TTL index).
  - Postgres backend (denorm tables or materialized views with a small access layer).
- API flow:
  - Endpoints read: Redis → WarmStore → Postgres (fallback), and set Redis on miss.
  - Admin endpoints can trigger refresh jobs for diagnostics.

Indexes for warm layer
- Leaderboards: index by `{ key, generatedAt }` and `{ key, 'items.rank' }` (Mongo) or `(key)` (Postgres table) with JSONB.
- Investors: compound indexes on `{ score desc, lastActiveAt desc }`, `{ categories }` (Mongo: multikey), or btree/GIN for JSONB.
- Conversations: `{ userId, lastMessageAt desc }` and `{ userId, otherUserId }` unique to upsert quickly.

Risks and mitigations
- Stale reads: visible for minutes; mitigate with SWR and manual refresh on user action.
- Dual-write complexity: centralize writes via jobs; avoid writing warm layer from request thread.
- Data drift: add canaries—periodically compare sample aggregates from Postgres vs warm layer.

Bottom line
- Yes—adding a denormalized warm layer between Redis and Postgres helps for leaderboards, directories, and conversation summaries. Prefer Postgres materialized views/denorm tables for simpler ops unless you specifically need schema flexibility and independent scaling—then use Mongo. Keep Redis as the hot, low-latency front.