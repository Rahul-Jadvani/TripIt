-- Migration: Add GitHub Access Token to Users
-- Date: 2025-01-17
-- Purpose: Store GitHub OAuth access token for API calls during scoring

-- Add github_access_token column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS github_access_token TEXT NULL;

-- Add index for performance (only index non-null tokens)
CREATE INDEX IF NOT EXISTS idx_users_github_token ON users(github_access_token)
WHERE github_access_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.github_access_token IS
'GitHub OAuth access token for API calls. Used for repo/team analysis during AI scoring. Should be encrypted in production.';

-- Verification query
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'github_access_token'
    ) THEN
        RAISE NOTICE '✅ Migration 001: github_access_token column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration 001 failed: github_access_token column not found';
    END IF;
END $$;
