"""
Sync travelers to users table (reverse sync)
Ensures every traveler has a corresponding user record for notifications
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
DATABASE_URL = os.getenv("DATABASE_URL")

def sync_travelers_to_users():
    """Sync travelers to users table (reverse direction)"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Syncing travelers to users table...")

        # Get all travelers
        cursor.execute("""
            SELECT id, username, email, email_verified, display_name, bio, avatar_url,
                   password_hash, is_admin, is_active, created_at, updated_at
            FROM travelers
        """)
        travelers = cursor.fetchall()
        print(f"Found {len(travelers)} travelers to sync")

        synced_count = 0
        for traveler in travelers:
            traveler_id, username, email, email_verified, display_name, bio, avatar_url, password_hash, is_admin, is_active, created_at, updated_at = traveler

            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (traveler_id,))
            exists = cursor.fetchone()

            if not exists:
                # Insert into users table with same ID
                cursor.execute("""
                    INSERT INTO users (
                        id, username, email, email_verified, password_hash, display_name, bio, avatar_url,
                        is_admin, is_active, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (traveler_id, username, email, email_verified, password_hash, display_name, bio, avatar_url,
                      is_admin, is_active, created_at, updated_at))
                synced_count += 1
                print(f"  ✓ Synced traveler to user: {username} (ID: {traveler_id})")
            else:
                print(f"  - User already exists: {username}")

        print(f"\n✅ Synced {synced_count} travelers to users table!")
        print(f"📊 Total users now: {len(travelers)}")

    except Exception as e:
        print(f"\n❌ Sync failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    sync_travelers_to_users()
