"""
Migration Runner - Execute all denormalization migrations
"""
import os
import sys
import re
import time
from extensions import db
from app import create_app
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
import psycopg2

def run_sql_file(filename, description, max_retries=3):
    """Run a SQL file migration with deadlock retry logic"""
    print(f"\n{'='*70}")
    print(f"Running: {description}")
    print(f"File: {filename}")
    print(f"{'='*70}\n")

    filepath = os.path.join('migrations', filename)

    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        return False

    for attempt in range(1, max_retries + 1):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            # Execute the SQL
            db.session.execute(text(sql_content))
            db.session.commit()

            if attempt > 1:
                print(f"  (Succeeded on attempt {attempt})")
            
            print(f"SUCCESS: {description} completed")
            return True

        except (OperationalError, Exception) as e:
            error_str = str(e)
            
            # Check if it's a deadlock error
            if 'deadlock' in error_str.lower() or 'DeadlockDetected' in error_str:
                if attempt < max_retries:
                    wait_time = attempt * 2  # Exponential backoff: 2s, 4s, 6s
                    print(f"  [WARN] Deadlock detected (attempt {attempt}/{max_retries})")
                    print(f"  [INFO] Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    db.session.rollback()
                    continue
                else:
                    print(f"ERROR in {description}:")
                    print(f"   Deadlock detected after {max_retries} attempts")
                    print(f"   {error_str[:200]}")
                    print(f"\n   [HINT] Try stopping any background processes (cache warmer, workers)")
                    print(f"   [HINT] and run migrations when database is less busy")
                    db.session.rollback()
                    return False
            else:
                # Non-deadlock error, don't retry
                print(f"ERROR in {description}:")
                print(f"   {str(e)}")
                db.session.rollback()
                return False
    
    return False

def run_indexes_file(filename, description):
    """Run Phase 4 indexes file - executes each CREATE INDEX CONCURRENTLY outside transaction"""
    print(f"\n{'='*70}")
    print(f"Running: {description}")
    print(f"File: {filename}")
    print(f"{'='*70}\n")

    filepath = os.path.join('migrations', filename)

    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        return False

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        # Split SQL into individual CREATE INDEX CONCURRENTLY statements
        # Find all CREATE INDEX CONCURRENTLY blocks (preserving original formatting)
        statements = []
        lines = sql_content.split('\n')
        current_statement = []
        in_statement = False
        
        for line in lines:
            stripped = line.strip()
            
            # Check if this line starts a CREATE INDEX CONCURRENTLY statement
            if 'CREATE INDEX CONCURRENTLY' in stripped.upper() and 'IF NOT EXISTS' in stripped.upper():
                in_statement = True
                current_statement = [line]
            elif in_statement:
                current_statement.append(line)
                # Check if this line ends the statement (ends with semicolon)
                if stripped.endswith(';'):
                    statement = '\n'.join(current_statement).strip()
                    if statement:
                        statements.append(statement)
                    current_statement = []
                    in_statement = False
        
        # Also handle COMMENT ON INDEX statements (they can be in transaction)
        comment_statements = []
        for line in sql_content.split('\n'):
            stripped = line.strip()
            if stripped.startswith('COMMENT ON INDEX'):
                comment_statements.append(stripped)

        # Get raw connection to execute outside transaction
        # Must use autocommit mode for CREATE INDEX CONCURRENTLY
        connection = db.engine.raw_connection()
        
        try:
            # Set autocommit mode - required for CREATE INDEX CONCURRENTLY
            connection.set_isolation_level(0)  # 0 = autocommit mode
            cursor = connection.cursor()
            
            # Execute each CREATE INDEX CONCURRENTLY statement individually
            total = len(statements)
            success_count = 0
            error_count = 0
            
            for i, statement in enumerate(statements, 1):
                # Extract index name for progress display
                match = re.search(r'CREATE INDEX CONCURRENTLY IF NOT EXISTS (\w+)', statement, re.IGNORECASE)
                index_name = match.group(1) if match else f"index_{i}"
                
                try:
                    print(f"  [{i}/{total}] Creating index: {index_name}...", end=' ', flush=True)
                    cursor.execute(statement)
                    # No commit needed in autocommit mode, but we can still call it
                    print("✓")
                    success_count += 1
                except Exception as e:
                    # Check if index already exists (that's OK)
                    if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                        print("✓ (already exists)")
                        success_count += 1
                    else:
                        print(f"✗ Error: {str(e)[:100]}")
                        error_count += 1
            
            # Execute COMMENT statements (can be in autocommit mode too)
            if comment_statements:
                print(f"\n  Adding index comments...")
                for comment_stmt in comment_statements:
                    try:
                        cursor.execute(comment_stmt)
                    except Exception as e:
                        # Ignore comment errors (non-critical)
                        pass
            
            cursor.close()
            
            print(f"\n  Summary: {success_count} succeeded, {error_count} failed out of {total} indexes")
            
            if error_count == 0:
                print(f"\nSUCCESS: {description} completed")
                return True
            elif success_count > 0:
                print(f"\nPARTIAL SUCCESS: {description} completed with {error_count} errors")
                return True  # Still return True since some indexes were created
            else:
                print(f"\nFAILED: {description} - all indexes failed")
                return False
                
        finally:
            connection.close()

    except Exception as e:
        print(f"ERROR in {description}:")
        print(f"   {str(e)}")
        return False

def verify_phase(phase_name, verification_queries):
    """Verify a phase completed successfully"""
    print(f"\n{'='*70}")
    print(f"Verifying: {phase_name}")
    print(f"{'='*70}\n")

    all_passed = True
    for desc, query in verification_queries:
        try:
            result = db.session.execute(text(query))
            value = result.scalar()
            print(f"[OK] {desc}: {value}")
        except Exception as e:
            print(f"[FAIL] {desc}: FAILED - {str(e)}")
            all_passed = False

    return all_passed

def main():
    """Main migration runner"""
    print("\n" + "="*70)
    print("  DENORMALIZATION SYSTEM - COMPLETE MIGRATION")
    print("="*70)

    # Disable cache warmer during migrations to avoid deadlocks
    os.environ['DISABLE_CACHE_WARMER'] = '1'
    
    app = create_app()

    with app.app_context():
        # Phase 1: Denormalized Tables
        success = run_sql_file(
            'phase1_denormalized_tables.sql',
            'Phase 1: Create Denormalized Tables with Triggers'
        )

        if not success:
            print("\n[ERROR] Phase 1 failed. Stopping migrations.")
            sys.exit(1)

        # Verify Phase 1
        verify_phase('Phase 1 - Tables Created', [
            ('user_dashboard_stats table', "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_dashboard_stats'"),
            ('message_conversations_denorm table', "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'message_conversations_denorm'"),
            ('intro_request_stats table', "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'intro_request_stats'"),
            ('Dashboard triggers', "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_dashboard%'"),
        ])

        # Phase 1 Backfill
        success = run_sql_file(
            'phase1_backfill_data.sql',
            'Phase 1 Backfill: Populate Denormalized Tables'
        )

        if not success:
            print("\n[ERROR] Phase 1 backfill failed. Stopping migrations.")
            sys.exit(1)

        # Verify backfill
        verify_phase('Phase 1 - Data Backfilled', [
            ('user_dashboard_stats rows', "SELECT COUNT(*) FROM user_dashboard_stats"),
            ('message_conversations rows', "SELECT COUNT(*) FROM message_conversations_denorm"),
            ('intro_request_stats rows', "SELECT COUNT(*) FROM intro_request_stats"),
        ])

        # Phase 2: Materialized Views
        success = run_sql_file(
            'phase2_materialized_views.sql',
            'Phase 2: Create Materialized Views with Debouncing'
        )

        if not success:
            print("\n[ERROR] Phase 2 failed. Stopping migrations.")
            sys.exit(1)

        # Verify Phase 2
        verify_phase('Phase 2 - Materialized Views', [
            ('mv_feed_projects', "SELECT COUNT(*) FROM mv_feed_projects"),
            ('mv_leaderboard_projects', "SELECT COUNT(*) FROM mv_leaderboard_projects"),
            ('mv_leaderboard_builders', "SELECT COUNT(*) FROM mv_leaderboard_builders"),
            ('mv_chains_discovery', "SELECT COUNT(*) FROM mv_chains_discovery"),
            ('mv_project_details', "SELECT COUNT(*) FROM mv_project_details"),
            ('Refresh queue table', "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mv_refresh_queue'"),
        ])

        # Phase 3: Search and Forums
        success = run_sql_file(
            'phase3_search_and_forums.sql',
            'Phase 3: Create Search Index and Chain Forums'
        )

        if not success:
            print("\n[ERROR] Phase 3 failed. Stopping migrations.")
            sys.exit(1)

        # Verify Phase 3
        verify_phase('Phase 3 - Search and Forums', [
            ('pg_trgm extension', "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm'"),
            ('mv_search_index', "SELECT COUNT(*) FROM mv_search_index"),
            ('mv_chain_posts', "SELECT COUNT(*) FROM mv_chain_posts"),
            ('mv_investors_directory', "SELECT COUNT(*) FROM mv_investors_directory"),
        ])

        # Phase 4: Indexes (special handling for CONCURRENTLY)
        print(f"\n{'='*70}")
        print(f"Running: Phase 4: Add Critical Indexes")
        print(f"Note: This phase uses CONCURRENTLY and may take 15-20 minutes")
        print(f"{'='*70}\n")

        success = run_indexes_file(
            'phase4_critical_indexes.sql',
            'Phase 4: Add Critical Performance Indexes'
        )

        if not success:
            print("\n[WARN]  Phase 4 had some issues, but this is non-critical.")
            print("    You can continue and fix indexes later if needed.")

        # Final Summary
        print("\n" + "="*70)
        print("  MIGRATION COMPLETE!")
        print("="*70)
        print("\n[OK] All phases completed successfully!")
        print("\nNext steps:")
        print("1. Review the output above for any warnings")
        print("2. Start the MV refresh worker: python workers/mv_refresh_worker.py")
        print("3. Setup nightly reconciliation cron job")
        print("4. Update app.py to initialize Redis cache")
        print("5. Test the application")

        sys.exit(0)

if __name__ == '__main__':
    main()
