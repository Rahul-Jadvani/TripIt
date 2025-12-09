"""
Script to migrate materialized views from old database to new database
"""
import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def parse_database_url(url):
    """Parse PostgreSQL connection URL into components"""
    # Remove postgresql:// prefix
    url = url.replace('postgresql://', '')

    # Split user:password@host
    auth_host = url.split('?')[0]  # Remove query params for parsing
    auth, host_db = auth_host.split('@')
    user, password = auth.split(':')

    # Split host:port/database
    host_port, database = host_db.split('/')
    host, port = host_port.split(':')

    # Extract query params for sslmode
    sslmode = 'prefer'  # Default
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
    """Connect to PostgreSQL database using connection URL"""
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

    return conn


def get_materialized_views(conn):
    """Get all materialized views and their definitions from database"""
    cursor = conn.cursor()

    # Query to get all materialized views with their definitions
    query = """
    SELECT
        schemaname,
        matviewname,
        pg_get_viewdef(
            (schemaname || '.' || matviewname)::regclass,
            true
        ) as definition
    FROM pg_matviews
    WHERE schemaname = 'public'
    ORDER BY matviewname;
    """

    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()

    return results


def get_materialized_view_indexes(conn, schema, mv_name):
    """Get all indexes for a specific materialized view"""
    cursor = conn.cursor()

    query = """
    SELECT
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = %s
    AND tablename = %s
    ORDER BY indexname;
    """

    cursor.execute(query, (schema, mv_name))
    results = cursor.fetchall()
    cursor.close()

    return results


def drop_materialized_view_if_exists(conn, schema, mv_name):
    """Drop materialized view if it exists"""
    cursor = conn.cursor()

    drop_query = sql.SQL("DROP MATERIALIZED VIEW IF EXISTS {}.{} CASCADE").format(
        sql.Identifier(schema),
        sql.Identifier(mv_name)
    )

    try:
        cursor.execute(drop_query)
        conn.commit()
        print(f"  ✓ Dropped existing MV: {schema}.{mv_name}")
    except Exception as e:
        conn.rollback()
        print(f"  ⚠ Could not drop MV {schema}.{mv_name}: {e}")
    finally:
        cursor.close()


def create_materialized_view(conn, schema, mv_name, definition):
    """Create materialized view in target database"""
    cursor = conn.cursor()

    # Create the materialized view
    create_query = sql.SQL("CREATE MATERIALIZED VIEW {}.{} AS {}").format(
        sql.Identifier(schema),
        sql.Identifier(mv_name),
        sql.SQL(definition)
    )

    try:
        cursor.execute(create_query)
        conn.commit()
        print(f"  ✓ Created MV: {schema}.{mv_name}")
        return True
    except Exception as e:
        conn.rollback()
        print(f"  ✗ Failed to create MV {schema}.{mv_name}: {e}")
        return False
    finally:
        cursor.close()


def create_indexes(conn, indexes):
    """Create indexes on materialized view"""
    cursor = conn.cursor()

    for index_name, index_def in indexes:
        try:
            cursor.execute(index_def)
            conn.commit()
            print(f"    ✓ Created index: {index_name}")
        except Exception as e:
            conn.rollback()
            print(f"    ⚠ Could not create index {index_name}: {e}")

    cursor.close()


def refresh_materialized_view(conn, schema, mv_name):
    """Refresh materialized view with data"""
    cursor = conn.cursor()

    refresh_query = sql.SQL("REFRESH MATERIALIZED VIEW {}.{}").format(
        sql.Identifier(schema),
        sql.Identifier(mv_name)
    )

    try:
        cursor.execute(refresh_query)
        conn.commit()
        print(f"  ✓ Refreshed MV: {schema}.{mv_name}")
    except Exception as e:
        conn.rollback()
        print(f"  ⚠ Could not refresh MV {schema}.{mv_name}: {e}")
    finally:
        cursor.close()


def migrate_materialized_views(old_db_url, new_db_url):
    """Main function to migrate all materialized views from old to new database"""

    print("=" * 70)
    print("MATERIALIZED VIEW MIGRATION")
    print("=" * 70)
    print()

    # Connect to old database
    print("📡 Connecting to OLD database...")
    old_conn = connect_to_database(old_db_url)
    print("  ✓ Connected to old database")
    print()

    # Connect to new database
    print("📡 Connecting to NEW database...")
    new_conn = connect_to_database(new_db_url)
    print("  ✓ Connected to new database")
    print()

    # Get all materialized views from old database
    print("🔍 Fetching materialized views from old database...")
    mvs = get_materialized_views(old_conn)
    print(f"  ✓ Found {len(mvs)} materialized views")
    print()

    if not mvs:
        print("⚠ No materialized views found in old database")
        old_conn.close()
        new_conn.close()
        return

    # Migrate each materialized view
    print("🚀 Migrating materialized views...")
    print()

    success_count = 0
    failed_count = 0

    for schema, mv_name, definition in mvs:
        print(f"📦 Processing: {schema}.{mv_name}")

        # Get indexes for this MV
        indexes = get_materialized_view_indexes(old_conn, schema, mv_name)
        if indexes:
            print(f"  → Found {len(indexes)} indexes")

        # Drop if exists in new database
        drop_materialized_view_if_exists(new_conn, schema, mv_name)

        # Create materialized view
        if create_materialized_view(new_conn, schema, mv_name, definition):
            # Create indexes
            if indexes:
                create_indexes(new_conn, indexes)

            # Refresh with data
            refresh_materialized_view(new_conn, schema, mv_name)

            success_count += 1
        else:
            failed_count += 1

        print()

    # Close connections
    old_conn.close()
    new_conn.close()

    # Summary
    print("=" * 70)
    print("MIGRATION SUMMARY")
    print("=" * 70)
    print(f"✓ Successfully migrated: {success_count} materialized views")
    if failed_count > 0:
        print(f"✗ Failed: {failed_count} materialized views")
    print()


if __name__ == "__main__":
    # Get database URLs from .env
    # Old database (commented out in .env - we'll use it directly)
    OLD_DB_URL = "postgresql://neondb_owner:npg_kgiQyc4dJA6C@ep-falling-dust-ad4x9ty7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=10&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5"

    # New database (active in .env)
    NEW_DB_URL = os.getenv('DATABASE_URL')

    if not NEW_DB_URL:
        print("❌ ERROR: DATABASE_URL not found in .env")
        exit(1)

    print(f"Old DB: {OLD_DB_URL.split('@')[1].split('/')[0]}...")  # Show host only
    print(f"New DB: {NEW_DB_URL.split('@')[1].split('?')[0]}...")  # Show host:port/db only
    print()

    # Run migration
    migrate_materialized_views(OLD_DB_URL, NEW_DB_URL)

    print("🎉 Migration complete!")
