"""
Standalone script to add missing unique constraints to production database.
Fixes ON CONFLICT errors when GitHub connecting and publishing projects.

Run this script directly:
    python add_missing_constraints.py

Or use the deployment script which runs this automatically.
"""
import psycopg2
import sys

# Production database URL - update this for your environment
PROD_DB_URL = "postgresql://zer0_prod_user:CHANGE_PASSWORD@postgres:5432/zer0_discovery_prod?sslmode=disable"

# Or for local Docker:
# PROD_DB_URL = "postgresql://zer0_user:zer0_local_password_change_me@postgres:5432/zer0_discovery?sslmode=disable"


def parse_database_url(url):
    """Parse PostgreSQL connection URL into components"""
    url = url.replace('postgresql://', '')
    auth_host = url.split('?')[0]
    auth, host_db = auth_host.split('@')
    user, password = auth.split(':')
    host_port, database = host_db.split('/')

    if ':' in host_port:
        host, port = host_port.split(':')
    else:
        host = host_port
        port = '5432'

    sslmode = 'prefer'
    if '?' in url:
        params = url.split('?')[1]
        for param in params.split('&'):
            if param.startswith('sslmode='):
                sslmode = param.split('=')[1]

    return {
        'host': host,
        'port': port,
        'database': database,
        'user': user,
        'password': password,
        'sslmode': sslmode
    }


def connect_to_database(db_url):
    """Connect to PostgreSQL database"""
    db_config = parse_database_url(db_url)
    conn = psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database'],
        user=db_config['user'],
        password=db_config['password'],
        sslmode=db_config['sslmode'],
        connect_timeout=30
    )
    conn.autocommit = True
    return conn


def add_missing_unique_constraints(conn):
    """Add missing unique constraints required for ON CONFLICT operations"""
    cursor = conn.cursor()

    print("=" * 70)
    print("  Adding Missing Unique Constraints")
    print("=" * 70)
    print()

    constraints_to_add = [
        {
            'table': 'mv_refresh_queue',
            'column': 'view_name',
            'index_name': 'idx_mv_refresh_queue_view_name',
            'reason': 'Required for ON CONFLICT in queue_mv_refresh() function'
        },
        {
            'table': 'user_dashboard_stats',
            'column': 'user_id',
            'index_name': 'idx_user_dashboard_stats_user_id',
            'reason': 'Required for ON CONFLICT in update_dashboard_project_stats() trigger'
        }
    ]

    success_count = 0
    skip_count = 0

    for constraint in constraints_to_add:
        table = constraint['table']
        column = constraint['column']
        index_name = constraint['index_name']
        reason = constraint['reason']

        print(f"📋 Checking {table}.{column}...")

        try:
            # Check if table exists
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = '{table}'
                );
            """)
            table_exists = cursor.fetchone()[0]

            if not table_exists:
                print(f"   ⚠️  Table '{table}' does not exist - skipping")
                skip_count += 1
                print()
                continue

            # Check if unique constraint already exists
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname = 'public'
                    AND tablename = '{table}'
                    AND indexname = '{index_name}'
                );
            """)
            constraint_exists = cursor.fetchone()[0]

            if constraint_exists:
                print(f"   ✅ Unique constraint already exists: {index_name}")
                skip_count += 1
                print()
                continue

            # Add unique constraint
            cursor.execute(f"""
                CREATE UNIQUE INDEX IF NOT EXISTS {index_name}
                ON public.{table}({column});
            """)

            print(f"   ✅ Added unique constraint: {index_name}")
            print(f"      Reason: {reason}")
            success_count += 1
            print()

        except Exception as e:
            print(f"   ❌ Failed to add constraint: {e}")
            print()
            continue

    cursor.close()

    print("=" * 70)
    if success_count > 0:
        print(f"✅ Successfully added {success_count} unique constraint(s)")
    if skip_count > 0:
        print(f"ℹ️  Skipped {skip_count} (already exists or table not found)")
    print("=" * 70)
    print()

    return success_count


def main():
    """Main function"""
    print()
    print("🔧 Missing Unique Constraints Fix")
    print("   Fixes: GitHub OAuth connect & Project publish errors")
    print()

    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = connect_to_database(PROD_DB_URL)
        db_name = PROD_DB_URL.split('/')[-1].split('?')[0]
        print(f"   ✅ Connected to: {db_name}")
        print()

        # Add constraints
        added_count = add_missing_unique_constraints(conn)

        # Close connection
        conn.close()

        if added_count > 0:
            print("🎉 All fixes applied successfully!")
            print()
            print("You can now:")
            print("  ✅ Connect GitHub in publish form")
            print("  ✅ Publish projects without errors")
            print()
            return 0
        else:
            print("✅ No changes needed - all constraints already exist")
            print()
            return 0

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("💡 Troubleshooting:")
        print("  1. Check database URL is correct in this script")
        print("  2. Ensure database is accessible from this machine")
        print("  3. Verify credentials are correct")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
