-- ============================================================================
-- PHASE 1 BACKFILL: Populate denormalized tables with existing data
-- ============================================================================
-- Purpose: Fill newly created denormalized tables with current data
-- Run time: ~10-15 minutes (depends on data volume)
-- Impact: Read-only queries, no downtime
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. BACKFILL USER DASHBOARD STATS
-- ============================================================================
INSERT INTO user_dashboard_stats (
    user_id,
    project_count,
    active_projects,
    total_proof_score,
    comment_count,
    badges_given,
    badges_received,
    intros_sent,
    intros_received,
    intro_requests_pending,
    karma_score,
    unread_messages,
    unread_notifications,
    created_at,
    last_updated_at
)
SELECT
    u.id as user_id,

    -- Project stats
    COALESCE((SELECT COUNT(*) FROM projects WHERE user_id = u.id), 0) as project_count,
    COALESCE((SELECT COUNT(*) FROM projects WHERE user_id = u.id AND is_deleted = FALSE), 0) as active_projects,
    COALESCE((SELECT SUM(proof_score) FROM projects WHERE user_id = u.id AND is_deleted = FALSE), 0) as total_proof_score,

    -- Engagement stats
    COALESCE((SELECT COUNT(*) FROM comments WHERE user_id = u.id), 0) as comment_count,
    COALESCE((SELECT COUNT(*) FROM validation_badges WHERE validator_id = u.id), 0) as badges_given,
    COALESCE((SELECT COUNT(DISTINCT vb.id) FROM validation_badges vb
              JOIN projects p ON vb.project_id = p.id
              WHERE p.user_id = u.id), 0) as badges_received,

    -- Intro stats
    COALESCE((SELECT COUNT(*) FROM intros WHERE requester_id = u.id), 0) as intros_sent,
    COALESCE((SELECT COUNT(*) FROM intros WHERE recipient_id = u.id), 0) as intros_received,
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'pending'), 0) as intro_requests_pending,

    -- Karma (same as total proof score)
    COALESCE((SELECT SUM(proof_score) FROM projects WHERE user_id = u.id AND is_deleted = FALSE), 0) as karma_score,

    -- Unread counts
    COALESCE((SELECT COUNT(*) FROM direct_messages WHERE recipient_id = u.id AND is_read = FALSE), 0) as unread_messages,
    COALESCE((SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND is_read = FALSE), 0) as unread_notifications,

    -- Timestamps
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as last_updated_at

FROM users u
WHERE u.is_active = TRUE
ON CONFLICT (user_id) DO UPDATE
SET project_count = EXCLUDED.project_count,
    active_projects = EXCLUDED.active_projects,
    total_proof_score = EXCLUDED.total_proof_score,
    comment_count = EXCLUDED.comment_count,
    badges_given = EXCLUDED.badges_given,
    badges_received = EXCLUDED.badges_received,
    intros_sent = EXCLUDED.intros_sent,
    intros_received = EXCLUDED.intros_received,
    intro_requests_pending = EXCLUDED.intro_requests_pending,
    karma_score = EXCLUDED.karma_score,
    unread_messages = EXCLUDED.unread_messages,
    unread_notifications = EXCLUDED.unread_notifications,
    last_updated_at = CURRENT_TIMESTAMP;

-- Log progress
DO $$
DECLARE
    row_count INT;
BEGIN
    SELECT COUNT(*) INTO row_count FROM user_dashboard_stats;
    RAISE NOTICE 'Backfilled % rows in user_dashboard_stats', row_count;
END $$;


