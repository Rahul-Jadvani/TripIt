# Test Files Structure & Templates

## Complete Test File List (60+ Test Files)

### Core Test Configuration

#### 1. tests/__init__.py
```python
"""
TripIt Backend Test Suite
"""
__version__ = '1.0.0'
```

#### 2. tests/conftest.py
```python
"""
Pytest configuration and shared fixtures
"""
import pytest
from app import create_app
from extensions import db
from models.traveler import Traveler
from models.itinerary import Itinerary
import os

@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    os.environ['FLASK_ENV'] = 'testing'
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for tests"""
    with app.app_context():
        yield db.session
        db.session.rollback()
        # Clean up test data
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()

@pytest.fixture
def test_user(db_session):
    """Create test user"""
    user = Traveler(
        email='test@example.com',
        username='testuser',
        full_name='Test User',
        is_active=True
    )
    user.set_password('Test123!')
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def admin_user(db_session):
    """Create admin user"""
    admin = Traveler(
        email='admin@example.com',
        username='adminuser',
        full_name='Admin User',
        is_active=True,
        is_admin=True
    )
    admin.set_password('Admin123!')
    db_session.add(admin)
    db_session.commit()
    return admin

@pytest.fixture
def auth_token(client, test_user):
    """Get JWT token for test user"""
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Test123!'
    })
    return response.json['data']['access_token']

@pytest.fixture
def admin_token(client, admin_user):
    """Get JWT token for admin user"""
    response = client.post('/api/auth/login', json={
        'email': 'admin@example.com',
        'password': 'Admin123!'
    })
    return response.json['data']['access_token']

@pytest.fixture
def test_itinerary(db_session, test_user):
    """Create test itinerary"""
    itinerary = Itinerary(
        traveler_id=test_user.id,
        title='Test Itinerary',
        destination='Tokyo, Japan',
        duration_days=3,
        budget_range='medium',
        description='Test description',
        activity_tags=['cultural', 'food']
    )
    db_session.add(itinerary)
    db_session.commit()
    return itinerary
```

#### 3. tests/test_config.py
```python
"""
Test configuration validation
"""
import pytest
from config import DevelopmentConfig, TestingConfig, ProductionConfig

def test_testing_config():
    """Test that testing config is properly configured"""
    assert TestingConfig.TESTING is True
    assert TestingConfig.DEBUG is False
    assert 'sqlite' in TestingConfig.SQLALCHEMY_DATABASE_URI

def test_development_config():
    """Test development config"""
    assert DevelopmentConfig.DEBUG is True
    assert DevelopmentConfig.TESTING is False

def test_production_config():
    """Test production config"""
    assert ProductionConfig.DEBUG is False
    assert ProductionConfig.TESTING is False
```

---

## Unit Tests (10 Files)

### tests/unit/test_models.py
```python
"""
Test database models
"""
import pytest
from models.itinerary import Itinerary
from models.traveler import Traveler
from models.safety_rating import SafetyRating

def test_traveler_password_hashing():
    """Test password is hashed correctly"""
    user = Traveler(email='test@example.com', username='test')
    user.set_password('password123')

    assert user.password_hash != 'password123'
    assert user.check_password('password123') is True
    assert user.check_password('wrongpassword') is False

def test_itinerary_validation():
    """Test itinerary model validation"""
    itinerary = Itinerary(
        title='Test',
        destination='Tokyo',
        duration_days=3
    )
    assert itinerary.title == 'Test'
    assert itinerary.is_deleted is False

def test_itinerary_to_dict():
    """Test itinerary serialization"""
    itinerary = Itinerary(
        title='Test',
        destination='Tokyo',
        duration_days=3
    )
    data = itinerary.to_dict()

    assert isinstance(data, dict)
    assert data['title'] == 'Test'
    assert data['destination'] == 'Tokyo'
```

### tests/unit/test_utils.py
```python
"""
Test utility functions
"""
import pytest
from utils.helpers import generate_slug, success_response, error_response

def test_generate_slug():
    """Test slug generation"""
    assert generate_slug('Hello World') == 'hello-world'
    assert generate_slug('Tokyo 2024!') == 'tokyo-2024'
    assert generate_slug('  Spaces  ') == 'spaces'

def test_success_response():
    """Test success response format"""
    response = success_response({'key': 'value'}, 'Success!')
    data, status = response

    assert status == 200
    assert data.json['status'] == 'success'
    assert data.json['message'] == 'Success!'
    assert data.json['data'] == {'key': 'value'}

def test_error_response():
    """Test error response format"""
    response = error_response('Error', 'Something went wrong', 400)
    data, status = response

    assert status == 400
    assert data.json['status'] == 'error'
    assert data.json['error'] == 'Error'
```

