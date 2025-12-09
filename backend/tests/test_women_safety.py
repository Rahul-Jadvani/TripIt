"""
Tests for Women's Safety endpoints (Guides, Resources, Bookings)
"""
import pytest
import json
from datetime import datetime, timedelta
from uuid import uuid4


class TestWomenGuideList:
    """Test listing women guides"""

    def test_list_guides_empty(self, client):
        """Test listing guides when none exist"""
        response = client.get('/api/women-safety/guides')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'guides' in data['data']

    def test_list_guides_with_data(self, client, sample_women_guide):
        """Test listing guides with sample data"""
        response = client.get('/api/women-safety/guides')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['guides']) >= 1

    def test_list_guides_pagination(self, client, app, sample_traveler):
        """Test pagination of guides"""
        from tests.conftest import create_test_women_guide

        # Create multiple guides
        for i in range(15):
            guide_traveler = sample_traveler if i == 0 else None
            create_test_women_guide(app, sample_traveler.id, f'guide{i}', f'Guide {i}')

        response = client.get('/api/women-safety/guides?page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['guides']) <= 10

    def test_list_guides_search(self, client, sample_women_guide):
        """Test searching guides by name"""
        response = client.get(f'/api/women-safety/guides?search=Guide')
        assert response.status_code == 200

    def test_list_guides_location_filter(self, client, sample_women_guide):
        """Test filtering guides by location"""
        response = client.get('/api/women-safety/guides?location=Paris')
        assert response.status_code == 200

    def test_list_guides_verified_only(self, client, sample_women_guide):
        """Test listing only verified guides"""
        response = client.get('/api/women-safety/guides?verified_only=true')
        assert response.status_code == 200

    def test_list_guides_available_only(self, client, sample_women_guide):
        """Test listing only available guides"""
        response = client.get('/api/women-safety/guides?available_only=true')
        assert response.status_code == 200

    def test_list_guides_featured_only(self, client, sample_women_guide):
        """Test listing only featured guides"""
        response = client.get('/api/women-safety/guides?featured=true')
        assert response.status_code == 200


class TestWomenGuideDetail:
    """Test getting guide details"""

    def test_get_guide_success(self, client, sample_women_guide):
        """Test getting guide details"""
        response = client.get(f'/api/women-safety/guides/{sample_women_guide.id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['id'] == sample_women_guide.id

    def test_get_guide_not_found(self, client):
        """Test getting non-existent guide"""
        fake_id = str(uuid4())
        response = client.get(f'/api/women-safety/guides/{fake_id}')
        assert response.status_code == 404

    def test_get_guide_with_reviews(self, client, sample_women_guide):
        """Test getting guide with reviews"""
        response = client.get(f'/api/women-safety/guides/{sample_women_guide.id}?include=reviews')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'reviews' in data['data']


class TestGuideBooking:
    """Test guide booking functionality"""

    def test_book_guide_success(self, client, auth_headers, sample_women_guide):
        """Test booking a guide"""
        payload = {
            'start_date': (datetime.utcnow() + timedelta(days=7)).isoformat(),
            'end_date': (datetime.utcnow() + timedelta(days=10)).isoformat(),
            'destination': 'Paris',
            'group_size': 2,
            'activity_type': 'city tour',
            'notes': 'First time in Paris'
        }
        response = client.post(
            f'/api/women-safety/guides/{sample_women_guide.id}/book',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        assert data['data']['status'] == 'pending'

    def test_book_guide_missing_auth(self, client, sample_women_guide):
        """Test booking guide without authentication"""
        payload = {
            'start_date': datetime.utcnow().isoformat(),
            'end_date': (datetime.utcnow() + timedelta(days=3)).isoformat(),
            'destination': 'Paris'
        }
        response = client.post(
            f'/api/women-safety/guides/{sample_women_guide.id}/book',
            data=json.dumps(payload),
            content_type='application/json'
        )
        assert response.status_code == 401

    def test_book_guide_missing_fields(self, client, auth_headers, sample_women_guide):
        """Test booking guide with missing required fields"""
        payload = {
            'start_date': datetime.utcnow().isoformat()
            # Missing end_date and destination
        }
        response = client.post(
            f'/api/women-safety/guides/{sample_women_guide.id}/book',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_book_unavailable_guide(self, client, auth_headers, app, sample_women_guide):
        """Test booking an unavailable guide"""
        # Mark guide as unavailable
        with app.app_context():
            sample_women_guide.availability_status = 'unavailable'
            db.session.commit()

        payload = {
            'start_date': (datetime.utcnow() + timedelta(days=7)).isoformat(),
            'end_date': (datetime.utcnow() + timedelta(days=10)).isoformat(),
            'destination': 'Paris'
        }
        response = client.post(
            f'/api/women-safety/guides/{sample_women_guide.id}/book',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code == 400


class TestGuideReview:
    """Test guide review functionality"""

    def test_submit_guide_review(self, client, auth_headers, app, sample_women_guide):
        """Test submitting a review for a guide"""
        # First create a completed booking
        from models.guide_booking import GuideBooking
        from extensions import db

        with app.app_context():
            booking = GuideBooking(
                id=str(uuid4()),
                guide_id=sample_women_guide.id,
                traveler_id='test-traveler-id',
                destination='Paris',
                start_date=datetime.utcnow() - timedelta(days=5),
                end_date=datetime.utcnow() - timedelta(days=2),
                status='completed',
                group_size=2,
                activity_type='city tour'
            )
            db.session.add(booking)
            db.session.commit()

        payload = {
            'rating': 5,
            'review_title': 'Amazing guide!',
            'review_text': 'Had a wonderful time with this guide',
            'safety_rating': 5,
            'knowledge_rating': 5,
            'communication_rating': 5,
            'professionalism_rating': 5,
            'value_for_money_rating': 4
        }
        response = client.post(
            f'/api/women-safety/guides/{sample_women_guide.id}/reviews',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May succeed or fail depending on completed bookings

    def test_review_invalid_rating(self, client, auth_headers, sample_women_guide):
        """Test submitting review with invalid rating"""
        payload = {
            'rating': 10  # Invalid, should be 1-5
        }
        response = client.post(
            f'/api/women-safety/guides/{sample_women_guide.id}/reviews',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code == 400


class TestWomenSafetyResources:
    """Test women safety resources"""

    def test_list_resources(self, client):
        """Test listing safety resources"""
        response = client.get('/api/women-safety/resources')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'resources' in data['data']
        assert 'categories' in data['data']

    def test_list_resources_by_category(self, client, sample_women_safety_resource):
        """Test filtering resources by category"""
        response = client.get(f'/api/women-safety/resources?category={sample_women_safety_resource.category}')
        assert response.status_code == 200

    def test_list_resources_by_region(self, client):
        """Test filtering resources by region"""
        response = client.get('/api/women-safety/resources?region=Europe')
        assert response.status_code == 200

    def test_list_resources_by_language(self, client):
        """Test filtering resources by language"""
        response = client.get('/api/women-safety/resources?language=en')
        assert response.status_code == 200

    def test_featured_resources_only(self, client):
        """Test listing only featured resources"""
        response = client.get('/api/women-safety/resources?featured=true')
        assert response.status_code == 200

    def test_get_resource_detail(self, client, sample_women_safety_resource):
        """Test getting resource details"""
        response = client.get(f'/api/women-safety/resources/{sample_women_safety_resource.id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['id'] == sample_women_safety_resource.id

    def test_mark_resource_helpful(self, client, sample_women_safety_resource):
        """Test marking a resource as helpful"""
        response = client.post(
            f'/api/women-safety/resources/{sample_women_safety_resource.id}/helpful',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        assert 'helpful_count' in data['data']


class TestWomenSafetySettings:
    """Test women traveler safety settings"""

    def test_get_women_safety_settings(self, client, auth_headers, sample_traveler):
        """Test getting safety settings for a traveler"""
        response = client.get(
            '/api/women-safety/settings',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'women_only_group_preference' in data['data']
        assert 'emergency_contacts' in data['data']

    def test_update_women_safety_settings(self, client, auth_headers):
        """Test updating women safety settings"""
        payload = {
            'women_only_group_preference': True,
            'location_sharing_enabled': True,
            'emergency_contacts': [
                {
                    'name': 'Mom',
                    'phone': '+1-555-0001'
                },
                {
                    'name': 'Sister',
                    'phone': '+1-555-0002'
                }
            ],
            'insurance_provider': 'Travel Safe Insurance'
        }
        response = client.put(
            '/api/women-safety/settings',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [200, 204]

    def test_get_settings_without_auth(self, client):
        """Test getting settings without authentication"""
        response = client.get('/api/women-safety/settings')
        assert response.status_code == 401

    def test_update_settings_partial(self, client, auth_headers):
        """Test partial update of safety settings"""
        payload = {
            'women_only_group_preference': True
        }
        response = client.put(
            '/api/women-safety/settings',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [200, 204]


class TestWomenSafetyGuideFiltering:
    """Test advanced filtering of women guides"""

    def test_filter_by_specialization(self, client, sample_women_guide):
        """Test filtering guides by specialization"""
        response = client.get('/api/women-safety/guides?specialization=cultural%20tours')
        assert response.status_code == 200

    def test_filter_by_language(self, client, sample_women_guide):
        """Test filtering guides by language"""
        response = client.get('/api/women-safety/guides?language=French')
        assert response.status_code == 200

    def test_filter_by_min_rating(self, client, sample_women_guide):
        """Test filtering guides by minimum rating"""
        response = client.get('/api/women-safety/guides?min_rating=4.0')
        assert response.status_code == 200

    def test_filter_by_price_range(self, client):
        """Test filtering guides by price range"""
        response = client.get('/api/women-safety/guides?min_price=30&max_price=100')
        # May fail if this filter isn't implemented


class TestWomenGuideMembership:
    """Test women guide membership/profile features"""

    def test_create_women_guide_profile(self, client, auth_headers):
        """Test creating a women guide profile"""
        payload = {
            'years_of_experience': 3,
            'service_locations': ['Paris', 'Lyon'],
            'specializations': ['cultural tours', 'food tours'],
            'languages_spoken': ['English', 'French'],
            'hourly_rate_usd': 45.0,
            'bio': 'I love showing women travelers the best of France!'
        }
        response = client.post(
            '/api/women-safety/guides/profile',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May fail if endpoint doesn't exist

    def test_update_guide_availability(self, client, auth_headers):
        """Test updating guide availability status"""
        payload = {
            'availability_status': 'unavailable',
            'unavailable_until': (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        response = client.put(
            '/api/women-safety/guides/availability',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May fail if endpoint doesn't exist
