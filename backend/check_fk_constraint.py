from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    print("=== CHECKING FOREIGN KEY CONSTRAINTS ON votes TABLE ===\n")

    # Check all FK constraints on votes table
    result = db.session.execute(text("""
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'votes'
        AND tc.constraint_type = 'FOREIGN KEY'
    """)).fetchall()

    if result:
        print(f"❌ Found {len(result)} FK constraints on votes table:")
        for row in result:
            print(f"\n  Constraint: {row[0]}")
            print(f"  Column: {row[2]} -> {row[3]}.{row[4]}")
        print("\n⚠️  The migration did NOT work! FK constraints still exist.")
        print("This is why voting fails - votes can only go to projects table, not itineraries.")
    else:
        print("✅ NO FK constraints found on votes table!")
        print("Migration worked correctly.")
