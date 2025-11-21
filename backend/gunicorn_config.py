"""
Gunicorn configuration for production
Fixes eventlet DNS monkey-patching issues with external APIs
"""
import eventlet

# Monkey-patch ONLY what's needed, EXCLUDE dns/socket to fix external API calls
eventlet.monkey_patch(
    os=True,
    select=True,
    socket=False,  # Don't patch socket - fixes ZeptoMail/external APIs
    thread=True,
    time=True
)

# Worker configuration
bind = "0.0.0.0:5000"
workers = 4
worker_class = "eventlet"
worker_connections = 1000
timeout = 300
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
