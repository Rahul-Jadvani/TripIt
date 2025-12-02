"""
Pytest configuration and fixtures for TripIt API testing
"""
import pytest
import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
import jwt as pyjwt

# Set testing environment before any imports
os.environ['FLASK_ENV'] = 'testing'
os.environ['DISABLE_CACHE_WARMER'] = 'true'

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Now we can safely import Flask and extensions
from flask import Flask
from extensions import db
from config import config


def create_test_app():
    """Create test app without executing app.py globals"""
    app = Flask(__name__)
    app.config.from_object(config['testing'])

    # Initialize extensions
    db.init_app(app)

    # Register only TripIt blueprints for testing (skip legacy blueprints with complex dependencies)
    try:
        from routes.itineraries import itineraries_bp
        app.register_blueprint(itineraries_bp, url_prefix='/api/itineraries')
    except Exception as e:
        print(f"Warning: Could not import itineraries_bp: {e}")

    try:
        from routes.safety_ratings import safety_ratings_bp
        app.register_blueprint(safety_ratings_bp, url_prefix='/api/safety-ratings')
    except Exception as e:
        print(f"Warning: Could not import safety_ratings_bp: {e}")

    try:
        from routes.travel_groups import travel_groups_bp
        app.register_blueprint(travel_groups_bp, url_prefix='/api/travel-groups')
    except Exception as e:
        print(f"Warning: Could not import travel_groups_bp: {e}")

    try:
        from routes.women_safety import women_safety_bp
        app.register_blueprint(women_safety_bp, url_prefix='/api/women-safety')
    except Exception as e:
        print(f"Warning: Could not import women_safety_bp: {e}")

    return app


