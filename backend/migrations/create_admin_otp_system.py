"""
Create admin OTP authentication system tables
Run: python migrations/create_admin_otp_system.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Create admin_users table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            is_root BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            created_by VARCHAR(36) REFERENCES admin_users(id) ON DELETE SET NULL,
            last_login TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
        CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
        CREATE INDEX IF NOT EXISTS idx_admin_users_created ON admin_users(created_at DESC);
    """))

    # Create admin_otps table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS admin_otps (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(6) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            used_at TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_admin_otps_email ON admin_otps(email);
        CREATE INDEX IF NOT EXISTS idx_admin_otps_expires ON admin_otps(expires_at);
        CREATE INDEX IF NOT EXISTS idx_admin_otps_used ON admin_otps(is_used);
    """))

    db.session.commit()

    print("✅ Admin OTP authentication tables created successfully!")
    print("")
    print("🔐 IMPORTANT: Set up a root admin user")
    print("   Run the following SQL command to create your first root admin:")
    print("")
    print("   INSERT INTO admin_users (id, email, is_root, is_active)")
    print("   VALUES (gen_random_uuid()::text, 'your-email@example.com', TRUE, TRUE);")
    print("")
    print("   Replace 'your-email@example.com' with your actual email address.")
