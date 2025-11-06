-- Fix ambiguous column reference in process_mv_refresh_queue function
-- Run this to update the function after Phase 2 migration

CREATE OR REPLACE FUNCTION process_mv_refresh_queue()
RETURNS TABLE(view_name TEXT, status TEXT, duration_ms INT, row_count BIGINT) AS $$
DECLARE
    refresh_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INT;
    rows BIGINT;
BEGIN
    -- Process all pending refreshes
    FOR refresh_record IN
        SELECT * FROM mv_refresh_queue
        WHERE mv_refresh_queue.status = 'pending'
        ORDER BY refresh_requested_at ASC
    LOOP
        BEGIN
            -- Mark as in progress
            UPDATE mv_refresh_queue
            SET status = 'in_progress',
                refresh_started_at = CURRENT_TIMESTAMP
            WHERE mv_refresh_queue.id = refresh_record.id;

            -- Execute refresh
            start_time := CLOCK_TIMESTAMP();
            EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', refresh_record.view_name);
            end_time := CLOCK_TIMESTAMP();

            -- Get row count
            EXECUTE format('SELECT COUNT(*) FROM %I', refresh_record.view_name) INTO rows;

            -- Calculate duration
            duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

            -- Mark as completed
            UPDATE mv_refresh_queue
            SET status = 'completed',
                refresh_completed_at = end_time,
                last_refresh_duration_ms = duration
            WHERE mv_refresh_queue.id = refresh_record.id;

            -- Log to history
            INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_completed_at, duration_ms, row_count, triggered_by, status)
            VALUES (refresh_record.view_name, start_time, end_time, duration, rows, refresh_record.triggered_by, 'completed');

            -- Return result
            view_name := refresh_record.view_name;
            status := 'completed';
            duration_ms := duration;
            row_count := rows;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed
            UPDATE mv_refresh_queue
            SET status = 'failed',
                error_message = SQLERRM,
                refresh_completed_at = CURRENT_TIMESTAMP
            WHERE mv_refresh_queue.id = refresh_record.id;

            -- Log failure
            INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_completed_at, triggered_by, status)
            VALUES (refresh_record.view_name, start_time, CURRENT_TIMESTAMP, refresh_record.triggered_by, 'failed');

            -- Return error result
            view_name := refresh_record.view_name;
            status := 'failed';
            duration_ms := 0;
            row_count := 0;
            RETURN NEXT;
        END;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_mv_refresh_queue IS 'Process all pending materialized view refreshes (called by background worker)';

