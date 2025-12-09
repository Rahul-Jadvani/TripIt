"""Quick script to check user's blockchain identity data"""
from app import app, db
from models.traveler import Traveler

with app.app_context():
    # Get the most recent user
    user = Traveler.query.order_by(Traveler.created_at.desc()).first()

    if user:
        print(f"\n=== User: {user.email} ===")
        print(f"ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"\n--- Blockchain Identity ---")
        print(f"Wallet Address: {user.wallet_address}")
        print(f"Wallet Bound At: {user.wallet_bound_at}")
        print(f"Profile Hash: {user.profile_hash}")
        print(f"Profile Hash Salt: {user.profile_hash_salt}")
        print(f"Profile Hash Updated: {user.profile_hash_updated_at}")
        print(f"Reputation Score: {user.reputation_score}")
        print(f"\n--- SBT ---")
        print(f"SBT ID: {user.sbt_id}")
        print(f"SBT Status: {user.sbt_status}")
        print(f"SBT Hash: {user.sbt_blockchain_hash}")
        print(f"SBT Verified: {user.sbt_verified_date}")

        print(f"\n--- to_dict() output ---")
        user_dict = user.to_dict(include_sensitive=True)
        print(f"wallet_address in dict: {user_dict.get('wallet_address')}")
        print(f"profile_hash in dict: {user_dict.get('profile_hash')}")
    else:
        print("No users found")
