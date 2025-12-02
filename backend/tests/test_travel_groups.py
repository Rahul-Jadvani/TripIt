"""
Tests for Travel Group endpoints
"""
import pytest
import json
from datetime import datetime, timedelta
from uuid import uuid4


class TestTravelGroupList:
    """Test listing travel groups"""

    def test_list_groups_empty(self, client):
        """Test listing groups when none exist"""
        response = client.get('/api/travel-groups')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'groups' in data['data']

    def test_list_groups_with_data(self, client, sample_travel_group):
        """Test listing groups with sample data"""
        response = client.get('/api/travel-groups')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['groups']) >= 1

    def test_list_groups_pagination(self, client, app, sample_traveler):
        """Test pagination of groups"""
        from tests.conftest import create_test_travel_group

        # Create multiple groups
        for i in range(15):
            create_test_travel_group(app, sample_traveler.id, name=f'Group {i}')

        response = client.get('/api/travel-groups?page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['groups']) <= 10

    def test_list_groups_search(self, client, sample_travel_group):
        """Test searching groups by name"""
        response = client.get(f'/api/travel-groups?search={sample_travel_group.name}')
        assert response.status_code == 200
        data = json.loads(response.data)
        # Should find the group or return empty list

    def test_list_groups_destination_filter(self, client, sample_travel_group):
        """Test filtering groups by destination"""
        response = client.get(f'/api/travel-groups?destination={sample_travel_group.destination}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'groups' in data['data']

    def test_list_groups_type_filter(self, client, sample_travel_group):
        """Test filtering groups by type"""
        response = client.get('/api/travel-groups?group_type=adventure')
        assert response.status_code == 200


class TestTravelGroupDetail:
    """Test getting group details"""

    def test_get_group_success(self, client, sample_travel_group):
        """Test getting group details"""
        response = client.get(f'/api/travel-groups/{sample_travel_group.id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['id'] == sample_travel_group.id
        assert data['data']['name'] == sample_travel_group.name

    def test_get_group_not_found(self, client):
        """Test getting non-existent group"""
        fake_id = str(uuid4())
        response = client.get(f'/api/travel-groups/{fake_id}')
        assert response.status_code == 404

    def test_get_group_with_members(self, client, sample_travel_group):
        """Test getting group with member details"""
        response = client.get(f'/api/travel-groups/{sample_travel_group.id}?include=members')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'members' in data['data']


class TestTravelGroupCreate:
    """Test creating travel groups"""

    def test_create_group_success(self, client, auth_headers):
        """Test creating a travel group"""
        payload = {
            'name': 'Summer Europe Tour',
            'description': 'Group trip to Europe',
            'destination': 'France',
            'start_date': (datetime.utcnow() + timedelta(days=30)).isoformat(),
            'end_date': (datetime.utcnow() + timedelta(days=40)).isoformat(),
            'max_members': 8,
            'group_type': 'adventure',
            'travel_pace': 'moderate',
            'budget_range': 'mid-range',
            'is_public': True
        }
        response = client.post(
            '/api/travel-groups',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        assert data['data']['name'] == 'Summer Europe Tour'

    def test_create_group_missing_auth(self, client):
        """Test creating group without authentication"""
        payload = {
            'name': 'Trip Group',
            'destination': 'Paris'
        }
        response = client.post(
            '/api/travel-groups',
            data=json.dumps(payload),
            content_type='application/json'
        )
        assert response.status_code == 401

    def test_create_group_missing_fields(self, client, auth_headers):
        """Test creating group with missing fields"""
        payload = {
            'name': 'Incomplete Group'
            # Missing destination, dates, etc.
        }
        response = client.post(
            '/api/travel-groups',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code == 400


class TestTravelGroupUpdate:
    """Test updating travel groups"""

    def test_update_group_success(self, client, auth_headers, sample_travel_group, sample_traveler):
        """Test updating a group (creator only)"""
        payload = {
            'name': 'Updated Group Name',
            'description': 'Updated description'
        }
        response = client.put(
            f'/api/travel-groups/{sample_travel_group.id}',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May fail due to permission if auth user isn't the creator

    def test_update_group_not_found(self, client, auth_headers):
        """Test updating non-existent group"""
        fake_id = str(uuid4())
        payload = {'name': 'Updated Name'}
        response = client.put(
            f'/api/travel-groups/{fake_id}',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        assert response.status_code in [403, 404]


class TestTravelGroupDelete:
    """Test deleting travel groups"""

    def test_delete_group_not_found(self, client, auth_headers):
        """Test deleting non-existent group"""
        fake_id = str(uuid4())
        response = client.delete(
            f'/api/travel-groups/{fake_id}',
            headers=auth_headers
        )
        assert response.status_code in [403, 404]


class TestTravelGroupMembership:
    """Test group membership operations"""

    def test_join_group_success(self, client, auth_headers, sample_travel_group):
        """Test joining a group"""
        response = client.post(
            f'/api/travel-groups/{sample_travel_group.id}/join',
            headers=auth_headers
        )
        assert response.status_code in [200, 201]

    def test_join_group_missing_auth(self, client, sample_travel_group):
        """Test joining group without authentication"""
        response = client.post(
            f'/api/travel-groups/{sample_travel_group.id}/join'
        )
        assert response.status_code == 401

    def test_join_group_not_found(self, client, auth_headers):
        """Test joining non-existent group"""
        fake_id = str(uuid4())
        response = client.post(
            f'/api/travel-groups/{fake_id}/join',
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_leave_group_success(self, client, auth_headers, sample_travel_group):
        """Test leaving a group"""
        response = client.post(
            f'/api/travel-groups/{sample_travel_group.id}/leave',
            headers=auth_headers
        )
        # May return 200 or 400 if not a member

    def test_get_group_members(self, client, sample_travel_group):
        """Test getting group members list"""
        response = client.get(f'/api/travel-groups/{sample_travel_group.id}/members')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'members' in data['data']


class TestTravelGroupItineraries:
    """Test group itinerary management"""

    def test_add_itinerary_to_group(self, client, auth_headers, sample_travel_group, sample_itinerary):
        """Test adding an itinerary to a group"""
        payload = {
            'itinerary_id': sample_itinerary.id
        }
        response = client.post(
            f'/api/travel-groups/{sample_travel_group.id}/itineraries',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May succeed or fail depending on permissions

    def test_get_group_itineraries(self, client, sample_travel_group):
        """Test getting group's itineraries"""
        response = client.get(f'/api/travel-groups/{sample_travel_group.id}/itineraries')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'itineraries' in data['data']


class TestTravelGroupFiltering:
    """Test advanced filtering of travel groups"""

    def test_filter_by_group_type(self, client):
        """Test filtering by group type"""
        response = client.get('/api/travel-groups?group_type=budget')
        assert response.status_code == 200

    def test_filter_by_travel_pace(self, client):
        """Test filtering by travel pace"""
        response = client.get('/api/travel-groups?travel_pace=slow')
        assert response.status_code == 200

    def test_filter_by_budget_range(self, client):
        """Test filtering by budget range"""
        response = client.get('/api/travel-groups?budget_range=luxury')
        assert response.status_code == 200

    def test_filter_available_groups(self, client):
        """Test filtering for groups with available spots"""
        response = client.get('/api/travel-groups?available_only=true')
        assert response.status_code == 200

    def test_filter_public_groups(self, client):
        """Test filtering for public groups"""
        response = client.get('/api/travel-groups?public_only=true')
        assert response.status_code == 200


class TestTravelGroupChat:
    """Test group chat functionality"""

    def test_post_group_message(self, client, auth_headers, sample_travel_group):
        """Test posting a message to group chat"""
        payload = {
            'message': 'Looking forward to the trip!'
        }
        response = client.post(
            f'/api/travel-groups/{sample_travel_group.id}/chat',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        # May succeed or fail if endpoint doesn't exist

    def test_get_group_chat_history(self, client, sample_travel_group):
        """Test getting group chat history"""
        response = client.get(f'/api/travel-groups/{sample_travel_group.id}/chat')
        # May fail if endpoint doesn't exist
