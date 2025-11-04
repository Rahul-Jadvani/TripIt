"""
Notification utility functions for creating and sending notifications
"""
from extensions import db, socketio
from models.notification import Notification
from models.chain import ChainFollower


def create_notification(user_id, notification_type, title, message,
                        project_id=None, chain_id=None, actor_id=None, redirect_url=None):
    """
    Create and save a notification to the database

    Args:
        user_id: ID of the user to notify
        notification_type: Type of notification (e.g., 'chain_new_project')
        title: Notification title
        message: Notification message
        project_id: Related project ID (optional)
        chain_id: Related chain ID (optional)
        actor_id: ID of user who triggered the notification (optional)
        redirect_url: URL to redirect to when notification is clicked (optional)

    Returns:
        Notification object
    """
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        project_id=project_id,
        chain_id=chain_id,
        actor_id=actor_id,
        redirect_url=redirect_url
    )
    db.session.add(notification)
    db.session.commit()

    # Emit real-time notification via WebSocket
    try:
        socketio.emit('new_notification', notification.to_dict(include_relations=True),
                      room=f'user_{user_id}')
    except Exception as e:
        print(f"Error emitting notification: {e}")

    return notification


def notify_chain_new_project(chain, project, actor):
    """
    Notify chain followers when a new project is added

    Args:
        chain: Chain object
        project: Project object that was added
        actor: User who added the project
    """
    # Get all followers of this chain (except the actor)
    followers = ChainFollower.query.filter(
        ChainFollower.chain_id == chain.id,
        ChainFollower.user_id != actor.id
    ).all()

    for follower in followers:
        create_notification(
            user_id=follower.user_id,
            notification_type='chain_new_project',
            title=f"New project in {chain.name}",
            message=f"{project.title} was added to {chain.name}",
            project_id=project.id,
            chain_id=chain.id,
            actor_id=actor.id,
            redirect_url=f"/chains/{chain.slug}"
        )


def notify_chain_request_approved(requester_id, chain, project):
    """
    Notify project owner when their request to add project to chain is approved

    Args:
        requester_id: ID of user who requested
        chain: Chain object
        project: Project object
    """
    create_notification(
        user_id=requester_id,
        notification_type='chain_request_approved',
        title=f"Project approved for {chain.name}",
        message=f"Your project '{project.title}' was approved for {chain.name}",
        project_id=project.id,
        chain_id=chain.id,
        actor_id=chain.creator_id,
        redirect_url=f"/chains/{chain.slug}"
    )


def notify_chain_request_rejected(requester_id, chain, project, reason=None):
    """
    Notify project owner when their request to add project to chain is rejected

    Args:
        requester_id: ID of user who requested
        chain: Chain object
        project: Project object
        reason: Rejection reason (optional)
    """
    message = f"Your request to add '{project.title}' to {chain.name} was declined"
    if reason:
        message += f": {reason}"

    create_notification(
        user_id=requester_id,
        notification_type='chain_request_rejected',
        title="Request declined",
        message=message,
        project_id=project.id,
        chain_id=chain.id,
        actor_id=chain.creator_id,
        redirect_url=f"/projects/{project.id}"
    )


def notify_project_added_to_chain(chain_owner_id, chain, project, actor):
    """
    Notify chain owner when someone adds a project to their chain (instant-add chains)

    Args:
        chain_owner_id: ID of chain owner
        chain: Chain object
        project: Project object
        actor: User who added the project
    """
    # Don't notify if the owner added the project themselves
    if chain_owner_id == actor.id:
        return

    create_notification(
        user_id=chain_owner_id,
        notification_type='project_added_to_chain',
        title="New project in your chain",
        message=f"{actor.username} added '{project.title}' to {chain.name}",
        project_id=project.id,
        chain_id=chain.id,
        actor_id=actor.id,
        redirect_url=f"/chains/{chain.slug}"
    )


def notify_chain_follower(chain_owner_id, chain, follower):
    """
    Notify chain owner when someone follows their chain

    Args:
        chain_owner_id: ID of chain owner
        chain: Chain object
        follower: User who followed
    """
    # Don't notify if owner follows their own chain
    if chain_owner_id == follower.id:
        return

    create_notification(
        user_id=chain_owner_id,
        notification_type='chain_follower',
        title="New follower",
        message=f"{follower.username} followed {chain.name}",
        chain_id=chain.id,
        actor_id=follower.id,
        redirect_url=f"/chains/{chain.slug}/followers"
    )


def notify_chain_featured(chain_owner_id, chain):
    """
    Notify chain owner when their chain is featured by admin

    Args:
        chain_owner_id: ID of chain owner
        chain: Chain object
    """
    create_notification(
        user_id=chain_owner_id,
        notification_type='chain_featured',
        title="Chain featured!",
        message=f"Your chain '{chain.name}' was featured by the platform",
        chain_id=chain.id,
        redirect_url=f"/chains/{chain.slug}"
    )


def notify_chain_project_request(chain_owner_id, chain, project, requester, message=None):
    """
    Notify chain owner when someone requests to add project to approval-required chain

    Args:
        chain_owner_id: ID of chain owner
        chain: Chain object
        project: Project object
        requester: User requesting to add project
        message: Optional message from requester
    """
    notification_message = f"{requester.username} wants to add '{project.title}' to {chain.name}"
    if message:
        notification_message += f": {message}"

    create_notification(
        user_id=chain_owner_id,
        notification_type='chain_project_request',
        title="New project request",
        message=notification_message,
        project_id=project.id,
        chain_id=chain.id,
        actor_id=requester.id,
        redirect_url=f"/chains/{chain.slug}/requests"
    )


def notify_project_removed_from_chain(project_owner_id, chain, project, remover_id):
    """
    Notify project owner when their project is removed from a chain

    Args:
        project_owner_id: ID of project owner
        chain: Chain object
        project: Project object
        remover_id: ID of user who removed the project
    """
    # Don't notify if owner removed it themselves
    if project_owner_id == remover_id:
        return

    create_notification(
        user_id=project_owner_id,
        notification_type='project_removed_from_chain',
        title="Project removed from chain",
        message=f"Your project '{project.title}' was removed from {chain.name}",
        project_id=project.id,
        chain_id=chain.id,
        actor_id=remover_id,
        redirect_url=f"/projects/{project.id}"
    )


def get_unread_count(user_id):
    """
    Get count of unread notifications for a user

    Args:
        user_id: ID of user

    Returns:
        int: Count of unread notifications
    """
    return Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).count()


def mark_all_as_read(user_id):
    """
    Mark all notifications as read for a user

    Args:
        user_id: ID of user

    Returns:
        int: Number of notifications marked as read
    """
    from datetime import datetime

    notifications = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).all()

    count = len(notifications)
    for notification in notifications:
        notification.is_read = True
        notification.read_at = datetime.utcnow()

    db.session.commit()
    return count
