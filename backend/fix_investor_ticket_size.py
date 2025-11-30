#!/usr/bin/env python3
"""
Fix investor_requests ticket_size columns to support values up to 10 billion
Changes INTEGER to BIGINT to prevent numeric overflow
Handles materialized view dependency
"""
import os
import sys
from sqlalchemy import text

# Set environment
os.environ.setdefault('FLASK_ENV', 'production')

from app import create_app
from extensions import db

# Materialized view definition
MV_DEFINITION = """
CREATE MATERIALIZED VIEW mv_investors_directory AS
SELECT ir.id,
    ir.user_id,
    ir.status,
    ir.created_at,
    ir.reviewed_at AS approved_at,
    u.username,
    u.avatar_url AS profile_image,
    u.bio,
    u.email,
    u.email_verified AS is_verified,
    ir.company_name,
    ir.industries AS investment_focus,
    ir.ticket_size_min AS ticket_size,
    ir.website_url AS portfolio_url,
    ir.linkedin_url,
    COALESCE(intro_stats.total_requests, 0::bigint) AS intro_requests_sent,
    COALESCE(intro_stats.approved_requests, 0::bigint) AS intros_approved,
    COALESCE(intro_stats.pending_requests, 0::bigint) AS intros_pending,
    (COALESCE(intro_stats.approved_requests, 0::bigint) * 10 + COALESCE(intro_stats.total_requests, 0::bigint) * 2) AS relevance_score
FROM investor_requests ir
JOIN users u ON ir.user_id = u.id
LEFT JOIN (
    SELECT investor_id,
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS approved_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_requests
    FROM intro_requests
    GROUP BY investor_id
) intro_stats ON ir.user_id = intro_stats.investor_id
WHERE ir.status = 'approved' AND u.is_active = true
ORDER BY relevance_score DESC, ir.reviewed_at DESC
"""

def fix_ticket_size_columns():
    """Alter ticket_size columns from INTEGER to BIGINT"""
    app = create_app()

    with app.app_context():
        try:
            print("Starting migration: investor_requests ticket_size INTEGER -> BIGINT")
            print("=" * 70)

            # Check current column types
            print("\n1. Checking current column types...")
            result = db.session.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'investor_requests'
                AND column_name IN ('ticket_size_min', 'ticket_size_max')
            """)).fetchall()

            for col_name, data_type in result:
                print(f"   {col_name}: {data_type}")

            # Drop materialized view
            print("\n2. Dropping materialized view mv_investors_directory...")
            db.session.execute(text("DROP MATERIALIZED VIEW IF EXISTS mv_investors_directory"))
            db.session.commit()
            print("   ✓ Materialized view dropped")

            # Alter columns to BIGINT
            print("\n3. Altering columns to BIGINT...")
            db.session.execute(text("""
                ALTER TABLE investor_requests
                ALTER COLUMN ticket_size_min TYPE BIGINT,
                ALTER COLUMN ticket_size_max TYPE BIGINT
            """))
            db.session.commit()
            print("   ✓ Columns altered successfully")

            # Verify new types
            print("\n4. Verifying new column types...")
            result = db.session.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'investor_requests'
                AND column_name IN ('ticket_size_min', 'ticket_size_max')
            """)).fetchall()

            for col_name, data_type in result:
                print(f"   {col_name}: {data_type}")
                if data_type != 'bigint':
                    raise Exception(f"Column {col_name} is still {data_type}, expected bigint")

            # Recreate materialized view
            print("\n5. Recreating materialized view...")
            db.session.execute(text(MV_DEFINITION))
            db.session.commit()
            print("   ✓ Materialized view recreated")

            # Create index
            print("\n6. Creating index on materialized view...")
            db.session.execute(text("CREATE UNIQUE INDEX idx_mv_investors_id ON mv_investors_directory(id)"))
            db.session.commit()
            print("   ✓ Index created")

            # Refresh materialized view
            print("\n7. Refreshing materialized view with current data...")
            db.session.execute(text("REFRESH MATERIALIZED VIEW mv_investors_directory"))
            db.session.commit()
            print("   ✓ Materialized view refreshed")

            print("\n" + "=" * 70)
            print("✓ Migration completed successfully!")
            print("\nBIGINT supports values up to 9,223,372,036,854,775,807")
            print("(That's 9 quintillion - more than enough for ticket sizes!)")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    fix_ticket_size_columns()
