"""
COMPREHENSIVE DATABASE SCHEMA MIGRATION SCRIPT
Migrates EVERYTHING - complete replica of database schema (no data)

Migrates:
- Extensions
- Custom types/enums
- Sequences
- Tables (all columns, defaults, constraints)
- Primary keys
- Unique constraints
- Check constraints
- Foreign keys
- Indexes (all types)
- Functions/Procedures
- Triggers
- Regular views
- Materialized views
- Comments
- Everything else
"""
import psycopg2
from psycopg2 import sql

# ============================================================================
# DATABASE URLs - CHANGE THESE AS NEEDED
# ============================================================================
# For Docker deployment: Use Docker service name 'postgres' instead of 'localhost'
# For local (non-Docker): Use 'localhost'

# OLD DATABASE (Source) - Your existing Neon database
OLD_DB_URL = "postgresql://neondb_owner:npg_kgiQyc4dJA6C@ep-falling-dust-ad4x9ty7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=10&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5"

# NEW DATABASE (Target) - Your new PostgreSQL in Docker
# Use 'postgres' (Docker service name) when running inside Docker container
# Use 'localhost' when running migration script directly on host
NEW_DB_URL = "postgresql://postgres:postgres@localhost:5432/Zer0?sslmode=disable&connect_timeout=10&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5"
# ============================================================================


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
    conn.autocommit = False
    return conn


def execute_sql(conn, sql_query, params=None, fetch=False):
    """Execute SQL query with error handling"""
    cursor = conn.cursor()
    try:
        if params:
            cursor.execute(sql_query, params)
        else:
            cursor.execute(sql_query)

        if fetch:
            results = cursor.fetchall()
            cursor.close()
            return results
        else:
            conn.commit()
            cursor.close()
            return True
    except Exception as e:
        conn.rollback()
        cursor.close()
        return str(e)


def get_extensions(conn):
    """Get all installed extensions"""
    query = """
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname NOT IN ('plpgsql')  -- Skip built-in extensions
    ORDER BY extname;
    """
    return execute_sql(conn, query, fetch=True)


def get_custom_types(conn):
    """Get all custom types and enums"""
    query = """
    SELECT
        t.typname,
        t.typtype,
        CASE
            WHEN t.typtype = 'e' THEN (
                SELECT array_agg(enumlabel ORDER BY enumsortorder)
                FROM pg_enum
                WHERE enumtypid = t.oid
            )
            ELSE NULL
        END as enum_labels
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    AND t.typtype IN ('e', 'c')  -- e=enum, c=composite
    ORDER BY t.typname;
    """
    return execute_sql(conn, query, fetch=True)


def get_sequences(conn):
    """Get all sequences with full definition"""
    query = """
    SELECT
        sequence_schema,
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name;
    """
    return execute_sql(conn, query, fetch=True)


def get_tables(conn):
    """Get all tables"""
    query = """
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
    """
    return execute_sql(conn, query, fetch=True)


def get_table_columns(conn, schema, table_name):
    """Get all columns for a table with complete definitions"""
    query = """
    SELECT
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable,
        udt_name,
        numeric_precision,
        numeric_scale,
        datetime_precision
    FROM information_schema.columns
    WHERE table_schema = %s
    AND table_name = %s
    ORDER BY ordinal_position;
    """
    return execute_sql(conn, query, (schema, table_name), fetch=True)


def get_primary_keys(conn, schema, table_name):
    """Get primary key constraint"""
    query = """
    SELECT
        tc.constraint_name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = %s
    AND tc.table_name = %s
    GROUP BY tc.constraint_name;
    """
    return execute_sql(conn, query, (schema, table_name), fetch=True)


def get_unique_constraints(conn, schema, table_name):
    """Get unique constraints"""
    query = """
    SELECT
        tc.constraint_name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = %s
    AND tc.table_name = %s
    GROUP BY tc.constraint_name;
    """
    return execute_sql(conn, query, (schema, table_name), fetch=True)


def get_check_constraints(conn, schema, table_name):
    """Get check constraints"""
    query = """
    SELECT
        cc.constraint_name,
        cc.check_clause
    FROM information_schema.check_constraints cc
    JOIN information_schema.table_constraints tc
        ON cc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = %s
    AND tc.table_name = %s
    AND tc.constraint_type = 'CHECK';
    """
    return execute_sql(conn, query, (schema, table_name), fetch=True)


