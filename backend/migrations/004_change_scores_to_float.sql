-- Migration: Change score columns from INTEGER to NUMERIC (Float)
-- This allows storing decimal values for more precise scoring

-- Alter score columns to NUMERIC (equivalent to Float in SQLAlchemy)
ALTER TABLE projects
    ALTER COLUMN proof_score TYPE NUMERIC USING proof_score::numeric,
    ALTER COLUMN proof_score SET DEFAULT 0.0;

ALTER TABLE projects
    ALTER COLUMN verification_score TYPE NUMERIC USING verification_score::numeric,
    ALTER COLUMN verification_score SET DEFAULT 0.0;

ALTER TABLE projects
    ALTER COLUMN community_score TYPE NUMERIC USING community_score::numeric,
    ALTER COLUMN community_score SET DEFAULT 0.0;

ALTER TABLE projects
    ALTER COLUMN validation_score TYPE NUMERIC USING validation_score::numeric,
    ALTER COLUMN validation_score SET DEFAULT 0.0;

ALTER TABLE projects
    ALTER COLUMN quality_score TYPE NUMERIC USING quality_score::numeric,
    ALTER COLUMN quality_score SET DEFAULT 0.0;

-- Note: trending_score is already NUMERIC, no change needed
