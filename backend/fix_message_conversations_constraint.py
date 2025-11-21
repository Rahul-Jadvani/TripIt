#!/usr/bin/env python3
"""
Fix message_conversations_denorm table to add UNIQUE constraint on (user_id, other_user_id)
Required for ON CONFLICT clause in update_conversation_on_message trigger
"""
import os
import sys
from sqlalchemy import text

# Set environment
os.environ.setdefault('FLASK_ENV', 'production')

from app import create_app
from extensions import db

def fix_message_conversations():
    """Add UNIQUE constraint on (user_id, other_user_id)"""
    app = create_app()

    with app.app_context():
        try:
            print("Starting migration: Add UNIQUE constraint to message_conversations_denorm")
            print("=" * 70)

            # Check current constraints
            print("\n1. Checking existing constraints...")
            result = db.session.execute(text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'message_conversations_denorm'
                AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
            """)).fetchall()

            if result:
                print("   Existing constraints:")
                for name, ctype in result:
                    print(f"   - {name}: {ctype}")
            else:
                print("   No PRIMARY KEY or UNIQUE constraints found")

            # Check for duplicate (user_id, other_user_id) pairs
            print("\n2. Checking for duplicate (user_id, other_user_id) pairs...")
            duplicates = db.session.execute(text("""
                SELECT user_id, other_user_id, COUNT(*) as count
                FROM message_conversations_denorm
                GROUP BY user_id, other_user_id
                HAVING COUNT(*) > 1
            """)).fetchall()

            if duplicates:
                print(f"   WARNING: Found {len(duplicates)} duplicate pairs")
                print("   Consolidating duplicates before adding constraint...")

                for user_id, other_user_id, count in duplicates:
                    # Get the most recent conversation data
                    latest = db.session.execute(text("""
                        SELECT
                            user_id,
                            other_user_id,
                            last_message_id,
                            last_message_text,
                            last_message_time,
                            last_sender_id,
                            SUM(total_messages) as total_msgs,
                            SUM(unread_count) as total_unread,
                            MIN(created_at) as earliest_created,
                            MAX(updated_at) as latest_updated
                        FROM message_conversations_denorm
                        WHERE user_id = :user_id AND other_user_id = :other_user_id
                        GROUP BY user_id, other_user_id, last_message_id,
                                 last_message_text, last_message_time, last_sender_id
                        ORDER BY last_message_time DESC
                        LIMIT 1
                    """), {"user_id": user_id, "other_user_id": other_user_id}).fetchone()

                    # Delete all duplicate rows
                    db.session.execute(text("""
                        DELETE FROM message_conversations_denorm
                        WHERE user_id = :user_id AND other_user_id = :other_user_id
                    """), {"user_id": user_id, "other_user_id": other_user_id})

                    # Insert consolidated row
                    db.session.execute(text("""
                        INSERT INTO message_conversations_denorm
                        (user_id, other_user_id, last_message_id, last_message_text,
                         last_message_time, last_sender_id, total_messages, unread_count,
                         created_at, updated_at)
                        VALUES (:user_id, :other_user_id, :last_msg_id, :last_msg_text,
                                :last_msg_time, :last_sender_id, :total_msgs, :total_unread,
                                :created_at, :updated_at)
                    """), {
                        "user_id": latest[0],
                        "other_user_id": latest[1],
                        "last_msg_id": latest[2],
                        "last_msg_text": latest[3],
                        "last_msg_time": latest[4],
                        "last_sender_id": latest[5],
                        "total_msgs": latest[6],
                        "total_unread": latest[7],
                        "created_at": latest[8],
                        "updated_at": latest[9]
                    })

                db.session.commit()
                print(f"   ✓ Consolidated {len(duplicates)} duplicate conversation pairs")
            else:
                print("   ✓ No duplicates found")

            # Add UNIQUE constraint
            print("\n3. Adding UNIQUE constraint on (user_id, other_user_id)...")
            db.session.execute(text("""
                ALTER TABLE message_conversations_denorm
                ADD CONSTRAINT message_conversations_denorm_unique_pair
                UNIQUE (user_id, other_user_id)
            """))
            db.session.commit()
            print("   ✓ UNIQUE constraint added successfully")

            # Verify constraint was added
            print("\n4. Verifying UNIQUE constraint...")
            result = db.session.execute(text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'message_conversations_denorm'
                AND constraint_name = 'message_conversations_denorm_unique_pair'
            """)).fetchone()

            if result:
                print(f"   ✓ Constraint verified: {result[0]} ({result[1]})")
            else:
                raise Exception("UNIQUE constraint not found after creation!")

            print("\n" + "=" * 70)
            print("✓ Migration completed successfully!")
            print("\nThe trigger's ON CONFLICT (user_id, other_user_id) clause will now work.")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    fix_message_conversations()
