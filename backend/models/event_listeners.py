"""
Database Event Listeners for Automatic Score Updates
Handles automatic denormalization and score recalculation when votes/comments change
"""
from sqlalchemy import event
from extensions import db


def update_project_community_score(project):
    """
    Recalculate and update community score for a project

    Args:
        project: Project instance to update
    """
    # Calculate upvote ratio (max 20 points)
    total_votes = project.upvotes + project.downvotes
    if total_votes > 0:
        upvote_ratio = project.upvotes / total_votes
        upvote_score = upvote_ratio * 20
    else:
        upvote_score = 0

    # Comment engagement (max 10 points)
    comment_score = min(project.comment_count * 0.5, 10)

    # Total community score (max 30)
    community_score = upvote_score + comment_score
    project.community_score = round(min(community_score, 30), 2)

    # Recalculate total proof score
    project.proof_score = (
        project.quality_score +
        project.verification_score +
        project.validation_score +
        project.community_score
    )


def setup_vote_listeners():
    """Setup event listeners for Vote model to auto-update denormalized counts"""
    from models.vote import Vote
    from models.project import Project

    @event.listens_for(Vote, 'after_insert')
    def receive_after_insert(mapper, connection, target):
        """After a vote is inserted, update project counts and score"""
        # Get the project using the session
        project = db.session.query(Project).get(target.project_id)
        if project:
            # Update denormalized vote counts
            if target.vote_type == 'upvote':
                project.upvotes += 1
            elif target.vote_type == 'downvote':
                project.downvotes += 1

            # Recalculate community score
            update_project_community_score(project)

            # DO NOT commit here - let the original transaction handle it

    @event.listens_for(Vote, 'after_update')
    def receive_after_update(mapper, connection, target):
        """After a vote is updated (changed from upvote to downvote or vice versa), update counts"""
        # Get the project using the session
        project = db.session.query(Project).get(target.project_id)
        if project:
            # Recalculate counts from scratch to ensure accuracy
            from sqlalchemy import func
            upvotes = db.session.query(func.count(Vote.id)).filter(
                Vote.project_id == project.id,
                Vote.vote_type == 'upvote'
            ).scalar() or 0

            downvotes = db.session.query(func.count(Vote.id)).filter(
                Vote.project_id == project.id,
                Vote.vote_type == 'downvote'
            ).scalar() or 0

            project.upvotes = upvotes
            project.downvotes = downvotes

            # Recalculate community score
            update_project_community_score(project)

            # DO NOT commit here - let the original transaction handle it

    @event.listens_for(Vote, 'after_delete')
    def receive_after_delete(mapper, connection, target):
        """After a vote is deleted, update project counts and score"""
        # Get the project using the session
        project = db.session.query(Project).get(target.project_id)
        if project:
            # Update denormalized vote counts
            if target.vote_type == 'upvote':
                project.upvotes = max(0, project.upvotes - 1)
            elif target.vote_type == 'downvote':
                project.downvotes = max(0, project.downvotes - 1)

            # Recalculate community score
            update_project_community_score(project)

            # DO NOT commit here - let the original transaction handle it


def setup_comment_listeners():
    """Setup event listeners for Comment model to auto-update denormalized counts"""
    from models.comment import Comment
    from models.project import Project

    @event.listens_for(Comment, 'after_insert')
    def receive_after_insert(mapper, connection, target):
        """After a comment is inserted, update project count and score"""
        # Only count top-level comments (not replies)
        if not target.parent_id:
            project = db.session.query(Project).get(target.project_id)
            if project:
                # Update denormalized comment count
                project.comment_count += 1

                # Recalculate community score
                update_project_community_score(project)

                # DO NOT commit here - let the original transaction handle it

    @event.listens_for(Comment, 'after_delete')
    def receive_after_delete(mapper, connection, target):
        """After a comment is deleted, update project count and score"""
        # Only count top-level comments (not replies)
        if not target.parent_id:
            project = db.session.query(Project).get(target.project_id)
            if project:
                # Update denormalized comment count
                project.comment_count = max(0, project.comment_count - 1)

                # Recalculate community score
                update_project_community_score(project)

                # DO NOT commit here - let the original transaction handle it


def setup_all_listeners():
    """Setup all database event listeners"""
    setup_vote_listeners()
    setup_comment_listeners()
