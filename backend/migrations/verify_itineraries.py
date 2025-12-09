"""
Verify created itineraries
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

# Get all itineraries
cursor.execute('''
    SELECT id, title, destination, duration_days, budget_amount,
           trip_highlights IS NOT NULL, trip_journey IS NOT NULL,
           day_by_day_plan IS NOT NULL, safety_intelligence IS NOT NULL,
           hidden_gems IS NOT NULL, unique_highlights IS NOT NULL,
           safety_tips IS NOT NULL
    FROM itineraries
    ORDER BY created_at DESC
''')
results = cursor.fetchall()

print('\n' + '='*80)
print('ALL ITINERARIES IN DATABASE')
print('='*80)
for idx, row in enumerate(results, 1):
    print(f'\n{idx}. {row[1]}')
    print(f'   Destination: {row[2]}')
    print(f'   Duration: {row[3]} days | Budget: Rs.{row[4]:,}')
    print(f'   Extended Fields: Highlights={row[5]}, Journey={row[6]}, DayPlan={row[7]},')
    print(f'                    Safety={row[8]}, Gems={row[9]}, Unique={row[10]}, Tips={row[11]}')

print('\n' + '='*80)
print(f'Total: {len(results)} itineraries')
print('='*80)

cursor.close()
conn.close()