### tests/unit/test_helpers.py
```python
"""
Test helper functions
"""
from utils.helpers import paginated_response, get_pagination_params
from flask import Flask

def test_get_pagination_params():
    """Test pagination parameter extraction"""
    app = Flask(__name__)

    with app.test_request_context('/?page=2&per_page=50'):
        page, per_page = get_pagination_params()
        assert page == 2
        assert per_page == 50

    with app.test_request_context('/'):
        page, per_page = get_pagination_params()
        assert page == 1
        assert per_page == 20  # Default
```

---

## Integration Tests - Authentication (8 Files)

### tests/integration/auth/test_auth_register.py
```python
"""
Test user registration endpoints
"""
import pytest

def test_register_valid_user(client):
    """Test successful user registration"""
    data = {
        'email': 'newuser@example.com',
        'username': 'newuser',
        'password': 'Password123!',
        'full_name': 'New User'
    }

    response = client.post('/api/auth/register', json=data)

    assert response.status_code == 201
    assert response.json['status'] == 'success'
    assert 'access_token' in response.json['data']

def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email"""
    data = {
        'email': 'test@example.com',  # Already exists
        'username': 'different',
        'password': 'Password123!'
    }

    response = client.post('/api/auth/register', json=data)

    assert response.status_code == 409
    assert 'already exists' in response.json['message'].lower()

def test_register_invalid_email(client):
    """Test registration with invalid email"""
    data = {
        'email': 'invalid-email',
        'username': 'testuser',
        'password': 'Password123!'
    }

    response = client.post('/api/auth/register', json=data)

    assert response.status_code == 400

def test_register_weak_password(client):
    """Test registration with weak password"""
    data = {
        'email': 'test@example.com',
        'username': 'testuser',
        'password': '123'  # Too short
    }

    response = client.post('/api/auth/register', json=data)

    assert response.status_code == 400
```

### tests/integration/auth/test_auth_login.py
```python
"""
Test user login endpoints
"""
import pytest

def test_login_valid_credentials(client, test_user):
    """Test login with valid credentials"""
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Test123!'
    })

    assert response.status_code == 200
    assert 'access_token' in response.json['data']
    assert 'refresh_token' in response.json['data']

def test_login_invalid_password(client, test_user):
    """Test login with wrong password"""
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'WrongPassword'
    })

    assert response.status_code == 401

def test_login_nonexistent_user(client):
    """Test login with non-existent user"""
    response = client.post('/api/auth/login', json={
        'email': 'nonexistent@example.com',
        'password': 'Password123!'
    })

    assert response.status_code == 401

def test_get_current_user(client, auth_token):
    """Test getting current user info"""
    response = client.get(
        '/api/auth/me',
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200
    assert response.json['data']['email'] == 'test@example.com'
```

### tests/integration/auth/test_auth_tokens.py
```python
"""
Test JWT token handling
"""
import pytest
import time

def test_refresh_token(client, test_user):
    """Test refreshing access token"""
    # Login to get tokens
    login_response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Test123!'
    })
    refresh_token = login_response.json['data']['refresh_token']

    # Refresh token
    response = client.post(
        '/api/auth/refresh',
        headers={'Authorization': f'Bearer {refresh_token}'}
    )

    assert response.status_code == 200
    assert 'access_token' in response.json['data']

def test_expired_token_handling(client):
    """Test handling of expired tokens"""
    expired_token = 'expired.jwt.token'

    response = client.get(
        '/api/auth/me',
        headers={'Authorization': f'Bearer {expired_token}'}
    )

    assert response.status_code == 401

def test_logout(client, auth_token):
    """Test user logout"""
    response = client.post(
        '/api/auth/logout',
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200
```

---

## Integration Tests - Travel Endpoints (25 Files)

