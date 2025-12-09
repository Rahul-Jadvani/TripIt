"""
Migration to add allowed_categories to validator_permissions
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        print("[MIGRATION] Adding allowed_categories to validator_permissions...")

        # Add allowed_categories column
        db.session.execute(text("""
            ALTER TABLE validator_permissions
            ADD COLUMN IF NOT EXISTS allowed_categories JSON DEFAULT '[]';
        """))
        db.session.commit()

        print("[SUCCESS] allowed_categories column added")

        # Set default categories for existing validator (your validator)
        print("[MIGRATION] Setting default categories for existing validators...")
        db.session.execute(text("""
            UPDATE validator_permissions
            SET allowed_categories = '["AI/ML", "Web3/Blockchain", "EdTech", "FinTech", "DevTools"]'::json
            WHERE allowed_categories IS NULL;
        """))
        db.session.commit()

        print("[SUCCESS] Default categories set for all validators")
        print("\n[MIGRATION COMPLETE] Validators can now auto-receive assignments based on their category preferences!")

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Migration failed: {str(e)}")
        raise
