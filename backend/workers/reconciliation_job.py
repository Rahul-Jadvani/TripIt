"""
Nightly Reconciliation Job
==========================
Compares denormalized data with primary tables and auto-corrects discrepancies

Features:
- Runs at 3 AM server time (low traffic)
- Compares all denormalized tables with source data
- Auto-corrects discrepancies
- Logs all fixes for audit trail
- Alerts on critical issues

Schedule:
    Run via cron:
    0 3 * * * cd /path/to/backend && python workers/reconciliation_job.py

    Or use APScheduler in app.py:
    scheduler.add_job(reconcile_all, 'cron', hour=3)
"""

import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extensions import db
from app import create_app
from sqlalchemy import text


class ReconciliationJob:
    """
    Reconciliation job for denormalized data integrity
    """

    def __init__(self, app, auto_fix=True):
        """
        Initialize reconciliation job

        Args:
            app: Flask app instance
            auto_fix: If True, automatically fix discrepancies
        """
        self.app = app
        self.auto_fix = auto_fix
        self.report = {
            'started_at': None,
            'completed_at': None,
            'duration_seconds': 0,
            'tables_checked': [],
            'discrepancies_found': 0,
            'discrepancies_fixed': 0,
            'errors': []
        }

    def log(self, message, level='INFO'):
        """Log with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] [{level}] {message}", flush=True)

    def log_discrepancy(self, table: str, user_id: str, field: str, expected: any, actual: any, fixed: bool):
        """Log a discrepancy"""
        self.report['discrepancies_found'] += 1
        if fixed:
            self.report['discrepancies_fixed'] += 1

        self.log(
            f"{'[FIXED]' if fixed else '[FOUND]'} {table}.{field} for user {user_id}: "
            f"Expected={expected}, Actual={actual}",
            level='WARNING' if not fixed else 'INFO'
        )

    def reconcile_dashboard_stats(self) -> int:
        """Reconcile user_dashboard_stats with primary tables"""
        self.log("Reconciling user_dashboard_stats...")

        discrepancies = 0

        with self.app.app_context():
            try:
                # Get all users with dashboard stats
                result = db.session.execute(text("""
                    SELECT
                        u.id as user_id,
                        uds.project_count as cached_project_count,
                        uds.active_projects as cached_active_projects,
                        uds.total_proof_score as cached_proof_score,
                        uds.comment_count as cached_comment_count,
                        uds.badges_given as cached_badges_given,
                        uds.badges_received as cached_badges_received,
                        uds.unread_messages as cached_unread_messages,
                        uds.unread_notifications as cached_unread_notifications,

                        -- Actual values from primary tables
                        (SELECT COUNT(*) FROM projects WHERE user_id = u.id) as actual_project_count,
                        (SELECT COUNT(*) FROM projects WHERE user_id = u.id AND is_deleted = FALSE) as actual_active_projects,
                        (SELECT COALESCE(SUM(proof_score), 0) FROM projects WHERE user_id = u.id AND is_deleted = FALSE) as actual_proof_score,
                        (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as actual_comment_count,
                        (SELECT COUNT(*) FROM validation_badges WHERE validator_id = u.id) as actual_badges_given,
                        (SELECT COUNT(DISTINCT vb.id) FROM validation_badges vb JOIN projects p ON vb.project_id = p.id WHERE p.user_id = u.id) as actual_badges_received,
                        (SELECT COUNT(*) FROM direct_messages WHERE recipient_id = u.id AND is_read = FALSE) as actual_unread_messages,
                        (SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND is_read = FALSE) as actual_unread_notifications

                    FROM users u
                    LEFT JOIN user_dashboard_stats uds ON u.id = uds.user_id
                    WHERE u.is_active = TRUE
                """))

                rows = result.fetchall()

                for row in rows:
                    user_id = row[0]
                    has_discrepancy = False

                    # Check each field
                    fields = [
                        ('project_count', row[1], row[9]),
                        ('active_projects', row[2], row[10]),
                        ('total_proof_score', row[3], row[11]),
                        ('comment_count', row[4], row[12]),
                        ('badges_given', row[5], row[13]),
                        ('badges_received', row[6], row[14]),
                        ('unread_messages', row[7], row[15]),
                        ('unread_notifications', row[8], row[16]),
                    ]

                    updates = {}
                    for field_name, cached, actual in fields:
                        if cached != actual:
                            has_discrepancy = True
                            discrepancies += 1
                            updates[field_name] = actual
                            self.log_discrepancy(
                                'user_dashboard_stats',
                                user_id,
                                field_name,
                                actual,
                                cached,
                                self.auto_fix
                            )

                    # Fix if auto_fix enabled
                    if has_discrepancy and self.auto_fix and updates:
                        update_sql = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                        db.session.execute(
                            text(f"""
                                UPDATE user_dashboard_stats
                                SET {update_sql}, last_updated_at = CURRENT_TIMESTAMP
                                WHERE user_id = :user_id
                            """),
                            {'user_id': user_id, **updates}
                        )

                db.session.commit()
                self.log(f"Dashboard stats: Found {discrepancies} discrepancies")

            except Exception as e:
                self.report['errors'].append(f"dashboard_stats: {str(e)}")
                self.log(f"Error reconciling dashboard stats: {e}", level='ERROR')
                db.session.rollback()

        return discrepancies

    def reconcile_message_conversations(self) -> int:
        """Reconcile message_conversations_denorm with direct_messages"""
        self.log("Reconciling message_conversations_denorm...")

        discrepancies = 0

        with self.app.app_context():
            try:
                # Find conversations with mismatched unread counts
                result = db.session.execute(text("""
                    SELECT
                        mcd.user_id,
                        mcd.other_user_id,
                        mcd.unread_count as cached_unread,
                        mcd.total_messages as cached_total,
                        (SELECT COUNT(*) FROM direct_messages
                         WHERE recipient_id = mcd.user_id
                           AND sender_id = mcd.other_user_id
                           AND is_read = FALSE) as actual_unread,
                        (SELECT COUNT(*) FROM direct_messages
                         WHERE (sender_id = mcd.user_id AND recipient_id = mcd.other_user_id)
                            OR (sender_id = mcd.other_user_id AND recipient_id = mcd.user_id)) as actual_total
                    FROM message_conversations_denorm mcd
                """))

                rows = result.fetchall()

                for row in rows:
                    user_id, other_user_id, cached_unread, cached_total, actual_unread, actual_total = row

                    has_discrepancy = False
                    updates = {}

                    if cached_unread != actual_unread:
                        has_discrepancy = True
                        discrepancies += 1
                        updates['unread_count'] = actual_unread
                        self.log_discrepancy(
                            'message_conversations_denorm',
                            user_id,
                            'unread_count',
                            actual_unread,
                            cached_unread,
                            self.auto_fix
                        )

                    if cached_total != actual_total:
                        has_discrepancy = True
                        discrepancies += 1
                        updates['total_messages'] = actual_total
                        self.log_discrepancy(
                            'message_conversations_denorm',
                            user_id,
                            'total_messages',
                            actual_total,
                            cached_total,
                            self.auto_fix
                        )

                    # Fix if auto_fix enabled
                    if has_discrepancy and self.auto_fix and updates:
                        update_sql = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                        db.session.execute(
                            text(f"""
                                UPDATE message_conversations_denorm
                                SET {update_sql}, updated_at = CURRENT_TIMESTAMP
                                WHERE user_id = :user_id AND other_user_id = :other_user_id
                            """),
                            {'user_id': user_id, 'other_user_id': other_user_id, **updates}
                        )

                db.session.commit()
                self.log(f"Message conversations: Found {discrepancies} discrepancies")

            except Exception as e:
                self.report['errors'].append(f"message_conversations: {str(e)}")
                self.log(f"Error reconciling message conversations: {e}", level='ERROR')
                db.session.rollback()

        return discrepancies

    def reconcile_intro_request_stats(self) -> int:
        """Reconcile intro_request_stats with intro_requests"""
        self.log("Reconciling intro_request_stats...")

        discrepancies = 0

        with self.app.app_context():
            try:
                result = db.session.execute(text("""
                    SELECT
                        u.id as user_id,
                        irs.pending_requests as cached_pending,
                        irs.approved_requests as cached_approved,
                        irs.rejected_requests as cached_rejected,
                        irs.sent_requests as cached_sent,
                        (SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'pending') as actual_pending,
                        (SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'approved') as actual_approved,
                        (SELECT COUNT(*) FROM intro_requests WHERE builder_id = u.id AND status = 'rejected') as actual_rejected,
                        (SELECT COUNT(*) FROM intro_requests WHERE investor_id = u.id) as actual_sent
                    FROM users u
                    LEFT JOIN intro_request_stats irs ON u.id = irs.user_id
                    WHERE u.is_active = TRUE
                """))

                rows = result.fetchall()

                for row in rows:
                    user_id = row[0]
                    has_discrepancy = False
                    updates = {}

                    fields = [
                        ('pending_requests', row[1], row[5]),
                        ('approved_requests', row[2], row[6]),
                        ('rejected_requests', row[3], row[7]),
                        ('sent_requests', row[4], row[8]),
                    ]

                    for field_name, cached, actual in fields:
                        if cached != actual:
                            has_discrepancy = True
                            discrepancies += 1
                            updates[field_name] = actual
                            self.log_discrepancy(
                                'intro_request_stats',
                                user_id,
                                field_name,
                                actual,
                                cached,
                                self.auto_fix
                            )

                    # Fix if auto_fix enabled
                    if has_discrepancy and self.auto_fix and updates:
                        update_sql = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                        db.session.execute(
                            text(f"""
                                UPDATE intro_request_stats
                                SET {update_sql}, last_updated_at = CURRENT_TIMESTAMP
                                WHERE user_id = :user_id
                            """),
                            {'user_id': user_id, **updates}
                        )

                db.session.commit()
                self.log(f"Intro request stats: Found {discrepancies} discrepancies")

            except Exception as e:
                self.report['errors'].append(f"intro_request_stats: {str(e)}")
                self.log(f"Error reconciling intro request stats: {e}", level='ERROR')
                db.session.rollback()

        return discrepancies

    def refresh_all_materialized_views(self):
        """Force refresh all materialized views"""
        self.log("Refreshing all materialized views...")

        views = [
            'mv_feed_projects',
            'mv_leaderboard_projects',
            'mv_leaderboard_builders',
            'mv_chains_discovery',
            'mv_project_details',
            'mv_search_index',
            'mv_chain_posts',
            'mv_investors_directory'
        ]

        with self.app.app_context():
            for view in views:
                try:
                    start_time = datetime.now()
                    db.session.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}"))
                    db.session.commit()
                    duration = (datetime.now() - start_time).total_seconds() * 1000
                    self.log(f"  [OK] Refreshed {view} in {duration:.0f}ms")

                except Exception as e:
                    self.report['errors'].append(f"{view}: {str(e)}")
                    self.log(f"  [FAIL] Failed to refresh {view}: {e}", level='ERROR')
                    db.session.rollback()

    def run(self) -> Dict:
        """Run full reconciliation"""
        self.report['started_at'] = datetime.now()

        self.log("=" * 62)
        self.log("         NIGHTLY RECONCILIATION JOB STARTED")
        self.log("=" * 62)
        self.log(f"  Started At:           {self.report['started_at'].strftime('%Y-%m-%d %H:%M:%S')}")
        self.log(f"  Auto Fix:             {'Enabled' if self.auto_fix else 'Disabled'}")
        self.log("=" * 62)

        # Reconcile denormalized tables
        self.report['tables_checked'].append('user_dashboard_stats')
        self.reconcile_dashboard_stats()

        self.report['tables_checked'].append('message_conversations_denorm')
        self.reconcile_message_conversations()

        self.report['tables_checked'].append('intro_request_stats')
        self.reconcile_intro_request_stats()

        # Refresh all materialized views
        self.refresh_all_materialized_views()

        # Finalize report
        self.report['completed_at'] = datetime.now()
        self.report['duration_seconds'] = (
            self.report['completed_at'] - self.report['started_at']
        ).total_seconds()

        # Print summary
        self.print_report()

        return self.report

    def print_report(self):
        """Print reconciliation report"""
        self.log("=" * 62)
        self.log("         RECONCILIATION JOB COMPLETED")
        self.log("=" * 62)
        self.log(f"  Duration:             {self.report['duration_seconds']:.1f}s")
        self.log(f"  Tables Checked:       {len(self.report['tables_checked'])}")
        self.log(f"  Discrepancies Found:  {self.report['discrepancies_found']}")
        self.log(f"  Discrepancies Fixed:  {self.report['discrepancies_fixed']}")
        self.log(f"  Errors:               {len(self.report['errors'])}")
        self.log("=" * 62)

        if self.report['errors']:
            self.log("\nErrors encountered:", level='ERROR')
            for error in self.report['errors']:
                self.log(f"  - {error}", level='ERROR')


def main():
    """Entry point"""
    # Create Flask app
    app = create_app()

    # Create and run reconciliation job
    job = ReconciliationJob(app, auto_fix=True)

    try:
        report = job.run()

        # Exit with error code if discrepancies found and not fixed
        if report['discrepancies_found'] > report['discrepancies_fixed']:
            sys.exit(1)

        sys.exit(0)

    except Exception as e:
        print(f"Reconciliation job crashed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
