"""
Sync existing users to travelers table
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

def sync_users_to_travelers():
    """Sync users to travelers table"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Syncing users to travelers table...")

        # Get all users
        cursor.execute("""
            SELECT id, username, email, email_verified, display_name, bio, avatar_url,
                   password_hash, is_admin, is_active, created_at, updated_at
            FROM users
        """)
        users = cursor.fetchall()
        print(f"Found {len(users)} users to sync")

        synced_count = 0
        for user in users:
            user_id, username, email, email_verified, display_name, bio, avatar_url, password_hash, is_admin, is_active, created_at, updated_at = user

            # Check if traveler already exists
            cursor.execute("SELECT id FROM travelers WHERE id = %s", (user_id,))
            exists = cursor.fetchone()

            if not exists:
                # Use existing password_hash or a dummy one for OAuth users
                password = password_hash if password_hash else 'oauth_user_no_password'

                # Insert into travelers table
                cursor.execute("""
                    INSERT INTO travelers (
                        id, username, email, email_verified, password_hash, display_name, bio, avatar_url,
                        is_admin, is_active, created_at, updated_at,
                        travel_interests, total_trips_count,
                        total_km_traveled, traveler_reputation_score, women_guide_certified
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        '[]'::json, 0, 0.0, 0.0, FALSE
                    )
                """, (user_id, username, email, email_verified, password, display_name, bio, avatar_url,
                      is_admin, is_active, created_at, updated_at))
                synced_count += 1
                print(f"  ✓ Synced user: {username}")
            else:
                print(f"  - Traveler already exists: {username}")

        print(f"\n✅ Synced {synced_count} users to travelers table!")

    except Exception as e:
        print(f"\n❌ Sync failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    sync_users_to_travelers()