### tests/integration/travel/test_itineraries_crud.py
```python
"""
Test itinerary CRUD operations
"""
import pytest

def test_create_itinerary(client, auth_token):
    """Test creating a new itinerary"""
    data = {
        'title': '5-Day Kyoto Adventure',
        'destination': 'Kyoto, Japan',
        'duration_days': 5,
        'budget_range': 'medium',
        'activity_tags': ['cultural', 'temples', 'food'],
        'description': 'Explore ancient Kyoto',
        'has_gps_coordinates': True,
        'difficulty': 'easy'
    }

    response = client.post(
        '/api/itineraries',
        json=data,
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 201
    assert response.json['data']['title'] == data['title']
    assert response.json['data']['destination'] == data['destination']

def test_get_itinerary(client, test_itinerary):
    """Test fetching single itinerary"""
    response = client.get(f'/api/itineraries/{test_itinerary.id}')

    assert response.status_code == 200
    assert response.json['data']['id'] == test_itinerary.id
    assert response.json['data']['title'] == test_itinerary.title

def test_update_itinerary(client, auth_token, test_itinerary):
    """Test updating itinerary"""
    response = client.put(
        f'/api/itineraries/{test_itinerary.id}',
        json={'title': 'Updated Title'},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200
    assert response.json['data']['title'] == 'Updated Title'

def test_delete_itinerary(client, auth_token, test_itinerary):
    """Test deleting itinerary"""
    response = client.delete(
        f'/api/itineraries/{test_itinerary.id}',
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200

    # Verify it's soft deleted
    get_response = client.get(f'/api/itineraries/{test_itinerary.id}')
    assert get_response.status_code == 404

def test_update_itinerary_not_owner(client, auth_token, db_session):
    """Test user cannot update other's itinerary"""
    # Create itinerary by different user
    other_user = Traveler(email='other@example.com', username='other')
    other_user.set_password('Test123!')
    db_session.add(other_user)
    db_session.commit()

    other_itinerary = Itinerary(
        traveler_id=other_user.id,
        title='Other Itinerary',
        destination='Paris',
        duration_days=3
    )
    db_session.add(other_itinerary)
    db_session.commit()

    response = client.put(
        f'/api/itineraries/{other_itinerary.id}',
        json={'title': 'Hacked'},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 403
```

### tests/integration/travel/test_itineraries_filters.py
```python
"""
Test itinerary filtering and searching
"""
import pytest

def test_filter_by_destination(client, db_session):
    """Test filtering itineraries by destination"""
    # Create test itineraries
    itineraries = [
        Itinerary(title='Tokyo Trip', destination='Tokyo, Japan', duration_days=3),
        Itinerary(title='Paris Trip', destination='Paris, France', duration_days=5),
        Itinerary(title='Osaka Trip', destination='Osaka, Japan', duration_days=2),
    ]
    for itin in itineraries:
        db_session.add(itin)
    db_session.commit()

    response = client.get('/api/itineraries?destination=Japan')

    assert response.status_code == 200
    results = response.json['data']
    assert len(results) == 2

def test_filter_by_activity(client, db_session):
    """Test filtering by activity tags"""
    itinerary = Itinerary(
        title='Hiking Trip',
        destination='Alps',
        duration_days=7,
        activity_tags=['hiking', 'nature']
    )
    db_session.add(itinerary)
    db_session.commit()

    response = client.get('/api/itineraries?activity=hiking')

    assert response.status_code == 200
    assert len(response.json['data']) >= 1

def test_filter_women_safe(client, db_session):
    """Test filtering women-safe itineraries"""
    safe_itin = Itinerary(
        title='Safe Trip',
        destination='Copenhagen',
        duration_days=3,
        women_safe_verified=True
    )
    db_session.add(safe_itin)
    db_session.commit()

    response = client.get('/api/itineraries?women_safe=true')

    assert response.status_code == 200

def test_search_itineraries(client, db_session):
    """Test search functionality"""
    itinerary = Itinerary(
        title='Amazing Tokyo Food Tour',
        destination='Tokyo, Japan',
        duration_days=3,
        description='Best food spots in Tokyo'
    )
    db_session.add(itinerary)
    db_session.commit()

    response = client.get('/api/itineraries?search=food')

    assert response.status_code == 200
    results = response.json['data']
    assert any('food' in r['title'].lower() for r in results)

def test_pagination(client, db_session):
    """Test itinerary pagination"""
    # Create 25 itineraries
    for i in range(25):
        itin = Itinerary(
            title=f'Trip {i}',
            destination='Test',
            duration_days=3
        )
        db_session.add(itin)
    db_session.commit()

    response = client.get('/api/itineraries?page=2&per_page=10')

    assert response.status_code == 200
    assert len(response.json['data']) == 10
    assert response.json['pagination']['page'] == 2
```

