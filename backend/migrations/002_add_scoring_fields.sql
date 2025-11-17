-- Migration: Add AI Scoring Fields to Projects
-- Date: 2025-01-17
-- Purpose: Add fields for async AI scoring system with retry logic

-- Add AI scoring metadata columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scoring_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS scoring_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS scoring_error TEXT NULL;

-- Add indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_projects_scoring_status ON projects(scoring_status);
CREATE INDEX IF NOT EXISTS idx_projects_last_scored_at ON projects(last_scored_at);
CREATE INDEX IF NOT EXISTS idx_projects_score_breakdown ON projects USING GIN(score_breakdown);

-- Add constraint for valid scoring statuses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_scoring_status'
    ) THEN
        ALTER TABLE projects
        ADD CONSTRAINT check_scoring_status
        CHECK (scoring_status IN ('pending', 'processing', 'completed', 'failed', 'retrying'));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN projects.score_breakdown IS
'JSONB field containing detailed AI scoring breakdown (GitHub analysis, LLM results, reasoning)';
COMMENT ON COLUMN projects.scoring_status IS
'Current status of AI scoring: pending, processing, completed, failed, retrying';
COMMENT ON COLUMN projects.scoring_retry_count IS
'Number of retry attempts (max 10). Increments on each failure.';
COMMENT ON COLUMN projects.last_scored_at IS
'Timestamp of last successful scoring attempt';
COMMENT ON COLUMN projects.scoring_error IS
'Error message from last failed scoring attempt (for debugging)';

-- Verification query
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'scoring_status'
    ) THEN
        RAISE NOTICE '✅ Migration 002: Scoring fields added successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration 002 failed: scoring_status column not found';
    END IF;
END $$;
