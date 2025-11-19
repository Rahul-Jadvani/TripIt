-- ============================================================================
-- REMOVE LEGACY USERS.KARMA COLUMN
-- ============================================================================
-- The application now reads karma exclusively from user_dashboard_stats.
-- Drop the redundant column and its index to prevent future drift.
-- ============================================================================

BEGIN;

-- Drop legacy index if it still exists
DROP INDEX IF EXISTS idx_users_karma;

-- Remove the unused column
ALTER TABLE users
    DROP COLUMN IF EXISTS karma;

COMMIT;
