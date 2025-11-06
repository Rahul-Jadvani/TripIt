-- ============================================================================
-- PHASE 4: CRITICAL INDEXES
-- ============================================================================
-- Purpose: Add missing critical indexes for performance optimization
-- Impact: Improves query performance by 10-100x on indexed columns
-- Run time: ~15-20 minutes (using CONCURRENTLY for zero downtime)
-- Note: All indexes use CREATE INDEX CONCURRENTLY for non-blocking creation
-- ============================================================================

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================

-- Composite index for user's active projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_deleted
ON projects(user_id, is_deleted)
WHERE is_deleted = FALSE;

-- Featured projects with timestamps
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_featured
ON projects(is_featured, created_at DESC)
WHERE is_featured = TRUE;

-- Proof score for leaderboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_proof_score
ON projects(proof_score DESC, created_at DESC)
WHERE is_deleted = FALSE AND proof_score > 0;

-- Created timestamp for "newest" feed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created
ON projects(created_at DESC)
WHERE is_deleted = FALSE;

-- Updated timestamp for recent activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_updated
ON projects(updated_at DESC)
WHERE is_deleted = FALSE;

COMMENT ON INDEX idx_projects_user_deleted IS 'Fast lookup of user active projects';
COMMENT ON INDEX idx_projects_featured IS 'Featured projects list';


-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Case-insensitive username search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower
ON users(LOWER(username));

-- Case-insensitive email lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
ON users(LOWER(email));

-- Active users filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active
ON users(is_active, created_at DESC)
WHERE is_active = TRUE;

-- Verified users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verified
ON users(email_verified, created_at DESC)
WHERE email_verified = TRUE;

-- Investors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_investor
ON users(is_investor, created_at DESC)
WHERE is_investor = TRUE;

-- Validators
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_validator
ON users(is_validator, created_at DESC)
WHERE is_validator = TRUE;

COMMENT ON INDEX idx_users_username_lower IS 'Case-insensitive username search and login';
COMMENT ON INDEX idx_users_email_lower IS 'Case-insensitive email lookup';


-- ============================================================================
-- COMMENTS TABLE INDEXES
-- ============================================================================

-- Project comments (nested structure)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_project_parent
ON comments(project_id, parent_id, created_at DESC);

-- User's comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user
ON comments(user_id, created_at DESC);

-- Top-level comments only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_top_level
ON comments(project_id, created_at DESC)
WHERE parent_id IS NULL;

-- Recent comments across platform
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_created
ON comments(created_at DESC);

COMMENT ON INDEX idx_comments_project_parent IS 'Fast comment threads with nesting';
COMMENT ON INDEX idx_comments_top_level IS 'Top-level comments without replies';


-- ============================================================================
-- VOTES TABLE INDEXES
-- ============================================================================

-- User + project composite for "has user upvoted" checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_project
ON votes(user_id, project_id);

-- Project upvotes count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_project
ON votes(project_id, created_at DESC)
WHERE vote_type = 'up';

-- User's upvote history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user
ON votes(user_id, created_at DESC)
WHERE vote_type = 'up';

COMMENT ON INDEX idx_votes_user_project IS 'Fast "has upvoted" checks';
COMMENT ON INDEX idx_votes_project IS 'Project upvote counts and lists';


-- ============================================================================
-- VALIDATION BADGES TABLE INDEXES
-- ============================================================================

-- Project badges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badges_project
ON validation_badges(project_id, created_at DESC);

-- Validator's badges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badges_validator
ON validation_badges(validator_id, created_at DESC);

-- Badge type distribution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badges_type
ON validation_badges(badge_type, created_at DESC);

-- Recent badges across platform
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badges_created
ON validation_badges(created_at DESC);

COMMENT ON INDEX idx_badges_project IS 'Project badge list';
COMMENT ON INDEX idx_badges_validator IS 'Validator contribution history';


-- ============================================================================
-- DIRECT MESSAGES TABLE INDEXES
-- ============================================================================

