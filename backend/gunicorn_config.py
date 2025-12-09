"""
Gunicorn configuration for production
Using gevent instead of eventlet to avoid DNS issues
"""

# Worker configuration
bind = "0.0.0.0:5000"
workers = 4
worker_class = "gevent"  # Use gevent instead of eventlet
worker_connections = 1000
timeout = 300
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
