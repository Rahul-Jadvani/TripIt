import os
import sys
import psycopg2
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration(migration_file):
    separator = "=" * 60
    print(f"\n{separator}")
    print(f"Running migration: {migration_file}")
    print(f"{separator}")
    
    with open(migration_file, "r", encoding="utf-8") as f:
        migration_sql = f.read()
    
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        cursor.execute(migration_sql)
        print(f"Success: Migration completed: {migration_file}")
        for notice in conn.notices:
            print(notice.strip())
        return True
    except Exception as e:
        print(f"Failed: Migration failed: {migration_file}")
        print(f"Error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

migrations = [
    "migrations/001_add_github_token.sql",
    "migrations/002_add_scoring_fields.sql",
    "migrations/003_create_scoring_config.sql"
]

print("\nZER0 AI SCORING - Running Database Migrations\n")
for migration in migrations:
    if not run_migration(migration):
        print("\nStopping due to migration failure")
        break
print("\nMigrations complete!\n")
