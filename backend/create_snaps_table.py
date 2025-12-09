"""
Migration script to create the snaps table
"""
from app import app
from extensions import db
from models.snap import Snap

def create_snaps_table():
    """Create the snaps table"""
    with app.app_context():
        print("[MIGRATION] Creating snaps table...")
        try:
            # Create the table
            db.create_all()
            print("[SUCCESS] Snaps table created successfully!")

            # Verify table exists
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()

            if 'snaps' in tables:
                print("[VERIFIED] Snaps table exists in database")
                columns = inspector.get_columns('snaps')
                print(f"[INFO] Table has {len(columns)} columns:")
                for col in columns:
                    print(f"  - {col['name']}: {col['type']}")
            else:
                print("[ERROR] Snaps table was not created!")

        except Exception as e:
            print(f"[ERROR] Failed to create snaps table: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    create_snaps_table()
