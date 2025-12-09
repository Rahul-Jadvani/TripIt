-- Migration: Add On-Chain Score Placeholder
-- Date: 2025-11-20
-- Purpose: Reserve 20 proof points for future on-chain verification metrics

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS onchain_score NUMERIC DEFAULT 0.0;

COMMENT ON COLUMN projects.onchain_score IS
'Reserved for future on-chain verification signals (0-20). Currently defaults to 0.';

-- Backfill existing rows to 0 to avoid NULL comparisons
UPDATE projects
SET onchain_score = 0
WHERE onchain_score IS NULL;

RAISE NOTICE '✅ Added projects.onchain_score placeholder column.';
