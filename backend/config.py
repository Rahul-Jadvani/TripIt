"""
Flask Configuration
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""

    # Flask
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production-12345')

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://user:password@localhost:5432/oxship'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # Database Connection Pooling - OPTIMIZED for high concurrency (10,000+ users)
    # NeonDB-compatible configuration (pooler doesn't support statement_timeout in options)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,           # Maintain 20 connections for instant access
        'max_overflow': 40,        # Allow 40 extra connections during peak load
        'pool_timeout': 10,        # Reduced timeout for faster fail/retry
        'pool_recycle': 1800,      # Recycle after 30 min (NeonDB disconnects idle)
        'pool_pre_ping': True,     # Test connections before using (prevents stale conn errors)
        'echo_pool': False,        # Disable pool logging for performance
        'connect_args': {
            'connect_timeout': 10,  # Connection timeout
        }
    }

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=90)

    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # AWS/S3
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    AWS_S3_REGION = os.getenv('AWS_S3_REGION', 'us-east-1')

    # Blockchain
    KAIA_TESTNET_RPC = os.getenv(
        'KAIA_TESTNET_RPC',
        'https://public-en-kairos.node.kaia.io'
    )
    OXCERTS_CONTRACT_ADDRESS = os.getenv(
        'OXCERTS_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000'  # Update with actual contract
    )

    # Pinata IPFS
    PINATA_API_KEY = os.getenv('PINATA_API_KEY')
    PINATA_SECRET_API_KEY = os.getenv('PINATA_SECRET_API_KEY')
    PINATA_JWT = os.getenv('PINATA_JWT')

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:8080').split(',')

    # Rate Limiting
    RATELIMIT_ENABLED = os.getenv('RATELIMIT_ENABLED', 'true').lower() == 'true'
    RATELIMIT_STORAGE_URL = os.getenv('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/1')

    # Email (Optional)
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@0xship.com')

    # GitHub OAuth
    GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET')
    GITHUB_REDIRECT_URI = os.getenv('GITHUB_REDIRECT_URI', 'http://localhost:5000/api/auth/github/callback')

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/auth/google/callback')

    # Performance Optimization - Materialized Views
    ENABLE_FEED_MV = os.getenv('ENABLE_FEED_MV', 'true').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # Disable SQL query logging


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
