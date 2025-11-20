"""
Database Migration: Add Events, EventProjects, and EventSubscribers tables

Run this script to add the new event/organizer functionality tables to your database.

Usage:
    python add_events_tables.py
"""

from app import create_app
from extensions import db
from sqlalchemy import text
import sys

def run_migration():
    """Add events, event_projects, and event_subscribers tables"""

    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("DATABASE MIGRATION: Adding Events Tables")
        print("=" * 60)
        print()

        try:
            # Import models to ensure they're registered
            from models.event import Event, EventProject, EventSubscriber
            from models.user import User
            from models.project import Project

            # Check if tables already exist
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()

            tables_to_create = []
            if 'events' not in existing_tables:
                tables_to_create.append('events')
            if 'event_projects' not in existing_tables:
                tables_to_create.append('event_projects')
            if 'event_subscribers' not in existing_tables:
                tables_to_create.append('event_subscribers')

            if not tables_to_create:
                print("[OK] All event tables already exist. No migration needed.")
                print()
                return True

            print(f"[INFO] Tables to create: {', '.join(tables_to_create)}")
            print()

            # Create tables
            print("Creating tables...")
            db.create_all()

            # Verify creation
            inspector = db.inspect(db.engine)
            updated_tables = inspector.get_table_names()

            print()
            print("[OK] Migration completed successfully!")
            print()
            print("Created tables:")
            for table in tables_to_create:
                if table in updated_tables:
                    print(f"  [+] {table}")

                    # Show columns
                    columns = inspector.get_columns(table)
                    print(f"    Columns: {', '.join([c['name'] for c in columns])}")
                else:
                    print(f"  [!] {table} - FAILED TO CREATE")

            print()
            print("=" * 60)
            print("New Features Available:")
            print("=" * 60)
            print()
            print("API Endpoints:")
            print("  GET    /api/events                      - List all events")
            print("  GET    /api/events/<slug>               - Get single event")
            print("  GET    /api/events/<slug>/projects      - Get event's projects")
            print("  POST   /api/events                      - Create event (auth)")
            print("  PUT    /api/events/<slug>               - Update event (auth)")
            print("  POST   /api/events/<slug>/projects      - Add project to event (auth)")
            print("  DELETE /api/events/<slug>/projects/<id> - Remove project (auth)")
            print("  POST   /api/events/<slug>/subscribe     - Subscribe to event (auth)")
            print("  DELETE /api/events/<slug>/subscribe     - Unsubscribe (auth)")
            print("  GET    /api/events/featured             - Get featured events")
            print("  GET    /api/events/types                - Get event types/categories")
            print()
            print("=" * 60)

            return True

        except Exception as e:
            print(f"[ERROR] Migration failed: {str(e)}")
            print()
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return False


if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
