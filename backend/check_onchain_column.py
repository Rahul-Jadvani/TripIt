"""
Check if onchain_score column exists
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

# Check if column exists
try:
    with engine.begin() as connection:
        result = connection.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name='projects' AND column_name='onchain_score'
        """))
        row = result.fetchone()

        if row:
            print("onchain_score column EXISTS")
            print(f"  Data type: {row[1]}")
            print(f"  Default: {row[2]}")
        else:
            print("onchain_score column DOES NOT EXIST")
            print("\nAdding onchain_score column...")

            # Add the column
            connection.execute(text("""
                ALTER TABLE projects
                ADD COLUMN onchain_score NUMERIC DEFAULT 0.0;
            """))

            # Add comment
            connection.execute(text("""
                COMMENT ON COLUMN projects.onchain_score IS
                'Reserved for future on-chain verification signals (0-20). Currently defaults to 0.';
            """))

            # Backfill existing rows
            connection.execute(text("""
                UPDATE projects
                SET onchain_score = 0
                WHERE onchain_score IS NULL;
            """))

            print("Successfully added onchain_score column!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