### tests/integration/travel/test_safety_ratings.py
```python
"""
Test safety rating endpoints
"""
import pytest

def test_add_safety_rating(client, auth_token, test_itinerary):
    """Test adding safety rating to itinerary"""
    data = {
        'itinerary_id': test_itinerary.id,
        'overall_safety_score': 4,
        'rating_type': 'overall',
        'detailed_feedback': 'Very safe destination',
        'accommodation_safety': 5,
        'route_safety': 4,
        'local_area_safety': 4
    }

    response = client.post(
        '/api/safety-ratings',
        json=data,
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 201
    assert response.json['data']['overall_safety_score'] == 4

def test_update_safety_rating(client, auth_token, test_itinerary, db_session):
    """Test updating existing rating"""
    # Create initial rating
    rating = SafetyRating(
        itinerary_id=test_itinerary.id,
        traveler_id=test_itinerary.traveler_id,
        overall_safety_score=3
    )
    db_session.add(rating)
    db_session.commit()

    # Update rating
    response = client.put(
        f'/api/safety-ratings/{rating.id}',
        json={'overall_safety_score': 5},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200
    assert response.json['data']['overall_safety_score'] == 5

def test_get_itinerary_ratings(client, test_itinerary):
    """Test fetching all ratings for itinerary"""
    response = client.get(f'/api/safety-ratings/{test_itinerary.id}')

    assert response.status_code == 200
    assert isinstance(response.json['data'], list)

def test_mark_rating_helpful(client, auth_token, db_session, test_itinerary):
    """Test marking rating as helpful"""
    rating = SafetyRating(
        itinerary_id=test_itinerary.id,
        traveler_id=test_itinerary.traveler_id,
        overall_safety_score=4
    )
    db_session.add(rating)
    db_session.commit()

    response = client.post(
        f'/api/safety-ratings/{rating.id}/helpful',
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200
```

### tests/integration/travel/test_travel_intel.py
```python
"""
Test travel intelligence endpoints
"""
import pytest

def test_add_travel_intel(client, auth_token, test_itinerary):
    """Test adding travel intel"""
    data = {
        'itinerary_id': test_itinerary.id,
        'intel_type': 'tip',
        'content': 'Best time to visit is spring',
        'location_reference': 'Tokyo'
    }

    response = client.post(
        '/api/travel-intel',
        json=data,
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 201
    assert response.json['data']['intel_type'] == 'tip'

def test_get_itinerary_intel(client, test_itinerary):
    """Test fetching intel for itinerary"""
    response = client.get(f'/api/travel-intel?itinerary_id={test_itinerary.id}')

    assert response.status_code == 200
    assert isinstance(response.json['data'], list)

def test_filter_intel_by_type(client, test_itinerary):
    """Test filtering intel by type"""
    response = client.get(
        f'/api/travel-intel?itinerary_id={test_itinerary.id}&type=tip'
    )

    assert response.status_code == 200

def test_respond_to_intel(client, auth_token, db_session, test_itinerary):
    """Test responding to travel intel"""
    # Create parent intel
    intel = TravelIntel(
        itinerary_id=test_itinerary.id,
        author_id=test_itinerary.traveler_id,
        intel_type='question',
        content='Is it safe?'
    )
    db_session.add(intel)
    db_session.commit()

    # Add response
    response = client.post(
        f'/api/travel-intel/{intel.id}/respond',
        json={'content': 'Yes, very safe!'},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 201
```

### tests/integration/travel/test_travel_groups.py
```python
"""
Test travel group endpoints
"""
import pytest

def test_create_travel_group(client, auth_token):
    """Test creating a travel group"""
    data = {
        'name': 'Tokyo Explorers',
        'destination': 'Tokyo, Japan',
        'travel_dates_start': '2024-06-01',
        'travel_dates_end': '2024-06-10',
        'max_members': 8,
        'description': 'Group trip to Tokyo'
    }

    response = client.post(
        '/api/travel-groups',
        json=data,
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 201
    assert response.json['data']['name'] == data['name']

def test_join_travel_group(client, auth_token, db_session):
    """Test joining a travel group"""
    group = TravelGroup(
        name='Test Group',
        destination='Paris',
        creator_id=1,
        max_members=10
    )
    db_session.add(group)
    db_session.commit()

    response = client.post(
        f'/api/travel-groups/{group.id}/join',
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200

def test_leave_travel_group(client, auth_token, db_session, test_user):
    """Test leaving a travel group"""
    group = TravelGroup(
        name='Test Group',
        destination='Paris',
        creator_id=1,
        max_members=10
    )
    db_session.add(group)

    member = TravelGroupMember(
        group_id=group.id,
        traveler_id=test_user.id,
        role='member'
    )
    db_session.add(member)
    db_session.commit()

    response = client.post(
        f'/api/travel-groups/{group.id}/leave',
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    assert response.status_code == 200
```

