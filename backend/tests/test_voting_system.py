"""
Test script to verify the voting system works correctly
Run this after the backend is started: python test_voting_system.py
"""

import requests
import json
import sys

# Configuration
API_BASE = 'http://localhost:5000/api'
TEST_USERNAME = 'testvoter'
TEST_EMAIL = 'testvoter@example.com'
TEST_PASSWORD = 'TestPassword123!'

def print_step(step_num, message):
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {message}")
    print(f"{'='*60}")

def test_voting_system():
    """Test the complete voting flow"""

    # Step 1: Create or authenticate a test user
    print_step(1, "Authenticating/Creating test user")
    try:
        # Try to login
        response = requests.post(f'{API_BASE}/auth/login', json={
            'email': TEST_EMAIL,
            'password': TEST_PASSWORD
        })

        if response.status_code == 200:
            print("✓ User authenticated")
            token = response.json()['data']['access']
        elif response.status_code == 401:
            # User doesn't exist, try to register
            print("User doesn't exist, registering...")
            response = requests.post(f'{API_BASE}/auth/register', json={
                'username': TEST_USERNAME,
                'email': TEST_EMAIL,
                'password': TEST_PASSWORD,
                'display_name': 'Test Voter'
            })

            if response.status_code != 201:
                print(f"✗ Registration failed: {response.text}")
                return False

            token = response.json()['data']['access']
            print("✓ User registered and authenticated")
        else:
            print(f"✗ Auth error: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Auth failed: {e}")
        return False

    headers = {'Authorization': f'Bearer {token}'}

    # Step 2: Get a project to vote on
    print_step(2, "Fetching a project to vote on")
    try:
        response = requests.get(f'{API_BASE}/projects?page=1')
        if response.status_code != 200:
            print(f"✗ Failed to fetch projects: {response.text}")
            return False

        projects = response.json()['data']
        if not projects:
            print("✗ No projects found")
            return False

        project = projects[0]
        project_id = project['id']
        initial_votes = project.get('net_score', 0) or (project.get('upvotes', 0) - project.get('downvotes', 0))
        print(f"✓ Found project: {project['title']}")
        print(f"  - Project ID: {project_id}")
        print(f"  - Initial vote count: {initial_votes}")
        print(f"  - User vote: {project.get('user_vote', None)}")
    except Exception as e:
        print(f"✗ Failed to fetch project: {e}")
        return False

    # Step 3: Cast an upvote
    print_step(3, "Casting an upvote")
    try:
        response = requests.post(f'{API_BASE}/votes',
            json={'project_id': project_id, 'vote_type': 'up'},
            headers=headers
        )

        if response.status_code != 200:
            print(f"✗ Vote failed: {response.text}")
            return False

        vote_response = response.json()
        print(f"✓ Vote recorded: {vote_response['message']}")

        # Check response structure
        if 'data' in vote_response:
            project_data = vote_response['data']
            print(f"  - Response upvotes: {project_data.get('upvotes', 'N/A')}")
            print(f"  - Response downvotes: {project_data.get('downvotes', 'N/A')}")
            print(f"  - User vote: {project_data.get('user_vote', 'N/A')}")
        else:
            print("✗ Response doesn't include project data!")
            return False
    except Exception as e:
        print(f"✗ Upvote failed: {e}")
        return False

    # Step 4: Verify vote was saved in database
    print_step(4, "Verifying vote persisted")
    try:
        response = requests.get(f'{API_BASE}/projects/{project_id}', headers=headers)

        if response.status_code != 200:
            print(f"✗ Failed to fetch project: {response.text}")
            return False

        updated_project = response.json()['data']
        new_votes = updated_project.get('upvotes', 0) - updated_project.get('downvotes', 0)
        user_vote = updated_project.get('user_vote')

        print(f"✓ Project fetched from database")
        print(f"  - Upvotes: {updated_project.get('upvotes', 0)}")
        print(f"  - Downvotes: {updated_project.get('downvotes', 0)}")
        print(f"  - Net score: {new_votes}")
        print(f"  - User's vote: {user_vote}")

        if user_vote != 'up':
            print(f"✗ User vote not set correctly! Expected 'up', got '{user_vote}'")
            return False

        if new_votes <= initial_votes:
            print(f"⚠ Warning: Vote count didn't increase (was {initial_votes}, now {new_votes})")
    except Exception as e:
        print(f"✗ Verification failed: {e}")
        return False

    # Step 5: Remove the vote
    print_step(5, "Removing the vote (click same button again)")
    try:
        response = requests.post(f'{API_BASE}/votes',
            json={'project_id': project_id, 'vote_type': 'up'},
            headers=headers
        )

        if response.status_code != 200:
            print(f"✗ Vote removal failed: {response.text}")
            return False

        vote_response = response.json()
        print(f"✓ Vote removed: {vote_response['message']}")

        if 'data' not in vote_response:
            print(f"✗ Response doesn't include project data after removal!")
            return False
    except Exception as e:
        print(f"✗ Vote removal failed: {e}")
        return False

    # Step 6: Verify vote was removed from database
    print_step(6, "Verifying vote removal persisted")
    try:
        response = requests.get(f'{API_BASE}/projects/{project_id}', headers=headers)

        if response.status_code != 200:
            print(f"✗ Failed to fetch project: {response.text}")
            return False

        final_project = response.json()['data']
        final_user_vote = final_project.get('user_vote')

        print(f"✓ Project fetched from database")
        print(f"  - User's vote: {final_user_vote}")

        if final_user_vote is not None:
            print(f"✗ User vote not cleared! Expected None, got '{final_user_vote}'")
            return False
    except Exception as e:
        print(f"✗ Verification failed: {e}")
        return False

    print_step(7, "ALL TESTS PASSED ✓")
    print("\nThe voting system is working correctly!")
    print("- Votes are saved to the database")
    print("- Votes are returned in API responses")
    print("- Vote state persists on refresh")
    return True

if __name__ == '__main__':
    try:
        success = test_voting_system()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
