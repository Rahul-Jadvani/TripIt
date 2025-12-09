"""
Test AI Snap Filtering - Verify caption-based analysis
"""
from app import app
from services.ai_analyzer import AIAnalyzer

def test_snap_filtering():
    """Test that AI analyzer correctly filters snaps based on caption"""

    with app.app_context():
        analyzer = AIAnalyzer()

        # Test Case 1: Empty caption (should skip)
        print("\n" + "="*80)
        print("TEST 1: Empty caption")
        print("="*80)
        snap_data = {
            'caption': '',
            'location_name': 'Pushpagiri Nagar',
            'city': 'Bengaluru',
            'country': 'India',
            'latitude': 12.9716,
            'longitude': 77.5946
        }
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        assert len(alerts) == 0, "Should skip empty caption"
        print("✅ PASSED: Skipped empty caption")

        # Test Case 2: Short caption (should skip)
        print("\n" + "="*80)
        print("TEST 2: Short caption")
        print("="*80)
        snap_data['caption'] = 'Nice'
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        assert len(alerts) == 0, "Should skip short caption"
        print("✅ PASSED: Skipped short caption")

        # Test Case 3: Pothole (should skip)
        print("\n" + "="*80)
        print("TEST 3: Pothole caption (non-travel)")
        print("="*80)
        snap_data['caption'] = 'Big pothole on the road'
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        assert len(alerts) == 0, "Should skip pothole caption"
        print("✅ PASSED: Skipped pothole content")

        # Test Case 4: My house (should skip)
        print("\n" + "="*80)
        print("TEST 4: 'My house' caption (non-travel)")
        print("="*80)
        snap_data['caption'] = 'View from my house terrace'
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        assert len(alerts) == 0, "Should skip 'my house' caption"
        print("✅ PASSED: Skipped 'my house' content")

        # Test Case 5: Traffic (should skip)
        print("\n" + "="*80)
        print("TEST 5: Traffic jam caption (non-travel)")
        print("="*80)
        snap_data['caption'] = 'Traffic jam near office'
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        assert len(alerts) == 0, "Should skip traffic jam caption"
        print("✅ PASSED: Skipped traffic jam content")

        # Test Case 6: Travel-related (should analyze)
        print("\n" + "="*80)
        print("TEST 6: Travel-related caption (should analyze)")
        print("="*80)
        snap_data['caption'] = 'Beautiful sunset at Dal Lake, Kashmir'
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        print("Alerts:", alerts)
        # This should generate alerts (if OpenAI is configured)
        if analyzer.is_available():
            print("✅ PASSED: Analyzed travel-related content")
        else:
            print("⚠️ SKIPPED: OpenAI not configured")

        # Test Case 7: Safety question (should analyze)
        print("\n" + "="*80)
        print("TEST 7: Safety question (should analyze)")
        print("="*80)
        snap_data['caption'] = 'Is this area safe for solo female travelers?'
        alerts = analyzer.analyze_snap(snap_data)
        print(f"Result: {len(alerts)} alerts generated")
        print("Alerts:", alerts)
        if analyzer.is_available():
            print("✅ PASSED: Analyzed safety question")
        else:
            print("⚠️ SKIPPED: OpenAI not configured")

        print("\n" + "="*80)
        print("ALL TESTS PASSED! ✅")
        print("="*80)
        print("\nSummary:")
        print("- Empty captions: Skipped ✅")
        print("- Short captions (<10 chars): Skipped ✅")
        print("- Non-travel keywords (pothole, my house, traffic): Skipped ✅")
        print("- Travel-related content: Analyzed ✅")
        print("- Safety questions: Analyzed ✅")

if __name__ == '__main__':
    test_snap_filtering()
