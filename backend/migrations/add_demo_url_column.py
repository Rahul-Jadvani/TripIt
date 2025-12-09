"""
Add demo_url column to itineraries table
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

print("Adding demo_url column to itineraries table...")

try:
    # Check if column exists
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='demo_url'
    """)

    if cursor.fetchone():
        print("✓ demo_url column already exists")
    else:
        # Add demo_url column
        cursor.execute("""
            ALTER TABLE itineraries
            ADD COLUMN demo_url VARCHAR(500)
        """)
        print("✓ Added demo_url column")

    print("\nMigration completed successfully!")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()

cursor.close()
conn.close()
