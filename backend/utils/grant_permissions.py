"""
Utility script to grant admin/validator permissions to a user
Usage: python -m utils.grant_permissions <username_or_email> [--admin] [--validator]
"""
import sys
from models.user import User
from extensions import db
from app import create_app


def grant_permissions(identifier, make_admin=False, make_validator=False):
    """Grant admin/validator permissions to a user"""
    app = create_app()

    with app.app_context():
        # Find user by username or email
        user = User.query.filter(
            (User.username == identifier) | (User.email == identifier)
        ).first()

        if not user:
            print(f"❌ User not found: {identifier}")
            return False

        # Grant permissions
        changed = False
        if make_admin and not user.is_admin:
            user.is_admin = True
            changed = True
            print(f"✅ Granted ADMIN access to {user.username} ({user.email})")
        elif make_admin:
            print(f"ℹ️  {user.username} is already an admin")

        if make_validator and not user.is_validator:
            user.is_validator = True
            changed = True
            print(f"✅ Granted VALIDATOR access to {user.username} ({user.email})")
        elif make_validator:
            print(f"ℹ️  {user.username} is already a validator")

        if changed:
            db.session.commit()
            print("\n✅ Permissions updated successfully!")
            print("🔄 Please LOGOUT and LOGIN again to see the changes")
        else:
            print("\nℹ️  No changes needed")

        # Show current status
        print(f"\nCurrent status for {user.username}:")
        print(f"  - Admin: {'✅ Yes' if user.is_admin else '❌ No'}")
        print(f"  - Validator: {'✅ Yes' if user.is_validator else '❌ No'}")
        print(f"  - Investor: {'✅ Yes' if user.is_investor else '❌ No'}")

        return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python -m utils.grant_permissions <username_or_email> [--admin] [--validator]")
        print("\nExample:")
        print("  python -m utils.grant_permissions john@example.com --admin --validator")
        sys.exit(1)

    identifier = sys.argv[1]
    make_admin = '--admin' in sys.argv
    make_validator = '--validator' in sys.argv

    if not make_admin and not make_validator:
        print("❌ Please specify at least one permission: --admin or --validator")
        sys.exit(1)

    grant_permissions(identifier, make_admin, make_validator)
