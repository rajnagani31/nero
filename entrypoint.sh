#!/bin/sh
set -e

echo "==> [Entrypoint] Running Alembic migrations to sync database schema..."
alembic upgrade head

echo "==> [Entrypoint] Schema in sync. Starting application..."
exec "$@"
