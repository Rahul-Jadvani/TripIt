"""
Add Admin Users to admin_users table
======================================
Creates AdminUser records for OTP-based admin authentication.
Run: docker exec -it zer0_backend_local python scripts/add_admin_users.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from models.admin_user import AdminUser

# Admin emails to create
ADMIN_EMAILS = [
    'sameerkatte@gmail.com',
    'saijadhav148@gmail.com',
    'sarankumar.0x@gmail.com',
    'zer0@z-0.io'
]

def add_admin_users():
    """Add admin users to admin_users table"""
    app = create_app()

    with app.app_context():
        print("=" * 70)
        print("ADDING ADMIN USERS TO admin_users TABLE")
        print("=" * 70)
        print("")

        created_count = 0
        existing_count = 0

        for email in ADMIN_EMAILS:
            # Check if admin already exists
            existing_admin = AdminUser.query.filter_by(email=email).first()

            if existing_admin:
                if existing_admin.is_active:
                    print(f"   ℹ️  Admin already exists: {email}")
                    existing_count += 1
                else:
                    # Reactivate
                    existing_admin.is_active = True
                    db.session.commit()
                    print(f"   ✅ Reactivated admin: {email}")
                    created_count += 1
            else:
                # Create new admin
                admin = AdminUser(
                    email=email,
                    is_root=True,
                    is_active=True,
                    created_by=None  # Self-created root admin
                )
                db.session.add(admin)
                db.session.commit()
                print(f"   ✅ Created admin: {email} (ID: {admin.id})")
                created_count += 1

        print("")
        print("=" * 70)
        if created_count > 0:
            print(f"✅ Created/reactivated {created_count} admin user(s)")
        if existing_count > 0:
            print(f"ℹ️  {existing_count} admin user(s) already exist")
        print("")
        print("📧 To login, use POST /api/admin/request-otp with the email")
        print("   You will receive an OTP code via email (if email is configured)")
        print("=" * 70)
        print("")

if __name__ == '__main__':
    add_admin_users()