@pytest.fixture(scope='session')
def app():
    """Create and configure a test Flask application"""
    app = create_test_app()

    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create a test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def app_context(app):
    """Create an app context for tests that need it"""
    with app.app_context():
        yield app
        db.session.rollback()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean database before each test"""
    with app.app_context():
        # Delete all data in reverse dependency order
        from models.guide_review import GuideReview
        from models.guide_booking import GuideBooking
        from models.women_guide import WomenGuide
        from models.women_safety_resource import WomenSafetyResource
        from models.travel_group_member import TravelGroupMember
        from models.travel_group import TravelGroup
        from models.safety_rating import SafetyRating
        from models.day_plan import DayPlan
        from models.itinerary import Itinerary
        from models.traveler import Traveler

        db.session.query(GuideReview).delete()
        db.session.query(GuideBooking).delete()
        db.session.query(WomenGuide).delete()
        db.session.query(WomenSafetyResource).delete()
        db.session.query(TravelGroupMember).delete()
        db.session.query(TravelGroup).delete()
        db.session.query(SafetyRating).delete()
        db.session.query(DayPlan).delete()
        db.session.query(Itinerary).delete()
        db.session.query(Traveler).delete()
        db.session.commit()
        yield
        db.session.rollback()


def create_test_traveler(app, username='test_traveler', email='test@example.com', display_name='Test Traveler'):
    """Helper function to create a test traveler"""
    from models.traveler import Traveler

    with app.app_context():
        traveler = Traveler(
            id=str(uuid4()),
            username=username,
            email=email,
            display_name=display_name,
            bio='Test traveler bio',
            profile_image_url='https://example.com/profile.jpg',
            country='US',
            experience_level='intermediate',
            travel_interests=['adventure', 'culture'],
            languages_spoken=['English'],
            is_verified=True,
            women_only_group_preference=False,
            location_sharing_enabled=False,
            emergency_contact_1_name='John Doe',
            emergency_contact_1_phone='+1-555-0001',
            insurance_provider='Test Insurance'
        )
        db.session.add(traveler)
        db.session.commit()
        return traveler


def create_test_itinerary(app, traveler_id, title='Test Itinerary', destination='Paris', start_date=None, end_date=None):
    """Helper function to create a test itinerary"""
    from models.itinerary import Itinerary

    if start_date is None:
        start_date = datetime.utcnow()
    if end_date is None:
        end_date = start_date + timedelta(days=7)

    with app.app_context():
        itinerary = Itinerary(
            id=str(uuid4()),
            traveler_id=traveler_id,
            title=title,
            description=f'Test itinerary to {destination}',
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            is_public=True,
            budget_usd=5000,
            travel_style='luxury',
            budget_category='mid-range'
        )
        db.session.add(itinerary)
        db.session.commit()
        return itinerary


def create_test_day_plan(app, itinerary_id, day_number=1, date=None):
    """Helper function to create a test day plan"""
    from models.day_plan import DayPlan

    if date is None:
        date = datetime.utcnow()

    with app.app_context():
        day_plan = DayPlan(
            id=str(uuid4()),
            itinerary_id=itinerary_id,
            day_number=day_number,
            date=date,
            title=f'Day {day_number}',
            description='Test day plan description',
            estimated_budget_usd=500
        )
        db.session.add(day_plan)
        db.session.commit()
        return day_plan


def create_test_travel_group(app, creator_id, name='Test Group', destination='Paris'):
    """Helper function to create a test travel group"""
    from models.travel_group import TravelGroup

    with app.app_context():
        group = TravelGroup(
            id=str(uuid4()),
            creator_id=creator_id,
            name=name,
            description=f'Test group going to {destination}',
            destination=destination,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=7),
            max_members=10,
            group_type='adventure',
            travel_pace='moderate',
            budget_range='mid-range',
            languages=['English'],
            is_public=True
        )
        db.session.add(group)
        db.session.commit()
        return group


def create_test_women_guide(app, traveler_id, username, name='Test Guide'):
    """Helper function to create a test women guide"""
    from models.women_guide import WomenGuide

    with app.app_context():
        guide = WomenGuide(
            id=str(uuid4()),
            traveler_id=traveler_id,
            years_of_experience=5,
            service_locations=['Paris', 'London'],
            specializations=['cultural tours', 'adventure'],
            languages_spoken=['English', 'French'],
            hourly_rate_usd=50.0,
            is_verified=True,
            is_active=True,
            availability_status='available',
            average_rating=4.5,
            total_reviews=10,
            is_featured=False
        )
        db.session.add(guide)
        db.session.commit()
        return guide


@pytest.fixture
def sample_traveler(app):
    """Create a sample traveler for testing"""
    return create_test_traveler(app)


@pytest.fixture
def sample_itinerary(app, sample_traveler):
    """Create a sample itinerary for testing"""
    return create_test_itinerary(app, sample_traveler.id)


@pytest.fixture
def sample_day_plan(app, sample_itinerary):
    """Create a sample day plan for testing"""
    return create_test_day_plan(app, sample_itinerary.id)


@pytest.fixture
def sample_travel_group(app, sample_traveler):
    """Create a sample travel group for testing"""
    return create_test_travel_group(app, sample_traveler.id)


@pytest.fixture
def sample_women_guide(app, sample_traveler):
    """Create a sample women guide for testing"""
    return create_test_women_guide(app, sample_traveler.id, sample_traveler.username)


@pytest.fixture
def sample_safety_rating(app, sample_itinerary):
    """Create a sample safety rating for testing"""
    from models.safety_rating import SafetyRating

    with app.app_context():
        rating = SafetyRating(
            id=str(uuid4()),
            itinerary_id=sample_itinerary.id,
            location='Paris',
            overall_safety_score=8,
            safety_assessment='Safe for solo travelers',
            safety_resources=['embassy', 'hospital'],
            is_verified=True,
            verified_by_travelers=['traveler1', 'traveler2']
        )
        db.session.add(rating)
        db.session.commit()
        return rating


@pytest.fixture
def sample_women_safety_resource(app):
    """Create a sample women safety resource for testing"""
    from models.women_safety_resource import WomenSafetyResource

    with app.app_context():
        resource = WomenSafetyResource(
            id=str(uuid4()),
            title='Solo Travel Safety Tips',
            description='Tips for women traveling solo',
            content='Detailed safety content here',
            category='tips',
            target_region='Global',
            urgency_level='medium',
            is_featured=False,
            is_pinned=False,
            language='en'
        )
        db.session.add(resource)
        db.session.commit()
        return resource


@pytest.fixture
def auth_headers(app, sample_traveler):
    """Create authentication headers with a valid JWT token"""
    secret_key = app.config['JWT_SECRET_KEY']

    payload = {
        'user_id': sample_traveler.id,
        'email': sample_traveler.email,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }

    token = pyjwt.encode(payload, secret_key, algorithm='HS256')

    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def invalid_auth_headers():
    """Create invalid authentication headers"""
    return {
        'Authorization': 'Bearer invalid.token.here',
        'Content-Type': 'application/json'
    }
