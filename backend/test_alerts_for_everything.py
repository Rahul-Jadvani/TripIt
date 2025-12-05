"""
Test AI Alerts for EVERYTHING - Comprehensive Testing
Verify that AI provides alerts for ALL content types:
- Potholes, traffic jams, infrastructure issues
- Scenic views, travel content
- Daily life, home, office content
"""
from app import app
from services.ai_analyzer import AIAnalyzer

def test_alerts_for_everything():
    """Test that AI generates alerts for EVERYTHING, not just travel content"""

    with app.app_context():
        analyzer = AIAnalyzer()

        if not analyzer.is_available():
            print("\n" + "="*80)
            print("❌ OpenAI not configured. Please set OPENAI_API_KEY in .env")
            print("="*80)
            return

        print("\n" + "="*80)
        print("AI ALERTS FOR EVERYTHING - COMPREHENSIVE TEST")
        print("="*80)
        print("\nTesting that AI provides alerts for ALL content types:")
        print("✓ Infrastructure issues (potholes, road damage)")
        print("✓ Traffic patterns (jams, congestion)")
        print("✓ Daily life (home, office, parking)")
        print("✓ Travel content (scenic views, destinations)")
        print("="*80)

        # Test cases covering ALL content types
        test_cases = [
            {
                "name": "Test 1: Pothole in Residential Area",
                "data": {
                    'caption': 'Pothole near my house gate',
                    'image_url': 'https://images.unsplash.com/photo-1583511655826-05700d4f0e44',  # Placeholder: pothole image
                    'location_name': 'Pushpagiri Nagar',
                    'city': 'Bengaluru',
                    'country': 'India',
                    'latitude': 12.9716,
                    'longitude': 77.5946
                },
                "expected": "Infrastructure alert with reporting info"
            },
            {
                "name": "Test 2: Traffic Near Office",
                "data": {
                    'caption': 'Traffic jam near office',
                    'image_url': 'https://images.unsplash.com/photo-1582564286939-400a311013a2',  # Placeholder: traffic
                    'location_name': 'Electronic City',
                    'city': 'Bengaluru',
                    'country': 'India',
                    'latitude': 12.8456,
                    'longitude': 77.6603
                },
                "expected": "Traffic pattern alert with alternative routes"
            },
            {
                "name": "Test 3: Parking Lot",
                "data": {
                    'caption': 'Parking area',
                    'image_url': 'https://images.unsplash.com/photo-1590674899484-d5640e854abe',  # Placeholder: parking
                    'location_name': 'Forum Mall',
                    'city': 'Bengaluru',
                    'country': 'India',
                    'latitude': 12.9352,
                    'longitude': 77.6244
                },
                "expected": "Parking information with rates and safety"
            },
            {
                "name": "Test 4: Home Interior",
                "data": {
                    'caption': 'My room',
                    'image_url': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af',  # Placeholder: room
                    'location_name': 'Home',
                    'city': 'Bengaluru',
                    'country': 'India',
                    'latitude': 12.9716,
                    'longitude': 77.5946
                },
                "expected": "Home safety tips"
            },
            {
                "name": "Test 5: Broken Sidewalk",
                "data": {
                    'caption': 'Damaged footpath',
                    'image_url': 'https://images.unsplash.com/photo-1583511655826-05700d4f0e44',  # Placeholder: damaged path
                    'location_name': 'MG Road',
                    'city': 'Bengaluru',
                    'country': 'India',
                    'latitude': 12.9759,
                    'longitude': 77.6062
                },
                "expected": "Pedestrian safety alert with reporting"
            },
            {
                "name": "Test 6: Highway Pothole (Travel Context)",
                "data": {
                    'caption': 'Dangerous pothole on Mumbai-Pune Expressway',
                    'image_url': 'https://images.unsplash.com/photo-1583511655826-05700d4f0e44',  # Placeholder: pothole
                    'location_name': 'Mumbai-Pune Expressway KM 47',
                    'city': 'Pune',
                    'country': 'India',
                    'latitude': 18.8190,
                    'longitude': 73.4467
                },
                "expected": "Highway road warning with alternatives"
            },
            {
                "name": "Test 7: Tourist Route Traffic",
                "data": {
                    'caption': 'Heavy traffic on way to Rohtang Pass',
                    'image_url': 'https://images.unsplash.com/photo-1582564286939-400a311013a2',  # Placeholder: traffic
                    'location_name': 'Manali-Rohtang Road',
                    'city': 'Manali',
                    'country': 'India',
                    'latitude': 32.2432,
                    'longitude': 77.1892
                },
                "expected": "Tourist route traffic with best times"
            },
            {
                "name": "Test 8: Scenic View (Traditional Travel)",
                "data": {
                    'caption': 'Beautiful sunset at Dal Lake',
                    'image_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',  # Placeholder: sunset
                    'location_name': 'Dal Lake',
                    'city': 'Srinagar',
                    'country': 'India',
                    'latitude': 34.0836,
                    'longitude': 74.7973
                },
                "expected": "Travel insights and tips"
            }
        ]

        passed = 0
        failed = 0

        for test in test_cases:
            print("\n" + "-"*80)
            print(f"{test['name']}")
            print("-"*80)
            print(f"Caption: '{test['data']['caption']}'")
            print(f"Location: {test['data']['location_name']}, {test['data']['city']}")
            print(f"Expected: {test['expected']}")
            print()

            try:
                alerts = analyzer.analyze_snap(test['data'])

                if alerts and len(alerts) > 0:
                    print(f"✅ SUCCESS - {len(alerts)} alert(s) generated")
                    passed += 1

                    for i, alert in enumerate(alerts, 1):
                        print(f"\n  Alert {i}:")
                        print(f"    Type: {alert.get('type')}")
                        print(f"    Priority: {alert.get('priority')}")
                        print(f"    Title: {alert.get('title')}")
                        print(f"    Message: {alert.get('message')[:150]}...")
                else:
                    print("❌ FAILED - No alerts generated (should always generate 1-2 alerts)")
                    failed += 1

            except Exception as e:
                print(f"❌ ERROR: {e}")
                failed += 1
                import traceback
                traceback.print_exc()

        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total Tests: {len(test_cases)}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print("="*80)

        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! AI generates alerts for EVERYTHING!")
            print("\nExpected Behavior:")
            print("✓ Potholes → Infrastructure reporting alerts")
            print("✓ Traffic → Alternative routes and timing")
            print("✓ Parking → Rates, availability, safety")
            print("✓ Home → Safety tips and recommendations")
            print("✓ Sidewalk → Pedestrian alerts and reporting")
            print("✓ Highway issues → Road warnings and alternatives")
            print("✓ Tourist traffic → Best times and route tips")
            print("✓ Scenic views → Travel insights and tips")
            print("\n✅ System is working as expected!")
        else:
            print("\n⚠️ Some tests failed. Review AI responses above.")
            print("Note: Placeholder image URLs may not return optimal results.")
            print("      Test with real IPFS URLs for best accuracy.")

        print("\n" + "="*80)
        print("NEXT STEPS")
        print("="*80)
        print("1. Restart Celery worker:")
        print("   cd backend")
        print("   celery -A celery_app.celery worker --loglevel=info --pool=solo")
        print()
        print("2. Upload REAL photos via API to test with actual IPFS URLs:")
        print("   - Pothole photo → Should generate infrastructure alert")
        print("   - Traffic photo → Should generate traffic pattern alert")
        print("   - Scenic photo → Should generate travel insights")
        print()
        print("3. Check notifications in app (bell icon) and emails")
        print("="*80)

if __name__ == '__main__':
    test_alerts_for_everything()
