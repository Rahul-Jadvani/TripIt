import requests
import json

url = "http://localhost:5000/api/auth/register"
data = {
    "email": "test@example.com",
    "username": "testuser123",
    "password": "TestPassword123!"
}

print("Testing registration endpoint...")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, indent=2)}")
print()

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
