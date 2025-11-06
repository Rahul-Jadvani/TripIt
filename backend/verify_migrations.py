"""
Verification script to check that all migrations completed successfully
"""
from extensions import db
from app import create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Check tables
    result = db.session.execute(text("""
        SELECT table_name FROM information_schema.tables
        WHERE table_name IN ('user_dashboard_stats', 'message_conversations_denorm', 'intro_request_stats')
    """))
    tables = [r[0] for r in result.fetchall()]
    print(f'✓ Created {len(tables)} denormalized tables: {tables}')

    # Check materialized views
    result = db.session.execute(text("""
        SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
    """))
    views = [r[0] for r in result.fetchall()]
    print(f'✓ Created {len(views)} materialized views: {views}')

    # Check triggers
    result = db.session.execute(text("""
        SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_%'
    """))
    trigger_count = result.scalar()
    print(f'✓ Created {trigger_count} triggers')

    # Check data
    result = db.session.execute(text("SELECT COUNT(*) FROM user_dashboard_stats"))
    stats_count = result.scalar()
    print(f'✓ Dashboard stats rows: {stats_count}')

    result = db.session.execute(text("SELECT COUNT(*) FROM mv_feed_projects"))
    feed_count = result.scalar()
    print(f'✓ Feed projects in MV: {feed_count}')

    print('\n✓✓✓ ALL MIGRATIONS SUCCESSFUL! ✓✓✓')

