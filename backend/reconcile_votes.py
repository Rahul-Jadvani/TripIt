"""
Manual script to run vote count reconciliation

This script triggers the Celery task that recalculates all vote counts
from the votes table and updates both the projects table and Redis cache.

Usage:
    python reconcile_votes.py

This will fix all data inconsistencies in the voting system.
"""
from app import create_app
from tasks.vote_tasks import reconcile_all_vote_counts

print("=" * 60)
print("VOTE COUNT RECONCILIATION")
print("=" * 60)
print()
print("This will recalculate all vote counts from the votes table")
print("and update both the projects table and Redis cache.")
print()

app = create_app()

with app.app_context():
    print("[Reconciliation] Starting task...")
    result = reconcile_all_vote_counts()
    print()
    print("=" * 60)
    print("RESULTS:")
    print("=" * 60)

    if result.get('success'):
        print(f"✓ Success!")
        print(f"  - Projects reconciled: {result.get('reconciled', 0)}")
        print(f"  - Projects with incorrect counts (fixed): {result.get('fixed', 0)}")
        print(f"  - Time taken: {result.get('latency_ms', 0):.2f}ms")
    else:
        print(f"✗ Failed!")
        print(f"  - Error: {result.get('error', 'Unknown error')}")

    print("=" * 60)
