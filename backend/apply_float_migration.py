"""Apply float migration directly to database"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(DATABASE_URL)

print("Applying migration to change score columns to NUMERIC (Float)...")

with engine.begin() as conn:
    try:
        # Change all score columns to NUMERIC
        statements = [
            "ALTER TABLE projects ALTER COLUMN proof_score TYPE NUMERIC USING proof_score::numeric",
            "ALTER TABLE projects ALTER COLUMN verification_score TYPE NUMERIC USING verification_score::numeric",
            "ALTER TABLE projects ALTER COLUMN community_score TYPE NUMERIC USING community_score::numeric",
            "ALTER TABLE projects ALTER COLUMN validation_score TYPE NUMERIC USING validation_score::numeric",
            "ALTER TABLE projects ALTER COLUMN quality_score TYPE NUMERIC USING quality_score::numeric"
        ]

        for i, stmt in enumerate(statements, 1):
            print(f"[{i}/5] Executing: {stmt[:60]}...")
            conn.execute(text(stmt))

        print("\n✅ Migration completed successfully!")
        print("All score columns are now NUMERIC (Float) type")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise
