"""Apply float migration - Drop ALL MVs, change columns, recreate MVs"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("Starting migration to change score columns to NUMERIC (Float)...\n")

with engine.begin() as conn:
    try:
        # Step 1: Drop ALL materialized views that might depend on score columns
        print("[1/4] Dropping all materialized views...")
        mvs_to_drop = [
            "mv_feed_projects",
            "mv_leaderboard_projects",
            "mv_search_projects"
        ]
        for mv in mvs_to_drop:
            print(f"      Dropping {mv}...")
            conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {mv} CASCADE"))
        print("      Done!\n")

        # Step 2: Alter column types
        print("[2/4] Changing column types to NUMERIC...")
        statements = [
            "ALTER TABLE projects ALTER COLUMN proof_score TYPE NUMERIC USING proof_score::numeric",
            "ALTER TABLE projects ALTER COLUMN verification_score TYPE NUMERIC USING verification_score::numeric",
            "ALTER TABLE projects ALTER COLUMN community_score TYPE NUMERIC USING community_score::numeric",
            "ALTER TABLE projects ALTER COLUMN validation_score TYPE NUMERIC USING validation_score::numeric",
            "ALTER TABLE projects ALTER COLUMN quality_score TYPE NUMERIC USING quality_score::numeric"
        ]

        for i, stmt in enumerate(statements, 1):
            print(f"      [{i}/5] {stmt[:50]}...")
            conn.execute(text(stmt))
        print("      Done!\n")

        # Step 3: Recreate mv_feed_projects
        print("[3/4] Recreating mv_feed_projects...")
        mv_feed_sql = """
CREATE MATERIALIZED VIEW mv_feed_projects AS
SELECT
    p.id,
    p.title,
    p.tagline,
    p.description,
    p.tech_stack,
    p.demo_url,
    p.github_url,
    p.created_at,
    p.updated_at,
    p.is_featured,
    p.user_id,
    u.username as creator_username,
    u.display_name as creator_display_name,
    u.avatar_url as creator_avatar_url,
    u.email_verified as creator_is_verified,
    cp.chain_id,
    c.name as chain_name,
    c.slug as chain_slug,
    c.logo_url as chain_logo_url,
    p.proof_score,
    COALESCE(comment_counts.count, 0) as comment_count,
    COALESCE(upvote_counts.count, 0) as upvote_count,
    COALESCE(downvote_counts.count, 0) as downvote_count,
    COALESCE(badge_counts.count, 0) as badge_count,
    (COALESCE(upvote_counts.count, 0) - COALESCE(downvote_counts.count, 0)) as net_score,
    (
        p.proof_score * 0.5 +
        COALESCE(comment_counts.count, 0) * 2 +
        COALESCE(upvote_counts.count, 0) * 1.5 -
        COALESCE(downvote_counts.count, 0) * 1 +
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) / 3600) * -0.1
    ) as trending_score
FROM projects p
JOIN users u ON p.user_id = u.id
LEFT JOIN LATERAL (
    SELECT chain_id
    FROM chain_projects
    WHERE project_id = p.id
    LIMIT 1
) cp ON true
LEFT JOIN chains c ON cp.chain_id = c.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM comments
    GROUP BY project_id
) comment_counts ON p.id = comment_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM votes
    WHERE vote_type = 'up'
    GROUP BY project_id
) upvote_counts ON p.id = upvote_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM votes
    WHERE vote_type = 'down'
    GROUP BY project_id
) downvote_counts ON p.id = downvote_counts.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM validation_badges
    GROUP BY project_id
) badge_counts ON p.id = badge_counts.project_id
WHERE p.id IS NOT NULL
        """
        conn.execute(text(mv_feed_sql))
        print("      Created mv_feed_projects")

        # Step 4: Create indexes
        print("[4/4] Creating indexes...")
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_feed_projects_id ON mv_feed_projects(id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mv_feed_trending ON mv_feed_projects(trending_score DESC, created_at DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mv_feed_newest ON mv_feed_projects(created_at DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mv_feed_top_rated ON mv_feed_projects(net_score DESC, created_at DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mv_feed_featured ON mv_feed_projects(is_featured DESC, trending_score DESC)"))
        print("      Done!\n")

        print("SUCCESS! Migration completed successfully!")
        print("- All score columns are now NUMERIC (Float) type")
        print("- mv_feed_projects has been recreated")
        print("- Other MVs (leaderboard, search) will be recreated on app startup")

    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        raise
