"""
Add Admin Users - Simple version (no background services)
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Set environment variables to disable background services
os.environ['DISABLE_CACHE_WARMER'] = 'true'
os.environ['DISABLE_MV_WORKER'] = 'true'
os.environ['DISABLE_CELERY'] = 'true'
os.environ['DISABLE_RECONCILIATION'] = 'true'

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from extensions import db
from config import config
from models.admin_user import AdminUser

# Admin emails to create
ADMIN_EMAILS = [
    'sameerkatte@gmail.com',
    'saijadhav148@gmail.com',
]

def add_admin_users():
    """Add admin users without starting background services"""
    # Create minimal Flask app
    app = Flask(__name__)
    app.config.from_object(config['development'])

    # Initialize only database
    db.init_app(app)

    with app.app_context():
        # Create tables if they don't exist
        db.create_all()

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
                    print(f"   INFO: Admin already exists: {email}")
                    existing_count += 1
                else:
                    # Reactivate
                    existing_admin.is_active = True
                    db.session.commit()
                    print(f"   SUCCESS: Reactivated admin: {email}")
                    created_count += 1
            else:
                # Create new admin
                admin = AdminUser(
                    email=email,
                    is_root=True,
                    is_active=True,
                    created_by=None
                )
                db.session.add(admin)
                db.session.commit()
                print(f"   SUCCESS: Created admin: {email} (ID: {admin.id})")
                created_count += 1

        print("")
        print("=" * 70)
        if created_count > 0:
            print(f"SUCCESS: Created/reactivated {created_count} admin user(s)")
        if existing_count > 0:
            print(f"INFO: {existing_count} admin user(s) already exist")
        print("")
        print("To login, use POST /api/admin/request-otp with the email")
        print("=" * 70)
        print("")

if __name__ == '__main__':
    add_admin_users()
