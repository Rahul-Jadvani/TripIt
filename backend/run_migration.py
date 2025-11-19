"""
Script to apply database migration for changing score columns to float
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment variables")
    exit(1)

# Create engine
engine = create_engine(DATABASE_URL)

# Read migration file
migration_file = 'migrations/004_change_scores_to_float.sql'
with open(migration_file, 'r') as f:
    migration_sql = f.read()

# Execute migration
try:
    with engine.begin() as connection:
        # Split by semicolon and execute each statement
        # Filter out comments and empty statements
        statements = []
        for line in migration_sql.split('\n'):
            line = line.strip()
            if line and not line.startswith('--'):
                statements.append(line)

        full_sql = ' '.join(statements)

        for statement in full_sql.split(';'):
            statement = statement.strip()
            if statement:
                print(f"Executing: {statement[:80]}...")
                connection.execute(text(statement))

        print("\n✅ Migration completed successfully!")
        print("Score columns changed from INTEGER to NUMERIC (Float)")

except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
