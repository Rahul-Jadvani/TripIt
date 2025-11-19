"""
Database Event Listeners for Automatic Score Updates
Handles automatic denormalization and score recalculation when votes/comments change
"""
from sqlalchemy import event
from extensions import db


def update_project_community_score(project):
    """
    Recalculate and update community score for a project using relative scoring

    New Formula:
    - Upvote Score: (project_upvotes / max_upvotes_in_any_project) × 20
    - Comment Score: (project_comments / max_comments_in_any_project) × 10
    - Total: max 30 points

    Args:
        project: Project instance to update
    """
    try:
        from models.project import Project
        from sqlalchemy import func

        # Get max upvotes and max comments across all non-deleted projects
        max_stats = db.session.query(
            func.max(Project.upvotes).label('max_upvotes'),
            func.max(Project.comment_count).label('max_comments')
        ).filter(
            Project.is_deleted == False
        ).first()

        max_upvotes = max_stats.max_upvotes or 0
        max_comments = max_stats.max_comments or 0

        # Calculate upvote score (max 20 points)
        if max_upvotes > 0:
            upvote_score = (project.upvotes / max_upvotes) * 20
        else:
            upvote_score = 0

        # Calculate comment score (max 10 points)
        if max_comments > 0:
            comment_score = (project.comment_count / max_comments) * 10
        else:
            comment_score = 0

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

    except Exception as e:
        print(f"Error updating community score: {e}")
        # Fallback to 0 if calculation fails
        project.community_score = 0
        project.proof_score = (
            project.quality_score +
            project.verification_score +
            project.validation_score
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
