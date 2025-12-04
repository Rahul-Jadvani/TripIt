"""
Add upvotes and downvotes columns to itineraries table
"""
from app import app, db

def add_vote_columns():
    """Add upvotes and downvotes columns to itineraries table"""
    with app.app_context():
        try:
            # Check if columns already exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('itineraries')]

            if 'upvotes' in columns and 'downvotes' in columns:
                print("✓ Columns already exist")
                return

            print("Adding upvotes and downvotes columns to itineraries...")

            # Add columns using raw SQL
            with db.engine.connect() as conn:
                if 'upvotes' not in columns:
                    conn.execute(db.text("""
                        ALTER TABLE itineraries
                        ADD COLUMN upvotes INTEGER DEFAULT 0
                    """))
                    conn.execute(db.text("""
                        CREATE INDEX IF NOT EXISTS ix_itineraries_upvotes
                        ON itineraries(upvotes)
                    """))
                    conn.commit()
                    print("✓ Added upvotes column")

                if 'downvotes' not in columns:
                    conn.execute(db.text("""
                        ALTER TABLE itineraries
                        ADD COLUMN downvotes INTEGER DEFAULT 0
                    """))
                    conn.commit()
                    print("✓ Added downvotes column")

            print("✓ Migration complete!")

        except Exception as e:
            print(f"✗ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    add_vote_columns()
