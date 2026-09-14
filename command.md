# FasAPI

```bash
# Codebot(nerobot) FastAPI backend server
uvicorn agent:app --reload --port 8001
Dir: \codebot\codebot

# neroai FastAPI backend server
- uvicorn apps.backend.agents.pr_reviewer_agent.apps.main:app --reload
- python -m uvicorn apps.backend.agents.pr_reviewer_agent.apps.main:app --reload --port 8080
```

# Celery 
```bash
dir : cd E:\raj\codebot\codebot
uv run celery -A apps.backend.bot.application.core.celery:celery_app worker --loglevel=INFO
uv run celery -A apps.backend.bot.application.core.celery:celery_app worker --loglevel=INFO --pool=solo
uv run celery -A apps.backend.bot.application.core.celery:celery_app worker --loglevel=INFO --pool=threads --concurrency=4
```

# alembic
```bash
# Run migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "migration message"
```


# Docker Commands Cheat Sheet

## 1. Rebuild & Restart Specific Services (When code changes)
```bash
# Rebuild backend container after code update
docker compose up -d --build backend

# Rebuild celery worker after code update
docker compose up -d --build celery_worker

# Rebuild frontend after code update
docker compose up -d --build frontend
```

## 2. Rebuild & Restart All Services
```bash
# Rebuild all services in docker-compose.yml
docker compose up -d --build
```

## 3. Restart a Service (Without rebuilding)
```bash
# Simply restart the backend process/container
docker compose restart backend
```

## 4. View Logs
```bash
# Stream live backend logs
docker compose logs -f backend

# Stream live celery worker logs
docker compose logs -f celery_worker
```

## 5. Check Service Status & Stop
```bash
# Check status of running containers
docker compose ps

docker compose down
```