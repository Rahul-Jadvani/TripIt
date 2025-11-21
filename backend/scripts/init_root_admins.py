"""
Initialize Root Admin Users
============================
Bypasses materialized view triggers by using raw SQL.
Run inside Docker: docker exec -it zer0_backend_local python scripts/init_root_admins.py
Run locally: python scripts/init_root_admins.py
"""
import sys
import os
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from sqlalchemy import text

# Root admin emails to initialize
ROOT_ADMIN_EMAILS = [
    'sameerkatte@gmail.com',
    'saijadhav148@gmail.com',
    'sarankumar.0x@gmail.com',
    'zer0@z-0.io'
]

def init_root_admins():
    """Initialize root admin users using raw SQL to bypass triggers"""
    app = create_app()

    with app.app_context():
        print("=" * 70)
        print("INITIALIZING ROOT ADMIN USERS")
        print("=" * 70)
        print("")

        try:
            # Disable triggers temporarily
            print("[1/3] Disabling triggers...")
            db.session.execute(text("SET session_replication_role = replica;"))

            updated_count = 0
            created_count = 0

            print("[2/3] Processing root admins...")
            for email in ROOT_ADMIN_EMAILS:
                # Check if user exists
                result = db.session.execute(
                    text("SELECT id, is_admin, username FROM users WHERE email = :email"),
                    {"email": email}
                ).fetchone()

                if result:
                    user_id, is_admin, username = result
                    if not is_admin:
                        # Update existing user to admin using raw SQL
                        db.session.execute(
                            text("""
                                UPDATE users
                                SET is_admin = true, updated_at = NOW()
                                WHERE email = :email
                            """),
                            {"email": email}
                        )
                        updated_count += 1
                        print(f"   ✅ Updated {email} (username: {username}) to root admin")
                    else:
                        print(f"   ℹ️  {email} (username: {username}) is already a root admin")
                else:
                    print(f"   ⚠️  User not found: {email}")
                    print(f"      This user needs to register first via the platform")

            # Re-enable triggers
            print("[3/3] Re-enabling triggers...")
            db.session.execute(text("SET session_replication_role = DEFAULT;"))

            # Commit changes
            db.session.commit()

            print("")
            print("=" * 70)
            if updated_count > 0:
                print(f"✅ Successfully initialized {updated_count} root admin(s)")
            else:
                print("ℹ️  No changes needed - all registered users are already admins")
            print("=" * 70)
            print("")

        except Exception as e:
            db.session.rollback()
            print("")
            print("=" * 70)
            print(f"❌ Error initializing root admins: {e}")
            print("=" * 70)
            import traceback
            traceback.print_exc()
            print("")

if __name__ == '__main__':
    init_root_admins()
