-- ============================================================================
-- PHASE 2: MATERIALIZED VIEWS WITH DEBOUNCED REFRESH
-- ============================================================================
-- Purpose: Create materialized views for fast reads with event-driven refresh
-- Views: Feed, Leaderboards, Chains, Project Details
-- Refresh Strategy: Event-driven with 5-second debouncing
-- Run time: ~10 minutes
-- Impact: Zero downtime (creates new objects, doesn't modify existing)
-- ============================================================================

BEGIN;

-- ============================================================================
-- DEBOUNCING INFRASTRUCTURE
-- ============================================================================
-- Purpose: Track pending refreshes and prevent refresh storms
-- Mechanism: Queue refresh requests, process max once per 5 seconds
-- ============================================================================

CREATE TABLE IF NOT EXISTS mv_refresh_queue (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL UNIQUE,
    refresh_requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refresh_started_at TIMESTAMP,
    refresh_completed_at TIMESTAMP,
    last_refresh_duration_ms INT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
    error_message TEXT,
    triggered_by TEXT,

    CONSTRAINT check_mv_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_mv_queue_status ON mv_refresh_queue(status, refresh_requested_at);
CREATE INDEX IF NOT EXISTS idx_mv_queue_view ON mv_refresh_queue(view_name, refresh_requested_at DESC);

COMMENT ON TABLE mv_refresh_queue IS 'Debouncing queue for materialized view refreshes (5-second debounce)';


-- Refresh log for monitoring
CREATE TABLE IF NOT EXISTS mv_refresh_log (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL,
    refresh_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refresh_completed_at TIMESTAMP,
    duration_ms INT,
    row_count BIGINT,
    triggered_by TEXT,
    status TEXT DEFAULT 'pending',

    CONSTRAINT check_log_status CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_mv_log_view ON mv_refresh_log(view_name, refresh_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_log_completed ON mv_refresh_log(refresh_completed_at DESC);

COMMENT ON TABLE mv_refresh_log IS 'Historical log of all materialized view refreshes';


-- ============================================================================
-- MATERIALIZED VIEW 1: FEED PROJECTS
-- ============================================================================
-- Purpose: Pre-compute feed with all metadata for instant load
-- Updates: Event-driven (5s debounce) on project/vote/badge/comment changes
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_feed_projects AS
SELECT
    p.id,
    p.title,
    p.description,
    p.created_at,
    p.updated_at,
    p.is_featured,

    -- Creator info (denormalized)
    p.user_id,
    u.username,
    u.avatar_url as profile_image,
    u.email_verified as is_verified,

    -- Engagement metrics (pre-computed)
    p.proof_score,
    COALESCE(comment_counts.count, 0) as comment_count,
    COALESCE(upvote_counts.count, 0) as upvote_count,
    COALESCE(badge_counts.count, 0) as badge_count,

    -- Trending score (for sorting)
    -- Formula: proof_score * 0.5 + comments * 2 + upvotes * 1.5 - age_penalty
    (
        p.proof_score * 0.5 +
        COALESCE(comment_counts.count, 0) * 2 +
        COALESCE(upvote_counts.count, 0) * 1.5 +
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) / 3600) * -0.1
    ) as trending_score

FROM projects p
JOIN users u ON p.user_id = u.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM comments
    WHERE parent_id IS NULL
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
    FROM validation_badges
    GROUP BY project_id
) badge_counts ON p.id = badge_counts.project_id
WHERE p.is_deleted = FALSE
ORDER BY trending_score DESC;

-- Indexes for fast queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_feed_id ON mv_feed_projects(id);
CREATE INDEX IF NOT EXISTS idx_mv_feed_trending ON mv_feed_projects(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_feed_proof_score ON mv_feed_projects(proof_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_feed_created ON mv_feed_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_feed_featured ON mv_feed_projects(is_featured, trending_score DESC) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_mv_feed_user ON mv_feed_projects(user_id, created_at DESC);

COMMENT ON MATERIALIZED VIEW mv_feed_projects IS 'Denormalized feed with pre-computed trending scores';


-- ============================================================================
-- MATERIALIZED VIEW 2: LEADERBOARD PROJECTS
-- ============================================================================
-- Purpose: Pre-compute project rankings by proof score
-- Updates: Event-driven (5s debounce) on badge awards
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard_projects AS
SELECT
    p.id,
    p.title,
    p.proof_score,
    p.user_id,
    u.username,
    u.avatar_url as profile_image,
    u.email_verified as is_verified,

    -- Metrics
    COALESCE(badge_counts.count, 0) as badge_count,
    COALESCE(comment_counts.count, 0) as comment_count,
    COALESCE(vote_counts.count, 0) as vote_count,

    -- Rank (computed on refresh)
    ROW_NUMBER() OVER (ORDER BY p.proof_score DESC, p.created_at ASC) as rank

FROM projects p
JOIN users u ON p.user_id = u.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM validation_badges
    GROUP BY project_id
) badge_counts ON p.id = badge_counts.project_id
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
) vote_counts ON p.id = vote_counts.project_id
WHERE p.is_deleted = FALSE AND p.proof_score > 0
ORDER BY p.proof_score DESC
LIMIT 1000;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_projects_id ON mv_leaderboard_projects(id);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_projects_rank ON mv_leaderboard_projects(rank);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_projects_score ON mv_leaderboard_projects(proof_score DESC);

COMMENT ON MATERIALIZED VIEW mv_leaderboard_projects IS 'Top 1000 projects ranked by proof score';


-- ============================================================================
-- MATERIALIZED VIEW 3: LEADERBOARD BUILDERS
-- ============================================================================
-- Purpose: Pre-compute builder rankings by karma (total proof score)
-- Updates: Event-driven (5s debounce) on badge awards/project updates
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard_builders AS
SELECT
    u.id,
    u.username,
    u.avatar_url as profile_image,
    u.bio,
    u.email_verified as is_verified,

    -- Karma (main metric) - from dashboard stats for consistency
    COALESCE(uds.karma_score, 0) as total_karma,

    -- Supporting metrics
    COALESCE(uds.project_count, 0) as project_count,
    COALESCE(uds.badges_given, 0) as badges_given,
    COALESCE(uds.comment_count, 0) as comment_count,

    -- Rank
    ROW_NUMBER() OVER (ORDER BY COALESCE(uds.karma_score, 0) DESC, u.created_at ASC) as rank

FROM users u
LEFT JOIN user_dashboard_stats uds ON u.id = uds.user_id
WHERE u.is_active = TRUE
ORDER BY total_karma DESC
LIMIT 1000;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_builders_id ON mv_leaderboard_builders(id);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_builders_rank ON mv_leaderboard_builders(rank);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_builders_karma ON mv_leaderboard_builders(total_karma DESC);

COMMENT ON MATERIALIZED VIEW mv_leaderboard_builders IS 'Top 1000 builders ranked by total karma';


-- ============================================================================
-- MATERIALIZED VIEW 4: CHAINS DISCOVERY
-- ============================================================================
-- Purpose: Pre-compute chains list with follower/project counts
-- Updates: Event-driven (5s debounce) on chain updates/follows/project additions
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_chains_discovery AS
SELECT
    c.id,
    c.name,
    c.description,
    c.logo_url as image_url,
    NULL as category,
    c.is_public,
    c.is_featured,
    c.created_at,

    -- Creator info
    c.creator_id,
    u.username as creator_username,
    u.avatar_url as creator_profile_image,
    u.email_verified as creator_is_verified,

    -- Metrics (pre-computed)
    COALESCE(follower_counts.count, 0) as follower_count,
    COALESCE(project_counts.count, 0) as project_count,
    COALESCE(post_counts.count, 0) as post_count,

    -- Trending score
    -- Formula: followers * 0.3 + projects * 0.6 + recent_posts * 0.1
    (
        COALESCE(follower_counts.count, 0) * 0.3 +
        COALESCE(project_counts.count, 0) * 0.6 +
        COALESCE(recent_post_counts.count, 0) * 0.1
    ) as trending_score

FROM chains c
JOIN users u ON c.creator_id = u.id
LEFT JOIN (
    SELECT chain_id, COUNT(*) as count
    FROM chain_followers
    GROUP BY chain_id
) follower_counts ON c.id = follower_counts.chain_id
LEFT JOIN (
    SELECT chain_id, COUNT(*) as count
    FROM chain_projects
    GROUP BY chain_id
) project_counts ON c.id = project_counts.chain_id
LEFT JOIN (
    SELECT chain_id, COUNT(*) as count
    FROM chain_posts
    WHERE is_deleted = FALSE
    GROUP BY chain_id
) post_counts ON c.id = post_counts.chain_id
LEFT JOIN (
    SELECT chain_id, COUNT(*) as count
    FROM chain_posts
    WHERE is_deleted = FALSE AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    GROUP BY chain_id
) recent_post_counts ON c.id = recent_post_counts.chain_id
WHERE c.is_active = TRUE
ORDER BY trending_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_chains_id ON mv_chains_discovery(id);
CREATE INDEX IF NOT EXISTS idx_mv_chains_trending ON mv_chains_discovery(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_chains_followers ON mv_chains_discovery(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_mv_chains_featured ON mv_chains_discovery(is_featured, trending_score DESC) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_mv_chains_public ON mv_chains_discovery(is_public, trending_score DESC) WHERE is_public = TRUE;

COMMENT ON MATERIALIZED VIEW mv_chains_discovery IS 'Chains list with pre-computed metrics and trending scores';


-- ============================================================================
-- MATERIALIZED VIEW 5: PROJECT DETAILS
-- ============================================================================
-- Purpose: Pre-compute project details with all metadata
-- Updates: Event-driven (5s debounce) on project/badge/chain changes
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_details AS
SELECT
    p.id,
    p.title,
    p.description,
    p.created_at,
    p.updated_at,
    p.proof_score,
    p.is_featured,

    -- Creator info
    p.user_id,
    u.username,
    u.avatar_url as profile_image,
    u.bio as creator_bio,
    u.email_verified as is_verified,

    -- Engagement metrics (pre-computed)
    COALESCE(comment_counts.count, 0) as comment_count,
    COALESCE(vote_counts.count, 0) as vote_count,
    COALESCE(badge_counts.count, 0) as badge_count,

    -- Badges (JSON array for fast access)
    COALESCE(
        (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', vb.id,
                    'badge_type', vb.badge_type,
                    'validator_id', vb.validator_id,
                    'validator_username', v.username,
                    'validator_profile_image', v.avatar_url,
                    'created_at', vb.created_at
                )
                ORDER BY vb.created_at DESC
            )
            FROM validation_badges vb
            JOIN users v ON vb.validator_id = v.id
            WHERE vb.project_id = p.id
        ),
        '[]'::JSON
    ) as badges_json,

    -- Chains this project is in (JSON array)
    COALESCE(
        (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', c.id,
                    'name', c.name,
                    'image_url', c.logo_url,
                    'category', NULL
                )
                ORDER BY c.name
            )
            FROM chain_projects cp
            JOIN chains c ON cp.chain_id = c.id
            WHERE cp.project_id = p.id AND c.is_active = TRUE
        ),
        '[]'::JSON
    ) as chains_json

