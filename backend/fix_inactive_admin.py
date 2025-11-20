#!/usr/bin/env python3
"""
Script to activate the saijadhav148@gmail.com admin user
Run this script to fix the inactive admin issue
"""
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def fix_admin():
    try:
        from app import create_app, db
        from models.user import User
        from utils.cache import CacheService

        app = create_app()
        with app.app_context():
            # Find the admin user by email
            user = User.query.filter_by(email='saijadhav148@gmail.com').first()
            if user:
                print(f"✓ Found user: {user.email}")
                print(f"  - is_active: {user.is_active}")
                print(f"  - is_admin: {user.is_admin}")
                print(f"  - username: {user.username}")

                # Activate the user if inactive
                if not user.is_active:
                    user.is_active = True
                    db.session.commit()

                    # Invalidate search cache
                    CacheService.invalidate_search_results()

                    print("\n✓ SUCCESS: User activated!")
                    print(f"  - is_active is now: {user.is_active}")
                    print("  - User can now be found in search results")
                else:
                    print("\n✓ User is already active!")

            else:
                print("✗ User not found with email: saijadhav148@gmail.com")
                print("\nSearching for all users:")
                all_users = User.query.all()
                print(f"\nFound {len(all_users)} users:")
                for u in all_users[:10]:  # Show first 10
                    print(f"  - {u.email} (active: {u.is_active}, admin: {u.is_admin})")
                if len(all_users) > 10:
                    print(f"  ... and {len(all_users) - 10} more")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    fix_admin()
