"""
Emergency fix for corrupted materialized view
Refreshes mv_feed_projects and ensures data integrity
"""
from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    print("=" * 60)
    print("FIXING CORRUPTED MATERIALIZED VIEW")
    print("=" * 60)
    
    try:
        # Check current state
        print("\n[1] Checking current state of mv_feed_projects...")
        count_result = db.session.execute(text("SELECT COUNT(*) FROM mv_feed_projects"))
        current_count = count_result.scalar()
        print(f"    Current row count: {current_count}")
        
        # Check for NULL usernames (corruption indicator)
        null_users = db.session.execute(text("""
            SELECT COUNT(*) FROM mv_feed_projects
            WHERE creator_username IS NULL OR creator_username = ''
        """)).scalar()
        print(f"    Rows with NULL/empty creator_username: {null_users}")

        # Check sample data
        sample = db.session.execute(text("""
            SELECT id, creator_username, upvote_count, comment_count, creator_avatar_url
            FROM mv_feed_projects
            LIMIT 5
        """)).fetchall()

        print("\n[2] Sample data before refresh:")
        for row in sample:
            print(f"    ID: {row[0]}, Username: {row[1]}, Upvotes: {row[2]}, Comments: {row[3]}, Avatar: {row[4]}")
        
        # Refresh the materialized view
        print("\n[3] Refreshing materialized view...")
        db.session.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feed_projects"))
        db.session.commit()
        print("    [OK] Refresh completed")
        
        # Check state after refresh
        print("\n[4] Checking state after refresh...")
        count_result = db.session.execute(text("SELECT COUNT(*) FROM mv_feed_projects"))
        new_count = count_result.scalar()
        print(f"    New row count: {new_count}")
        
        # Check for NULL usernames after refresh
        null_users_after = db.session.execute(text("""
            SELECT COUNT(*) FROM mv_feed_projects
            WHERE creator_username IS NULL OR creator_username = ''
        """)).scalar()
        print(f"    Rows with NULL/empty creator_username: {null_users_after}")

        # Check sample data after refresh
        sample_after = db.session.execute(text("""
            SELECT id, creator_username, upvote_count, comment_count, creator_avatar_url
            FROM mv_feed_projects
            LIMIT 5
        """)).fetchall()

        print("\n[5] Sample data after refresh:")
        for row in sample_after:
            print(f"    ID: {row[0]}, Username: {row[1]}, Upvotes: {row[2]}, Comments: {row[3]}, Avatar: {row[4]}")
        
        # Verify the view structure
        print("\n[6] Verifying view structure...")
        columns = db.session.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'mv_feed_projects'
            ORDER BY ordinal_position
        """)).fetchall()
        
        print("    Columns in mv_feed_projects:")
        for col in columns:
            print(f"      - {col[0]} ({col[1]})")
        
        print("\n" + "=" * 60)
        print("[SUCCESS] Materialized view fix completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] Failed to fix materialized view: {e}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
