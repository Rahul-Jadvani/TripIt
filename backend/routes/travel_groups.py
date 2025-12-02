"""
Travel Groups routes - Group formation and management (Phase 3)
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import joinedload
from datetime import datetime

from extensions import db
from models.travel_group import TravelGroup, travel_group_itineraries
from models.travel_group_member import TravelGroupMember
from models.traveler import Traveler
from models.itinerary import Itinerary
from utils.decorators import token_required, optional_auth
from utils.helpers import success_response, error_response, get_pagination_params
from utils.cache import CacheService

travel_groups_bp = Blueprint('travel_groups', __name__)


@travel_groups_bp.route('', methods=['GET'])
@optional_auth
def list_travel_groups(user_id):
    """List travel groups with advanced filtering"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20)

        # Filters
        search = request.args.get('search', '').strip()
        destination = request.args.get('destination', '').strip()
        group_type = request.args.get('type', '').strip()
        activity = request.args.getlist('activity')
        women_only = request.args.get('women_safe', type=lambda v: v.lower() == 'true') if request.args.get('women_safe') else None
        has_availability = request.args.get('has_availability', type=lambda v: v.lower() == 'true') if request.args.get('has_availability') else None
        sort = request.args.get('sort', 'newest')  # newest, popular, starting_soon

        # Base query
        query = TravelGroup.query.filter(TravelGroup.is_active == True)

        # Text search
        if search:
            query = query.filter(or_(
                TravelGroup.name.icontains(search),
                TravelGroup.description.icontains(search),
                TravelGroup.destination.icontains(search)
            ))

        # Filter by destination
        if destination:
            query = query.filter(TravelGroup.destination.icontains(destination))

        # Filter by group type
        if group_type:
            query = query.filter(TravelGroup.group_type == group_type)

        # Filter by activity tags
        if activity:
            for tag in activity:
                query = query.filter(TravelGroup.activity_tags.contains([tag]))

        # Women-only groups
        if women_only is not None:
            query = query.filter(TravelGroup.is_women_only == women_only)

        # Groups with availability
        if has_availability:
            query = query.filter(TravelGroup.current_members_count < TravelGroup.max_members)

        # Sorting
        if sort == 'popular':
            query = query.order_by(TravelGroup.current_members_count.desc())
        elif sort == 'starting_soon':
            query = query.order_by(TravelGroup.start_date.asc())
        else:  # newest (default)
            query = query.order_by(TravelGroup.created_at.desc())

        total = query.count()
        groups = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [g.to_dict(include_members=False) for g in groups]

        return success_response({
            'groups': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            }
        }, 'Travel groups retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('', methods=['POST'])
