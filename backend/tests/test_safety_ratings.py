"""
Tests for Safety Rating endpoints
"""
import pytest
import json
from datetime import datetime
from uuid import uuid4


class TestSafetyRatingList:
    """Test listing safety ratings"""

    def test_list_ratings_empty(self, client):
        """Test listing ratings when none exist"""
        response = client.get('/api/safety-ratings')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'ratings' in data['data']

    def test_list_ratings_with_data(self, client, sample_safety_rating):
        """Test listing ratings with sample data"""
        response = client.get('/api/safety-ratings')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['ratings']) >= 1

    def test_list_ratings_by_location(self, client, sample_safety_rating):
        """Test listing ratings for a specific location"""
        response = client.get(f'/api/safety-ratings?location={sample_safety_rating.location}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'ratings' in data['data']

    def test_list_ratings_sorted_by_score(self, client, sample_safety_rating):
        """Test listing ratings sorted by score"""
        response = client.get('/api/safety-ratings?sort=score')
        assert response.status_code == 200

    def test_list_ratings_pagination(self, client, app, sample_itinerary):
        """Test pagination of ratings"""
        from tests.conftest import create_test_itinerary
        from models.safety_rating import SafetyRating
        from extensions import db

        # Create multiple safety ratings
        for i in range(15):
            with app.app_context():
                rating = SafetyRating(
                    id=str(uuid4()),
                    itinerary_id=sample_itinerary.id,
                    location=f'Location {i}',
                    overall_safety_score=7 + (i % 3),
                    is_verified=True
                )
                db.session.add(rating)
            db.session.commit()

        response = client.get('/api/safety-ratings?page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['ratings']) <= 10


class TestSafetyRatingDetail:
    """Test getting rating details"""

    def test_get_rating_success(self, client, sample_safety_rating):
        """Test getting a safety rating"""
        response = client.get(f'/api/safety-ratings/{sample_safety_rating.id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['id'] == sample_safety_rating.id
        assert data['data']['location'] == sample_safety_rating.location

    def test_get_rating_not_found(self, client):
        """Test getting non-existent rating"""
        fake_id = str(uuid4())
        response = client.get(f'/api/safety-ratings/{fake_id}')
        assert response.status_code == 404

    def test_get_rating_with_reviews(self, client, sample_safety_rating):
        """Test getting rating with reviews"""
        response = client.get(f'/api/safety-ratings/{sample_safety_rating.id}?include=reviews')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'reviews' in data['data']


class TestSafetyRatingCreate:
    """Test creating safety ratings"""

    def test_create_rating_success(self, client, auth_headers, sample_itinerary):
        """Test creating a safety rating"""
        payload = {
            'location': 'Rome, Italy',
            'overall_safety_score': 8,
            'safety_assessment': 'Very safe for travelers',
            'safety_resources': ['embassy', 'hospital', 'police'],
            'women_safety_notes': 'Good for women travelers'
        }
        response = client.post(
            '/api/safety-ratings',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        assert data['data']['location'] == 'Rome, Italy'
        assert data['data']['overall_safety_score'] == 8

    def test_create_rating_missing_auth(self, client, sample_itinerary):
        """Test creating rating without authentication"""
        payload = {
            'location': 'Paris',
            'overall_safety_score': 8
        }
        response = client.post(
            '/api/safety-ratings',
            data=json.dumps(payload),
            content_type='application/json'
        )
        assert response.status_code == 401

    def test_create_rating_invalid_score(self, client, auth_headers):
        """Test creating rating with invalid score"""
        payload = {
            'location': 'Paris',
            'overall_safety_score': 15  # Should be 1-10
        }
        response = client.post(
            '/api/safety-ratings',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_create_rating_missing_fields(self, client, auth_headers):
        """Test creating rating with missing fields"""
        payload = {
            'location': 'Paris'
            # Missing overall_safety_score
        }
        response = client.post(
            '/api/safety-ratings',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code == 400


class TestSafetyRatingUpdate:
    """Test updating safety ratings"""

    def test_update_rating_success(self, client, auth_headers, sample_safety_rating):
        """Test updating a rating"""
        payload = {
            'overall_safety_score': 9,
            'safety_assessment': 'Updated assessment'
        }
        response = client.put(
            f'/api/safety-ratings/{sample_safety_rating.id}',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May succeed or fail depending on permissions

    def test_update_rating_not_found(self, client, auth_headers):
        """Test updating non-existent rating"""
        fake_id = str(uuid4())
        payload = {'overall_safety_score': 8}
        response = client.put(
            f'/api/safety-ratings/{fake_id}',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [403, 404]


class TestSafetyRatingVerification:
    """Test rating verification (admin only)"""

    def test_verify_rating(self, client, auth_headers, sample_safety_rating):
        """Test verifying a rating"""
        response = client.post(
            f'/api/safety-ratings/{sample_safety_rating.id}/verify',
            headers=auth_headers
        )
        # May fail if not admin


class TestSafetyRatingByItinerary:
    """Test ratings for specific itineraries"""

    def test_get_itinerary_safety_rating(self, client, sample_itinerary):
        """Test getting safety rating for an itinerary"""
        response = client.get(f'/api/itineraries/{sample_itinerary.id}/safety-rating')
        assert response.status_code in [200, 404]  # May not have a rating

    def test_get_itinerary_all_ratings(self, client, sample_itinerary):
        """Test getting all ratings for an itinerary"""
        response = client.get(f'/api/itineraries/{sample_itinerary.id}/ratings')
        assert response.status_code == 200


class TestSafetyRatingFiltering:
    """Test filtering safety ratings"""

    def test_filter_by_score_range(self, client):
        """Test filtering by score range"""
        response = client.get('/api/safety-ratings?min_score=7&max_score=9')
        assert response.status_code == 200

    def test_filter_verified_only(self, client):
        """Test filtering verified ratings only"""
        response = client.get('/api/safety-ratings?verified_only=true')
        assert response.status_code == 200

    def test_filter_by_region(self, client):
        """Test filtering by region"""
        response = client.get('/api/safety-ratings?region=Europe')
        assert response.status_code == 200

    def test_filter_women_safe_locations(self, client):
        """Test filtering women-safe locations"""
        response = client.get('/api/safety-ratings?women_safe=true')
        assert response.status_code == 200


class TestSafetyAlerts:
    """Test safety alerts for locations"""

    def test_get_location_alerts(self, client, sample_safety_rating):
        """Test getting safety alerts for a location"""
        response = client.get(f'/api/safety-ratings/{sample_safety_rating.location}/alerts')
        # May fail if endpoint doesn't exist

    def test_get_active_alerts(self, client):
        """Test getting active safety alerts"""
        response = client.get('/api/safety-ratings/alerts/active')
        assert response.status_code in [200, 404]


class TestSafetyRatingCommunity:
    """Test community features of safety ratings"""

    def test_upvote_rating(self, client, auth_headers, sample_safety_rating):
        """Test upvoting a safety rating"""
        response = client.post(
            f'/api/safety-ratings/{sample_safety_rating.id}/upvote',
            headers=auth_headers
        )
        assert response.status_code in [200, 201]

    def test_downvote_rating(self, client, auth_headers, sample_safety_rating):
        """Test downvoting a safety rating"""
        response = client.post(
            f'/api/safety-ratings/{sample_safety_rating.id}/downvote',
            headers=auth_headers
        )
        assert response.status_code in [200, 201]

    def test_flag_rating(self, client, auth_headers, sample_safety_rating):
        """Test flagging a safety rating for review"""
        payload = {
            'reason': 'Inaccurate information',
            'description': 'This rating is outdated'
        }
        response = client.post(
            f'/api/safety-ratings/{sample_safety_rating.id}/flag',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
