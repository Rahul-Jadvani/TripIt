"""
Denormalized Counts - Maintain real-time counts without expensive COUNT(*) queries
These are updated via triggers or application logic for instant access
"""
from extensions import db
from sqlalchemy import event
from datetime import datetime


class DenormalizedCounts:
    """Helper class to maintain denormalized counts"""

    @staticmethod
    def update_user_project_count(user_id, delta=1):
        """Update user's project count (avoids COUNT query)"""
        try:
            from models.user import User
            user = User.query.get(user_id)
            if user:
                user.project_count = max(0, (user.project_count or 0) + delta)
                db.session.commit()
        except Exception as e:
            print(f"Error updating user project count: {e}")
            db.session.rollback()

    @staticmethod
    def update_project_comment_count(project_id, delta=1):
        """Update project's comment count"""
        try:
            from models.project import Project
            project = Project.query.get(project_id)
            if project:
                project.comment_count = max(0, (project.comment_count or 0) + delta)
                db.session.commit()
        except Exception as e:
            print(f"Error updating project comment count: {e}")
            db.session.rollback()

    @staticmethod
    def update_chain_project_count(chain_id, delta=1):
        """Update chain's project count"""
        try:
            from models.chain import Chain
            chain = Chain.query.get(chain_id)
            if chain:
                chain.project_count = max(0, (chain.project_count or 0) + delta)
                db.session.commit()
        except Exception as e:
            print(f"Error updating chain project count: {e}")
            db.session.rollback()

    @staticmethod
    def update_chain_follower_count(chain_id, delta=1):
        """Update chain's follower count"""
        try:
            from models.chain import Chain
            chain = Chain.query.get(chain_id)
            if chain:
                chain.follower_count = max(0, (chain.follower_count or 0) + delta)
                db.session.commit()
        except Exception as e:
            print(f"Error updating chain follower count: {e}")
            db.session.rollback()

    @staticmethod
    def recalculate_all_counts():
        """Recalculate all denormalized counts (run periodically as maintenance)"""
        print("[COUNTS] Starting count recalculation...")

        try:
            from models.user import User
            from models.project import Project
            from models.comment import Comment
            from models.chain import Chain, ChainProject, ChainFollower

            # Recalculate user project counts
            users = User.query.all()
            for user in users:
                count = Project.query.filter_by(user_id=user.id, is_deleted=False).count()
                user.project_count = count

            # Recalculate project comment counts
            projects = Project.query.filter_by(is_deleted=False).all()
            for project in projects:
                count = Comment.query.filter_by(project_id=project.id, is_deleted=False).count()
                project.comment_count = count

            # Recalculate chain project counts
            chains = Chain.query.all()
            for chain in chains:
                project_count = ChainProject.query.filter_by(chain_id=chain.id).count()
                follower_count = ChainFollower.query.filter_by(chain_id=chain.id).count()
                chain.project_count = project_count
                chain.follower_count = follower_count

            db.session.commit()
            print("[COUNTS] ✓ Count recalculation completed")

        except Exception as e:
            print(f"[COUNTS] ✗ Count recalculation failed: {e}")
            db.session.rollback()


def setup_count_maintenance():
    """Setup automatic count maintenance via SQLAlchemy events"""

    # Auto-update project comment count on comment create
    @event.listens_for(db.session, 'after_flush')
    def update_counts_after_flush(session, flush_context):
        """Update denormalized counts after database flush"""
        try:
            from models.comment import Comment
            from models.project import Project

            # Track comment changes
            for obj in session.new:
                if isinstance(obj, Comment) and not obj.is_deleted:
                    project = Project.query.get(obj.project_id)
                    if project:
                        project.comment_count = (project.comment_count or 0) + 1

            for obj in session.deleted:
                if isinstance(obj, Comment):
                    project = Project.query.get(obj.project_id)
                    if project and project.comment_count > 0:
                        project.comment_count -= 1

        except Exception as e:
            print(f"Error in count maintenance: {e}")
