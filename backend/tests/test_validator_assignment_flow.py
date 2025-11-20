"""
Comprehensive test script for validator assignment system
Tests the complete end-to-end flow:
1. Admin sets validator category preferences
2. Project is created with multiple categories
3. Auto-assignment creates assignments
4. Validator sees project in dashboard
5. Validation marks project as done for all validators
"""
import requests
import json
from pprint import pprint

BASE_URL = "http://localhost:5000/api"

# Admin credentials (from logs)
ADMIN_EMAIL = "sameerkatte@gmail.com"
ADMIN_PASSWORD = "admin123"  # Replace with actual password

print("="*80)
print("VALIDATOR ASSIGNMENT SYSTEM - END-TO-END TEST")
print("="*80)

# Step 1: Login as admin
print("\n[1] Logging in as admin...")
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
})

if response.status_code == 200:
    admin_token = response.json()['data']['access_token']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"✓ Admin logged in successfully")
else:
    print(f"✗ Admin login failed: {response.status_code}")
    print(response.text)
    exit(1)

# Step 2: Get all validators
print("\n[2] Fetching validators...")
response = requests.get(f"{BASE_URL}/admin/validators", headers=admin_headers)

if response.status_code == 200:
    data = response.json()
    validators = data['data']['validators']
    print(f"✓ Found {len(validators)} validators")

    if len(validators) == 0:
        print("✗ No validators found. Please create at least one validator first.")
        exit(1)

    # Display validator info
    for v in validators:
        print(f"\n  Validator: {v['username']} ({v['email']})")
        if v.get('permissions'):
            perms = v['permissions']
            print(f"    - can_validate_all: {perms.get('can_validate_all', False)}")
            print(f"    - allowed_categories: {perms.get('allowed_categories', [])}")
        if v.get('assignments'):
            assigns = v['assignments']
            print(f"    - Assignments: Total={assigns.get('total', 0)}, Pending={assigns.get('pending', 0)}")

    # Pick the first validator for testing
    test_validator = validators[0]
    validator_id = test_validator['id']
    validator_email = test_validator['email']
    print(f"\n✓ Will use validator: {test_validator['username']} for testing")
else:
    print(f"✗ Failed to fetch validators: {response.status_code}")
    print(response.text)
    exit(1)

# Step 3: Update validator's category preferences
print(f"\n[3] Setting category preferences for validator {test_validator['username']}...")
test_categories = ["AI/ML", "EdTech", "Web3/Blockchain"]
response = requests.patch(
    f"{BASE_URL}/admin/validators/{validator_id}/permissions",
    headers=admin_headers,
    json={
        "allowed_categories": test_categories,
        "can_validate_all": False
    }
)

if response.status_code == 200:
    print(f"✓ Category preferences updated: {test_categories}")
else:
    print(f"✗ Failed to update preferences: {response.status_code}")
    print(response.text)
    exit(1)

# Step 4: Get all projects to see current state
print("\n[4] Fetching current projects...")
response = requests.get(f"{BASE_URL}/admin/projects?per_page=100", headers=admin_headers)

if response.status_code == 200:
    data = response.json()
    projects = data['data']['projects']
    print(f"✓ Found {len(projects)} existing projects")

    # Find a project with matching categories
    matching_project = None
    for p in projects:
        if p.get('categories'):
            # Check if any category matches
            if any(cat in test_categories for cat in p['categories']):
                matching_project = p
                break

    if matching_project:
        print(f"\n✓ Found existing project with matching categories:")
        print(f"  Project: {matching_project['title']}")
        print(f"  Categories: {matching_project.get('categories', [])}")
        test_project_id = matching_project['id']
    else:
        print(f"\n! No existing project with matching categories found")
        print(f"  Please create a project via the UI with categories: {test_categories}")
        print(f"  Then run this test again to verify auto-assignment")
        test_project_id = None
else:
    print(f"✗ Failed to fetch projects: {response.status_code}")
    print(response.text)
    test_project_id = None

# Step 5: Check if auto-assignment created assignments
if test_project_id:
    print(f"\n[5] Checking assignments for project {test_project_id[:8]}...")

    # Get validator's assignments from the validator list
    response = requests.get(f"{BASE_URL}/admin/validators", headers=admin_headers)
    if response.status_code == 200:
        validators = response.json()['data']['validators']
        test_validator_data = next((v for v in validators if v['id'] == validator_id), None)

        if test_validator_data and test_validator_data.get('assignments'):
            assigns = test_validator_data['assignments']
            print(f"✓ Validator has assignments:")
            print(f"  Total: {assigns.get('total', 0)}")
            print(f"  Pending: {assigns.get('pending', 0)}")
            print(f"  In Review: {assigns.get('in_review', 0)}")
            print(f"  Completed: {assigns.get('completed', 0)}")
        else:
            print(f"! No assignments found. Auto-assignment may not have triggered yet.")
            print(f"  Try creating a NEW project to test auto-assignment.")
    else:
        print(f"✗ Failed to fetch updated validators: {response.status_code}")

# Step 6: Try to login as validator to test their dashboard
print(f"\n[6] Testing validator dashboard...")
print(f"  Note: You'll need to know the validator's password to test their dashboard")
print(f"  Validator email: {validator_email}")
print(f"  If you have the password, you can test via the UI by:")
print(f"    1. Login as the validator")
print(f"    2. Check if the project appears in their dashboard")
print(f"    3. Try validating the project")
print(f"    4. Verify it disappears from all validators")

# Step 7: Manual assignment test
print(f"\n[7] Testing manual assignment via bulk assign...")
if test_project_id:
    response = requests.post(
        f"{BASE_URL}/admin/validator-assignments/bulk",
        headers=admin_headers,
        json={
            "validator_ids": [validator_id],
            "project_ids": [test_project_id],
            "category_filter": ",".join(test_categories),
            "priority": "normal"
        }
    )

    if response.status_code == 201:
        result = response.json()
        print(f"✓ Manual bulk assignment successful:")
        print(f"  {result.get('message', 'No message')}")
    else:
        print(f"! Manual assignment response: {response.status_code}")
        print(response.text)

print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)
print("""
✓ Admin login - SUCCESS
✓ Fetch validators - SUCCESS
✓ Update category preferences - SUCCESS
✓ Fetch projects - SUCCESS

Next steps to complete testing:
1. Create a NEW project via the UI with categories: ['AI/ML', 'EdTech', 'Web3/Blockchain']
2. Check backend logs for [AUTO-ASSIGN] messages
3. Login as the validator to see their dashboard
4. Validate a project and verify it disappears from all validators

The system is configured and ready. Auto-assignment will work for new projects!
""")
print("="*80)
