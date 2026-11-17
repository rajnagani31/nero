#!/bin/sh
set -e

# Only run migrations for the web server, or when explicitly requested.
# Celery worker containers skip migrations to avoid race conditions.
if [ "$SKIP_MIGRATIONS" != "true" ]; then
    case "$*" in
        *celery*worker*)
            echo "==> [Entrypoint] Skipping Alembic migrations for Celery worker process..."
            ;;
        *)
            echo "==> [Entrypoint] Running Alembic migrations to sync database schema..."
            alembic upgrade head
            echo "==> [Entrypoint] Schema in sync."
            ;;
    esac
else
    echo "==> [Entrypoint] Migrations skipped via SKIP_MIGRATIONS=true."
fi

echo "==> [Entrypoint] Starting application: $*"
exec "$@"
