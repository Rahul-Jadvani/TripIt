-- ============================================================================
-- PHASE 0: CLEANUP - Drop existing denormalization objects if they exist
-- ============================================================================
-- Purpose: Clean up any partially completed migrations
-- Safe to run multiple times
-- ============================================================================

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_dashboard_project_stats ON projects;
DROP TRIGGER IF EXISTS trg_dashboard_badge_stats ON validation_badges;
DROP TRIGGER IF EXISTS trg_dashboard_comment_stats ON comments;
DROP TRIGGER IF EXISTS trg_dashboard_message_count ON direct_messages;
DROP TRIGGER IF EXISTS trg_dashboard_notification_count ON notifications;
DROP TRIGGER IF EXISTS trg_dashboard_intro_stats ON intros;
DROP TRIGGER IF EXISTS trg_conversation_on_message ON direct_messages;
DROP TRIGGER IF EXISTS trg_conversation_on_read ON direct_messages;
DROP TRIGGER IF EXISTS trg_intro_request_stats ON intro_requests;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_dashboard_project_stats();
DROP FUNCTION IF EXISTS update_dashboard_badge_stats();
DROP FUNCTION IF EXISTS update_dashboard_comment_stats();
DROP FUNCTION IF EXISTS update_dashboard_message_count();
DROP FUNCTION IF EXISTS update_dashboard_notification_count();
DROP FUNCTION IF EXISTS update_dashboard_intro_stats();
DROP FUNCTION IF EXISTS update_conversation_on_message();
DROP FUNCTION IF EXISTS update_conversation_on_read();
DROP FUNCTION IF EXISTS update_intro_request_stats();

-- Drop denormalized tables
DROP TABLE IF EXISTS user_dashboard_stats CASCADE;
DROP TABLE IF EXISTS message_conversations_denorm CASCADE;
DROP TABLE IF EXISTS intro_request_stats CASCADE;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_feed_projects CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_projects CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_builders CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_chains_discovery CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_project_details CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_search_index CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_chain_posts CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_investors_directory CASCADE;

-- Drop queue and log tables
DROP TABLE IF EXISTS mv_refresh_queue CASCADE;
DROP TABLE IF EXISTS mv_refresh_log CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS queue_mv_refresh(TEXT, TEXT);
DROP FUNCTION IF EXISTS process_mv_refresh_queue();
DROP FUNCTION IF EXISTS search_content(TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_fuzzy(TEXT, TEXT, REAL, INT);
DROP FUNCTION IF EXISTS search_combined(TEXT, TEXT, INT);

-- Drop phase 2 trigger functions
DROP FUNCTION IF EXISTS trigger_feed_refresh();
DROP FUNCTION IF EXISTS trigger_leaderboard_refresh();
DROP FUNCTION IF EXISTS trigger_chains_refresh();
DROP FUNCTION IF EXISTS trigger_project_details_refresh();
DROP FUNCTION IF EXISTS trigger_search_refresh();
DROP FUNCTION IF EXISTS trigger_chain_posts_refresh();
DROP FUNCTION IF EXISTS trigger_investors_refresh();

COMMIT;

SELECT 'Cleanup complete - ready for fresh migration';
