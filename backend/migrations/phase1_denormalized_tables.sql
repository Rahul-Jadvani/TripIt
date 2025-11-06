-- ============================================================================
-- PHASE 1: REAL-TIME DENORMALIZED TABLES
-- ============================================================================
-- Purpose: Create trigger-based denormalized tables for instant updates
-- Tables: user_dashboard_stats, message_conversations_denorm, intro_request_stats
-- Run time: ~5 minutes
-- Impact: Zero downtime (creates new tables, doesn't modify existing)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. USER DASHBOARD STATS
-- ============================================================================
-- Purpose: Pre-compute all dashboard statistics for instant dashboard load
-- Updates: Real-time via triggers on projects, badges, messages, notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_dashboard_stats (
    user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Project stats
    project_count INT DEFAULT 0 NOT NULL,
    active_projects INT DEFAULT 0 NOT NULL,
    total_proof_score INT DEFAULT 0 NOT NULL,

    -- Engagement stats
    comment_count INT DEFAULT 0 NOT NULL,
    badges_given INT DEFAULT 0 NOT NULL,
    badges_received INT DEFAULT 0 NOT NULL,

    -- Intro stats
    intros_sent INT DEFAULT 0 NOT NULL,
    intros_received INT DEFAULT 0 NOT NULL,
    intro_requests_pending INT DEFAULT 0 NOT NULL,

    -- Karma/Score
    karma_score INT DEFAULT 0 NOT NULL,

    -- Unread counts
    unread_messages INT DEFAULT 0 NOT NULL,
    unread_notifications INT DEFAULT 0 NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CONSTRAINT check_non_negative_stats CHECK (
        project_count >= 0 AND
        active_projects >= 0 AND
        total_proof_score >= 0 AND
        comment_count >= 0 AND
        badges_given >= 0 AND
        badges_received >= 0 AND
        intros_sent >= 0 AND
        intros_received >= 0 AND
        intro_requests_pending >= 0 AND
        karma_score >= 0 AND
        unread_messages >= 0 AND
        unread_notifications >= 0
    )
);

-- Indexes for dashboard stats
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_karma ON user_dashboard_stats(karma_score DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_proof ON user_dashboard_stats(total_proof_score DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_updated ON user_dashboard_stats(last_updated_at DESC);

COMMENT ON TABLE user_dashboard_stats IS 'Real-time denormalized dashboard statistics per user';
COMMENT ON COLUMN user_dashboard_stats.karma_score IS 'Total karma = sum of proof_scores from all projects';
COMMENT ON COLUMN user_dashboard_stats.active_projects IS 'Projects where is_deleted = FALSE';


-- ============================================================================
-- 2. MESSAGE CONVERSATIONS DENORMALIZED
-- ============================================================================
-- Purpose: Pre-compute conversation metadata for instant inbox load
-- Updates: Real-time via triggers on direct_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_conversations_denorm (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    other_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Last message info
    last_message_id VARCHAR REFERENCES direct_messages(id) ON DELETE SET NULL,
    last_message_text TEXT,
    last_message_time TIMESTAMP,
    last_sender_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,

    -- Counts
    unread_count INT DEFAULT 0 NOT NULL,
    total_messages INT DEFAULT 0 NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    UNIQUE(user_id, other_user_id),
    CONSTRAINT check_conversation_counts CHECK (unread_count >= 0 AND total_messages >= 0)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_time ON message_conversations_denorm(user_id, last_message_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON message_conversations_denorm(user_id, unread_count DESC) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_conversations_other_user ON message_conversations_denorm(other_user_id);

COMMENT ON TABLE message_conversations_denorm IS 'Denormalized conversation list with last message and unread counts';


-- ============================================================================
-- 3. INTRO REQUEST STATS
-- ============================================================================
-- Purpose: Fast counts for intro request badges and dashboard
-- Updates: Real-time via triggers on intro_requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS intro_request_stats (
    user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- As builder (receiving requests from investors)
    pending_requests INT DEFAULT 0 NOT NULL,
    approved_requests INT DEFAULT 0 NOT NULL,
    rejected_requests INT DEFAULT 0 NOT NULL,

    -- As investor (sending requests to builders)
    sent_requests INT DEFAULT 0 NOT NULL,
    sent_approved INT DEFAULT 0 NOT NULL,
    sent_rejected INT DEFAULT 0 NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CONSTRAINT check_intro_stats_non_negative CHECK (
        pending_requests >= 0 AND
        approved_requests >= 0 AND
        rejected_requests >= 0 AND
        sent_requests >= 0 AND
        sent_approved >= 0 AND
        sent_rejected >= 0
    )
);

-- Indexes for intro stats
CREATE INDEX IF NOT EXISTS idx_intro_stats_pending ON intro_request_stats(user_id) WHERE pending_requests > 0;
CREATE INDEX IF NOT EXISTS idx_intro_stats_updated ON intro_request_stats(last_updated_at DESC);

COMMENT ON TABLE intro_request_stats IS 'Real-time intro request statistics per user';


-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 1: Update dashboard stats on project changes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dashboard_project_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
        -- New active project
        INSERT INTO user_dashboard_stats (user_id, project_count, active_projects, last_updated_at)
        VALUES (NEW.user_id, 1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET project_count = user_dashboard_stats.project_count + 1,
            active_projects = user_dashboard_stats.active_projects + 1,
            last_updated_at = CURRENT_TIMESTAMP;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
            -- Project marked as deleted
            UPDATE user_dashboard_stats
            SET active_projects = GREATEST(0, active_projects - 1),
                last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id;
        ELSIF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
            -- Project restored
            UPDATE user_dashboard_stats
            SET active_projects = active_projects + 1,
                last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id;
        END IF;

        -- Update total proof score if it changed
        IF OLD.proof_score != NEW.proof_score THEN
            UPDATE user_dashboard_stats
            SET total_proof_score = (
                SELECT COALESCE(SUM(proof_score), 0)
                FROM projects
                WHERE user_id = NEW.user_id AND is_deleted = FALSE
            ),
            karma_score = (
                SELECT COALESCE(SUM(proof_score), 0)
                FROM projects
                WHERE user_id = NEW.user_id AND is_deleted = FALSE
            ),
            last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id;
        END IF;

    ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = FALSE THEN
        -- Physical deletion of active project (rare)
        UPDATE user_dashboard_stats
        SET active_projects = GREATEST(0, active_projects - 1),
            project_count = GREATEST(0, project_count - 1),
            last_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_project_stats ON projects;
CREATE TRIGGER trg_dashboard_project_stats
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION update_dashboard_project_stats();


-- ----------------------------------------------------------------------------
-- Trigger 2: Update dashboard stats on badge awards
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dashboard_badge_stats()
RETURNS TRIGGER AS $$
DECLARE
    project_owner_id VARCHAR(36);
BEGIN
    -- Get project owner
    SELECT user_id INTO project_owner_id FROM projects WHERE id = NEW.project_id;

    IF project_owner_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update validator stats (badges given)
    INSERT INTO user_dashboard_stats (user_id, badges_given, last_updated_at)
    VALUES (NEW.validator_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE
    SET badges_given = user_dashboard_stats.badges_given + 1,
        last_updated_at = CURRENT_TIMESTAMP;

    -- Update project owner stats (badges received + recalculate proof score)
    UPDATE user_dashboard_stats
    SET badges_received = badges_received + 1,
        total_proof_score = (
            SELECT COALESCE(SUM(proof_score), 0)
            FROM projects
            WHERE user_id = project_owner_id AND is_deleted = FALSE
        ),
        karma_score = (
            SELECT COALESCE(SUM(proof_score), 0)
            FROM projects
            WHERE user_id = project_owner_id AND is_deleted = FALSE
        ),
        last_updated_at = CURRENT_TIMESTAMP
    WHERE user_id = project_owner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_badge_stats ON validation_badges;
CREATE TRIGGER trg_dashboard_badge_stats
AFTER INSERT ON validation_badges
FOR EACH ROW EXECUTE FUNCTION update_dashboard_badge_stats();


-- ----------------------------------------------------------------------------
-- Trigger 3: Update dashboard stats on comments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dashboard_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_dashboard_stats (user_id, comment_count, last_updated_at)
        VALUES (NEW.user_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET comment_count = user_dashboard_stats.comment_count + 1,
            last_updated_at = CURRENT_TIMESTAMP;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_dashboard_stats
        SET comment_count = GREATEST(0, comment_count - 1),
            last_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_comment_stats ON comments;
CREATE TRIGGER trg_dashboard_comment_stats
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_dashboard_comment_stats();


-- ----------------------------------------------------------------------------
-- Trigger 4: Update dashboard message unread counts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dashboard_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_read = FALSE THEN
        -- New unread message
        INSERT INTO user_dashboard_stats (user_id, unread_messages, last_updated_at)
        VALUES (NEW.recipient_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET unread_messages = user_dashboard_stats.unread_messages + 1,
            last_updated_at = CURRENT_TIMESTAMP;

    ELSIF TG_OP = 'UPDATE' AND OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        -- Message marked as read
        UPDATE user_dashboard_stats
        SET unread_messages = GREATEST(0, unread_messages - 1),
            last_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.recipient_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_message_count ON direct_messages;
CREATE TRIGGER trg_dashboard_message_count
AFTER INSERT OR UPDATE ON direct_messages
FOR EACH ROW EXECUTE FUNCTION update_dashboard_message_count();


-- ----------------------------------------------------------------------------
-- Trigger 5: Update dashboard notification unread counts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dashboard_notification_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_read = FALSE THEN
        -- New unread notification
        INSERT INTO user_dashboard_stats (user_id, unread_notifications, last_updated_at)
        VALUES (NEW.user_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET unread_notifications = user_dashboard_stats.unread_notifications + 1,
            last_updated_at = CURRENT_TIMESTAMP;

    ELSIF TG_OP = 'UPDATE' AND OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        -- Notification marked as read
        UPDATE user_dashboard_stats
        SET unread_notifications = GREATEST(0, unread_notifications - 1),
            last_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_notification_count ON notifications;
CREATE TRIGGER trg_dashboard_notification_count
AFTER INSERT OR UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_dashboard_notification_count();


-- ----------------------------------------------------------------------------
-- Trigger 6: Update dashboard intro stats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dashboard_intro_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment intros_sent for requester
        INSERT INTO user_dashboard_stats (user_id, intros_sent, last_updated_at)
        VALUES (NEW.requester_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET intros_sent = user_dashboard_stats.intros_sent + 1,
            last_updated_at = CURRENT_TIMESTAMP;

        -- Increment intros_received for recipient
        INSERT INTO user_dashboard_stats (user_id, intros_received, last_updated_at)
        VALUES (NEW.recipient_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET intros_received = user_dashboard_stats.intros_received + 1,
            last_updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_intro_stats ON intros;
CREATE TRIGGER trg_dashboard_intro_stats
AFTER INSERT ON intros
FOR EACH ROW EXECUTE FUNCTION update_dashboard_intro_stats();


-- ----------------------------------------------------------------------------
-- Trigger 7: Update conversation denormalized table on new messages
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sender's conversation view
    INSERT INTO message_conversations_denorm (
        user_id, other_user_id, last_message_id, last_message_text,
        last_message_time, last_sender_id, total_messages, unread_count
    )
    VALUES (
        NEW.sender_id, NEW.recipient_id, NEW.id, NEW.message,
        NEW.created_at, NEW.sender_id, 1, 0
    )
    ON CONFLICT (user_id, other_user_id) DO UPDATE
    SET last_message_id = NEW.id,
        last_message_text = NEW.message,
        last_message_time = NEW.created_at,
        last_sender_id = NEW.sender_id,
        total_messages = message_conversations_denorm.total_messages + 1,
        updated_at = CURRENT_TIMESTAMP;

    -- Update recipient's conversation view (with unread count increment)
    INSERT INTO message_conversations_denorm (
        user_id, other_user_id, last_message_id, last_message_text,
        last_message_time, last_sender_id, total_messages, unread_count
    )
    VALUES (
        NEW.recipient_id, NEW.sender_id, NEW.id, NEW.message,
        NEW.created_at, NEW.sender_id, 1, CASE WHEN NEW.is_read THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, other_user_id) DO UPDATE
    SET last_message_id = NEW.id,
        last_message_text = NEW.message,
        last_message_time = NEW.created_at,
        last_sender_id = NEW.sender_id,
        total_messages = message_conversations_denorm.total_messages + 1,
        unread_count = CASE
            WHEN NEW.is_read THEN message_conversations_denorm.unread_count
            ELSE message_conversations_denorm.unread_count + 1
        END,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversation_on_message ON direct_messages;
CREATE TRIGGER trg_conversation_on_message
AFTER INSERT ON direct_messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();


-- ----------------------------------------------------------------------------
-- Trigger 8: Update conversation on message read
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_conversation_on_read()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        UPDATE message_conversations_denorm
        SET unread_count = GREATEST(0, unread_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.recipient_id AND other_user_id = NEW.sender_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversation_on_read ON direct_messages;
CREATE TRIGGER trg_conversation_on_read
AFTER UPDATE ON direct_messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_read();


-- ----------------------------------------------------------------------------
-- Trigger 9: Update intro request stats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_intro_request_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment pending for builder
        INSERT INTO intro_request_stats (user_id, pending_requests, last_updated_at)
        VALUES (NEW.builder_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET pending_requests = intro_request_stats.pending_requests + 1,
            last_updated_at = CURRENT_TIMESTAMP;

        -- Increment sent for investor
        INSERT INTO intro_request_stats (user_id, sent_requests, last_updated_at)
        VALUES (NEW.investor_id, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET sent_requests = intro_request_stats.sent_requests + 1,
            last_updated_at = CURRENT_TIMESTAMP;

        -- Update dashboard pending count
        UPDATE user_dashboard_stats
        SET intro_requests_pending = intro_requests_pending + 1,
            last_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.builder_id;

    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Status changed, update builder stats
        IF OLD.status = 'pending' THEN
            UPDATE intro_request_stats
            SET pending_requests = GREATEST(0, pending_requests - 1),
                approved_requests = CASE WHEN NEW.status = 'accepted' THEN approved_requests + 1 ELSE approved_requests END,
                rejected_requests = CASE WHEN NEW.status = 'declined' THEN rejected_requests + 1 ELSE rejected_requests END,
                last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.builder_id;

            -- Update dashboard pending count
            UPDATE user_dashboard_stats
            SET intro_requests_pending = GREATEST(0, intro_requests_pending - 1),
                last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.builder_id;
        END IF;

        -- Update investor stats
        IF NEW.status = 'accepted' THEN
            UPDATE intro_request_stats
            SET sent_approved = sent_approved + 1,
                last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.investor_id;
        ELSIF NEW.status = 'declined' THEN
            UPDATE intro_request_stats
            SET sent_rejected = sent_rejected + 1,
                last_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.investor_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intro_request_stats ON intro_requests;
CREATE TRIGGER trg_intro_request_stats
AFTER INSERT OR UPDATE ON intro_requests
FOR EACH ROW EXECUTE FUNCTION update_intro_request_stats();


-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify tables were created:
--
-- SELECT COUNT(*) FROM user_dashboard_stats;
-- SELECT COUNT(*) FROM message_conversations_denorm;
-- SELECT COUNT(*) FROM intro_request_stats;
--
-- Check trigger count:
-- SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_dashboard%' OR tgname LIKE 'trg_conversation%' OR tgname LIKE 'trg_intro%';
-- Expected: 9 triggers
-- ============================================================================
