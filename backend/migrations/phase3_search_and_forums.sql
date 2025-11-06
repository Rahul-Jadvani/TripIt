-- ============================================================================
-- PHASE 3: SEARCH INDEX & CHAIN FORUMS
-- ============================================================================
-- Purpose: Full-text search and chain forum materialized views
-- Views: Search Index, Chain Posts, Investors Directory
-- Run time: ~10 minutes
-- Impact: Zero downtime (creates new objects)
-- ============================================================================

BEGIN;

-- ============================================================================
-- INSTALL REQUIRED EXTENSIONS
-- ============================================================================

-- pg_trgm for fuzzy search and similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent for accent-insensitive search (optional but recommended)
CREATE EXTENSION IF NOT EXISTS unaccent;

COMMENT ON EXTENSION pg_trgm IS 'Trigram matching for fuzzy text search';
COMMENT ON EXTENSION unaccent IS 'Remove accents from text for better search';


-- ============================================================================
-- MATERIALIZED VIEW 6: SEARCH INDEX
-- ============================================================================
-- Purpose: Unified full-text search across projects, users, chains
-- Updates: Event-driven (5s debounce) on content changes
-- Features: tsvector, trigram matching, relevance scoring
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_search_index AS
-- Projects
SELECT
    'project' as result_type,
    p.id::TEXT as id,
    p.title as name,
    p.description,
    NULL as image_url,
    p.created_at,
    p.user_id::TEXT,
    u.username as creator_username,
    p.proof_score as relevance_score,
    NULL as category,

    -- Full-text search vector (English language)
    TO_TSVECTOR('english',
        COALESCE(p.title, '') || ' ' ||
        COALESCE(p.description, '') || ' ' ||
        COALESCE(u.username, '')
    ) as search_vector,

    -- Additional metadata for filtering
    JSON_BUILD_OBJECT(
        'proof_score', p.proof_score,
        'is_featured', p.is_featured,
        'category', NULL
    ) as metadata

FROM projects p
JOIN users u ON p.user_id = u.id
WHERE p.is_deleted = FALSE

UNION ALL

-- Users
SELECT
    'user' as result_type,
    u.id::TEXT as id,
    u.username as name,
    COALESCE(u.bio, '') as description,
    u.avatar_url as image_url,
    u.created_at,
    u.id::TEXT as user_id,
    u.username as creator_username,
    COALESCE((SELECT SUM(proof_score) FROM projects WHERE user_id = u.id AND is_deleted = FALSE), 0)::INT as relevance_score,
    NULL as category,

    TO_TSVECTOR('english',
        COALESCE(u.username, '') || ' ' ||
        COALESCE(u.bio, '') || ' ' ||
        COALESCE(u.email, '')
    ) as search_vector,

    JSON_BUILD_OBJECT(
        'is_verified', u.email_verified,
        'is_investor', u.is_investor,
        'is_validator', u.is_validator
    ) as metadata

FROM users u
WHERE u.is_active = TRUE

UNION ALL

-- Chains
SELECT
    'chain' as result_type,
    c.id::TEXT as id,
    c.name,
    COALESCE(c.description, '') as description,
    c.logo_url as image_url,
    c.created_at,
    c.creator_id::TEXT as user_id,
    u.username as creator_username,
    COALESCE((SELECT COUNT(*) FROM chain_followers WHERE chain_id = c.id), 0)::INT as relevance_score,
    NULL as category,

    TO_TSVECTOR('english',
        COALESCE(c.name, '') || ' ' ||
        COALESCE(c.description, '')
    ) as search_vector,

    JSON_BUILD_OBJECT(
        'is_public', c.is_public,
        'is_featured', c.is_featured,
        'category', NULL
    ) as metadata

FROM chains c
JOIN users u ON c.creator_id = u.id
WHERE c.is_active = TRUE AND c.is_public = TRUE;