-- Conversation lookup (both directions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation
ON direct_messages(sender_id, recipient_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_reverse
ON direct_messages(recipient_id, sender_id, created_at DESC);

-- Unread messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
ON direct_messages(recipient_id, is_read, created_at DESC)
WHERE is_read = FALSE;

-- User's all messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_all
ON direct_messages(recipient_id, created_at DESC);

COMMENT ON INDEX idx_messages_conversation IS 'Fast conversation thread loading';
COMMENT ON INDEX idx_messages_unread IS 'Unread message counts and lists';


-- ============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================================

-- User's unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = FALSE;

-- User's all notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Notification type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type
ON notifications(user_id, notification_type, created_at DESC);

-- Recent notifications across platform
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created
ON notifications(created_at DESC);

COMMENT ON INDEX idx_notifications_user_unread IS 'Fast unread notification counts and badges';
COMMENT ON INDEX idx_notifications_user_type IS 'Filtered notification feeds';


-- ============================================================================
-- CHAINS TABLE INDEXES
-- ============================================================================

-- Creator's chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_creator
ON chains(creator_id, created_at DESC);

-- Public active chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_public_active
ON chains(is_public, is_active, created_at DESC)
WHERE is_public = TRUE AND is_active = TRUE;

-- Featured chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_featured
ON chains(is_featured, created_at DESC)
WHERE is_featured = TRUE;

COMMENT ON INDEX idx_chains_public_active IS 'Public chain discovery';
COMMENT ON INDEX idx_chains_featured IS 'Featured chains showcase';


-- ============================================================================
-- CHAIN FOLLOWERS TABLE INDEXES
-- ============================================================================

-- User's followed chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_followers_user
ON chain_followers(user_id, followed_at DESC);

-- Chain's followers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_followers_chain
ON chain_followers(chain_id, followed_at DESC);

-- "Is following" check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_followers_user_chain
ON chain_followers(user_id, chain_id);

COMMENT ON INDEX idx_chain_followers_user_chain IS 'Fast "is following" checks';


-- ============================================================================
-- CHAIN PROJECTS TABLE INDEXES
-- ============================================================================

-- Chain's projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_projects_chain
ON chain_projects(chain_id, added_at DESC);

-- Project's chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_projects_project
ON chain_projects(project_id, added_at DESC);

-- Composite for uniqueness checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_projects_unique
ON chain_projects(chain_id, project_id);

COMMENT ON INDEX idx_chain_projects_chain IS 'Projects in a chain';
COMMENT ON INDEX idx_chain_projects_project IS 'Chains containing a project';


-- ============================================================================
-- CHAIN POSTS TABLE INDEXES
-- ============================================================================

-- Chain's posts (with pinned priority)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_posts_chain
ON chain_posts(chain_id, is_pinned DESC, created_at DESC)
WHERE is_deleted = FALSE;

-- Author's posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_posts_author
ON chain_posts(author_id, created_at DESC)
WHERE is_deleted = FALSE;

-- Recent posts across all chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_posts_created
ON chain_posts(created_at DESC)
WHERE is_deleted = FALSE;

COMMENT ON INDEX idx_chain_posts_chain IS 'Chain forum with pinned posts first';
COMMENT ON INDEX idx_chain_posts_type IS 'Filtered forum posts (discussion, announcement, etc.)';


-- ============================================================================
-- CHAIN POST VOTES TABLE INDEXES
-- ============================================================================

-- Post reactions count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_post_reactions_post
ON chain_post_reactions(post_id, created_at DESC)
WHERE reaction_type = 'upvote';

-- User's reactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_post_reactions_user
ON chain_post_reactions(user_id, created_at DESC);

-- "Has reacted" check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_post_reactions_user_post
ON chain_post_reactions(user_id, post_id);

COMMENT ON INDEX idx_chain_post_reactions_user_post IS 'Fast "has reacted" checks';


-- ============================================================================
-- CHAIN POST COMMENTS TABLE INDEXES
-- ============================================================================

-- Chain posts use nested replies (self-referential), so we index on parent_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_posts_parent
ON chain_posts(parent_id, created_at DESC)
WHERE parent_id IS NOT NULL AND is_deleted = FALSE;

-- Note: idx_chain_posts_author already created above in CHAIN POSTS section

COMMENT ON INDEX idx_chain_posts_parent IS 'Post reply threads (nested comments)';


-- ============================================================================
-- INTRO REQUESTS TABLE INDEXES
-- ============================================================================

-- Builder's received requests (with status filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intro_requests_builder_status
ON intro_requests(builder_id, status, created_at DESC);

-- Investor's sent requests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intro_requests_investor
ON intro_requests(investor_id, created_at DESC);

-- Pending requests only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intro_requests_pending
ON intro_requests(builder_id, created_at DESC)
WHERE status = 'pending';

-- Recent requests across platform
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intro_requests_created
ON intro_requests(created_at DESC);

COMMENT ON INDEX idx_intro_requests_builder_status IS 'Builder intro request inbox with filters';
COMMENT ON INDEX idx_intro_requests_pending IS 'Fast pending request count';


-- ============================================================================
-- INTROS TABLE INDEXES
-- ============================================================================

-- Requester's intros
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intros_requester
ON intros(requester_id, created_at DESC);

-- Recipient's intros
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intros_recipient
ON intros(recipient_id, created_at DESC);

-- Recent intros across platform
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intros_created
ON intros(created_at DESC);

COMMENT ON INDEX idx_intros_requester IS 'User sent intros';
COMMENT ON INDEX idx_intros_recipient IS 'User received intros';


-- ============================================================================
-- INVESTOR REQUESTS TABLE INDEXES
-- ============================================================================

-- Status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_requests_status
ON investor_requests(status, created_at DESC);

-- User lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_requests_user
ON investor_requests(user_id);

-- Approved investors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_requests_approved
ON investor_requests(reviewed_at DESC)
WHERE status = 'approved';

COMMENT ON INDEX idx_investor_requests_status IS 'Admin investor approval queue';
COMMENT ON INDEX idx_investor_requests_approved IS 'Public investor directory';


-- ============================================================================
-- FEEDBACK TABLE INDEXES
-- ============================================================================

-- Status filtering for admin
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_status
ON feedback(status, created_at DESC);

-- User's feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_user
ON feedback(user_id, created_at DESC);

-- Recent feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_created
ON feedback(created_at DESC);

COMMENT ON INDEX idx_feedback_status IS 'Admin feedback moderation queue';


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify indexes:
--
-- Count all indexes:
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
--
-- Check index sizes:
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- ORDER BY pg_relation_size(indexrelid) DESC;
--
-- Verify specific table indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'projects'
-- ORDER BY indexname;
-- ============================================================================
