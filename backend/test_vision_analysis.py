"""
Test GPT-4 Vision Analysis for Snaps
Verify intelligent image-based filtering
"""
from app import app
from services.ai_analyzer import AIAnalyzer

def test_vision_analysis():
    """Test that AI Vision correctly analyzes images"""

    with app.app_context():
        analyzer = AIAnalyzer()

        if not analyzer.is_available():
            print("❌ OpenAI not configured. Please set OPENAI_API_KEY in .env")
            return

        print("\n" + "="*80)
        print("GPT-4 VISION ANALYSIS TEST")
        print("="*80)

        # Test with a real IPFS image URL
        # Note: You'll need to replace this with actual IPFS URLs from your snaps

        # Example test data
        test_cases = [
            {
                "name": "Scenic Travel Photo",
                "data": {
                    'caption': 'Beautiful mountain view',
                    'image_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',  # Placeholder
                    'location_name': 'Swiss Alps',
                    'city': 'Interlaken',
                    'country': 'Switzerland',
                    'latitude': 46.6863,
                    'longitude': 7.8632
                },
                "expected": "Should generate travel alerts"
            },
            {
                "name": "Empty Caption with Scenic Image",
                "data": {
                    'caption': '',
                    'image_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
                    'location_name': 'Swiss Alps',
                    'city': 'Interlaken',
                    'country': 'Switzerland',
                    'latitude': 46.6863,
                    'longitude': 7.8632
                },
                "expected": "Should still generate alerts (vision sees image)"
            }
        ]

        for test in test_cases:
            print("\n" + "-"*80)
            print(f"TEST: {test['name']}")
            print("-"*80)
            print(f"Caption: '{test['data']['caption']}'")
            print(f"Location: {test['data']['location_name']}")
            print(f"Expected: {test['expected']}")
            print()

            try:
                alerts = analyzer.analyze_snap(test['data'])
                print(f"✅ Analysis completed")
                print(f"📊 Alerts generated: {len(alerts)}")

                if alerts:
                    print("\nAlerts:")
                    for i, alert in enumerate(alerts, 1):
                        print(f"\n  Alert {i}:")
                        print(f"    Type: {alert.get('type')}")
                        print(f"    Priority: {alert.get('priority')}")
                        print(f"    Title: {alert.get('title')}")
                        print(f"    Message: {alert.get('message')[:100]}...")
                else:
                    print("\n  No alerts generated (image deemed non-travel)")

            except Exception as e:
                print(f"❌ Error: {e}")
                import traceback
                traceback.print_exc()

        print("\n" + "="*80)
        print("TESTING COMPLETE")
        print("="*80)
        print("\nNOTE: For full testing, upload actual snaps via API")
        print("      with real IPFS image URLs (from pothole photos,")
        print("      scenic photos, etc.) and monitor the results.")

if __name__ == '__main__':
    test_vision_analysis()
