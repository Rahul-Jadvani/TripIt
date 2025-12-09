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

    # Session Configuration
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)  # Admin sessions expire after 2 hours

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

    # Vendor JWT (for QR verification portal)
    VENDOR_JWT_SECRET_KEY = os.getenv('VENDOR_JWT_SECRET_KEY', os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production'))
    VENDOR_JWT_EXPIRATION_DAYS = int(os.getenv('VENDOR_JWT_EXPIRATION_DAYS', 7))

    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # AWS/S3
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    AWS_S3_REGION = os.getenv('AWS_S3_REGION', 'us-east-1')

    # Blockchain - Legacy (Zer0)
    KAIA_TESTNET_RPC = os.getenv(
        'KAIA_TESTNET_RPC',
        'https://public-en-kairos.node.kaia.io'
    )
    OXCERTS_CONTRACT_ADDRESS = os.getenv(
        'OXCERTS_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000'  # Update with actual contract
    )

    # Blockchain - TripIt (Base Sepolia / Hardhat Local)
    BASE_SEPOLIA_RPC = os.getenv(
        'BASE_SEPOLIA_RPC',
        'https://sepolia.base.org'
    )
    BASE_MAINNET_RPC = os.getenv(
        'BASE_MAINNET_RPC',
        'https://mainnet.base.org'
    )
    HARDHAT_LOCAL_RPC = os.getenv(
        'HARDHAT_LOCAL_RPC',
        'http://localhost:8545'
    )
    BLOCKCHAIN_NETWORK = os.getenv('BLOCKCHAIN_NETWORK', 'hardhat')  # hardhat, base_sepolia, or base_mainnet

    # SBT Contract (Soul-Bound Travel Card)
    SBT_CONTRACT_ADDRESS = os.getenv(
        'SBT_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000'  # Update with actual contract
    )

    # TRIP Token Contract
    TRIP_TOKEN_CONTRACT_ADDRESS = os.getenv(
        'TRIP_TOKEN_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000'  # Update with actual contract
    )

    # Web3 / Blockchain Deployment
    BLOCKCHAIN_DEPLOYER_ADDRESS = os.getenv('BLOCKCHAIN_DEPLOYER_ADDRESS')
    BLOCKCHAIN_DEPLOYER_PRIVATE_KEY = os.getenv('BLOCKCHAIN_DEPLOYER_PRIVATE_KEY')
    BLOCKCHAIN_GAS_PRICE_MULTIPLIER = float(os.getenv('BLOCKCHAIN_GAS_PRICE_MULTIPLIER', 1.2))

    # Backend Signer (for SBT minting - server-side wallet)
    BACKEND_SIGNER_ADDRESS = os.getenv('BACKEND_SIGNER_ADDRESS')
    BACKEND_SIGNER_KEY = os.getenv('BACKEND_SIGNER_KEY')

    # Pinata IPFS
    PINATA_API_KEY = os.getenv('PINATA_API_KEY')
    PINATA_SECRET_API_KEY = os.getenv('PINATA_SECRET_API_KEY')
    PINATA_JWT = os.getenv('PINATA_JWT')

    # OpenAI API Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    OPENAI_MAX_TOKENS = int(os.getenv('OPENAI_MAX_TOKENS', 2000))
    OPENAI_TEMPERATURE = float(os.getenv('OPENAI_TEMPERATURE', 0.3))

    # Celery Configuration
    CELERY_BROKER_URL = os.getenv(
        'CELERY_BROKER_URL',
        os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    )
    CELERY_RESULT_BACKEND = os.getenv(
        'CELERY_RESULT_BACKEND',
        os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    )

    # SSL Configuration for rediss:// (only when using TLS)
    # Only apply SSL settings if using rediss:// URLs
    if CELERY_BROKER_URL.startswith('rediss://'):
        import ssl
        CELERY_BROKER_USE_SSL = {
            'ssl_cert_reqs': ssl.CERT_NONE  # Skip certificate verification for managed Redis (Upstash)
        }
        CELERY_REDIS_BACKEND_USE_SSL = {
            'ssl_cert_reqs': ssl.CERT_NONE  # Skip certificate verification for managed Redis (Upstash)
        }

    CELERY_TASK_TRACK_STARTED = True
    CELERY_TASK_TIME_LIMIT = 600  # 10 minutes max per task
    CELERY_TASK_SOFT_TIME_LIMIT = 540  # 9 minutes soft limit
    CELERY_TASK_ACKS_LATE = True
    CELERY_WORKER_PREFETCH_MULTIPLIER = 1

    # Scoring Configuration
    SCORING_RATE_LIMIT_HOURS = int(os.getenv('SCORING_RATE_LIMIT_HOURS', 1))
    SCORING_MAX_RETRIES = int(os.getenv('SCORING_MAX_RETRIES', 10))
    SCORING_RETRY_BACKOFF = int(os.getenv('SCORING_RETRY_BACKOFF', 300))  # 5 minutes
    SCORING_GITHUB_CACHE_DAYS = int(os.getenv('SCORING_GITHUB_CACHE_DAYS', 7))

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

    # ZeptoMail (supports legacy + new variable names)
    FRONTEND_APP_URL = os.getenv('FRONTEND_APP_URL', 'https://discoveryplatform.netlify.app')

    ZEPTO_ENDPOINT = os.getenv('ZEPTO_ENDPOINT') or os.getenv('ZEPTOMAIL_API_URL')

    _zepto_token = (
        os.getenv('ZEPTO_SEND_MAIL_TOKEN')
        or os.getenv('ZEPTOMAIL_TOKEN')
        or os.getenv('ZEPTOMAIL_API_KEY')
    )
    if _zepto_token and _zepto_token.lower().startswith('zoho-enczapikey'):
        _zepto_token = _zepto_token.split(' ', 1)[-1].strip()
    ZEPTO_SEND_MAIL_TOKEN = _zepto_token

    ZEPTO_SENDER_ADDRESS = os.getenv('ZEPTO_SENDER_ADDRESS') or os.getenv('ZEPTOMAIL_FROM_EMAIL')
    ZEPTO_SENDER_NAME = os.getenv('ZEPTO_SENDER_NAME') or os.getenv('ZEPTOMAIL_FROM_NAME') or 'Team Zer0'
    ZEPTO_MAIL_AGENT_ALIAS = os.getenv('ZEPTO_MAIL_AGENT_ALIAS') or os.getenv('ZEPTOMAIL_MAIL_AGENT_ALIAS')

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
    # Override engine options for SQLite (doesn't support connection pooling)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False}
    }


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