@token_required
def create_travel_group(user_id):
    """Create a new travel group"""
    try:
        data = request.get_json()

        # Validation
        if not data.get('name'):
            return error_response('Validation error', 'Group name is required', 400)
        if not data.get('destination'):
            return error_response('Validation error', 'Destination is required', 400)
        if not data.get('start_date') or not data.get('end_date'):
            return error_response('Validation error', 'Start and end dates are required', 400)

        # Create group
        group = TravelGroup(
            name=data.get('name'),
            description=data.get('description'),
            destination=data.get('destination'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            group_type=data.get('group_type', 'interest_based'),
            max_members=data.get('max_members', 10),
            activity_tags=data.get('activity_tags', []),
            is_women_only=data.get('is_women_only', False),
            require_identity_verification=data.get('require_identity_verification', False),
            created_by_traveler_id=user_id
        )

        db.session.add(group)
        db.session.flush()

        # Add creator as member (organizer)
        creator_member = TravelGroupMember(
            group_id=group.id,
            traveler_id=user_id,
            role='organizer',
            join_status='accepted',
            traveler_reputation_at_join=request.json.get('creator_reputation', 0.0)
        )
        db.session.add(creator_member)
        db.session.commit()

        # Emit event
        from services.socket_service import SocketService
        SocketService.emit_group_created(group.to_dict())

        return success_response(group.to_dict(), 'Travel group created', 201)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>', methods=['GET'])
@optional_auth
def get_travel_group(user_id, group_id):
    """Get travel group details"""
    try:
        group = TravelGroup.query.options(
            joinedload(TravelGroup.members).joinedload(TravelGroupMember.traveler)
        ).get(group_id)

        if not group:
            return error_response('Not found', 'Travel group not found', 404)

        # Check if user is member
        is_member = False
        user_member_role = None
        if user_id:
            member = TravelGroupMember.query.filter_by(
                group_id=group_id,
                traveler_id=user_id,
                is_active=True
            ).first()
            if member:
                is_member = True
                user_member_role = member.role

        data = group.to_dict(include_members=True)
        data['is_member'] = is_member
        data['user_role'] = user_member_role

        return success_response(data, 'Travel group retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>', methods=['PUT', 'PATCH'])
@token_required
def update_travel_group(user_id, group_id):
    """Update travel group"""
    try:
        group = TravelGroup.query.get(group_id)
        if not group:
            return error_response('Not found', 'Travel group not found', 404)

        # Check permission (only organizers/creator)
        member = TravelGroupMember.query.filter_by(
            group_id=group_id,
            traveler_id=user_id
        ).first()

        if not member or member.role not in ['organizer', 'moderator']:
            return error_response('Forbidden', 'Only organizers can edit the group', 403)

        data = request.get_json()

        # Update allowed fields
        if 'name' in data:
            group.name = data['name']
        if 'description' in data:
            group.description = data['description']
        if 'destination' in data:
            group.destination = data['destination']
        if 'start_date' in data:
            group.start_date = data['start_date']
        if 'end_date' in data:
            group.end_date = data['end_date']
        if 'activity_tags' in data:
            group.activity_tags = data['activity_tags']
        if 'max_members' in data:
            group.max_members = data['max_members']
        if 'is_women_only' in data:
            group.is_women_only = data['is_women_only']
        if 'group_type' in data:
            group.group_type = data['group_type']

        group.updated_at = datetime.utcnow()
        db.session.commit()

        # Emit event
        from services.socket_service import SocketService
        SocketService.emit_group_updated(group_id, group.to_dict())

        return success_response(group.to_dict(), 'Travel group updated', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>', methods=['DELETE'])
@token_required
def delete_travel_group(user_id, group_id):
    """Delete travel group (soft delete)"""
    try:
        group = TravelGroup.query.get(group_id)
        if not group:
            return error_response('Not found', 'Travel group not found', 404)

        # Check permission (only creator)
        if group.created_by_traveler_id != user_id:
            return error_response('Forbidden', 'Only the creator can delete the group', 403)

        group.is_active = False
        db.session.commit()

        # Emit event
        from services.socket_service import SocketService
        SocketService.emit_group_deleted(group_id)

        return success_response(None, 'Travel group deleted', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>/join', methods=['POST'])
@token_required
def join_travel_group(user_id, group_id):
    """Join a travel group"""
    try:
        group = TravelGroup.query.get(group_id)
        if not group:
            return error_response('Not found', 'Travel group not found', 404)

        # Check if already member
        existing_member = TravelGroupMember.query.filter_by(
            group_id=group_id,
            traveler_id=user_id
        ).first()

        if existing_member:
            if existing_member.is_active:
                return error_response('Conflict', 'Already a member of this group', 409)
            else:
                # Rejoin
                existing_member.is_active = True
                existing_member.join_status = 'accepted'
                existing_member.joined_date = datetime.utcnow()
                db.session.commit()
                return success_response(existing_member.to_dict(), 'Rejoined group', 200)

        # Check availability
        if group.current_members_count >= group.max_members:
            return error_response('Bad request', 'Group is full', 400)

        # Get traveler reputation
        traveler = Traveler.query.get(user_id)
        if not traveler:
            return error_response('Not found', 'Traveler not found', 404)

        # Create membership
        member = TravelGroupMember(
            group_id=group_id,
            traveler_id=user_id,
            role='member',
            join_status='accepted',
            traveler_reputation_at_join=traveler.traveler_reputation_score,
            traveler_safety_score_at_join=traveler.safety_score
        )

        db.session.add(member)
        group.current_members_count += 1
        db.session.commit()

        # Emit event
        from services.socket_service import SocketService
        SocketService.emit_group_member_joined(group_id, user_id, traveler.username)

        return success_response(member.to_dict(), 'Joined travel group', 201)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>/leave', methods=['POST'])
@token_required
def leave_travel_group(user_id, group_id):
    """Leave a travel group"""
    try:
        member = TravelGroupMember.query.filter_by(
            group_id=group_id,
            traveler_id=user_id,
            is_active=True
        ).first()

        if not member:
            return error_response('Not found', 'Not a member of this group', 404)

        # Check if creator (cannot leave if creator)
        group = TravelGroup.query.get(group_id)
        if group and group.created_by_traveler_id == user_id:
            return error_response('Bad request', 'Creator cannot leave the group', 400)

        # Mark as inactive
        member.is_active = False
        member.left_date = datetime.utcnow()
        group.current_members_count = max(0, group.current_members_count - 1)
        db.session.commit()

        # Emit event
        from services.socket_service import SocketService
        SocketService.emit_group_member_left(group_id, user_id)

        return success_response(None, 'Left travel group', 200)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>/members', methods=['GET'])
@optional_auth
def get_group_members(user_id, group_id):
    """Get all members of a travel group"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=20)

        # Verify group exists
        group = TravelGroup.query.get(group_id)
        if not group:
            return error_response('Not found', 'Travel group not found', 404)

        # Query members
        query = TravelGroupMember.query.filter(
            TravelGroupMember.group_id == group_id,
            TravelGroupMember.is_active == True
        ).order_by(TravelGroupMember.joined_date.asc())

        total = query.count()
        members = query.limit(per_page).offset((page - 1) * per_page).all()

        data = [m.to_dict(include_traveler=True) for m in members]

        return success_response({
            'members': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            }
        }, 'Group members retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/<group_id>/invite', methods=['POST'])
@token_required
def invite_to_group(user_id, group_id):
    """Invite a traveler to join the group"""
    try:
        data = request.get_json()
        target_traveler_id = data.get('traveler_id')

        if not target_traveler_id:
            return error_response('Validation error', 'traveler_id is required', 400)

        # Verify group exists and user is organizer
        group = TravelGroup.query.get(group_id)
        if not group:
            return error_response('Not found', 'Travel group not found', 404)

        requester = TravelGroupMember.query.filter_by(
            group_id=group_id,
            traveler_id=user_id
        ).first()

        if not requester or requester.role not in ['organizer', 'moderator']:
            return error_response('Forbidden', 'Only organizers can invite members', 403)

        # Check if target exists
        target = Traveler.query.get(target_traveler_id)
        if not target:
            return error_response('Not found', 'Target traveler not found', 404)

        # Check if already member
        existing = TravelGroupMember.query.filter_by(
            group_id=group_id,
            traveler_id=target_traveler_id
        ).first()

        if existing and existing.is_active:
            return error_response('Conflict', 'Traveler is already a member', 409)

        # Create pending membership
        member = TravelGroupMember(
            group_id=group_id,
            traveler_id=target_traveler_id,
            role='member',
            join_status='pending',
            traveler_reputation_at_join=target.traveler_reputation_score
        )

        db.session.add(member)
        db.session.commit()

        # Notify traveler (TODO: implement notification service)

        return success_response(member.to_dict(), 'Invitation sent', 201)

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@travel_groups_bp.route('/matching', methods=['GET'])
@token_required
def get_matching_groups(user_id):
    """Get travel groups matched for current user based on interests and preferences"""
    try:
        page, per_page = get_pagination_params(request, default_per_page=15)

        # Get traveler
        traveler = Traveler.query.get(user_id)
        if not traveler:
            return error_response('Not found', 'Traveler not found', 404)

        # Base query: active groups, user not already member
        query = TravelGroup.query.filter(
            TravelGroup.is_active == True,
            ~TravelGroup.members.any(TravelGroupMember.traveler_id == user_id)
        )

        # Preference 1: Groups matching traveler's interests
        if traveler.travel_interests:
            query = query.filter(
                or_(*[TravelGroup.activity_tags.contains([interest])
                      for interest in traveler.travel_interests])
            )

        # Preference 2: Women-only groups if traveler is woman and prefers it
        if traveler.women_only_group_preference:
            query = query.filter(TravelGroup.is_women_only == True)

        # Preference 3: Groups with reasonable member count
        query = query.filter(
            TravelGroup.current_members_count < TravelGroup.max_members
        )

        # Sort by relevance (number of matched interests)
        total = query.count()
        groups = query.order_by(TravelGroup.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()

        data = [g.to_dict(include_members=False) for g in groups]

        return success_response({
            'matched_groups': data,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
            }
        }, 'Matched groups retrieved', 200)

    except Exception as e:
        return error_response('Error', str(e), 500)
