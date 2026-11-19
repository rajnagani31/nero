# ---- Backend build ----

# -> Tha base image we build on top of. Every Dockerfile starts with FROM.
FROM python:3.13-slim AS backend 

# PYTHONDONTWRITEBYTECODE=1 Don't create and write .pyc files. Saves disk space in docker, since we don't need bytecode cache
# PYTHONUNBUFFERED=1 Don't buffer output, so logs are immediately flushed to the console. This is important for real-time logging in docker containers.
# UV_COMPILE_BYTECODE=1 Tells UV to compile bytecode when installing dependencies. This can improve performance by pre-compiling the dependencies, so they don't need to be compiled at runtime.
# UV_LINK_MODE=copy Tells UV to copy dependencies instead of symlinking them.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# All following commands run inside /app directory, create /app if it doesn't exist.
# EXAMPLE : Like doing mkdir -p /app && cd /app.

WORKDIR /app

# Install system-level packages we need.
#
# - apt-get update : refreshes the package list.
# - ca-certificates : needed for secure HTTPS requests so it's SSL certificates to make HTTP requests (OPENAI API etc..)
# - curl for health checks and debugging.
# - --no-install-recommends : don't install optional/suggested packages (keeps the image smaller).
# - rm -rf /var/lib/apt/lists/* : delete the package cache. Saves ~30 MB.

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Install the uv package manager.
RUN pip install --no-cache-dir uv

# Copy only the dependency files first, pyproject.toml -> copied, uv.lock -> copied
# COPY <source> <destination>
# - source : file/folder on your system
# - destination : path inside the docker image
# Copy dependency manifests first (layer caching)
COPY pyproject.toml uv.lock ./

# Install Python dependencies using UV.
RUN uv sync --no-dev


# Copy source code
COPY apps/backend  ./apps/backend
COPY alembic       ./alembic
COPY alembic.ini   ./alembic.ini
COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Add virtual environment to PATH
ENV PATH="/app/.venv/bin:$PATH" 

# EXPOSE is documentation only — it doesn't actually publish the port, just a hint for users and tools that this container listens on this port. Actual port mapping is inside docker-compose.yml.
EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]

# The command that runs when the container starts.
CMD ["uvicorn", "apps.backend.bot.application.main:app", "--host", "0.0.0.0", "--port", "8000"]
