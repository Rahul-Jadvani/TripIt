"""
Migration script to add NFT metadata fields to users table
"""
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app import create_app
from extensions import db
from sqlalchemy import text

def add_nft_metadata_fields():
    """Add NFT metadata fields to users table"""
    app = create_app()

    with app.app_context():
        try:
            print("Adding NFT metadata fields to users table...")

            # Add columns if they don't exist
            with db.engine.connect() as conn:
                # Check if columns already exist
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='users'
                    AND column_name IN ('oxcert_tx_hash', 'oxcert_token_id', 'oxcert_metadata')
                """))
                existing_columns = [row[0] for row in result]

                # Add oxcert_tx_hash if it doesn't exist
                if 'oxcert_tx_hash' not in existing_columns:
                    print("Adding oxcert_tx_hash column...")
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN oxcert_tx_hash VARCHAR(66)
                    """))
                    conn.commit()
                    print("✓ oxcert_tx_hash column added")
                else:
                    print("✓ oxcert_tx_hash column already exists")

                # Add oxcert_token_id if it doesn't exist
                if 'oxcert_token_id' not in existing_columns:
                    print("Adding oxcert_token_id column...")
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN oxcert_token_id VARCHAR(100)
                    """))
                    conn.commit()
                    print("✓ oxcert_token_id column added")
                else:
                    print("✓ oxcert_token_id column already exists")

                # Add oxcert_metadata if it doesn't exist
                if 'oxcert_metadata' not in existing_columns:
                    print("Adding oxcert_metadata column...")
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN oxcert_metadata JSON
                    """))
                    conn.commit()
                    print("✓ oxcert_metadata column added")
                else:
                    print("✓ oxcert_metadata column already exists")

            print("\n✅ Migration completed successfully!")

        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    add_nft_metadata_fields()
