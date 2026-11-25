import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .router.auth.auth_api import router as auth_router
from .router.chat_history.chat_history_api import router as chat_history_router
from .router.bot_api.chat_api import router as chat_router
from .router.v2.chat_api import router as chat_v2_router
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.routers.github import router as github_router
from apps.backend.agents.pr_reviewer_agent.apps.pull_requests.router import router as pull_requests_router
from apps.backend.agents.pr_reviewer_agent.apps.analytics.router import router as analytics_router

app = FastAPI(title="Codebot & NeroAI Unified Gateway")

# CORS Configuration
frontend_base_url = os.getenv("FRONTEND_BASE_URL", "https://nerotechnology.online")
cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://nerotechnology.online",
    "http://nerotechnology.online",
    "https://www.nerotechnology.online",
    "http://www.nerotechnology.online",
]
if frontend_base_url and frontend_base_url not in cors_origins:
    cors_origins.append(frontend_base_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.ngrok-free\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Public health check endpoint for monitoring and uptime probes."""
    return {"status": "ok", "service": "neroai-unified-gateway", "version": "0.1.0"}

app.include_router(auth_router, prefix="/api")
app.include_router(chat_history_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(chat_v2_router, prefix="/api")
app.include_router(github_router, prefix="/api")
app.include_router(pull_requests_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
