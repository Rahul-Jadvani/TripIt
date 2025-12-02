"""
Socket.IO Service - Real-time event broadcasting
Emits events when data changes (new project, vote, comment, etc.)
"""
from extensions import socketio
from flask import current_app


class SocketService:
    """
    Service for emitting real-time updates via WebSockets
    """

    @staticmethod
    def emit_project_created(project_data):
        """
        Emit event when a new project is created
        Frontend will show "New project published" notification
        """
        try:
            socketio.emit('project:created', {
                'type': 'project_created',
                'data': project_data,
                'message': f"New project: {project_data.get('title', 'Untitled')}"
            })
            print(f"[Socket.IO] Emitted project:created - {project_data.get('title')}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting project:created: {e}")

    @staticmethod
    def emit_itinerary_created(itinerary_data):
        """
        Emit event when a new itinerary is created
        Frontend will show "New itinerary published" notification
        """
        try:
            socketio.emit('itinerary:created', {
                'type': 'itinerary_created',
                'data': itinerary_data,
                'message': f"New itinerary: {itinerary_data.get('title', 'Untitled')}"
            })
            print(f"[Socket.IO] Emitted itinerary:created - {itinerary_data.get('title')}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting itinerary:created: {e}")

    @staticmethod
    def emit_project_updated(project_id, project_data):
        """
        Emit event when a project is updated
        """
        try:
            socketio.emit('project:updated', {
                'type': 'project_updated',
                'project_id': project_id,
                'data': project_data,
            })
            print(f"[Socket.IO] Emitted project:updated - ID {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting project:updated: {e}")

    @staticmethod
    def emit_project_deleted(project_id):
        """
        Emit event when a project is deleted
        """
        try:
            socketio.emit('project:deleted', {
                'type': 'project_deleted',
                'project_id': project_id,
            })
            print(f"[Socket.IO] Emitted project:deleted - ID {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting project:deleted: {e}")

    @staticmethod
    def emit_vote_cast(project_id, vote_type, new_score):
        """
        Emit event when a vote is cast
        Frontend will update vote counts in real-time
        """
        try:
            socketio.emit('vote:cast', {
                'type': 'vote_cast',
                'project_id': project_id,
                'vote_type': vote_type,  # 'up' or 'down'
                'new_score': new_score,
            })
            print(f"[Socket.IO] Emitted vote:cast - Project {project_id}, {vote_type}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting vote:cast: {e}")

    @staticmethod
    def emit_comment_added(project_id, comment_data):
        """
        Emit event when a comment is added
        """
        try:
            socketio.emit('comment:added', {
                'type': 'comment_added',
                'project_id': project_id,
                'data': comment_data,
            })
            print(f"[Socket.IO] Emitted comment:added - Project {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting comment:added: {e}")

    @staticmethod
    def emit_leaderboard_updated():
        """
        Emit event when leaderboard rankings change
        Frontend will refetch leaderboard data
        """
        try:
            socketio.emit('leaderboard:updated', {
                'type': 'leaderboard_updated',
                'message': 'Leaderboard rankings have changed',
            })
            print("[Socket.IO] Emitted leaderboard:updated")
        except Exception as e:
            print(f"[Socket.IO] Error emitting leaderboard:updated: {e}")

    @staticmethod
    def emit_user_updated(user_id, user_data):
        """
        Emit event when user profile is updated
        """
        try:
            socketio.emit('user:updated', {
                'type': 'user_updated',
                'user_id': user_id,
                'data': user_data,
            })
            print(f"[Socket.IO] Emitted user:updated - User {user_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting user:updated: {e}")

    @staticmethod
    def emit_profile_updated(user_id, user_data):
        """Emit event when user profile is updated"""
        SocketService.emit_user_updated(user_id, user_data)

    @staticmethod
    def emit_intro_received(recipient_id, intro_data):
        """Emit event when intro request is received"""
        try:
            socketio.emit('intro:received', {
                'type': 'intro_received',
                'recipient_id': recipient_id,
                'data': intro_data,
            })
            print(f"[Socket.IO] Emitted intro:received - Recipient {recipient_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting intro:received: {e}")

    @staticmethod
    def emit_intro_accepted(requester_id, intro_data):
        """Emit event when intro request is accepted to the requester"""
        try:
            # Emit to specific requester user only
            socketio.emit('intro:accepted', {
                'type': 'intro_accepted',
                'requester_id': requester_id,
                'data': intro_data,
            }, to=str(requester_id))
            print(f"[Socket.IO] Emitted intro:accepted - Requester {requester_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting intro:accepted: {e}")

    @staticmethod
    def emit_intro_declined(requester_id, intro_data):
        """Emit event when intro request is declined to the requester"""
        try:
            # Emit to specific requester user only
            socketio.emit('intro:declined', {
                'type': 'intro_declined',
                'requester_id': requester_id,
                'data': intro_data,
            }, to=str(requester_id))
            print(f"[Socket.IO] Emitted intro:declined - Requester {requester_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting intro:declined: {e}")

    @staticmethod
    def emit_message_received(recipient_id, message_data):
        """Emit event when direct message is received to the specific recipient"""
        try:
            # Emit to specific recipient user only
            socketio.emit('message:received', {
                'type': 'message_received',
                'recipient_id': recipient_id,
                'data': message_data,
            }, to=str(recipient_id))
            print(f"[Socket.IO] Emitted message:received - Recipient {recipient_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting message:received: {e}")

    @staticmethod
    def emit_message_read(sender_id, message_id):
        """Emit event when message is marked as read to the sender"""
        try:
            # Emit to sender user only
            socketio.emit('message:read', {
                'type': 'message_read',
                'sender_id': sender_id,
                'message_id': message_id,
            }, to=str(sender_id))
            print(f"[Socket.IO] Emitted message:read - Sender {sender_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting message:read: {e}")

    @staticmethod
    def emit_messages_read(sender_id, reader_id, count):
        """Emit event when multiple messages are marked as read to the sender"""
        try:
            # Emit to sender user only
            socketio.emit('messages:read', {
                'type': 'messages_read',
                'sender_id': sender_id,
                'reader_id': reader_id,
                'count': count,
            }, to=str(sender_id))
            print(f"[Socket.IO] Emitted messages:read - {count} messages read by {reader_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting messages:read: {e}")

    @staticmethod
    def emit_comment_updated(project_id, comment_data):
        """Emit event when comment is updated"""
        try:
            socketio.emit('comment:updated', {
                'type': 'comment_updated',
                'project_id': project_id,
                'data': comment_data,
            })
            print(f"[Socket.IO] Emitted comment:updated - Project {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting comment:updated: {e}")

    @staticmethod
    def emit_comment_deleted(project_id, comment_id):
        """Emit event when comment is deleted"""
        try:
            socketio.emit('comment:deleted', {
                'type': 'comment_deleted',
                'project_id': project_id,
                'comment_id': comment_id,
            })
            print(f"[Socket.IO] Emitted comment:deleted - Comment {comment_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting comment:deleted: {e}")

    @staticmethod
    def emit_comment_voted(project_id, comment_id, vote_type):
        """Emit event when comment is voted on"""
        try:
            socketio.emit('comment:voted', {
                'type': 'comment_voted',
                'project_id': project_id,
                'comment_id': comment_id,
                'vote_type': vote_type,
            })
            print(f"[Socket.IO] Emitted comment:voted - Comment {comment_id}, {vote_type}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting comment:voted: {e}")

    @staticmethod
    def emit_vote_removed(project_id):
        """Emit event when vote is removed"""
        try:
            socketio.emit('vote:removed', {
                'type': 'vote_removed',
                'project_id': project_id,
            })
            print(f"[Socket.IO] Emitted vote:removed - Project {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting vote:removed: {e}")

    @staticmethod
    def emit_project_featured(project_id):
        """Emit event when project is featured"""
        try:
            socketio.emit('project:featured', {
                'type': 'project_featured',
                'project_id': project_id,
            })
            print(f"[Socket.IO] Emitted project:featured - Project {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting project:featured: {e}")

    @staticmethod
    def emit_badge_awarded(project_id, badge_data):
        """Emit event when badge is awarded"""
        try:
            socketio.emit('badge:awarded', {
                'type': 'badge_awarded',
                'project_id': project_id,
                'data': badge_data,
            })
            print(f"[Socket.IO] Emitted badge:awarded - Project {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting badge:awarded: {e}")

    @staticmethod
    def emit_badge_updated(project_id, badge_data):
        """Emit event when badge is updated"""
        try:
            socketio.emit('badge:updated', {
                'type': 'badge_updated',
                'project_id': project_id,
                'data': badge_data,
            })
            print(f"[Socket.IO] Emitted badge:updated - Project {project_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting badge:updated: {e}")

    @staticmethod
    def emit_badge_removed(project_id, badge_id):
        """Emit event when badge is removed"""
        try:
            socketio.emit('badge:removed', {
                'type': 'badge_removed',
                'project_id': project_id,
                'badge_id': badge_id,
            })
            print(f"[Socket.IO] Emitted badge:removed - Project {project_id}, Badge {badge_id}")
        except Exception as e:
            print(f"[Socket.IO] Error emitting badge:removed: {e}")