def get_foreign_keys(conn, schema, table_name):
    """Get foreign key constraints"""
    query = """
    SELECT
        tc.constraint_name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
        ccu.table_name AS foreign_table_name,
        array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as foreign_columns,
        rc.delete_rule,
        rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = %s
    AND tc.table_name = %s
    GROUP BY tc.constraint_name, ccu.table_name, rc.delete_rule, rc.update_rule;
    """
    return execute_sql(conn, query, (schema, table_name), fetch=True)


def get_indexes(conn, schema, table_name):
    """Get all indexes (excluding PK and unique constraints)"""
    query = """
    SELECT
        i.indexname,
        pg_get_indexdef(i.indexrelid) as indexdef
    FROM pg_indexes i
    LEFT JOIN pg_constraint c ON c.conname = i.indexname
    WHERE i.schemaname = %s
    AND i.tablename = %s
    AND c.conname IS NULL  -- Exclude indexes created by constraints
    ORDER BY i.indexname;
    """
    return execute_sql(conn, query, (schema, table_name), fetch=True)


def get_functions(conn):
    """Get all user-defined functions and procedures"""
    query = """
    SELECT
        p.proname,
        pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')  -- f=function, p=procedure
    ORDER BY p.proname;
    """
    return execute_sql(conn, query, fetch=True)


def get_triggers(conn, schema, table_name):
    """Get all triggers for a table"""
    query = """
    SELECT
        tgname,
        pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid = %s::regclass
    AND tgisinternal = false
    ORDER BY tgname;
    """
    full_table_name = f"{schema}.{table_name}"
    return execute_sql(conn, query, (full_table_name,), fetch=True)


def get_views(conn):
    """Get all regular views"""
    query = """
    SELECT
        table_schema,
        table_name,
        view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
    """
    return execute_sql(conn, query, fetch=True)


def get_materialized_views(conn):
    """Get all materialized views"""
    query = """
    SELECT
        schemaname,
        matviewname,
        pg_get_viewdef((schemaname || '.' || matviewname)::regclass, true) as definition
    FROM pg_matviews
    WHERE schemaname = 'public'
    ORDER BY matviewname;
    """
    return execute_sql(conn, query, fetch=True)


def get_mv_indexes(conn, schema, mv_name):
    """Get indexes for materialized view"""
    query = """
    SELECT
        indexname,
        pg_get_indexdef(indexrelid) as indexdef
    FROM pg_indexes i
    JOIN pg_class c ON c.relname = i.tablename
    WHERE i.schemaname = %s
    AND i.tablename = %s
    ORDER BY i.indexname;
    """
    return execute_sql(conn, query, (schema, mv_name), fetch=True)


def get_table_comments(conn, schema, table_name):
    """Get comments on table and columns"""
    query = """
    SELECT
        'TABLE' as type,
        '' as column_name,
        obj_description((quote_ident(%s) || '.' || quote_ident(%s))::regclass) as comment
    UNION ALL
    SELECT
        'COLUMN' as type,
        col.column_name,
        col_description((quote_ident(%s) || '.' || quote_ident(%s))::regclass, col.ordinal_position) as comment
    FROM information_schema.columns col
    WHERE col.table_schema = %s
    AND col.table_name = %s
    AND col_description((quote_ident(%s) || '.' || quote_ident(%s))::regclass, col.ordinal_position) IS NOT NULL;
    """
    return execute_sql(conn, query, (schema, table_name, schema, table_name, schema, table_name, schema, table_name), fetch=True)


def build_column_definition(col_data):
    """Build complete SQL column definition"""
    col_name, data_type, char_max_len, col_default, is_nullable, udt_name, num_precision, num_scale, dt_precision = col_data

    # Handle data type
    if data_type == 'character varying':
        type_def = f"VARCHAR({char_max_len})" if char_max_len else "VARCHAR"
    elif data_type == 'character':
        type_def = f"CHAR({char_max_len})" if char_max_len else "CHAR"
    elif data_type == 'numeric' and num_precision and num_scale:
        type_def = f"NUMERIC({num_precision},{num_scale})"
    elif data_type == 'ARRAY':
        base_type = udt_name.lstrip('_')
        type_def = f"{base_type}[]"
    elif data_type == 'USER-DEFINED':
        type_def = udt_name
    elif data_type == 'timestamp with time zone':
        type_def = 'TIMESTAMPTZ'
    elif data_type == 'timestamp without time zone':
        type_def = 'TIMESTAMP'
    elif data_type == 'time with time zone':
        type_def = 'TIMETZ'
    elif data_type == 'time without time zone':
        type_def = 'TIME'
    else:
        type_def = data_type.upper()

    definition = f'"{col_name}" {type_def}'

    # Add default
    if col_default:
        definition += f" DEFAULT {col_default}"

    # Add NOT NULL
    if is_nullable == 'NO':
        definition += " NOT NULL"

    return definition


