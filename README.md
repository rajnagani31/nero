# 🤖 Codebot & NeroAI — AI Code Assistant & Automated PR Reviewer

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-v2+-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python)](https://www.python.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-v1.13+-D147A3.svg?style=flat&logo=qdrant)](https://qdrant.tech/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16--pgvector-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)

---

## 📌 Product Details & Overview

**Codebot & NeroAI** is an enterprise-grade AI software development ecosystem combining an **interactive conversational AI assistant** with an **automated GitHub PR review agent**.

### 🌟 Key Features

1. **🤖 Codebot (AI Chatbot & Developer Assistant)**
   * **Streaming Responses**: Real-time SSE streaming for interactive code generation & explanation.
   * **RAG & Vector Search**: Contextual code retrieval powered by **Qdrant** vector store.
   * **Conversational Memory**: Short-term and long-term memory powered by **PostgreSQL** & **pgvector**.
   * **Guest Quota & Credit Management**: Automated message rate limiting for guest sessions with seamless upgrade to password/OAuth accounts.

2. **🔍 NeroAI (Automated PR Reviewer Agent)**
   * **GitHub App Integration**: Intercepts `pull_request.opened` and `pull_request.synchronize` webhooks.
   * **Multi-Agent Code Analysis**: Scans git diffs, analyzes code quality, potential bugs, security issues, and style violations.
   * **Automated Line-by-Line Feedback**: Posts inline pull request review comments directly on GitHub PRs.

3. **🔐 Shared Authentication Architecture**
   * **Stateless Microservice Auth (`get_current_user_from_token`)**: Decodes JWT in-memory (< 1ms, zero DB queries) for agent microservices.
   * **Stateful Session Auth (`get_current_user_from_db`)**: Queries PostgreSQL for live guest credit enforcement and session revocation checks.
   * **OAuth & Security**: Supports Google OAuth 2.0, PBKDF2-SHA256 password hashing, and HTTP-only cookie delivery.

---

## 🏗️ Infrastructure & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CODEBOT & NEROAI STACK                          │
├────────────────────────────────────────────────────────────────────────┤
│ • FastAPI (Asynchronous Python API Backend - Port 8000)                │
│ • React / Vite (Frontend Web Interface - Port 3000)                    │
│ • PostgreSQL + pgvector (User Database & Embeddings - Port 5433:5432) │
│ • Redis / Valkey (Celery Task Broker & Token Cache - Port 6379)        │
│ • Qdrant (Vector Database for RAG - Port 6334:6333)                    │
│ • Celery Worker (Asynchronous PR analysis & indexing)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run the Project

### Option 1: Full Docker Compose Stack (Recommended for Production / Testing)

Start all containers in detached mode:

```bash
# 1. Navigate to codebot directory
cd codebot

# 2. Start all services
docker compose up -d

# 3. View live backend logs
docker compose logs -f backend
```

#### Rebuilding Services After Code Updates:
```bash
# Rebuild backend service after updating backend code
docker compose up -d --build backend

# Rebuild Celery worker after updating worker code
docker compose up -d --build celery_worker

# Rebuild Frontend after updating UI code
docker compose up -d --build frontend

# Rebuild all services
docker compose up -d --build
```

#### Stopping the Stack:
```bash
docker compose down
```

---

### Option 2: Hybrid Local Development (FastAPI Command + Docker Infra)

*Best for active feature development, hot-reloading (< 1s), and step-by-step IDE debugging.*

#### Step 1: Start Infrastructure Services in Docker
```bash
cd codebot
docker compose up -d db redis vector_db
```

#### Step 2: Run FastAPI Backend Locally with `--reload`
```bash
# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate     # Windows

# Run FastAPI backend
uvicorn apps.backend.bot.application.main:app --reload --host 0.0.0.0 --port 8000
```

#### Step 3: Run Celery Worker Locally (In a separate terminal)
```bash
celery -A apps.backend.bot.application.core.celery:celery_app worker --loglevel=INFO
```

#### Step 4: Run Frontend Locally (In a separate terminal)
```bash
cd apps/frontend
npm run dev
```

---

### Option 3: Production Server Deployment

Run with staging overrides (e.g. on server with Nginx reverse proxy):

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

---

## 🔗 Interactive API Documentation & Health Checks

Once the backend is running:

| Resource | URL |
| :--- | :--- |
| **Local Swagger UI Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Local OpenAPI Schema** | [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json) |
| **Local Health Check** | `GET http://localhost:8000/health` |
| **Local Frontend Interface** | [http://localhost:3000](http://localhost:3000) |
| **Production Frontend** | [https://nerotechnology.online](https://nerotechnology.online) |
| **Production API Docs** | `https://api.nerotechnology.online/docs` |

---

## ⚡ PR Review Webhook Flow Architecture

```
GitHub App Event (PR Opened / Synchronize)
    ↓
Webhook Endpoint (/api/webhook/github)
    ↓
Verify Signature & Payload
    ↓
Celery Async Worker Task
    ↓
Fetch Changed Files & Diffs via GitHub API
    ↓
Multi-Agent LLM Review Engine
    ↓
Generate Inline Comments & Review Summary
    ↓
POST Review Comments directly to GitHub PR
```

### 🔑 GitHub App Permissions & Configuration

For NeroAI to fetch PR diffs and automatically post reviews with summary and inline code comments back to GitHub, the GitHub App must be configured with:

* **Repository permissions**:
  * `Pull requests`: **Read & write** *(Required: allows creating pull request reviews and inline comments via `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`)*
  * `Contents`: **Read-only** *(allows reading repository code files and diffs)*
  * `Metadata`: **Read-only** *(required by all GitHub Apps)*
* **Subscribe to events**:
  * `Pull request` *(opened, synchronize, reopened, ready_for_review)*
  * `Installation` & `Installation repositories`

---

## 📚 Documentation Shortcuts

* 🔐 [AUTH_SYSTEM_OVERVIEW.md](AUTH_SYSTEM_OVERVIEW.md): Comprehensive Authentication Architecture & Token Specs.
* 🐳 [command.md](command.md): Quick Docker Command Cheat Sheet.