FROM projects p
JOIN users u ON p.user_id = u.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM comments
    WHERE parent_id IS NULL
    GROUP BY project_id
) comment_counts ON p.id = comment_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM votes
    WHERE vote_type = 'up'
    GROUP BY project_id
) vote_counts ON p.id = vote_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM validation_badges
    GROUP BY project_id
) badge_counts ON p.id = badge_counts.project_id
WHERE p.is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_project_details_id ON mv_project_details(id);
CREATE INDEX IF NOT EXISTS idx_mv_project_details_user ON mv_project_details(user_id, created_at DESC);

COMMENT ON MATERIALIZED VIEW mv_project_details IS 'Project details with pre-computed metadata and JSON aggregations';


-- ============================================================================
-- DEBOUNCED REFRESH HELPER FUNCTIONS
-- ============================================================================

-- Function to queue a refresh request (debounced)
CREATE OR REPLACE FUNCTION queue_mv_refresh(view_name_param TEXT, triggered_by_param TEXT)
RETURNS VOID AS $$
DECLARE
    last_request_time TIMESTAMP;
    time_since_last_request INTERVAL;
BEGIN
    -- Check if view was recently requested (within 5 seconds)
    SELECT refresh_requested_at INTO last_request_time
    FROM mv_refresh_queue
    WHERE view_name = view_name_param
    AND status IN ('pending', 'in_progress')
    ORDER BY refresh_requested_at DESC
    LIMIT 1;

    IF last_request_time IS NOT NULL THEN
        time_since_last_request := CURRENT_TIMESTAMP - last_request_time;

        -- If less than 5 seconds, skip (debounce)
        IF EXTRACT(EPOCH FROM time_since_last_request) < 5 THEN
            -- Update triggered_by to show multiple triggers
            UPDATE mv_refresh_queue
            SET triggered_by = triggered_by || ', ' || triggered_by_param
            WHERE view_name = view_name_param AND status = 'pending';
            RETURN;
        END IF;
    END IF;

    -- Queue new refresh request
    INSERT INTO mv_refresh_queue (view_name, refresh_requested_at, triggered_by, status)
    VALUES (view_name_param, CURRENT_TIMESTAMP, triggered_by_param, 'pending')
    ON CONFLICT (view_name) DO UPDATE
    SET refresh_requested_at = CURRENT_TIMESTAMP,
        triggered_by = triggered_by_param,
        status = 'pending';

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION queue_mv_refresh IS 'Queue a materialized view refresh with 5-second debouncing';


