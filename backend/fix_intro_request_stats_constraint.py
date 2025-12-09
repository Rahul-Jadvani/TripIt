#!/usr/bin/env python3
"""
Fix intro_request_stats table to add PRIMARY KEY on user_id
Required for ON CONFLICT clause in update_intro_request_stats trigger
"""
import os
import sys
from sqlalchemy import text

# Set environment
os.environ.setdefault('FLASK_ENV', 'production')

from app import create_app
from extensions import db

def fix_intro_request_stats():
    """Add PRIMARY KEY constraint on user_id"""
    app = create_app()

    with app.app_context():
        try:
            print("Starting migration: Add PRIMARY KEY to intro_request_stats.user_id")
            print("=" * 70)

            # Check current constraints
            print("\n1. Checking existing constraints...")
            result = db.session.execute(text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'intro_request_stats'
                AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
            """)).fetchall()

            if result:
                print("   Existing constraints:")
                for name, ctype in result:
                    print(f"   - {name}: {ctype}")
            else:
                print("   No PRIMARY KEY or UNIQUE constraints found")

            # Check for duplicate user_ids
            print("\n2. Checking for duplicate user_id values...")
            duplicates = db.session.execute(text("""
                SELECT user_id, COUNT(*) as count
                FROM intro_request_stats
                GROUP BY user_id
                HAVING COUNT(*) > 1
            """)).fetchall()

            if duplicates:
                print(f"   WARNING: Found {len(duplicates)} duplicate user_id values")
                print("   Consolidating duplicates before adding constraint...")

                for user_id, count in duplicates:
                    # Get aggregated stats
                    agg = db.session.execute(text("""
                        SELECT
                            user_id,
                            SUM(pending_requests) as total_pending,
                            SUM(approved_requests) as total_approved,
                            SUM(rejected_requests) as total_rejected,
                            SUM(sent_requests) as total_sent,
                            SUM(sent_approved) as total_sent_approved,
                            SUM(sent_rejected) as total_sent_rejected,
                            MIN(created_at) as earliest_created,
                            MAX(last_updated_at) as latest_updated
                        FROM intro_request_stats
                        WHERE user_id = :user_id
                        GROUP BY user_id
                    """), {"user_id": user_id}).fetchone()

                    # Delete all duplicate rows
                    db.session.execute(text("""
                        DELETE FROM intro_request_stats WHERE user_id = :user_id
                    """), {"user_id": user_id})

                    # Insert consolidated row
                    db.session.execute(text("""
                        INSERT INTO intro_request_stats
                        (user_id, pending_requests, approved_requests, rejected_requests,
                         sent_requests, sent_approved, sent_rejected, created_at, last_updated_at)
                        VALUES (:user_id, :pending, :approved, :rejected,
                                :sent, :sent_approved, :sent_rejected, :created_at, :updated_at)
                    """), {
                        "user_id": agg[0],
                        "pending": agg[1],
                        "approved": agg[2],
                        "rejected": agg[3],
                        "sent": agg[4],
                        "sent_approved": agg[5],
                        "sent_rejected": agg[6],
                        "created_at": agg[7],
                        "updated_at": agg[8]
                    })

                db.session.commit()
                print(f"   ✓ Consolidated {len(duplicates)} duplicate records")
            else:
                print("   ✓ No duplicates found")

            # Add PRIMARY KEY constraint
            print("\n3. Adding PRIMARY KEY constraint on user_id...")
            db.session.execute(text("""
                ALTER TABLE intro_request_stats
                ADD PRIMARY KEY (user_id)
            """))
            db.session.commit()
            print("   ✓ PRIMARY KEY added successfully")

            # Verify constraint was added
            print("\n4. Verifying PRIMARY KEY constraint...")
            result = db.session.execute(text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'intro_request_stats'
                AND constraint_type = 'PRIMARY KEY'
            """)).fetchone()

            if result:
                print(f"   ✓ Constraint verified: {result[0]} ({result[1]})")
            else:
                raise Exception("PRIMARY KEY constraint not found after creation!")

            print("\n" + "=" * 70)
            print("✓ Migration completed successfully!")
            print("\nThe trigger's ON CONFLICT (user_id) clause will now work correctly.")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    fix_intro_request_stats()
