-- ============================================================================
-- ENHANCE FEED MATERIALIZED VIEW WITH ALL PROJECT DATA
-- ============================================================================
-- Purpose: Add all missing fields to mv_feed_projects for feature-rich cards
-- Fields added: tagline, tech_stack, URLs, chain info, downvotes
-- ============================================================================

BEGIN;

-- Drop and recreate the materialized view with ALL fields
DROP MATERIALIZED VIEW IF EXISTS mv_feed_projects CASCADE;

CREATE MATERIALIZED VIEW mv_feed_projects AS
SELECT
    p.id,
    p.title,
    p.tagline,
    p.description,
    p.tech_stack,
    p.demo_url,
    p.github_url,
    p.created_at,
    p.updated_at,
    p.is_featured,

    -- Creator info (denormalized)
    p.user_id,
    u.username as creator_username,
    u.display_name as creator_display_name,
    u.avatar_url as creator_avatar_url,
    u.email_verified as creator_is_verified,

    -- Chain info (first chain if exists, projects can be in multiple chains)
    cp.chain_id,
    c.name as chain_name,
    c.slug as chain_slug,
    c.logo_url as chain_logo_url,

    -- Engagement metrics (pre-computed)
    p.proof_score,
    COALESCE(comment_counts.count, 0) as comment_count,
    COALESCE(upvote_counts.count, 0) as upvote_count,
    COALESCE(downvote_counts.count, 0) as downvote_count,
    COALESCE(badge_counts.count, 0) as badge_count,

    -- Net score for sorting (upvotes - downvotes)
    (COALESCE(upvote_counts.count, 0) - COALESCE(downvote_counts.count, 0)) as net_score,

    -- Trending score (for sorting)
    -- Formula: proof_score * 0.5 + comments * 2 + upvotes * 1.5 - downvotes * 1 - age_penalty
    (
        p.proof_score * 0.5 +
        COALESCE(comment_counts.count, 0) * 2 +
        COALESCE(upvote_counts.count, 0) * 1.5 -
        COALESCE(downvote_counts.count, 0) * 1 +
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) / 3600) * -0.1
    ) as trending_score

FROM projects p
JOIN users u ON p.user_id = u.id
LEFT JOIN LATERAL (
    SELECT chain_id
    FROM chain_projects
    WHERE project_id = p.id
    LIMIT 1
) cp ON true
LEFT JOIN chains c ON cp.chain_id = c.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM comments
    GROUP BY project_id
) comment_counts ON p.id = comment_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM votes
    WHERE vote_type = 'up'
    GROUP BY project_id
) upvote_counts ON p.id = upvote_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM votes
    WHERE vote_type = 'down'
    GROUP BY project_id
) downvote_counts ON p.id = downvote_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM validation_badges
    GROUP BY project_id
) badge_counts ON p.id = badge_counts.project_id
WHERE p.id IS NOT NULL;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_feed_projects_id ON mv_feed_projects(id);

-- Create indexes for common sorts
CREATE INDEX IF NOT EXISTS idx_mv_feed_trending ON mv_feed_projects(trending_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_feed_newest ON mv_feed_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_feed_top_rated ON mv_feed_projects(net_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_feed_featured ON mv_feed_projects(is_featured DESC, trending_score DESC);

COMMENT ON MATERIALIZED VIEW mv_feed_projects IS 'Enhanced feed with ALL project data for feature-rich cards';

-- Refresh immediately
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feed_projects;

COMMIT;
