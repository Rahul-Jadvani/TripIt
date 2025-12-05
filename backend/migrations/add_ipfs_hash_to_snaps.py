"""
Add ipfs_hash column to snaps table for IPFS integration
"""
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
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
conn.autocommit = True
cursor = conn.cursor()

print("Adding ipfs_hash column to snaps table...")

try:
    # Check if column exists
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='snaps' AND column_name='ipfs_hash'
    """)

    if cursor.fetchone():
        print("✓ ipfs_hash column already exists")
    else:
        # Add ipfs_hash column
        cursor.execute("""
            ALTER TABLE snaps
            ADD COLUMN ipfs_hash VARCHAR(100)
        """)
        print("✓ Added ipfs_hash column to snaps table")

    # Update the comment on image_url column to reflect IPFS usage
    cursor.execute("""
        COMMENT ON COLUMN snaps.image_url IS 'IPFS gateway URL to the image'
    """)
    print("✓ Updated image_url column comment")

    print("\nMigration completed successfully!")
    print("Snaps will now store images on IPFS instead of local filesystem")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()

cursor.close()
conn.close()
