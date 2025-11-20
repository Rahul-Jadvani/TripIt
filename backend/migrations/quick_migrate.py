"""Quick migration script"""
import os
import sys
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from extensions import db
from app import create_app

app = create_app()

with app.app_context():
    try:
        # Run the ALTER commands
        statements = [
            "ALTER TABLE projects ALTER COLUMN proof_score TYPE NUMERIC USING proof_score::numeric, ALTER COLUMN proof_score SET DEFAULT 0.0",
            "ALTER TABLE projects ALTER COLUMN verification_score TYPE NUMERIC USING verification_score::numeric, ALTER COLUMN verification_score SET DEFAULT 0.0",
            "ALTER TABLE projects ALTER COLUMN community_score TYPE NUMERIC USING community_score::numeric, ALTER COLUMN community_score SET DEFAULT 0.0",
            "ALTER TABLE projects ALTER COLUMN validation_score TYPE NUMERIC USING validation_score::numeric, ALTER COLUMN validation_score SET DEFAULT 0.0",
            "ALTER TABLE projects ALTER COLUMN quality_score TYPE NUMERIC USING quality_score::numeric, ALTER COLUMN quality_score SET DEFAULT 0.0"
        ]

        for i, statement in enumerate(statements, 1):
            print(f"[{i}/{len(statements)}] {statement[:60]}...")
            db.session.execute(db.text(statement))

        db.session.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        db.session.rollback()
        import traceback
        traceback.print_exc()
