import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from apps.backend.bot.application.model.pg_vectore import Base
from apps.backend.bot.application.model import chat_history  # noqa: F401
from apps.backend.bot.application.model import web_search  # noqa: F401

PROJECT_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(PROJECT_ROOT / ".env", override=False)


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost/codebot",
)
JWT_SECRET = os.getenv("JWT_SECRET", "codebot-dev-jwt-secret")
ACCESS_TOKEN_EXPIRES_SECONDS = int(
    os.getenv("ACCESS_TOKEN_EXPIRES_SECONDS", str(60 * 15))
)
REFRESH_TOKEN_EXPIRES_SECONDS = int(
    os.getenv("REFRESH_TOKEN_EXPIRES_SECONDS", str(60 * 60 * 24 * 30))
)
GUEST_SESSION_EXPIRES_SECONDS = int(
    os.getenv("GUEST_SESSION_EXPIRES_SECONDS", str(60 * 60 * 24 * 3))
)
GUEST_MESSAGE_LIMIT = int(os.getenv("GUEST_MESSAGE_LIMIT", "5"))
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax")
AUTH_COOKIE_DOMAIN = os.getenv("AUTH_COOKIE_DOMAIN") or None
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:5173")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GITHUB_APP_ID = os.getenv("GITHUB_APP_ID") or os.getenv("APP_ID")
_github_private_key_path = os.getenv("GITHUB_PRIVATE_KEY_PATH")
GITHUB_PRIVATE_KEY_PATH = (
    str((PROJECT_ROOT / _github_private_key_path).resolve())
    if _github_private_key_path and not Path(_github_private_key_path).is_absolute()
    else _github_private_key_path
)
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET") or os.getenv("WEBHOOK_SECRET")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
AUTO_CREATE_SCHEMA = os.getenv("AUTO_CREATE_SCHEMA", "false").lower() == "true"
AUTO_MIGRATE_LEGACY_AUTH_SCHEMA = (
    os.getenv("AUTO_MIGRATE_LEGACY_AUTH_SCHEMA", "true").lower() == "true"
)
GITHUB_APP_SLUG = os.getenv("GITHUB_APP_SLUG")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)