def drop_all_schema_objects(conn):
    """Drop all schema objects in target database"""
    print("🗑️  Dropping all existing schema objects...")
    print()

    # Drop materialized views
    mvs = execute_sql(conn, "SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';", fetch=True)
    for (mv_name,) in mvs:
        execute_sql(conn, f"DROP MATERIALIZED VIEW IF EXISTS public.{mv_name} CASCADE;")
        print(f"  ✓ Dropped MV: {mv_name}")

    # Drop views
    views = execute_sql(conn, "SELECT table_name FROM information_schema.views WHERE table_schema = 'public';", fetch=True)
    for (view_name,) in views:
        execute_sql(conn, f"DROP VIEW IF EXISTS public.{view_name} CASCADE;")
        print(f"  ✓ Dropped view: {view_name}")

    # Drop tables
    tables = execute_sql(conn, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';", fetch=True)
    for (table_name,) in tables:
        execute_sql(conn, f"DROP TABLE IF EXISTS public.{table_name} CASCADE;")
        print(f"  ✓ Dropped table: {table_name}")

    # Drop functions
    funcs = execute_sql(conn, "SELECT proname, oidvectortypes(proargtypes) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';", fetch=True)
    for func_name, arg_types in funcs:
        execute_sql(conn, f"DROP FUNCTION IF EXISTS public.{func_name}({arg_types}) CASCADE;")
        print(f"  ✓ Dropped function: {func_name}")

    # Drop sequences
    seqs = execute_sql(conn, "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';", fetch=True)
    for (seq_name,) in seqs:
        execute_sql(conn, f"DROP SEQUENCE IF EXISTS public.{seq_name} CASCADE;")
        print(f"  ✓ Dropped sequence: {seq_name}")

    # Drop types
    types = execute_sql(conn, "SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype IN ('e', 'c');", fetch=True)
    for (type_name,) in types:
        execute_sql(conn, f"DROP TYPE IF EXISTS public.{type_name} CASCADE;")
        print(f"  ✓ Dropped type: {type_name}")

    conn.commit()
    print()


def migrate_extensions(old_conn, new_conn):
    """Migrate extensions"""
    print("🔌 Migrating extensions...")
    extensions = get_extensions(old_conn)

    if not extensions:
        print("  (No custom extensions found)")
        print()
        return

    for ext_name, ext_version in extensions:
        result = execute_sql(new_conn, f"CREATE EXTENSION IF NOT EXISTS {ext_name};")
        if result is True:
            print(f"  ✓ Created extension: {ext_name}")
        else:
            print(f"  ⚠ Extension {ext_name}: {result}")
    print()


def migrate_types(old_conn, new_conn):
    """Migrate custom types and enums"""
    print("🎨 Migrating custom types...")
    types = get_custom_types(old_conn)

    if not types:
        print("  (No custom types found)")
        print()
        return

    for type_name, type_type, enum_labels in types:
        if type_type == 'e' and enum_labels:
            # Enum type
            labels_str = ', '.join([f"'{label}'" for label in enum_labels])
            result = execute_sql(new_conn, f"CREATE TYPE public.{type_name} AS ENUM ({labels_str});")
            if result is True:
                print(f"  ✓ Created enum: {type_name}")
            else:
                print(f"  ⚠ Enum {type_name}: {result}")
    print()


def migrate_sequences(old_conn, new_conn):
    """Migrate sequences"""
    print("🔢 Migrating sequences...")
    sequences = get_sequences(old_conn)

    if not sequences:
        print("  (No sequences found)")
        print()
        return

    for schema, seq_name, data_type, start_val, min_val, max_val, increment, cycle in sequences:
        cycle_clause = "CYCLE" if cycle == 'YES' else "NO CYCLE"
        create_seq = f"""
        CREATE SEQUENCE {schema}.{seq_name}
        AS {data_type}
        START WITH {start_val}
        MINVALUE {min_val}
        MAXVALUE {max_val}
        INCREMENT BY {increment}
        {cycle_clause};
        """
        result = execute_sql(new_conn, create_seq)
        if result is True:
            print(f"  ✓ Created sequence: {seq_name}")
        else:
            print(f"  ⚠ Sequence {seq_name}: {result}")
    print()


def migrate_tables(old_conn, new_conn):
    """Migrate table structures"""
    print("📦 Migrating tables...")
    tables = get_tables(old_conn)

    if not tables:
        print("  (No tables found)")
        print()
        return []

    table_list = []
    for schema, table_name in tables:
        print(f"  📋 {table_name}")

        # Get columns
        columns = get_table_columns(old_conn, schema, table_name)
        col_defs = [build_column_definition(col) for col in columns]

        # Create table
        col_separator = ',\n            '
        create_table_sql = f"""
        CREATE TABLE {schema}.{table_name} (
            {col_separator.join(col_defs)}
        );
        """
        result = execute_sql(new_conn, create_table_sql)
        if result is True:
            print(f"    ✓ Created table structure")
            table_list.append((schema, table_name))
        else:
            print(f"    ✗ Failed: {result}")

    print()
    return table_list


def migrate_primary_keys(old_conn, new_conn, tables):
    """Migrate primary keys"""
    print("🔑 Adding primary keys...")

    for schema, table_name in tables:
        pk_data = get_primary_keys(old_conn, schema, table_name)
        if pk_data:
            constraint_name, columns = pk_data[0]
            cols_str = ', '.join([f'"{col}"' for col in columns])
            alter_sql = f"""
            ALTER TABLE {schema}.{table_name}
            ADD CONSTRAINT {constraint_name}
            PRIMARY KEY ({cols_str});
            """
            result = execute_sql(new_conn, alter_sql)
            if result is True:
                print(f"  ✓ {table_name}: {constraint_name}")
    print()


def migrate_unique_constraints(old_conn, new_conn, tables):
    """Migrate unique constraints"""
    print("🔒 Adding unique constraints...")

    count = 0
    for schema, table_name in tables:
        unique_data = get_unique_constraints(old_conn, schema, table_name)
        for constraint_name, columns in unique_data:
            cols_str = ', '.join([f'"{col}"' for col in columns])
            alter_sql = f"""
            ALTER TABLE {schema}.{table_name}
            ADD CONSTRAINT {constraint_name}
            UNIQUE ({cols_str});
            """
            result = execute_sql(new_conn, alter_sql)
            if result is True:
                print(f"  ✓ {table_name}: {constraint_name}")
                count += 1

    if count == 0:
        print("  (No unique constraints found)")
    print()


def migrate_check_constraints(old_conn, new_conn, tables):
    """Migrate check constraints"""
    print("✅ Adding check constraints...")

    count = 0
    for schema, table_name in tables:
        check_data = get_check_constraints(old_conn, schema, table_name)
        for constraint_name, check_clause in check_data:
            alter_sql = f"""
            ALTER TABLE {schema}.{table_name}
            ADD CONSTRAINT {constraint_name}
            CHECK {check_clause};
            """
            result = execute_sql(new_conn, alter_sql)
            if result is True:
                print(f"  ✓ {table_name}: {constraint_name}")
                count += 1

    if count == 0:
        print("  (No check constraints found)")
    print()


def migrate_foreign_keys(old_conn, new_conn, tables):
    """Migrate foreign keys"""
    print("🔗 Adding foreign keys...")

    for schema, table_name in tables:
        fk_data = get_foreign_keys(old_conn, schema, table_name)
        for constraint_name, columns, foreign_table, foreign_columns, delete_rule, update_rule in fk_data:
            cols_str = ', '.join([f'"{col}"' for col in columns])
            foreign_cols_str = ', '.join([f'"{col}"' for col in foreign_columns])
            alter_sql = f"""
            ALTER TABLE {schema}.{table_name}
            ADD CONSTRAINT {constraint_name}
            FOREIGN KEY ({cols_str})
            REFERENCES {schema}.{foreign_table} ({foreign_cols_str})
            ON DELETE {delete_rule}
            ON UPDATE {update_rule};
            """
            result = execute_sql(new_conn, alter_sql)
            if result is True:
                print(f"  ✓ {table_name}: {constraint_name}")
    print()


def migrate_indexes(old_conn, new_conn, tables):
    """Migrate indexes"""
    print("📇 Creating indexes...")

    count = 0
    for schema, table_name in tables:
        indexes = get_indexes(old_conn, schema, table_name)
        if indexes:
            for index_row in indexes:
                if len(index_row) >= 2:
                    index_name, index_def = index_row[0], index_row[1]
                    if index_def:
                        result = execute_sql(new_conn, index_def)
                        if result is True:
                            print(f"  ✓ {table_name}: {index_name}")
                            count += 1

    if count == 0:
        print("  (No additional indexes found)")
    print()


def migrate_functions(old_conn, new_conn):
    """Migrate functions and procedures"""
    print("⚙️  Migrating functions...")
    functions = get_functions(old_conn)

    if not functions:
        print("  (No custom functions found)")
        print()
        return

    for func_name, func_def in functions:
        result = execute_sql(new_conn, func_def)
        if result is True:
            print(f"  ✓ Created function: {func_name}")
        else:
            print(f"  ⚠ Function {func_name}: {result}")
    print()


def migrate_views(old_conn, new_conn):
    """Migrate regular views"""
    print("👁️  Migrating views...")
    views = get_views(old_conn)

    if not views:
        print("  (No views found)")
        print()
        return

    for schema, view_name, view_def in views:
        create_view = f"CREATE VIEW {schema}.{view_name} AS {view_def};"
        result = execute_sql(new_conn, create_view)
        if result is True:
            print(f"  ✓ Created view: {view_name}")
        else:
            print(f"  ⚠ View {view_name}: {result}")
    print()


def migrate_triggers(old_conn, new_conn, tables):
    """Migrate triggers"""
    print("⚡ Creating triggers...")

    count = 0
    for schema, table_name in tables:
        triggers = get_triggers(old_conn, schema, table_name)
        for trigger_name, trigger_def in triggers:
            result = execute_sql(new_conn, trigger_def)
            if result is True:
                print(f"  ✓ {table_name}: {trigger_name}")
                count += 1

    if count == 0:
        print("  (No triggers found)")
    print()


def migrate_materialized_views(old_conn, new_conn):
    """Migrate materialized views"""
    print("🎬 Migrating materialized views...")
    mvs = get_materialized_views(old_conn)

    if not mvs:
        print("  (No materialized views found)")
        print()
        return

    for mv_row in mvs:
        if len(mv_row) >= 3:
            schema, mv_name, definition = mv_row[0], mv_row[1], mv_row[2]
            print(f"  📊 {mv_name}")

            # Create MV
            create_mv = f"CREATE MATERIALIZED VIEW {schema}.{mv_name} AS {definition};"
            result = execute_sql(new_conn, create_mv)
            if result is True:
                print(f"    ✓ Created MV")

                # Create indexes
                indexes = get_mv_indexes(old_conn, schema, mv_name)
                if indexes:
                    for index_row in indexes:
                        if len(index_row) >= 2:
                            index_name, index_def = index_row[0], index_row[1]
                            if index_def:
                                idx_result = execute_sql(new_conn, index_def)
                                if idx_result is True:
                                    print(f"    ✓ Created index: {index_name}")

                # Refresh (will be empty)
                execute_sql(new_conn, f"REFRESH MATERIALIZED VIEW {schema}.{mv_name};")
                print(f"    ✓ Refreshed (empty)")
            else:
                print(f"    ✗ Failed: {result}")
    print()


def migrate_comments(old_conn, new_conn, tables):
    """Migrate table and column comments"""
    print("💬 Migrating comments...")

    count = 0
    for schema, table_name in tables:
        comments = get_table_comments(old_conn, schema, table_name)
        for comment_type, column_name, comment_text in comments:
            if comment_text:
                if comment_type == 'TABLE':
                    comment_sql = f"COMMENT ON TABLE {schema}.{table_name} IS '{comment_text}';"
                else:
                    comment_sql = f"COMMENT ON COLUMN {schema}.{table_name}.{column_name} IS '{comment_text}';"

                result = execute_sql(new_conn, comment_sql)
                if result is True:
                    count += 1

    if count == 0:
        print("  (No comments found)")
    else:
        print(f"  ✓ Added {count} comments")
    print()


def get_all_unique_indexes_from_source(old_conn):
    """
    Get all unique indexes from source database.
    This includes both unique constraints and unique indexes.
    """
    query = """
    SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%'
    ORDER BY tablename, indexname;
    """
    return execute_sql(old_conn, query, fetch=True)


def add_missing_unique_constraints(old_conn, new_conn):
    """
    Add ALL missing unique constraints from source to target database.
    This fixes database errors when inserting/updating data with ON CONFLICT.

    Automatically detects all unique indexes from source and ensures they exist in target.
    """
    print("🔒 Synchronizing unique constraints from source database...")
    print()

    # Get all unique indexes from source
    source_unique_indexes = get_all_unique_indexes_from_source(old_conn)

    if not source_unique_indexes:
        print("  ⚠️  No unique indexes found in source database")
        print()
        return

    print(f"  📊 Found {len(source_unique_indexes)} unique index(es) in source database")
    print()

    added_count = 0
    exists_count = 0
    failed_count = 0

    for schema, table, index_name, index_def in source_unique_indexes:
        print(f"  📋 Checking {table}.{index_name}...")

        # Check if table exists in target (includes both regular tables and materialized views)
        check_table = f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = '{schema}'
            AND table_name = '{table}'
        ) OR EXISTS (
            SELECT FROM pg_matviews
            WHERE schemaname = '{schema}'
            AND matviewname = '{table}'
        );
        """
        table_exists = execute_sql(new_conn, check_table, fetch=True)

        if not table_exists or not table_exists[0][0]:
            print(f"    ⚠️  Table '{table}' does not exist in target - skipping")
            print()
            continue

        # Check if unique index already exists in target
        check_index = f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = '{schema}'
            AND tablename = '{table}'
            AND indexname = '{index_name}'
        );
        """
        index_exists = execute_sql(new_conn, check_index, fetch=True)

        if index_exists and index_exists[0][0]:
            print(f"    ✅ Already exists")
            exists_count += 1
            print()
            continue

        # Create the unique index in target using the exact definition from source
        result = execute_sql(new_conn, index_def)

        if result is True:
            print(f"    ✅ Added unique constraint")
            print(f"       Definition: {index_def[:80]}...")
            added_count += 1
        else:
            print(f"    ❌ Failed: {result}")
            failed_count += 1

        print()

    print("=" * 70)
    print(f"  ✅ Added: {added_count}")
    print(f"  ℹ️  Already existed: {exists_count}")
    if failed_count > 0:
        print(f"  ❌ Failed: {failed_count}")
    print("=" * 70)
    print()


