-- Add comment_id column to notifications table
-- Run this SQL file directly in your PostgreSQL database
-- psql -U postgres -d oxship -f migrations/add_comment_id_to_notifications.sql

-- Check if the column already exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'comment_id'
    ) THEN
        -- Add the comment_id column
        ALTER TABLE notifications
        ADD COLUMN comment_id VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE;

        -- Create index for faster lookups
        CREATE INDEX idx_notifications_comment ON notifications(comment_id);

        RAISE NOTICE 'Successfully added comment_id column to notifications table';
    ELSE
        RAISE NOTICE 'comment_id column already exists in notifications table';
    END IF;
END $$;
