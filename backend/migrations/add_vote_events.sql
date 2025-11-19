-- Minimal addition: vote_events table for audit logging
BEGIN;

CREATE TABLE IF NOT EXISTS vote_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    request_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    vote_type VARCHAR(10) NOT NULL,
    action VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vote_events_project ON vote_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vote_events_user ON vote_events(user_id, created_at DESC);

COMMIT;