-- Indexes for blazing fast search
CREATE INDEX IF NOT EXISTS idx_search_vector ON mv_search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_type ON mv_search_index(result_type, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_search_created ON mv_search_index(result_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_name_trgm ON mv_search_index USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_desc_trgm ON mv_search_index USING GIN(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_relevance ON mv_search_index(result_type, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_search_category ON mv_search_index(result_type, category) WHERE category IS NOT NULL;

COMMENT ON MATERIALIZED VIEW mv_search_index IS 'Unified full-text search index with tsvector and trigram matching';
COMMENT ON COLUMN mv_search_index.search_vector IS 'Full-text search vector for fast phrase matching';
COMMENT ON COLUMN mv_search_index.relevance_score IS 'Sorting metric: proof_score for projects, karma for users, followers for chains';


-- ============================================================================
-- MATERIALIZED VIEW 7: CHAIN POSTS (FORUMS)
-- ============================================================================
-- Purpose: Pre-compute chain forum posts with engagement metrics
-- Updates: Event-driven (5s debounce) on post/vote/comment changes
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_chain_posts AS
SELECT
    cp.id,
    cp.chain_id,
    cp.title,
    cp.content,
    cp.created_at,
    cp.updated_at,
    cp.is_pinned,

    -- Author info (denormalized)
    cp.author_id,
    u.username as author_username,
    u.avatar_url as author_profile_image,
    u.email_verified as author_is_verified,

    -- Engagement metrics (pre-computed)
    COALESCE(upvote_counts.count, 0) as upvote_count,
    COALESCE(comment_counts.count, 0) as comment_count,

    -- Trending score
    -- Formula: upvotes * 1.5 + comments * 2 - age_penalty
    (
        COALESCE(upvote_counts.count, 0) * 1.5 +
        COALESCE(comment_counts.count, 0) * 2 +
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cp.created_at)) / 3600) * -0.1
    ) as trending_score

FROM chain_posts cp
JOIN users u ON cp.author_id = u.id
LEFT JOIN (
    SELECT post_id, COUNT(*) as count
    FROM chain_post_reactions
    WHERE reaction_type = 'upvote'
    GROUP BY post_id
) upvote_counts ON cp.id = upvote_counts.post_id
LEFT JOIN (
    SELECT parent_id as post_id, COUNT(*) as count
    FROM chain_posts
    WHERE parent_id IS NOT NULL AND is_deleted = FALSE
    GROUP BY parent_id
) comment_counts ON cp.id = comment_counts.post_id
WHERE cp.is_deleted = FALSE
ORDER BY cp.chain_id, cp.is_pinned DESC, trending_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_chain_posts_id ON mv_chain_posts(id);
CREATE INDEX IF NOT EXISTS idx_mv_chain_posts_chain ON mv_chain_posts(chain_id, is_pinned DESC, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_chain_posts_chain_created ON mv_chain_posts(chain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_chain_posts_trending ON mv_chain_posts(chain_id, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_chain_posts_author ON mv_chain_posts(author_id, created_at DESC);

COMMENT ON MATERIALIZED VIEW mv_chain_posts IS 'Chain forum posts with pre-computed engagement metrics';


-- ============================================================================
-- MATERIALIZED VIEW 8: INVESTORS DIRECTORY
-- ============================================================================
-- Purpose: Public investor directory with activity metrics
-- Updates: Event-driven (5s debounce) on investor request/intro changes
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_investors_directory AS
SELECT
    ir.id,
    ir.user_id,
    ir.status,
    ir.created_at,
    ir.reviewed_at as approved_at,

    -- User info (denormalized)
    u.username,
    u.avatar_url as profile_image,
    u.bio,
    u.email,
    u.email_verified as is_verified,

    -- Investor details
    ir.company_name,
    ir.industries as investment_focus,
    ir.ticket_size_min as ticket_size,
    ir.website_url as portfolio_url,
    ir.linkedin_url,

    -- Activity metrics
    COALESCE(intro_stats.total_requests, 0) as intro_requests_sent,
    COALESCE(intro_stats.approved_requests, 0) as intros_approved,
    COALESCE(intro_stats.pending_requests, 0) as intros_pending,

    -- Relevance score (for sorting)
    -- Formula: approved_intros * 10 + total_requests * 2
    (
        COALESCE(intro_stats.approved_requests, 0) * 10 +
        COALESCE(intro_stats.total_requests, 0) * 2
    ) as relevance_score

FROM investor_requests ir
JOIN users u ON ir.user_id = u.id
LEFT JOIN (
    SELECT
        investor_id,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests
    FROM intro_requests
    GROUP BY investor_id
) intro_stats ON ir.user_id = intro_stats.investor_id
WHERE ir.status = 'approved' AND u.is_active = TRUE
ORDER BY relevance_score DESC, ir.reviewed_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_investors_id ON mv_investors_directory(id);
CREATE INDEX IF NOT EXISTS idx_mv_investors_user ON mv_investors_directory(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_investors_approved ON mv_investors_directory(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_investors_relevance ON mv_investors_directory(relevance_score DESC);

COMMENT ON MATERIALIZED VIEW mv_investors_directory IS 'Public investor directory with activity metrics and relevance scoring';


-- ============================================================================
-- REFRESH TRIGGERS FOR NEW VIEWS
-- ============================================================================

-- Trigger function: Queue search index refresh
CREATE OR REPLACE FUNCTION trigger_search_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_search_index', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Search refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_search_project ON projects;
CREATE TRIGGER trg_refresh_search_project
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_search_refresh();

DROP TRIGGER IF EXISTS trg_refresh_search_user ON users;
CREATE TRIGGER trg_refresh_search_user
AFTER UPDATE ON users
FOR EACH STATEMENT EXECUTE FUNCTION trigger_search_refresh();

DROP TRIGGER IF EXISTS trg_refresh_search_chain ON chains;
CREATE TRIGGER trg_refresh_search_chain
AFTER INSERT OR UPDATE OR DELETE ON chains
FOR EACH STATEMENT EXECUTE FUNCTION trigger_search_refresh();


-- Trigger function: Queue chain posts refresh
CREATE OR REPLACE FUNCTION trigger_chain_posts_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_chain_posts', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Chain posts refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_chain_posts_meta ON chain_posts;
CREATE TRIGGER trg_refresh_chain_posts_meta
AFTER INSERT OR UPDATE OR DELETE ON chain_posts
FOR EACH STATEMENT EXECUTE FUNCTION trigger_chain_posts_refresh();

DROP TRIGGER IF EXISTS trg_refresh_chain_posts_reactions ON chain_post_reactions;
CREATE TRIGGER trg_refresh_chain_posts_reactions
AFTER INSERT OR DELETE ON chain_post_reactions
FOR EACH STATEMENT EXECUTE FUNCTION trigger_chain_posts_refresh();


-- Trigger function: Queue investors directory refresh
CREATE OR REPLACE FUNCTION trigger_investors_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_mv_refresh('mv_investors_directory', TG_TABLE_NAME || ':' || TG_OP);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Investors directory refresh triggers
DROP TRIGGER IF EXISTS trg_refresh_investors_status ON investor_requests;
CREATE TRIGGER trg_refresh_investors_status
AFTER UPDATE OF status ON investor_requests
FOR EACH STATEMENT EXECUTE FUNCTION trigger_investors_refresh();

DROP TRIGGER IF EXISTS trg_refresh_investors_intro ON intro_requests;
CREATE TRIGGER trg_refresh_investors_intro
AFTER INSERT OR UPDATE OR DELETE ON intro_requests
FOR EACH STATEMENT EXECUTE FUNCTION trigger_investors_refresh();


-- ============================================================================
-- ADVANCED SEARCH HELPER FUNCTIONS
-- ============================================================================

-- Function for fast full-text search with ranking
CREATE OR REPLACE FUNCTION search_content(
    query_text TEXT,
    result_type_filter TEXT DEFAULT NULL,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE(
    result_type TEXT,
    id TEXT,
    name TEXT,
    description TEXT,
    image_url TEXT,
    creator_username TEXT,
    relevance_score INT,
    search_rank REAL,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.result_type,
        si.id,
        si.name,
        si.description,
        si.image_url,
        si.creator_username,
        si.relevance_score,
        TS_RANK(si.search_vector, plainto_tsquery('english', query_text)) as search_rank,
        si.metadata::JSONB
    FROM mv_search_index si
    WHERE si.search_vector @@ plainto_tsquery('english', query_text)
      AND (result_type_filter IS NULL OR si.result_type = result_type_filter)
    ORDER BY search_rank DESC, si.relevance_score DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_content IS 'Fast full-text search with ranking across all content types';


-- Function for fuzzy search (typo-tolerant)
CREATE OR REPLACE FUNCTION search_fuzzy(
    query_text TEXT,
    result_type_filter TEXT DEFAULT NULL,
    similarity_threshold REAL DEFAULT 0.3,
    limit_count INT DEFAULT 20
)
RETURNS TABLE(
    result_type TEXT,
    id TEXT,
    name TEXT,
    description TEXT,
    image_url TEXT,
    creator_username TEXT,
    relevance_score INT,
    similarity_score REAL,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.result_type,
        si.id,
        si.name,
        si.description,
        si.image_url,
        si.creator_username,
        si.relevance_score,
        GREATEST(
            SIMILARITY(si.name, query_text),
            SIMILARITY(si.description, query_text)
        ) as similarity_score,
        si.metadata::JSONB
    FROM mv_search_index si
    WHERE (
        SIMILARITY(si.name, query_text) > similarity_threshold OR
        SIMILARITY(si.description, query_text) > similarity_threshold
    )
      AND (result_type_filter IS NULL OR si.result_type = result_type_filter)
    ORDER BY similarity_score DESC, si.relevance_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_fuzzy IS 'Fuzzy search with trigram similarity matching (typo-tolerant)';


-- Function for combined search (full-text + fuzzy)
CREATE OR REPLACE FUNCTION search_combined(
    query_text TEXT,
    result_type_filter TEXT DEFAULT NULL,
    limit_count INT DEFAULT 20
)
RETURNS TABLE(
    result_type TEXT,
    id TEXT,
    name TEXT,
    description TEXT,
    image_url TEXT,
    creator_username TEXT,
    relevance_score INT,
    combined_score REAL,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.result_type,
        si.id,
        si.name,
        si.description,
        si.image_url,
        si.creator_username,
        si.relevance_score,
        (
            -- Full-text rank (weighted 60%)
            TS_RANK(si.search_vector, plainto_tsquery('english', query_text)) * 0.6 +
            -- Trigram similarity (weighted 40%)
            GREATEST(
                SIMILARITY(si.name, query_text),
                SIMILARITY(si.description, query_text)
            ) * 0.4
        ) as combined_score,
        si.metadata::JSONB
    FROM mv_search_index si
    WHERE (
        si.search_vector @@ plainto_tsquery('english', query_text) OR
        SIMILARITY(si.name, query_text) > 0.2 OR
        SIMILARITY(si.description, query_text) > 0.2
    )
      AND (result_type_filter IS NULL OR si.result_type = result_type_filter)
    ORDER BY combined_score DESC, si.relevance_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_combined IS 'Combined full-text and fuzzy search with weighted scoring';


-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify:
--
-- Check materialized views:
-- SELECT COUNT(*) FROM mv_search_index;
-- SELECT COUNT(*) FROM mv_chain_posts;
-- SELECT COUNT(*) FROM mv_investors_directory;
--
-- Test full-text search:
-- SELECT * FROM search_content('blockchain', NULL, 10);
--
-- Test fuzzy search:
-- SELECT * FROM search_fuzzy('blokchain', NULL, 0.3, 10);
--
-- Test combined search:
-- SELECT * FROM search_combined('blockchain project', NULL, 10);
--
-- Check search performance:
-- EXPLAIN ANALYZE SELECT * FROM search_combined('test query', 'project', 20);
-- ============================================================================