-- ============================================================================
-- 2. BACKFILL MESSAGE CONVERSATIONS
-- ============================================================================
-- Skip message conversations backfill if there are no messages yet
-- Will be populated automatically by triggers when messages are sent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM direct_messages LIMIT 1) THEN
        -- Only backfill if there are actually messages
        -- First, get all unique conversation pairs
        WITH unique_conversations AS (
            SELECT DISTINCT
                LEAST(sender_id, recipient_id) as user1,
                GREATEST(sender_id, recipient_id) as user2
            FROM direct_messages
        ),
        conversation_stats AS (
            SELECT
                uc.user1,
                uc.user2,
                (
                    SELECT id FROM direct_messages
                    WHERE (sender_id = uc.user1 AND recipient_id = uc.user2)
                       OR (sender_id = uc.user2 AND recipient_id = uc.user1)
                    ORDER BY created_at DESC LIMIT 1
                ) as last_msg_id,
                (
                    SELECT message FROM direct_messages
                    WHERE (sender_id = uc.user1 AND recipient_id = uc.user2)
                       OR (sender_id = uc.user2 AND recipient_id = uc.user1)
                    ORDER BY created_at DESC LIMIT 1
                ) as last_msg_text,
                (
                    SELECT MAX(created_at) FROM direct_messages
                    WHERE (sender_id = uc.user1 AND recipient_id = uc.user2)
                       OR (sender_id = uc.user2 AND recipient_id = uc.user1)
                ) as last_msg_time,
                (
                    SELECT sender_id FROM direct_messages
                    WHERE (sender_id = uc.user1 AND recipient_id = uc.user2)
                       OR (sender_id = uc.user2 AND recipient_id = uc.user1)
                    ORDER BY created_at DESC LIMIT 1
                ) as last_sender,
                (
                    SELECT COUNT(*) FROM direct_messages
                    WHERE (sender_id = uc.user1 AND recipient_id = uc.user2)
                       OR (sender_id = uc.user2 AND recipient_id = uc.user1)
                ) as msg_count,
                (
                    SELECT MIN(created_at) FROM direct_messages
                    WHERE (sender_id = uc.user1 AND recipient_id = uc.user2)
                       OR (sender_id = uc.user2 AND recipient_id = uc.user1)
                ) as first_msg_time
            FROM unique_conversations uc
        )
        -- Insert both perspectives for each conversation
        INSERT INTO message_conversations_denorm (
            user_id,
            other_user_id,
            last_message_id,
            last_message_text,
            last_message_time,
            last_sender_id,
            unread_count,
            total_messages,
            created_at,
            updated_at
        )
        SELECT * FROM (
            -- Insert from user1's perspective
            SELECT
                cs.user1 as user_id,
                cs.user2 as other_user_id,
                cs.last_msg_id,
                cs.last_msg_text,
                cs.last_msg_time,
                cs.last_sender,
                COALESCE((
                    SELECT COUNT(*) FROM direct_messages
                    WHERE recipient_id = cs.user1 AND sender_id = cs.user2 AND is_read = FALSE
                ), 0) as unread_count,
                cs.msg_count,
                cs.first_msg_time as created_at,
                cs.last_msg_time as updated_at
            FROM conversation_stats cs
            
            UNION ALL
            
            -- Insert from user2's perspective
            SELECT
                cs.user2 as user_id,
                cs.user1 as other_user_id,
                cs.last_msg_id,
                cs.last_msg_text,
                cs.last_msg_time,
                cs.last_sender,
                COALESCE((
                    SELECT COUNT(*) FROM direct_messages
                    WHERE recipient_id = cs.user2 AND sender_id = cs.user1 AND is_read = FALSE
                ), 0) as unread_count,
                cs.msg_count,
                cs.first_msg_time as created_at,
                cs.last_msg_time as updated_at
            FROM conversation_stats cs
        ) all_perspectives
        ON CONFLICT (user_id, other_user_id) DO NOTHING;
    END IF;
END $$;

-- Log progress
DO $$
DECLARE
    row_count INT;
BEGIN
    SELECT COUNT(*) INTO row_count FROM message_conversations_denorm;
    RAISE NOTICE 'Backfilled % rows in message_conversations_denorm', row_count;
END $$;


-- ============================================================================
-- 3. BACKFILL INTRO REQUEST STATS
-- ============================================================================
INSERT INTO intro_request_stats (
    user_id,
    pending_requests,
    approved_requests,
    rejected_requests,
    sent_requests,
    sent_approved,
    sent_rejected,
    created_at,
    last_updated_at
)
SELECT
    u.id as user_id,

    -- As builder (receiving requests)
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'pending'), 0) as pending_requests,
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'accepted'), 0) as approved_requests,
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'declined'), 0) as rejected_requests,

    -- As investor (sending requests)
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE investor_id = u.id), 0) as sent_requests,
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE investor_id = u.id AND status = 'accepted'), 0) as sent_approved,
    COALESCE((SELECT COUNT(*) FROM intro_requests WHERE investor_id = u.id AND status = 'declined'), 0) as sent_rejected,

    -- Timestamps
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as last_updated_at

FROM users u
WHERE u.is_active = TRUE
ON CONFLICT (user_id) DO UPDATE
SET pending_requests = EXCLUDED.pending_requests,
    approved_requests = EXCLUDED.approved_requests,
    rejected_requests = EXCLUDED.rejected_requests,
    sent_requests = EXCLUDED.sent_requests,
    sent_approved = EXCLUDED.sent_approved,
    sent_rejected = EXCLUDED.sent_rejected,
    last_updated_at = CURRENT_TIMESTAMP;

-- Log progress
DO $$
DECLARE
    row_count INT;
BEGIN
    SELECT COUNT(*) INTO row_count FROM intro_request_stats;
    RAISE NOTICE 'Backfilled % rows in intro_request_stats', row_count;
END $$;


-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after backfill to verify data:
--
-- SELECT COUNT(*) FROM user_dashboard_stats;
-- SELECT * FROM user_dashboard_stats ORDER BY karma_score DESC LIMIT 10;
--
-- SELECT COUNT(*) FROM message_conversations_denorm;
-- SELECT * FROM message_conversations_denorm ORDER BY last_message_time DESC LIMIT 10;
--
-- SELECT COUNT(*) FROM intro_request_stats;
-- SELECT * FROM intro_request_stats WHERE pending_requests > 0 LIMIT 10;
-- ============================================================================
