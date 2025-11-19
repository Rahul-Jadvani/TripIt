"""
Clear corrupted vote cache from Redis

Run this once after deploying the downvote tracking fix
"""
import redis
from config import config
import os

# Connect to Redis
env = os.getenv("FLASK_ENV", "development")
redis_url = config[env].REDIS_URL
r = redis.from_url(redis_url, decode_responses=True)

print("Clearing vote cache from Redis...")

# Clear all user vote sets (upvotes and downvotes)
cursor = 0
count = 0

# Clear user:*:upvotes
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="user:*:upvotes", count=100)
    if keys:
        r.delete(*keys)
        count += len(keys)
    if cursor == 0:
        break

# Clear user:*:downvotes (new pattern)
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="user:*:downvotes", count=100)
    if keys:
        r.delete(*keys)
        count += len(keys)
    if cursor == 0:
        break

# Clear vote state
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="vote:state:*", count=100)
    if keys:
        r.delete(*keys)
        count += len(keys)
    if cursor == 0:
        break

print(f"Cleared {count} vote cache keys from Redis")
print("Users will need to refresh their pages to reload vote state from database")