-- Function to process refresh queue (called by background worker)
CREATE OR REPLACE FUNCTION process_mv_refresh_queue()
RETURNS TABLE(view_name TEXT, status TEXT, duration_ms INT, row_count BIGINT) AS $$
DECLARE
    refresh_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INT;
    rows BIGINT;
BEGIN
    -- Process all pending refreshes
    FOR refresh_record IN
        SELECT * FROM mv_refresh_queue
        WHERE mv_refresh_queue.status = 'pending'
        ORDER BY refresh_requested_at ASC
    LOOP
        BEGIN
            -- Mark as in progress
            UPDATE mv_refresh_queue
            SET status = 'in_progress',
                refresh_started_at = CURRENT_TIMESTAMP
            WHERE mv_refresh_queue.id = refresh_record.id;

            -- Execute refresh
            start_time := CLOCK_TIMESTAMP();
            EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', refresh_record.view_name);
            end_time := CLOCK_TIMESTAMP();

            -- Get row count
            EXECUTE format('SELECT COUNT(*) FROM %I', refresh_record.view_name) INTO rows;

            -- Calculate duration
            duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

            -- Mark as completed
            UPDATE mv_refresh_queue
            SET status = 'completed',
                refresh_completed_at = end_time,
                last_refresh_duration_ms = duration
            WHERE mv_refresh_queue.id = refresh_record.id;

            -- Log to history
            INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_completed_at, duration_ms, row_count, triggered_by, status)
            VALUES (refresh_record.view_name, start_time, end_time, duration, rows, refresh_record.triggered_by, 'completed');

            -- Return result
            view_name := refresh_record.view_name;
            status := 'completed';
            duration_ms := duration;
            row_count := rows;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed
            UPDATE mv_refresh_queue
            SET status = 'failed',
                error_message = SQLERRM,
                refresh_completed_at = CURRENT_TIMESTAMP
            WHERE mv_refresh_queue.id = refresh_record.id;

            -- Log failure
            INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_completed_at, triggered_by, status)
            VALUES (refresh_record.view_name, start_time, CURRENT_TIMESTAMP, refresh_record.triggered_by, 'failed');

            -- Return error result
            view_name := refresh_record.view_name;
            status := 'failed';
            duration_ms := 0;
            row_count := 0;
            RETURN NEXT;
        END;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_mv_refresh_queue IS 'Process all pending materialized view refreshes (called by background worker)';