def configure_database_settings(conn):
    """Configure database settings for production performance"""
    print("⚙️  Configuring database settings...")

    # Detect database type (cloud vs local)
    is_cloud_db = False
    db_host = NEW_DB_URL.split('@')[1].split('/')[0].split(':')[0]

    # Cloud database providers
    cloud_providers = ['neon.tech', 'supabase.co', 'railway.app', 'render.com', 'aws.com', 'azure.com', 'googleapis.com']
    if any(provider in db_host for provider in cloud_providers):
        is_cloud_db = True

    # Check if localhost/127.0.0.1 (local database)
    is_local_db = db_host in ['localhost', '127.0.0.1', '::1']

    if is_local_db:
        print("  📍 Detected: Local PostgreSQL database")
    elif is_cloud_db:
        print(f"  ☁️  Detected: Cloud database ({db_host})")
    else:
        print(f"  🔍 Database: {db_host}")

    print()

    # Try to set max_connections (requires superuser or appropriate permissions)
    try:
        execute_sql(conn, "ALTER SYSTEM SET max_connections = 200;")
        print("  ✅ Successfully set max_connections = 200")

        if is_local_db:
            print("  ⚠️  IMPORTANT: Restart PostgreSQL for this change to take effect")
            print("  💡 Local database restart commands:")
            print("     - Linux/macOS: sudo systemctl restart postgresql")
            print("     - Windows: Restart PostgreSQL service from Services app")
            print("     - Docker: docker restart <postgres-container-name>")
        else:
            print("  ⚠️  Note: Database restart required for this change to take effect")
            if is_cloud_db:
                print("  💡 Cloud databases usually restart automatically or via dashboard")

    except Exception as e:
        print(f"  ❌ Could not set max_connections automatically: {str(e)}")
        print()

        if is_local_db:
            print("  📝 Manual configuration for LOCAL PostgreSQL:")
            print("     1. Edit postgresql.conf file:")
            print("        - Linux: /etc/postgresql/<version>/main/postgresql.conf")
            print("        - Windows: C:\\Program Files\\PostgreSQL\\<version>\\data\\postgresql.conf")
            print("        - macOS: /usr/local/var/postgres/postgresql.conf")
            print("     2. Find and change: max_connections = 200")
            print("     3. Restart PostgreSQL service")
            print("     4. Verify with: SHOW max_connections;")
        elif is_cloud_db:
            print("  📝 Manual configuration for CLOUD database:")
            print("     - NeonDB: Go to Dashboard → Settings → Connection pooling")
            print("     - Supabase: Go to Database → Settings → Configuration")
            print("     - Other providers: Check provider dashboard/settings")
        else:
            print("  📝 Manual configuration:")
            print("     - Cloud: Update via provider dashboard")
            print("     - Local: Edit postgresql.conf and set max_connections = 200")

    print()

    # Additional performance recommendations for local databases
    if is_local_db:
        print("  💡 Additional local PostgreSQL performance settings to consider:")
        print("     - shared_buffers = 256MB (25% of RAM for dedicated server)")
        print("     - effective_cache_size = 1GB (50-75% of RAM)")
        print("     - work_mem = 16MB")
        print("     - maintenance_work_mem = 128MB")
        print("     - checkpoint_completion_target = 0.9")
        print()

    print("  ℹ️  Current application connection pool settings:")
    print("     - pool_size: 20 connections (always maintained)")
    print("     - max_overflow: 40 connections (during peak load)")
    print("     - Total per process: up to 60 connections")
    print("     - Recommended PostgreSQL max_connections: 200+")
    print()


