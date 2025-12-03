"""
Rescore a specific itinerary with the new scoring logic
"""
import sys
sys.path.insert(0, '.')

from extensions import db
from models.itinerary import Itinerary
from app import create_app

def rescore_itinerary(itinerary_id):
    """Rescore a specific itinerary"""
    app = create_app()

    with app.app_context():
        itinerary = Itinerary.query.get(itinerary_id)

        if not itinerary:
            print(f"[ERROR] Itinerary {itinerary_id} not found")
            return False

        print(f"[INFO] Found itinerary: {itinerary.title}")
        print(f"[INFO] Current proof_score: {itinerary.proof_score}")
        print(f"[INFO] Rescoring itinerary with new logic...")

        try:
            # Import scoring task to call it synchronously
            from tasks.scoring_tasks import score_itinerary_task

            # Call the Celery task directly (synchronously for testing)
            score_itinerary_task(itinerary_id)

            # Refresh the itinerary to see updated scores
            db.session.refresh(itinerary)

            print(f"\n[SUCCESS] Itinerary rescored!")
            print(f"Total Score: {itinerary.proof_score}")
            print(f"  - Identity Score: {itinerary.identity_score}")
            print(f"  - Travel History Score: {itinerary.travel_history_score}")
            print(f"  - Community Score: {itinerary.community_score}")
            print(f"  - Safety Score Component: {itinerary.safety_score_component}")
            print(f"  - Quality Score: {itinerary.quality_score}")

            if itinerary.score_explanations:
                print(f"\n[INFO] Score explanations generated: {len(itinerary.score_explanations)} components")
                for key, explanation in itinerary.score_explanations.items():
                    print(f"\n{key}:")
                    print(f"  Score: {explanation['score']}/{explanation['max']} ({explanation['percentage']}%)")
                    print(f"  Summary: {explanation['summary']}")

            return True
        except Exception as e:
            print(f"[ERROR] Scoring failed: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return False

if __name__ == '__main__':
    # Default itinerary ID
    itinerary_id = '49ac131a-bc02-41d6-92dd-2057af9d0ece'

    # Allow passing itinerary ID as argument
    if len(sys.argv) > 1:
        itinerary_id = sys.argv[1]

    rescore_itinerary(itinerary_id)
