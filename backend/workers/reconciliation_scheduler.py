"""
Reconciliation Scheduler
========================
Schedules nightly reconciliation jobs to run at configured time (default: 3 AM)

Features:
- Runs in background daemon thread
- Configurable execution hour via environment variable
- Integrates with existing ReconciliationJob
- Automatic restart on failure
- Logging and monitoring

Usage:
    Auto-starts with app.py (configured in create_app())

    To disable:
    set DISABLE_RECONCILIATION=1
    python app.py
"""

import time
import threading
from datetime import datetime, timedelta
from typing import Optional


class ReconciliationScheduler:
    """
    Background scheduler for nightly reconciliation jobs
    """

    def __init__(self, app, hour: int = 3):
        """
        Initialize scheduler

        Args:
            app: Flask app instance
            hour: Hour to run reconciliation (0-23, default: 3 = 3 AM)
        """
        self.app = app
        self.hour = hour
        self.running = False
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.stats = {
            'total_runs': 0,
            'successful_runs': 0,
            'failed_runs': 0,
            'started_at': None
        }

    def log(self, message, level='INFO'):
        """Log with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] [Reconciliation Scheduler] [{level}] {message}", flush=True)

    def calculate_next_run(self) -> datetime:
        """Calculate next run time"""
        now = datetime.now()
        next_run = now.replace(hour=self.hour, minute=0, second=0, microsecond=0)

        # If target time already passed today, schedule for tomorrow
        if next_run <= now:
            next_run += timedelta(days=1)

        return next_run

    def execute_reconciliation(self):
        """Execute reconciliation job"""
        try:
            self.log("Starting reconciliation job...")

            from workers.reconciliation_job import ReconciliationJob

            # Create and run reconciliation job
            job = ReconciliationJob(self.app, auto_fix=True)
            report = job.run()

            self.stats['total_runs'] += 1

            if report['errors']:
                self.stats['failed_runs'] += 1
                self.log(f"Reconciliation completed with {len(report['errors'])} errors", level='WARNING')
            else:
                self.stats['successful_runs'] += 1
                self.log(
                    f"Reconciliation completed successfully: "
                    f"{report['discrepancies_fixed']}/{report['discrepancies_found']} discrepancies fixed",
                    level='SUCCESS'
                )

            self.last_run = datetime.now()

        except Exception as e:
            self.stats['total_runs'] += 1
            self.stats['failed_runs'] += 1
            self.log(f"Reconciliation job failed: {e}", level='ERROR')

    def run(self):
        """Main scheduler loop"""
        self.running = True
        self.stats['started_at'] = datetime.now()
        self.next_run = self.calculate_next_run()

        self.log("=" * 62)
        self.log("    RECONCILIATION SCHEDULER STARTED")
        self.log("=" * 62)
        self.log(f"  Scheduled Hour:       {self.hour}:00 (24h format)")
        self.log(f"  Next Run:             {self.next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        self.log(f"  Time Until Next Run:  {self._format_time_until_next()}")
        self.log("=" * 62)

        last_status_log = time.time()

        try:
            while self.running:
                now = datetime.now()

                # Check if it's time to run
                if now >= self.next_run:
                    self.log(f"Triggering scheduled reconciliation at {now.strftime('%Y-%m-%d %H:%M:%S')}")
                    self.execute_reconciliation()

                    # Calculate next run (tomorrow at same hour)
                    self.next_run = self.calculate_next_run()
                    self.log(f"Next reconciliation scheduled for: {self.next_run.strftime('%Y-%m-%d %H:%M:%S')}")

                # Log status every hour
                if time.time() - last_status_log > 3600:
                    self.log(f"Scheduler active. Next run: {self.next_run.strftime('%Y-%m-%d %H:%M:%S')}")
                    last_status_log = time.time()

                # Sleep for 60 seconds before checking again
                time.sleep(60)

        except KeyboardInterrupt:
            self.log("Received shutdown signal", level='INFO')
            self.stop()

        except Exception as e:
            self.log(f"Scheduler error: {e}", level='ERROR')
            self.stop()

    def _format_time_until_next(self) -> str:
        """Format time until next run"""
        if not self.next_run:
            return "N/A"

        delta = self.next_run - datetime.now()
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60

        if delta.days > 0:
            return f"{delta.days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"

    def stop(self):
        """Stop scheduler gracefully"""
        self.running = False
        self.log("Scheduler stopped", level='INFO')
        self.print_stats()

    def print_stats(self):
        """Print scheduler statistics"""
        if self.stats['total_runs'] > 0:
            success_rate = (self.stats['successful_runs'] / self.stats['total_runs']) * 100
            uptime = (datetime.now() - self.stats['started_at']).total_seconds() / 86400  # days

            self.log("=" * 62)
            self.log("    RECONCILIATION SCHEDULER STATISTICS")
            self.log("=" * 62)
            self.log(f"  Total Runs:           {self.stats['total_runs']}")
            self.log(f"  Successful:           {self.stats['successful_runs']}")
            self.log(f"  Failed:               {self.stats['failed_runs']}")
            self.log(f"  Success Rate:         {success_rate:.1f}%")
            self.log(f"  Uptime:               {uptime:.1f} days")
            if self.last_run:
                self.log(f"  Last Run:             {self.last_run.strftime('%Y-%m-%d %H:%M:%S')}")
            if self.next_run:
                self.log(f"  Next Run:             {self.next_run.strftime('%Y-%m-%d %H:%M:%S')}")
            self.log("=" * 62)

    @classmethod
    def start_daily_scheduler(cls, app, hour: int = 3):
        """
        Start reconciliation scheduler in background thread

        Args:
            app: Flask app instance
            hour: Hour to run reconciliation (0-23, default: 3 = 3 AM)

        Returns:
            ReconciliationScheduler instance running in background thread
        """
        scheduler = cls(app, hour=hour)

        # Start scheduler in daemon thread (won't block app shutdown)
        thread = threading.Thread(
            target=scheduler.run,
            daemon=True,
            name='ReconciliationScheduler'
        )
        thread.start()

        return scheduler


def main():
    """Entry point for running scheduler standalone"""
    import sys
    import os

    # Add parent directory to path for imports
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

    from app import create_app

    # Get hour from environment or use default
    hour = int(os.environ.get('RECONCILIATION_HOUR', '3'))

    # Create Flask app
    app = create_app()

    # Create and start scheduler
    scheduler = ReconciliationScheduler(app, hour=hour)

    try:
        scheduler.run()
    except Exception as e:
        print(f"Scheduler crashed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
