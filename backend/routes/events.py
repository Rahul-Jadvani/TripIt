"""
Event Routes - Organizer-based event pages with product listings
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, func, desc
from datetime import datetime, timedelta
from models.event import Event, EventProject, EventSubscriber
from models.project import Project
from models.user import User
from extensions import db
from utils.decorators import token_required as require_auth, optional_auth

events_bp = Blueprint('events', __name__)


@events_bp.route('', methods=['GET'])
@optional_auth
def list_events(user_id):
    """
    List all events with filtering and sorting

    Query params:
    - search: Search in name, tagline, description
    - event_type: Filter by type (hackathon, conference, etc.)
    - category: Filter by category
    - is_active: Filter active/ended events
    - is_featured: Show only featured events
    - upcoming: Show only upcoming events
    - sort: trending (default), newest, popular, ending_soon
    - page: Page number (default: 1)
    - limit: Results per page (default: 20, max: 50)
    """
    try:
        # Pagination
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 20, type=int), 50)
        offset = (page - 1) * limit

        # Base query
        query = Event.query.filter_by(is_public=True)

        # Search
        search = request.args.get('search')
        if search:
            search_filter = or_(
                Event.name.ilike(f'%{search}%'),
                Event.tagline.ilike(f'%{search}%'),
                Event.description.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        # Filter by event type
        event_type = request.args.get('event_type')
        if event_type:
            query = query.filter(Event.event_type == event_type)

        # Filter by category
        category = request.args.get('category')
        if category:
            query = query.filter(Event.categories.contains([category]))

        # Filter by active status
        is_active = request.args.get('is_active')
        if is_active is not None:
            active_bool = is_active.lower() in ['true', '1', 'yes']
            query = query.filter(Event.is_active == active_bool)

        # Filter featured
        is_featured = request.args.get('is_featured')
        if is_featured and is_featured.lower() in ['true', '1', 'yes']:
            query = query.filter(Event.is_featured == True)

        # Filter upcoming events
        upcoming = request.args.get('upcoming')
        if upcoming and upcoming.lower() in ['true', '1', 'yes']:
            query = query.filter(Event.start_date >= datetime.utcnow())

        # Sorting
        sort = request.args.get('sort', 'trending')
        if sort in ['popular', 'trending']:
            query = query.order_by(desc(Event.project_count), desc(Event.subscriber_count))
        elif sort == 'newest':
            query = query.order_by(desc(Event.created_at))
        elif sort == 'ending_soon':
            query = query.filter(Event.end_date != None).order_by(Event.end_date.asc())
        else:
            query = query.order_by(desc(Event.is_featured), desc(Event.project_count))

        # Execute query
        total = query.count()
        events = query.offset(offset).limit(limit).all()

        return jsonify({
            'status': 'success',
            'data': {
                'events': [event.to_dict(include_organizer=True) for event in events],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>', methods=['GET'])
@optional_auth
def get_event(user_id, event_slug):
    """Get single event by slug with full details"""
    try:
        event = Event.query.filter_by(slug=event_slug, is_public=True).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        # Increment view count
        event.view_count += 1
        db.session.commit()

        # Check if user is subscribed
        is_subscribed = False
        if user_id:
            is_subscribed = EventSubscriber.query.filter_by(
                event_id=event.id,
                user_id=user_id
            ).first() is not None

        event_data = event.to_dict(include_organizer=True)
        event_data['is_subscribed'] = is_subscribed

        return jsonify({
            'status': 'success',
            'data': event_data
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>/projects', methods=['GET'])
@optional_auth
def get_event_projects(user_id, event_slug):
    """
    Get all projects for an event (like subreddit posts)

    Query params:
    - sort: top (default), newest, winners, finalists
    - track: Filter by track name
    - page, limit: Pagination
    """
    try:
        event = Event.query.filter_by(slug=event_slug, is_public=True).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        # Pagination
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 20, type=int), 50)
        offset = (page - 1) * limit

        # OPTIMIZED: Base query with eager loading to prevent N+1 queries
        from sqlalchemy.orm import joinedload
        query = EventProject.query.filter_by(event_id=event.id).join(
            Project, EventProject.project_id == Project.id
        ).filter(Project.is_deleted == False).options(
            joinedload(EventProject.project).joinedload(Project.creator)
        )

        # Filter by track
        track = request.args.get('track')
        if track:
            query = query.filter(EventProject.track == track)

        # Sorting
        sort = request.args.get('sort', 'top')
        if sort == 'winners':
            query = query.filter(EventProject.is_winner == True).order_by(EventProject.rank.asc())
        elif sort == 'finalists':
            query = query.filter(EventProject.is_finalist == True).order_by(Project.proof_score.desc())
        elif sort == 'newest':
            query = query.order_by(desc(EventProject.added_at))
        else:  # 'top'
            query = query.order_by(desc(Project.proof_score), desc(Project.upvotes))

        # Execute query
        total = query.count()
        event_projects = query.offset(offset).limit(limit).all()

        # Get unique tracks for filtering
        tracks = db.session.query(EventProject.track).filter_by(event_id=event.id).filter(
            EventProject.track != None
        ).distinct().all()
        track_list = [t[0] for t in tracks]

        return jsonify({
            'status': 'success',
            'data': {
                'projects': [ep.to_dict(include_project=True) for ep in event_projects],
                'tracks': track_list,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('', methods=['POST'])
@require_auth
def create_event(user_id):
    """Create a new event (organizer only)"""
    try:
        data = request.json

        # Validate required fields
        if not data.get('name'):
            return jsonify({'status': 'error', 'message': 'Event name is required'}), 400
        if not data.get('description'):
            return jsonify({'status': 'error', 'message': 'Description is required'}), 400

        # Create slug from name
        import re
        slug = re.sub(r'[^a-z0-9]+', '-', data['name'].lower()).strip('-')

        # Check slug uniqueness
        if Event.query.filter_by(slug=slug).first():
            return jsonify({'status': 'error', 'message': 'Event with this name already exists'}), 400

        # Create event
        event = Event(
            organizer_id=user_id,
            name=data['name'],
            slug=slug,
            tagline=data.get('tagline'),
            description=data['description'],
            banner_url=data.get('banner_url'),
            logo_url=data.get('logo_url'),
            event_type=data.get('event_type', 'hackathon'),
            location=data.get('location'),
            website_url=data.get('website_url'),
            categories=data.get('categories', []),
            prize_pool=data.get('prize_pool')
        )

        # Parse dates if provided
        if data.get('start_date'):
            try:
                event.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except:
                pass
        if data.get('end_date'):
            try:
                event.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except:
                pass

        db.session.add(event)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Event created successfully',
            'data': event.to_dict(include_organizer=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>', methods=['PUT'])
@require_auth
def update_event(user_id, event_slug):
    """Update event (organizer or admin only)"""
    try:
        event = Event.query.filter_by(slug=event_slug).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        # Check permissions
        user = User.query.get(user_id)
        if event.organizer_id != user_id and not user.is_admin:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

        data = request.json

        # Update fields
        if 'name' in data:
            event.name = data['name']
        if 'tagline' in data:
            event.tagline = data['tagline']
        if 'description' in data:
            event.description = data['description']
        if 'banner_url' in data:
            event.banner_url = data['banner_url']
        if 'logo_url' in data:
            event.logo_url = data['logo_url']
        if 'event_type' in data:
            event.event_type = data['event_type']
        if 'location' in data:
            event.location = data['location']
        if 'website_url' in data:
            event.website_url = data['website_url']
        if 'categories' in data:
            event.categories = data['categories']
        if 'prize_pool' in data:
            event.prize_pool = data['prize_pool']
        if 'is_active' in data:
            event.is_active = data['is_active']

        # Parse dates if provided
        if 'start_date' in data and data['start_date']:
            try:
                event.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except:
                pass
        if 'end_date' in data and data['end_date']:
            try:
                event.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except:
                pass

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Event updated successfully',
            'data': event.to_dict(include_organizer=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>/projects', methods=['POST'])
@require_auth
def add_project_to_event(user_id, event_slug):
    """Add a project to an event (organizer or project owner)"""
    try:
        event = Event.query.filter_by(slug=event_slug).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        data = request.json
        project_id = data.get('project_id')

        if not project_id:
            return jsonify({'status': 'error', 'message': 'Project ID is required'}), 400

        project = Project.query.get(project_id)
        if not project or project.is_deleted:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        # Check permissions - must be event organizer, project owner, or admin
        user = User.query.get(user_id)
        if event.organizer_id != user_id and project.user_id != user_id and not user.is_admin:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

        # Check if already added
        existing = EventProject.query.filter_by(event_id=event.id, project_id=project_id).first()
        if existing:
            return jsonify({'status': 'error', 'message': 'Project already added to event'}), 400

        # Create association
        event_project = EventProject(
            event_id=event.id,
            project_id=project_id,
            rank=data.get('rank'),
            prize=data.get('prize'),
            track=data.get('track'),
            is_winner=data.get('is_winner', False),
            is_finalist=data.get('is_finalist', False)
        )

        db.session.add(event_project)

        # OPTIMIZED: Increment count instead of querying
        event.project_count = (event.project_count or 0) + 1

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Project added to event successfully',
            'data': event_project.to_dict(include_project=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>/projects/<project_id>', methods=['DELETE'])
@require_auth
def remove_project_from_event(user_id, event_slug, project_id):
    """Remove a project from an event (organizer or admin only)"""
    try:
        event = Event.query.filter_by(slug=event_slug).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        # Check permissions
        user = User.query.get(user_id)
        if event.organizer_id != user_id and not user.is_admin:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

        event_project = EventProject.query.filter_by(event_id=event.id, project_id=project_id).first()
        if not event_project:
            return jsonify({'status': 'error', 'message': 'Project not in event'}), 404

        db.session.delete(event_project)

        # OPTIMIZED: Decrement count instead of querying
        event.project_count = max(0, (event.project_count or 0) - 1)

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Project removed from event successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>/subscribe', methods=['POST'])
@require_auth
def subscribe_to_event(user_id, event_slug):
    """Subscribe to an event for updates"""
    try:
        event = Event.query.filter_by(slug=event_slug, is_public=True).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        # Check if already subscribed
        existing = EventSubscriber.query.filter_by(event_id=event.id, user_id=user_id).first()
        if existing:
            return jsonify({'status': 'error', 'message': 'Already subscribed'}), 400

        # Create subscription
        subscription = EventSubscriber(event_id=event.id, user_id=user_id)
        db.session.add(subscription)

        # Update subscriber count
        event.subscriber_count = EventSubscriber.query.filter_by(event_id=event.id).count() + 1

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Subscribed to event successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/<event_slug>/subscribe', methods=['DELETE'])
@require_auth
def unsubscribe_from_event(user_id, event_slug):
    """Unsubscribe from an event"""
    try:
        event = Event.query.filter_by(slug=event_slug).first()
        if not event:
            return jsonify({'status': 'error', 'message': 'Event not found'}), 404

        subscription = EventSubscriber.query.filter_by(event_id=event.id, user_id=user_id).first()
        if not subscription:
            return jsonify({'status': 'error', 'message': 'Not subscribed'}), 400

        db.session.delete(subscription)

        # Update subscriber count
        event.subscriber_count = EventSubscriber.query.filter_by(event_id=event.id).count() - 1
        if event.subscriber_count < 0:
            event.subscriber_count = 0

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Unsubscribed from event successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/featured', methods=['GET'])
@optional_auth
def get_featured_events(user_id):
    """Get featured events"""
    try:
        limit = min(request.args.get('limit', 10, type=int), 50)

        events = Event.query.filter_by(
            is_featured=True,
            is_public=True
        ).order_by(desc(Event.project_count)).limit(limit).all()

        return jsonify({
            'status': 'success',
            'data': {
                'events': [event.to_dict(include_organizer=True) for event in events]
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@events_bp.route('/types', methods=['GET'])
def get_event_types():
    """Get available event types and categories"""
    return jsonify({
        'status': 'success',
        'data': {
            'event_types': ['hackathon', 'conference', 'competition', 'showcase', 'workshop'],
            'common_categories': ['DeFi', 'NFT', 'Gaming', 'Infrastructure', 'Social',
                                  'DAO', 'AI/ML', 'Mobile', 'Web3', 'Tooling']
        }
    }), 200
