"""
Test GitHub OAuth Connection
=============================
Simulates the GitHub callback to test if connection works
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from models.user import User
import requests

app = create_app()

def test_github_connection():
    """Test GitHub OAuth flow"""
    with app.app_context():
        print("=" * 70)
        print("TESTING GITHUB OAUTH CONNECTION")
        print("=" * 70)
        print("")

        # Get test user
        user = User.query.filter_by(email='sameerkatte@gmail.com').first()
        if not user:
            print("❌ User not found")
            return

        print(f"✅ Found user: {user.username} ({user.email})")
        print(f"   Current GitHub status: {user.github_connected}")
        print(f"   Current GitHub username: {user.github_username}")
        print("")

        # Test GitHub API credentials
        client_id = app.config.get('GITHUB_CLIENT_ID')
        client_secret = app.config.get('GITHUB_CLIENT_SECRET')

        print(f"GitHub Client ID: {client_id}")
        print(f"GitHub Client Secret set: {bool(client_secret)}")
        print("")

        # Test if we can reach GitHub API
        try:
            print("Testing GitHub API accessibility...")
            response = requests.get('https://api.github.com/user', timeout=10)
            print(f"✅ GitHub API reachable (status: {response.status_code})")
        except Exception as e:
            print(f"❌ GitHub API not reachable: {e}")

        print("")
        print("=" * 70)
        print("To manually test the OAuth flow:")
        print("1. Go to /api/auth/github/connect endpoint")
        print("2. Follow the GitHub authorization")
        print("3. Check this script again to see if github_connected changed")
        print("=" * 70)

if __name__ == '__main__':
    test_github_connection()
