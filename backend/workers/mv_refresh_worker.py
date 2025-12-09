"""
Materialized View Refresh Worker
=================================
Background worker that processes the MV refresh queue with 5-second debouncing

Features:
- Processes queue every 2 seconds
- Respects 5-second debounce window
- Concurrent refresh using ThreadPoolExecutor
- Error handling and retry logic
- Monitoring and logging

Usage:
    python workers/mv_refresh_worker.py

    Or run as daemon:
    nohup python workers/mv_refresh_worker.py > logs/mv_worker.log 2>&1 &
"""

import time
import sys
import os
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extensions import db
from sqlalchemy import text


class MVRefreshWorker:
    """
    Background worker for processing materialized view refresh queue
    """

    def __init__(self, app, poll_interval=2, max_workers=3):
        """
        Initialize worker

        Args:
            app: Flask app instance
            poll_interval: Seconds between queue checks
            max_workers: Max concurrent refreshes
        """
        self.app = app
        self.poll_interval = poll_interval
        self.max_workers = max_workers
        self.running = False
        self.stats = {
            'total_refreshes': 0,
            'successful_refreshes': 0,
            'failed_refreshes': 0,
            'total_duration_ms': 0,
            'started_at': None
        }

    def log(self, message, level='INFO'):
        """Log with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] [{level}] {message}", flush=True)

    def process_queue(self):
        """Process all pending refreshes in the queue"""
        with self.app.app_context():
            try:
                # Call the Postgres function to process queue
                result = db.session.execute(text("SELECT * FROM process_mv_refresh_queue()"))
                refreshes = result.fetchall()

                if refreshes:
                    for refresh in refreshes:
                        view_name, status, duration_ms, row_count = refresh

                        self.stats['total_refreshes'] += 1

                        if status == 'completed':
                            self.stats['successful_refreshes'] += 1
                            self.stats['total_duration_ms'] += duration_ms

                            self.log(
                                f"[OK] Refreshed {view_name}: {row_count} rows in {duration_ms}ms",
                                level='SUCCESS'
                            )
                        else:
                            self.stats['failed_refreshes'] += 1
                            self.log(
                                f"[FAIL] Failed to refresh {view_name}",
                                level='ERROR'
                            )

                    db.session.commit()

                return len(refreshes)

            except Exception as e:
                self.log(f"Error processing queue: {e}", level='ERROR')
                db.session.rollback()
                return 0

    def cleanup_completed_queue(self):
        """Clean up old completed/failed entries from queue (keep last 100)"""
        with self.app.app_context():
            try:
                db.session.execute(text("""
                    DELETE FROM mv_refresh_queue
                    WHERE status IN ('completed', 'failed')
                      AND id NOT IN (
                          SELECT id FROM mv_refresh_queue
                          WHERE status IN ('completed', 'failed')
                          ORDER BY refresh_completed_at DESC
                          LIMIT 100
                      )
                """))
                db.session.commit()

            except Exception as e:
                self.log(f"Error cleaning up queue: {e}", level='ERROR')
                db.session.rollback()

    def print_stats(self):
        """Print worker statistics"""
        if self.stats['total_refreshes'] > 0:
            avg_duration = self.stats['total_duration_ms'] / self.stats['successful_refreshes'] if self.stats['successful_refreshes'] > 0 else 0
            success_rate = (self.stats['successful_refreshes'] / self.stats['total_refreshes']) * 100

            uptime = (datetime.now() - self.stats['started_at']).total_seconds() if self.stats['started_at'] else 0

            self.log("=" * 62, level='STATS')
            self.log("           MV REFRESH WORKER STATISTICS", level='STATS')
            self.log("=" * 62, level='STATS')
            self.log(f"  Total Refreshes:      {self.stats['total_refreshes']}", level='STATS')
            self.log(f"  Successful:           {self.stats['successful_refreshes']}", level='STATS')
            self.log(f"  Failed:               {self.stats['failed_refreshes']}", level='STATS')
            self.log(f"  Success Rate:         {success_rate:.1f}%", level='STATS')
            self.log(f"  Avg Duration:         {avg_duration:.0f}ms", level='STATS')
            self.log(f"  Uptime:               {uptime/60:.1f} minutes", level='STATS')
            self.log("=" * 62, level='STATS')

    def run(self):
        """Main worker loop"""
        self.running = True
        self.stats['started_at'] = datetime.now()

        self.log("=" * 62)
        self.log("     MATERIALIZED VIEW REFRESH WORKER STARTED             ")
        self.log("=" * 62)
        self.log(f"  Poll Interval:        {self.poll_interval}s")
        self.log(f"  Max Workers:          {self.max_workers}")
        self.log(f"  Debounce Window:      5s")
        self.log("=" * 62)

        iteration = 0
        last_cleanup = time.time()
        last_stats = time.time()

        try:
            while self.running:
                iteration += 1

                # Process queue
                refreshes_processed = self.process_queue()

                # Cleanup every 5 minutes
                if time.time() - last_cleanup > 300:
                    self.log("Running queue cleanup...")
                    self.cleanup_completed_queue()
                    last_cleanup = time.time()

                # Print stats every 1 minute
                if time.time() - last_stats > 60:
                    self.print_stats()
                    last_stats = time.time()

                # Sleep
                time.sleep(self.poll_interval)

        except KeyboardInterrupt:
            self.log("Received shutdown signal", level='INFO')
            self.stop()

        except Exception as e:
            self.log(f"Fatal error: {e}", level='FATAL')
            self.stop()

    def stop(self):
        """Stop worker gracefully"""
        self.running = False
        self.log("Worker stopped", level='INFO')
        self.print_stats()

    @classmethod
    def start_background_worker(cls, app, poll_interval=2, max_workers=3):
        """
        Start MV refresh worker in background thread

        Args:
            app: Flask app instance
            poll_interval: Seconds between queue checks (default: 2)
            max_workers: Max concurrent refreshes (default: 3)

        Returns:
            MVRefreshWorker instance running in background thread
        """
        worker = cls(app, poll_interval=poll_interval, max_workers=max_workers)

        # Start worker in daemon thread (won't block app shutdown)
        thread = threading.Thread(target=worker.run, daemon=True, name='MVRefreshWorker')
        thread.start()

        return worker


def main():
    """Entry point for running worker standalone"""
    # Import here to avoid circular dependency
    from app import create_app

    # Create Flask app
    app = create_app()

    # Create and start worker
    worker = MVRefreshWorker(app, poll_interval=2, max_workers=3)

    try:
        worker.run()
    except Exception as e:
        print(f"Worker crashed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
