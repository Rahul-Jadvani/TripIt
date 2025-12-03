"""
Rescore all itineraries with new travel-focused scoring logic
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extensions import db
from models.itinerary import Itinerary
from tasks.scoring_tasks import score_itinerary_task
from config import Config
from flask import Flask

def rescore_all_itineraries():
    """Rescore all itineraries with the new travel-focused scoring"""

    # Create a minimal Flask app context
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = Config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        print("=" * 80)
        print("RESCORING ALL ITINERARIES WITH NEW TRAVEL-FOCUSED SCORING")
        print("=" * 80)

        # Get all itineraries
        itineraries = Itinerary.query.filter(
            Itinerary.is_deleted == False
        ).all()

        total = len(itineraries)
        print(f"\nFound {total} itineraries to rescore\n")

        success_count = 0
        error_count = 0

        for idx, itinerary in enumerate(itineraries, 1):
            try:
                print(f"[{idx}/{total}] Rescoring: {itinerary.title[:50]}...")

                # Call the scoring task synchronously (not via Celery)
                result = score_itinerary_task.apply(args=[itinerary.id])

                if result.result.get('success'):
                    success_count += 1
                    scores = result.result
                    print(f"  [OK] Proof Score: {scores['proof_score']:.2f} "
                          f"(I:{scores['identity_score']:.2f} "
                          f"TH:{scores['travel_history_score']:.2f} "
                          f"C:{scores['community_score']:.2f} "
                          f"S:{scores['safety_component']:.2f} "
                          f"Q:{scores['quality_score']:.2f})")
                else:
                    error_count += 1
                    print(f"  [ERROR] Error: {result.result.get('error')}")

            except Exception as e:
                error_count += 1
                print(f"  [ERROR] Exception: {str(e)}")

        print("\n" + "=" * 80)
        print(f"RESCORING COMPLETED")
        print(f"  Success: {success_count}/{total}")
        print(f"  Errors: {error_count}/{total}")
        print("=" * 80)

if __name__ == '__main__':
    rescore_all_itineraries()
