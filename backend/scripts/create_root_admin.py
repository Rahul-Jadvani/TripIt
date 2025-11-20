"""
Create a root admin user
Run: python scripts/create_root_admin.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from models.admin_user import AdminUser

app = create_app()

def create_root_admin():
    """Interactive script to create a root admin user"""
    with app.app_context():
        print("=" * 60)
        print("CREATE ROOT ADMIN USER")
        print("=" * 60)
        print("")

        # Get email from user
        email = input("Enter root admin email: ").strip().lower()

        if not email:
            print("❌ Error: Email is required")
            return

        # Check if admin already exists
        existing_admin = AdminUser.query.filter_by(email=email).first()
        if existing_admin:
            print(f"❌ Error: Admin user already exists with email: {email}")
            if existing_admin.is_root:
                print("   This user is already a root admin.")
            else:
                print("   This user is a regular admin (not root).")
                promote = input("   Do you want to promote this admin to root? (yes/no): ").strip().lower()
                if promote == 'yes':
                    existing_admin.is_root = True
                    existing_admin.is_active = True
                    db.session.commit()
                    print(f"✅ Admin user promoted to root: {email}")
            return

        # Create new root admin
        root_admin = AdminUser(
            email=email,
            is_root=True,
            is_active=True,
            created_by=None  # Self-created
        )

        db.session.add(root_admin)
        db.session.commit()

        print("")
        print("✅ Root admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   ID: {root_admin.id}")
        print("")
        print("📧 To login, use the /api/admin/request-otp endpoint with this email")
        print("   You will receive an OTP code via email.")
        print("")

if __name__ == '__main__':
    create_root_admin()
