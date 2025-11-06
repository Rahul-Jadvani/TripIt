"""
Database Latency Test - Pure Network Round-Trip Time
=====================================================
Tests database connection latency without any data retrieval.
Uses minimal queries (SELECT 1) to measure pure network latency.
"""

import time
import os
from datetime import datetime
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    exit(1)

print("=" * 70)
print("  DATABASE LATENCY TEST - Network Round-Trip Time")
print("=" * 70)
print(f"  Database: {DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'Unknown'}")
print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# Create engine with minimal pool
engine = create_engine(DATABASE_URL, pool_size=1, max_overflow=0)

def test_latency(iterations=10):
    """Test database latency with minimal queries"""
    latencies = []

    print(f"\nRunning {iterations} latency tests...\n")

    for i in range(iterations):
        try:
            start = time.time()

            # Minimal query - just checks connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            elapsed = (time.time() - start) * 1000  # Convert to ms
            latencies.append(elapsed)

            status = "OK" if elapsed < 100 else ("SLOW" if elapsed < 500 else "VERY SLOW")
            print(f"  Test {i+1:2d}: {elapsed:7.2f}ms  [{status}]")

        except Exception as e:
            print(f"  Test {i+1:2d}: FAILED - {str(e)[:50]}")

    return latencies


def print_statistics(latencies):
    """Print latency statistics"""
    if not latencies:
        print("\nNo successful tests!")
        return

    avg = sum(latencies) / len(latencies)
    min_lat = min(latencies)
    max_lat = max(latencies)

    # Calculate percentiles
    sorted_lat = sorted(latencies)
    p50 = sorted_lat[len(sorted_lat) // 2]
    p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if len(sorted_lat) > 20 else max_lat

    print("\n" + "=" * 70)
    print("  LATENCY STATISTICS")
    print("=" * 70)
    print(f"  Successful Tests:  {len(latencies)}")
    print(f"  Average Latency:   {avg:.2f}ms")
    print(f"  Minimum Latency:   {min_lat:.2f}ms")
    print(f"  Maximum Latency:   {max_lat:.2f}ms")
    print(f"  Median (p50):      {p50:.2f}ms")
    print(f"  95th Percentile:   {p95:.2f}ms")
    print("=" * 70)

    # Diagnosis
    print("\n" + "=" * 70)
    print("  DIAGNOSIS")
    print("=" * 70)

    if avg < 10:
        print("  [EXCELLENT] Database is very close (same region/local)")
        print("  Expected for: Local PostgreSQL or same AWS region")
    elif avg < 50:
        print("  [GOOD] Database is nearby (same continent)")
        print("  Expected for: Same country or neighboring region")
    elif avg < 150:
        print("  [ACCEPTABLE] Database is distant but reasonable")
        print("  Expected for: Different continent, good connection")
    elif avg < 500:
        print("  [SLOW] High latency - geographic distance")
        print("  Expected for: Far away region or slow connection")
    else:
        print("  [VERY SLOW] Severe latency - major distance or network issues")
        print("  Expected for: Opposite side of globe or network problems")

    print("\n  Geographic Distance Impact:")
    if avg > 500:
        print(f"  - Each DB query adds ~{avg:.0f}ms")
        print(f"  - Endpoint with 2 queries: ~{avg*2:.0f}ms just for network")
        print(f"  - Endpoint with 5 queries: ~{avg*5:.0f}ms just for network")
        print("\n  RECOMMENDATION: Move database closer or deploy backend near database")
    elif avg > 150:
        print(f"  - Each DB query adds ~{avg:.0f}ms")
        print(f"  - Acceptable for low-traffic, but consider closer region for production")
    else:
        print(f"  - Each DB query adds ~{avg:.0f}ms")
        print(f"  - Good latency for production use")

    print("=" * 70)


def test_connection_pool():
    """Test if connection pooling affects latency"""
    print("\n" + "=" * 70)
    print("  CONNECTION POOL TEST")
    print("=" * 70)

    # First connection (might be slower)
    start = time.time()
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    first_conn = (time.time() - start) * 1000

    # Reused connection (should be faster)
    start = time.time()
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    reused_conn = (time.time() - start) * 1000

    print(f"  First Connection:    {first_conn:.2f}ms")
    print(f"  Reused Connection:   {reused_conn:.2f}ms")
    print(f"  Connection Overhead: {first_conn - reused_conn:.2f}ms")
    print("=" * 70)


if __name__ == "__main__":
    # Run latency tests
    latencies = test_latency(iterations=20)

    # Print statistics
    print_statistics(latencies)

    # Test connection pooling
    test_connection_pool()

    # Close engine
    engine.dispose()

    print("\n" + "=" * 70)
    print("  Test complete!")
    print("=" * 70)
