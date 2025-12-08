"""
Remix Chat Routes
API endpoints for persistent AI chat sessions
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from uuid import uuid4
from sqlalchemy import desc

from extensions import db
from models.remix_chat_session import RemixChatSession
from models.remix_chat_message import RemixChatMessage
from models.itinerary import Itinerary
from models.traveler import Traveler
from models.day_plan import DayPlan
from utils.helpers import success_response, error_response, paginated_response
from services.ai_analyzer import AIAnalyzer

remix_chat_bp = Blueprint('remix_chat', __name__)


@remix_chat_bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_session():
    """
    Create new remix chat session

    Request Body:
    {
        "itinerary_ids": ["id1", "id2"],  // 1-3 itineraries
        "initial_message": "I want to combine these trips..."
    }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # Validate input
        itinerary_ids = data.get('itinerary_ids', [])
        initial_message = data.get('initial_message', '').strip()

        if not itinerary_ids or not isinstance(itinerary_ids, list):
            return error_response('Validation', 'Please select at least one itinerary', 400)

        if len(itinerary_ids) > 3:
            return error_response('Validation', 'Maximum 3 itineraries can be selected', 400)

        if not initial_message:
            return error_response('Validation', 'Please provide an initial message', 400)

        if len(initial_message) < 10:
            return error_response('Validation', 'Please provide more details (at least 10 characters)', 400)

        # Fetch source itineraries
        source_itineraries = Itinerary.query.filter(
            Itinerary.id.in_(itinerary_ids),
            Itinerary.is_deleted == False,
            Itinerary.is_published == True
        ).all()

        if len(source_itineraries) != len(itinerary_ids):
            return error_response('Validation', 'Some itineraries are not available', 400)

        print(f"\n[RemixChat] User {user_id} creating session with {len(source_itineraries)} itineraries")

        # Prepare itinerary data for AI
        itineraries_data = []
        for itin in source_itineraries:
            itin_dict = itin.to_dict(include_creator=True)

            # Include daily plans
            daily_plans = DayPlan.query.filter_by(
                itinerary_id=itin.id
            ).order_by(DayPlan.day_number).all()

            itin_dict['daily_plans'] = [dp.to_dict() for dp in daily_plans]
            itineraries_data.append(itin_dict)

        # Initialize AI service
        ai_analyzer = AIAnalyzer()

        if not ai_analyzer.is_available():
            return error_response('Service Unavailable', 'AI service is not available', 503)

        # Start chat with AI
        print(f"[RemixChat] Starting AI chat...")
        ai_result = ai_analyzer.start_remix_chat(itineraries_data, initial_message)

        if not ai_result:
            return error_response('Error', 'Failed to start chat. Please try again.', 500)

        # Generate session title from source itineraries
        if len(source_itineraries) == 1:
            session_title = f"Remix: {source_itineraries[0].title[:50]}"
        else:
            dest1 = source_itineraries[0].destination
            dest2 = source_itineraries[1].destination if len(source_itineraries) > 1 else ''
            session_title = f"Remix: {dest1}"
            if dest2 and dest2 != dest1:
                session_title += f" + {dest2}"

        # Create session
        session = RemixChatSession(
            id=str(uuid4()),
            user_id=user_id,
            title=session_title,
            source_itinerary_ids=itinerary_ids,
            status='active',
            last_message_at=datetime.utcnow(),
            message_count=2  # User message + AI response
        )

        db.session.add(session)
        db.session.flush()  # Get session ID

        # Create user message
        user_message = RemixChatMessage(
            id=str(uuid4()),
            session_id=session.id,
            role='user',
            content=initial_message
        )

        # Create assistant message
        assistant_message = RemixChatMessage(
            id=str(uuid4()),
            session_id=session.id,
            role='assistant',
            content=ai_result.get('message', ''),
            message_metadata=ai_result.get('draft_itinerary')
        )

        db.session.add(user_message)
        db.session.add(assistant_message)

        # Create draft itinerary if returned
        draft_data = ai_result.get('draft_itinerary')
        if draft_data:
            draft = Itinerary(
                id=str(uuid4()),
                created_by_traveler_id=user_id,
                title=draft_data.get('title', 'Remixed Itinerary'),
                description=draft_data.get('description', ''),
                destination=draft_data.get('destination', ''),
                duration_days=draft_data.get('duration_days'),
                budget_amount=draft_data.get('budget_amount'),
                budget_currency=draft_data.get('budget_currency', 'USD'),
                difficulty_level=draft_data.get('difficulty_level', 'moderate'),
                activity_tags=draft_data.get('activity_tags', []),
                categories=draft_data.get('categories', []),
                best_season=draft_data.get('best_season'),
                trip_highlights=draft_data.get('trip_highlights'),
                trip_journey=draft_data.get('trip_journey'),
                day_by_day_plan=draft_data.get('day_by_day_plan'),
                safety_tips=draft_data.get('safety_tips'),
                is_published=False,
                is_remixed=True,
                remixed_from_ids=itinerary_ids
            )

            db.session.add(draft)
            db.session.flush()

            session.current_draft_id = draft.id

        db.session.commit()

        print(f"[RemixChat] Session {session.id} created successfully")

        # Return session with messages
        return success_response(
            {
                'session': session.to_dict(include_draft=True),
                'messages': [user_message.to_dict(), assistant_message.to_dict()],
                'source_itineraries': [itin.to_dict() for itin in source_itineraries]
            },
            'Session created successfully'
        )

    except Exception as e:
        db.session.rollback()
        print(f"[RemixChat] Error creating session: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response('Error', f'Failed to create session: {str(e)}', 500)


@remix_chat_bp.route('/sessions', methods=['GET'])
@jwt_required()
def list_sessions():
    """List user's chat sessions"""
    try:
        user_id = get_jwt_identity()

        # Query params
        status = request.args.get('status', 'active')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Query sessions
        query = RemixChatSession.query.filter_by(
            user_id=user_id
        )

        if status and status != 'all':
            query = query.filter_by(status=status)

        query = query.order_by(desc(RemixChatSession.updated_at))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        sessions = []
        for session in pagination.items:
            session_dict = session.to_dict()

            # Add latest message preview
            latest_msg = session.messages.order_by(desc(RemixChatMessage.created_at)).first()
            if latest_msg:
                session_dict['latest_message_preview'] = latest_msg.content[:100]

            sessions.append(session_dict)

        return paginated_response(
            sessions,
            pagination.total,
            page,
            per_page
        )

    except Exception as e:
        print(f"[RemixChat] Error listing sessions: {str(e)}")
        return error_response('Error', str(e), 500)


@remix_chat_bp.route('/sessions/<session_id>', methods=['GET'])
@jwt_required()
def get_session(session_id):
    """Get session with all messages"""
    try:
        user_id = get_jwt_identity()

        session = RemixChatSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return error_response('Not Found', 'Session not found', 404)

        # Get source itineraries
        source_itineraries = []
        if session.source_itinerary_ids:
            sources = Itinerary.query.filter(
                Itinerary.id.in_(session.source_itinerary_ids)
            ).all()
            source_itineraries = [itin.to_dict() for itin in sources]

        return success_response(
            {
                'session': session.to_dict(include_draft=True, include_messages=True),
                'source_itineraries': source_itineraries
            },
            'Session retrieved'
        )

    except Exception as e:
        print(f"[RemixChat] Error getting session: {str(e)}")
        return error_response('Error', str(e), 500)


@remix_chat_bp.route('/sessions/<session_id>/messages', methods=['POST'])
@jwt_required()
def send_message(session_id):
    """
    Send message in chat session

    Request Body:
    {
        "message": "Can you add more cultural experiences?"
    }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        message = data.get('message', '').strip()

        if not message:
            return error_response('Validation', 'Message cannot be empty', 400)

        if len(message) < 3:
            return error_response('Validation', 'Message too short', 400)

        # Get session
        session = RemixChatSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return error_response('Not Found', 'Session not found', 404)

        if session.status != 'active':
            return error_response('Error', 'Session is not active', 400)

        # Check message limit
        if session.message_count >= 50:
            return error_response('Limit', 'Maximum 50 messages per session reached', 400)

        print(f"\n[RemixChat] Processing message in session {session_id}")

        # Get conversation history
        messages = session.messages.order_by(RemixChatMessage.created_at).all()
        chat_history = [{'role': msg.role, 'content': msg.content} for msg in messages]

        # Get current draft
        current_draft = None
        if session.current_draft_id:
            draft = Itinerary.query.get(session.current_draft_id)
            if draft:
                current_draft = draft.to_dict()

        # Get source itineraries
        itineraries_data = []
        if session.source_itinerary_ids:
            sources = Itinerary.query.filter(
                Itinerary.id.in_(session.source_itinerary_ids)
            ).all()

            for itin in sources:
                itin_dict = itin.to_dict(include_creator=True)
                daily_plans = DayPlan.query.filter_by(
                    itinerary_id=itin.id
                ).order_by(DayPlan.day_number).all()
                itin_dict['daily_plans'] = [dp.to_dict() for dp in daily_plans]
                itineraries_data.append(itin_dict)

        # Call AI
        ai_analyzer = AIAnalyzer()

        if not ai_analyzer.is_available():
            return error_response('Service Unavailable', 'AI service is not available', 503)

        print(f"[RemixChat] Calling AI to continue chat...")
        ai_result = ai_analyzer.continue_remix_chat(
            itineraries_data,
            chat_history,
            message,
            current_draft
        )

        if not ai_result:
            return error_response('Error', 'Failed to get AI response', 500)

        # Create user message
        user_message = RemixChatMessage(
            id=str(uuid4()),
            session_id=session.id,
            role='user',
            content=message
        )

        # Create assistant message
        assistant_message = RemixChatMessage(
            id=str(uuid4()),
            session_id=session.id,
            role='assistant',
            content=ai_result.get('message', ''),
            message_metadata=ai_result.get('draft_itinerary')
        )

        db.session.add(user_message)
        db.session.add(assistant_message)

        # Update session
        session.message_count += 2
        session.last_message_at = datetime.utcnow()
        session.updated_at = datetime.utcnow()

        # Update draft itinerary
        draft_data = ai_result.get('draft_itinerary')
        if draft_data and session.current_draft_id:
            draft = Itinerary.query.get(session.current_draft_id)
            if draft:
                # Update draft fields
                draft.title = draft_data.get('title', draft.title)
                draft.description = draft_data.get('description', draft.description)
                draft.destination = draft_data.get('destination', draft.destination)
                draft.duration_days = draft_data.get('duration_days', draft.duration_days)
                draft.budget_amount = draft_data.get('budget_amount', draft.budget_amount)
                draft.budget_currency = draft_data.get('budget_currency', draft.budget_currency)
                draft.difficulty_level = draft_data.get('difficulty_level', draft.difficulty_level)
                draft.activity_tags = draft_data.get('activity_tags', draft.activity_tags)
                draft.categories = draft_data.get('categories', draft.categories)
                draft.best_season = draft_data.get('best_season', draft.best_season)
                draft.trip_highlights = draft_data.get('trip_highlights', draft.trip_highlights)
                draft.trip_journey = draft_data.get('trip_journey', draft.trip_journey)
                draft.day_by_day_plan = draft_data.get('day_by_day_plan', draft.day_by_day_plan)
                draft.safety_tips = draft_data.get('safety_tips', draft.safety_tips)
                draft.updated_at = datetime.utcnow()

        db.session.commit()

        print(f"[RemixChat] Message processed successfully")

        return success_response(
            {
                'user_message': user_message.to_dict(),
                'assistant_message': assistant_message.to_dict(),
                'session': session.to_dict(include_draft=True)
            },
            'Message sent'
        )

    except Exception as e:
        db.session.rollback()
        print(f"[RemixChat] Error sending message: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response('Error', str(e), 500)


@remix_chat_bp.route('/sessions/<session_id>/finalize', methods=['POST'])
@jwt_required()
def finalize_session(session_id):
    """
    Finalize session and prepare for publishing
    Returns complete itinerary data for publish form
    """
    try:
        user_id = get_jwt_identity()

        session = RemixChatSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return error_response('Not Found', 'Session not found', 404)

        if not session.current_draft_id:
            return error_response('Error', 'No draft itinerary found', 400)

        # Get draft
        draft = Itinerary.query.get(session.current_draft_id)
        if not draft:
            return error_response('Error', 'Draft itinerary not found', 404)

        # Get source itineraries with creators
        source_itineraries = []
        if session.source_itinerary_ids:
            sources = Itinerary.query.filter(
                Itinerary.id.in_(session.source_itinerary_ids)
            ).all()
            source_itineraries = [itin.to_dict(include_creator=True) for itin in sources]

        # Mark session as finalized
        session.status = 'finalized'
        session.updated_at = datetime.utcnow()

        db.session.commit()

        print(f"[RemixChat] Session {session_id} finalized")

        return success_response(
            {
                'itinerary': draft.to_dict(),
                'source_itineraries': source_itineraries,
                'session_id': session.id,
                'redirect_to': '/publish'
            },
            'Session finalized'
        )

    except Exception as e:
        db.session.rollback()
        print(f"[RemixChat] Error finalizing session: {str(e)}")
        return error_response('Error', str(e), 500)


@remix_chat_bp.route('/sessions/<session_id>', methods=['PATCH'])
@jwt_required()
def update_session(session_id):
    """Update session (e.g., title)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        session = RemixChatSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return error_response('Not Found', 'Session not found', 404)

        if 'title' in data:
            session.title = data['title']

        session.updated_at = datetime.utcnow()
        db.session.commit()

        return success_response({'session': session.to_dict()}, 'Session updated')

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@remix_chat_bp.route('/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    """Delete session"""
    try:
        user_id = get_jwt_identity()

        session = RemixChatSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return error_response('Not Found', 'Session not found', 404)

        # Delete associated draft if not published
        if session.current_draft_id:
            draft = Itinerary.query.get(session.current_draft_id)
            if draft and not draft.is_published:
                db.session.delete(draft)

        db.session.delete(session)
        db.session.commit()

        return success_response({}, 'Session deleted')

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)


@remix_chat_bp.route('/sessions/<session_id>/archive', methods=['POST'])
@jwt_required()
def archive_session(session_id):
    """Archive session"""
    try:
        user_id = get_jwt_identity()

        session = RemixChatSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return error_response('Not Found', 'Session not found', 404)

        session.status = 'archived'
        session.updated_at = datetime.utcnow()

        db.session.commit()

        return success_response({'session': session.to_dict()}, 'Session archived')

    except Exception as e:
        db.session.rollback()
        return error_response('Error', str(e), 500)