---

## Load Tests (5 Files)

### tests/load/test_concurrent_requests.py
```python
"""
Test concurrent request handling
"""
import pytest
import concurrent.futures
import time

def test_concurrent_itinerary_reads(client, db_session):
    """Test 100 concurrent itinerary read requests"""
    # Create test itineraries
    itinerary_ids = []
    for i in range(10):
        itin = Itinerary(
            title=f'Test {i}',
            destination='Test',
            duration_days=3
        )
        db_session.add(itin)
        db_session.commit()
        itinerary_ids.append(itin.id)

    def fetch_itinerary(itin_id):
        start = time.time()
        response = client.get(f'/api/itineraries/{itin_id}')
        duration = time.time() - start
        return response.status_code, duration

    # Execute 100 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        futures = [executor.submit(fetch_itinerary, id) for id in itinerary_ids * 10]
        results = [f.result() for f in futures]

    # Assert success rate and performance
    success_count = sum(1 for status, _ in results if status == 200)
    avg_duration = sum(duration for _, duration in results) / len(results)

    assert success_count / len(results) > 0.95  # 95% success rate
    assert avg_duration < 0.5  # Avg response < 500ms

def test_concurrent_writes(client, auth_token):
    """Test concurrent write operations"""
    def create_itinerary(i):
        data = {
            'title': f'Trip {i}',
            'destination': 'Tokyo',
            'duration_days': 3
        }
        response = client.post(
            '/api/itineraries',
            json=data,
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        return response.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(create_itinerary, i) for i in range(50)]
        results = [f.result() for f in futures]

    success_count = sum(1 for status in results if status == 201)
    assert success_count == 50  # All should succeed
```

### tests/load/test_cache_performance.py
```python
"""
Test cache performance improvements
"""
import pytest
import time

def test_cache_hit_performance(client, test_itinerary):
    """Test that cache significantly improves performance"""
    # First request (cache miss)
    start = time.time()
    response1 = client.get(f'/api/itineraries/{test_itinerary.id}')
    duration_uncached = time.time() - start

    # Second request (cache hit)
    start = time.time()
    response2 = client.get(f'/api/itineraries/{test_itinerary.id}')
    duration_cached = time.time() - start

    assert response1.status_code == 200
    assert response2.status_code == 200
    # Cached should be at least 3x faster
    assert duration_cached < duration_uncached / 3

def test_cache_invalidation_on_update(client, auth_token, test_itinerary):
    """Test cache is properly invalidated"""
    # Initial request
    response1 = client.get(f'/api/itineraries/{test_itinerary.id}')

    # Update itinerary
    client.put(
        f'/api/itineraries/{test_itinerary.id}',
        json={'title': 'Updated'},
        headers={'Authorization': f'Bearer {auth_token}'}
    )

    # Verify cache was invalidated
    response2 = client.get(f'/api/itineraries/{test_itinerary.id}')
    assert response2.json['data']['title'] == 'Updated'
```

---

## Complete Test File Count: 60+ Files

**Total Files by Category:**
- Configuration: 3 files
- Unit Tests: 10 files
- Integration Tests - Auth: 8 files
- Integration Tests - Travel: 25 files (itineraries, safety, intel, groups, women_safety)
- Integration Tests - Social: 6 files
- Integration Tests - Users: 4 files
- Integration Tests - Admin: 5 files
- Load Tests: 5 files
- Fixtures: 4 files

**Total: 70 test files**

---

## Running Tests

```bash
# All tests
pytest tests/ -v

# Specific category
pytest tests/unit/ -v
pytest tests/integration/travel/ -v
pytest tests/load/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html --cov-report=term-missing

# Parallel execution (faster)
pytest tests/ -n auto

# Stop on first failure
pytest tests/ -x

# Verbose with stdout
pytest tests/ -v -s
```
