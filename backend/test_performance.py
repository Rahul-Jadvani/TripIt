"""
Performance Testing Script - Test all improved endpoints
"""
import requests
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
TOKEN = os.getenv('TEST_TOKEN', '')  # Set this to a valid JWT token

def test_endpoint(name, method, url, headers=None, data=None, iterations=3):
    """Test an endpoint multiple times and return average response time"""
    if headers is None:
        headers = {}

    print(f"\n{'='*70}")
    print(f"Testing: {name}")
    print(f"{'='*70}")

    times = []
    success_count = 0

    for i in range(iterations):
        try:
            start = time.time()

            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            else:
                print(f"Unsupported method: {method}")
                continue

            elapsed = (time.time() - start) * 1000  # Convert to ms
            times.append(elapsed)

            status = response.status_code
            if status == 200:
                success_count += 1
                print(f"  [Run {i+1}] OK {elapsed:.2f}ms (Status: {status})")
            else:
                print(f"  [Run {i+1}] FAIL {elapsed:.2f}ms (Status: {status}) - {response.text[:100]}")

        except requests.exceptions.Timeout:
            print(f"  [Run {i+1}] TIMEOUT (>10s)")
        except Exception as e:
            print(f"  [Run {i+1}] ERROR: {str(e)[:100]}")

    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)

        print(f"\n  Results:")
        print(f"    Average: {avg_time:.2f}ms")
        print(f"    Min:     {min_time:.2f}ms")
        print(f"    Max:     {max_time:.2f}ms")
        print(f"    Success: {success_count}/{iterations}")

        return {
            'name': name,
            'avg': avg_time,
            'min': min_time,
            'max': max_time,
            'success_rate': success_count / iterations * 100
        }
    else:
        print(f"  FAIL - All attempts failed")
        return {
            'name': name,
            'avg': None,
            'min': None,
            'max': None,
            'success_rate': 0
        }


def main():
    print("="*70)
    print("  DENORMALIZATION SYSTEM - PERFORMANCE TEST")
    print("="*70)
    print(f"  Base URL: {BASE_URL}")
    print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    results = []

    # Test 1: Project Feed (Materialized View)
    results.append(test_endpoint(
        name="Project Feed - Trending (MV)",
        method="GET",
        url=f"{BASE_URL}/api/projects?sort=trending&page=1&limit=10"
    ))

    # Test 2: Project Feed - Newest
    results.append(test_endpoint(
        name="Project Feed - Newest (MV)",
        method="GET",
        url=f"{BASE_URL}/api/projects?sort=newest&page=1&limit=10"
    ))

    # Test 3: Project Feed - Top Rated
    results.append(test_endpoint(
        name="Project Feed - Top Rated (MV)",
        method="GET",
        url=f"{BASE_URL}/api/projects?sort=top-rated&page=1&limit=10"
    ))

    # Test 4: Dashboard Stats (if token available)
    if TOKEN:
        headers = {'Authorization': f'Bearer {TOKEN}'}
        results.append(test_endpoint(
            name="User Dashboard Stats (Denormalized)",
            method="GET",
            url=f"{BASE_URL}/api/users/stats",
            headers=headers
        ))
    else:
        print(f"\nWARNING: Skipping dashboard test - no TOKEN set")
        print("  Set TEST_TOKEN environment variable to test authenticated endpoints")

    # Test 5: Search (Full-text with pg_trgm)
    results.append(test_endpoint(
        name="Search - Full-text (pg_trgm)",
        method="GET",
        url=f"{BASE_URL}/api/search?q=blockchain"
    ))

    # Test 6: Leaderboard Projects
    results.append(test_endpoint(
        name="Leaderboard - Projects (MV)",
        method="GET",
        url=f"{BASE_URL}/api/leaderboard/projects?limit=20"
    ))

    # Test 7: Leaderboard Builders
    results.append(test_endpoint(
        name="Leaderboard - Builders (MV)",
        method="GET",
        url=f"{BASE_URL}/api/users/leaderboard/builders?limit=20"
    ))

    # Test 8: Chains Discovery
    results.append(test_endpoint(
        name="Chains Discovery (MV Ready)",
        method="GET",
        url=f"{BASE_URL}/api/chains"
    ))

    # Test 9: Health Check (baseline)
    results.append(test_endpoint(
        name="Health Check (Baseline)",
        method="GET",
        url=f"{BASE_URL}/health"
    ))

    # Summary
    print("\n" + "="*70)
    print("  PERFORMANCE SUMMARY")
    print("="*70)
    print(f"{'Endpoint':<50} {'Avg Time':<12} {'Success':<10}")
    print("-"*70)

    successful_tests = []
    for result in results:
        if result['avg'] is not None:
            avg_str = f"{result['avg']:.2f}ms"
            success_str = f"{result['success_rate']:.0f}%"

            # Color coding based on performance
            if result['avg'] < 100:
                perf_indicator = "EXCELLENT"
            elif result['avg'] < 200:
                perf_indicator = "GOOD"
            elif result['avg'] < 500:
                perf_indicator = "OK"
            else:
                perf_indicator = "SLOW"

            print(f"{result['name']:<50} {avg_str:<12} {success_str:<10} {perf_indicator}")

            if result['success_rate'] == 100:
                successful_tests.append(result)
        else:
            print(f"{result['name']:<50} {'FAILED':<12} {'0%':<10} ERROR")

    print("="*70)

    # Calculate improvement metrics
    if successful_tests:
        avg_response_time = sum(r['avg'] for r in successful_tests) / len(successful_tests)
        print(f"\n[OK] {len(successful_tests)}/{len(results)} tests successful")
        print(f"[OK] Average response time: {avg_response_time:.2f}ms")

        if avg_response_time < 200:
            print(f"[OK] EXCELLENT PERFORMANCE! All endpoints < 200ms average")
        elif avg_response_time < 500:
            print(f"[OK] GOOD PERFORMANCE! Most endpoints performing well")
        else:
            print(f"[WARNING] Some endpoints need optimization")

    print("\n" + "="*70)
    print("  Testing complete!")
    print("="*70)


if __name__ == '__main__':
    main()