-- ============================================================================
-- REFRESH TRIGGERS (DEBOUNCED)
-- ============================================================================

-- Trigger function: Queue feed refresh
CREATE OR REPLACE FUNCTION trigger_feed_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_feed_projects', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Feed refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_feed_project ON projects;
CREATE TRIGGER trg_refresh_feed_project
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_feed_refresh();

DROP TRIGGER IF EXISTS trg_refresh_feed_vote ON votes;
CREATE TRIGGER trg_refresh_feed_vote
AFTER INSERT OR DELETE ON votes
FOR EACH STATEMENT EXECUTE FUNCTION trigger_feed_refresh();

DROP TRIGGER IF EXISTS trg_refresh_feed_badge ON validation_badges;
CREATE TRIGGER trg_refresh_feed_badge
AFTER INSERT ON validation_badges
FOR EACH STATEMENT EXECUTE FUNCTION trigger_feed_refresh();

DROP TRIGGER IF EXISTS trg_refresh_feed_comment ON comments;
CREATE TRIGGER trg_refresh_feed_comment
AFTER INSERT OR DELETE ON comments
FOR EACH STATEMENT EXECUTE FUNCTION trigger_feed_refresh();


-- Trigger function: Queue leaderboard refresh
CREATE OR REPLACE FUNCTION trigger_leaderboard_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_leaderboard_projects', TG_TABLE_NAME || ':' || TG_OP);
    PERFORM queue_mv_refresh('mv_leaderboard_builders', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Leaderboard refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_leaderboards_badge ON validation_badges;
CREATE TRIGGER trg_refresh_leaderboards_badge
AFTER INSERT ON validation_badges
FOR EACH STATEMENT EXECUTE FUNCTION trigger_leaderboard_refresh();

DROP TRIGGER IF EXISTS trg_refresh_leaderboards_project ON projects;
CREATE TRIGGER trg_refresh_leaderboards_project
AFTER UPDATE OF proof_score ON projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_leaderboard_refresh();


-- Trigger function: Queue chains refresh
CREATE OR REPLACE FUNCTION trigger_chains_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_chains_discovery', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Chains refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_chains_meta ON chains;
CREATE TRIGGER trg_refresh_chains_meta
AFTER INSERT OR UPDATE ON chains
FOR EACH STATEMENT EXECUTE FUNCTION trigger_chains_refresh();

DROP TRIGGER IF EXISTS trg_refresh_chains_followers ON chain_followers;
CREATE TRIGGER trg_refresh_chains_followers
AFTER INSERT OR DELETE ON chain_followers
FOR EACH STATEMENT EXECUTE FUNCTION trigger_chains_refresh();

DROP TRIGGER IF EXISTS trg_refresh_chains_projects ON chain_projects;
CREATE TRIGGER trg_refresh_chains_projects
AFTER INSERT OR DELETE ON chain_projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_chains_refresh();

DROP TRIGGER IF EXISTS trg_refresh_chains_posts ON chain_posts;
CREATE TRIGGER trg_refresh_chains_posts
AFTER INSERT ON chain_posts
FOR EACH STATEMENT EXECUTE FUNCTION trigger_chains_refresh();


-- Trigger function: Queue project details refresh
CREATE OR REPLACE FUNCTION trigger_project_details_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_project_details', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Project details refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_project_details_project ON projects;
CREATE TRIGGER trg_refresh_project_details_project
AFTER UPDATE ON projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_project_details_refresh();

DROP TRIGGER IF EXISTS trg_refresh_project_details_badge ON validation_badges;
CREATE TRIGGER trg_refresh_project_details_badge
AFTER INSERT OR DELETE ON validation_badges
FOR EACH STATEMENT EXECUTE FUNCTION trigger_project_details_refresh();

DROP TRIGGER IF EXISTS trg_refresh_project_details_chain ON chain_projects;
CREATE TRIGGER trg_refresh_project_details_chain
AFTER INSERT OR DELETE ON chain_projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_project_details_refresh();


-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify:
--
-- SELECT COUNT(*) FROM mv_feed_projects;
-- SELECT COUNT(*) FROM mv_leaderboard_projects;
-- SELECT COUNT(*) FROM mv_leaderboard_builders;
-- SELECT COUNT(*) FROM mv_chains_discovery;
-- SELECT COUNT(*) FROM mv_project_details;
--
-- Check queue:
-- SELECT * FROM mv_refresh_queue;
--
-- Trigger test (should queue refresh):
-- UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM projects LIMIT 1);
-- SELECT * FROM mv_refresh_queue WHERE view_name = 'mv_feed_projects';
-- ============================================================================