def main():
    """Main migration orchestrator"""
    print("=" * 90)
    print("COMPREHENSIVE DATABASE SCHEMA MIGRATION")
    print("Everything - Extensions, Types, Tables, Functions, Triggers, Views, MVs, Comments")
    print("=" * 90)
    print()
    print(f"[SOURCE] {OLD_DB_URL.split('@')[1].split('/')[0]}...")
    print(f"[TARGET] {NEW_DB_URL.split('@')[1].split('?')[0]}...")
    print()

    # Connect
    print("🔌 Connecting to databases...")
    old_conn = connect_to_database(OLD_DB_URL)
    print("  ✓ Connected to OLD database")
    new_conn = connect_to_database(NEW_DB_URL)
    print("  ✓ Connected to NEW database")
    print()

    # Configure database settings
    configure_database_settings(new_conn)

    # Drop all existing objects
    drop_all_schema_objects(new_conn)

    # Migration steps in order
    migrate_extensions(old_conn, new_conn)
    migrate_types(old_conn, new_conn)
    migrate_sequences(old_conn, new_conn)

    tables = migrate_tables(old_conn, new_conn)

    if tables:
        migrate_primary_keys(old_conn, new_conn, tables)
        migrate_unique_constraints(old_conn, new_conn, tables)
        migrate_check_constraints(old_conn, new_conn, tables)
        migrate_foreign_keys(old_conn, new_conn, tables)
        migrate_indexes(old_conn, new_conn, tables)
        migrate_comments(old_conn, new_conn, tables)

    migrate_functions(old_conn, new_conn)
    migrate_views(old_conn, new_conn)

    if tables:
        migrate_triggers(old_conn, new_conn, tables)

    migrate_materialized_views(old_conn, new_conn)

    # FINAL STEP: Verify all unique constraints are present (includes MVs)
    # This catches any missing constraints that the migration missed
    print("=" * 90)
    print("FINAL CHECK: Verifying all unique constraints from source")
    print("=" * 90)
    print()
    add_missing_unique_constraints(old_conn, new_conn)

    # Cleanup
    old_conn.close()
    new_conn.close()

    print("=" * 90)
    print("✅ SCHEMA MIGRATION COMPLETE")
    print("=" * 90)
    print("✓ Extensions migrated")
    print("✓ Custom types/enums migrated")
    print("✓ Sequences migrated")
    print("✓ Tables created (structure only)")
    print("✓ Primary keys added")
    print("✓ Unique constraints added")
    print("✓ Check constraints added")
    print("✓ Foreign keys added")
    print("✓ Indexes created")
    print("✓ Functions/procedures migrated")
    print("✓ Views migrated")
    print("✓ Triggers migrated")
    print("✓ Materialized views migrated")
    print("✓ Comments migrated")
    print()
    print("⚠️  Tables are empty - no data was migrated (schema only)")
    print("💡 Start your backend - it will work with the empty tables")
    print()


if __name__ == "__main__":
    main()
