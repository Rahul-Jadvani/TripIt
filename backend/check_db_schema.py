"""Check current database schema for projects table"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check column types
    result = conn.execute(text("""
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name IN ('proof_score', 'verification_score', 'community_score', 'onchain_score', 'validation_score', 'quality_score')
        ORDER BY column_name
    """))

    print("Current score column types in projects table:")
    print("-" * 70)
    for row in result:
        print(f"{row[0]:25} {row[1]:15} precision={row[2]} scale={row[3]}")

    # Check for dependencies
    print("\nChecking for dependencies (triggers, views, etc.)...")
    print("-" * 70)

    # Check triggers
    trig_result = conn.execute(text("""
        SELECT trigger_name, event_manipulation
        FROM information_schema.triggers
        WHERE event_object_table = 'projects'
    """))

    triggers = list(trig_result)
    if triggers:
        print(f"\nTriggers on projects table: {len(triggers)}")
        for row in triggers:
            print(f"  - {row[0]} ({row[1]})")

    # Check materialized views
    mv_result = conn.execute(text("""
        SELECT matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
    """))

    mvs = list(mv_result)
    if mvs:
        print(f"\nMaterialized views: {len(mvs)}")
        for row in mvs:
            print(f"  - {row[0]}")
