-- Migration: Create Admin Scoring Configuration Table
-- Date: 2025-01-17
-- Purpose: Store admin-configurable scoring weights and settings

-- Create admin settings table for configurable weights
CREATE TABLE IF NOT EXISTS admin_scoring_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    updated_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default configuration values (only if not exists)
INSERT INTO admin_scoring_config (config_key, config_value)
VALUES
    -- Main scoring weights (must sum to 100)
    ('scoring_weights', '{
        "quality_score": 20,
        "verification_score": 20,
        "validation_score": 30,
        "community_score": 30
    }'::jsonb),

    -- LLM sub-weights (must sum to 1.0)
    ('llm_weights', '{
        "competitive": 0.25,
        "market_fit": 0.25,
        "success_criteria": 0.25,
        "evaluation": 0.25
    }'::jsonb),

    -- GitHub analysis sub-weights (must sum to 1.0)
    ('github_weights', '{
        "repo_quality": 0.5,
        "team_quality": 0.5
    }'::jsonb),

    -- Code quality sub-weights (must sum to 1.0)
    ('code_quality_weights', '{
        "repo_structure": 0.3,
        "readme_quality": 0.3,
        "file_organization": 0.2,
        "code_patterns": 0.2
    }'::jsonb),

    -- General scoring configuration
    ('scoring_config', '{
        "llm_model": "gpt-4o-mini",
        "max_retries": 10,
        "retry_backoff_seconds": 300,
        "rate_limit_hours": 1,
        "github_cache_days": 7,
        "enable_scoring": true
    }'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- Add index for fast config lookups
CREATE INDEX IF NOT EXISTS idx_scoring_config_key ON admin_scoring_config(config_key);

-- Add comment
COMMENT ON TABLE admin_scoring_config IS
'Stores admin-configurable scoring weights and settings. Updated via Admin UI.';

-- Verification query
DO $$
DECLARE
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO config_count FROM admin_scoring_config;
    IF config_count >= 5 THEN
        RAISE NOTICE '✅ Migration 003: Scoring config table created with % default configs', config_count;
    ELSE
        RAISE EXCEPTION '❌ Migration 003 failed: Expected 5 configs, found %', config_count;
    END IF;
END $$;
