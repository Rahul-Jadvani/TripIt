"""
Sync existing itineraries to projects table for UI compatibility
"""
import os
import sys
import json
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def sync_itineraries_to_projects():
    """Sync itineraries to projects table"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Syncing itineraries to projects table...")

        # Get all itineraries
        cursor.execute("""
            SELECT id, created_by_traveler_id, title, description,
                   activity_tags, travel_companions, route_map_url,
                   proof_score, created_at, updated_at
            FROM itineraries
        """)
        itineraries = cursor.fetchall()
        print(f"Found {len(itineraries)} itineraries to sync")

        synced_count = 0
        for itin in itineraries:
            itin_id, user_id, title, description, activity_tags, travel_companions, route_map_url, proof_score, created_at, updated_at = itin

            # Check if project already exists
            cursor.execute("SELECT id FROM projects WHERE id = %s", (itin_id,))
            exists = cursor.fetchone()

            if not exists:
                # Convert JSON fields to proper format
                tech_stack_json = Json(activity_tags) if activity_tags else Json([])
                team_members_json = Json(travel_companions) if travel_companions else Json([])

                # Insert into projects table
                cursor.execute("""
                    INSERT INTO projects (
                        id, user_id, title, description, tagline,
                        demo_url, github_url, tech_stack, team_members,
                        proof_score, scoring_status,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, '',
                        %s, %s, %s, %s,
                        %s, 'pending',
                        %s, %s
                    )
                """, (
                    itin_id, user_id, title, description,
                    route_map_url or '', route_map_url or '',
                    tech_stack_json, team_members_json,
                    proof_score or 0,
                    created_at, updated_at
                ))
                synced_count += 1
                print(f"  ✓ Synced itinerary: {title}")
            else:
                print(f"  - Project already exists: {title}")

        print(f"\n✅ Synced {synced_count} itineraries to projects table!")

    except Exception as e:
        print(f"\n❌ Sync failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    sync_itineraries_to_projects()
