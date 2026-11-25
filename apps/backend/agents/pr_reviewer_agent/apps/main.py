from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.routers.github import router as github
from apps.backend.agents.pr_reviewer_agent.apps.pull_requests.router import router as pull_requests
from apps.backend.agents.pr_reviewer_agent.apps.analytics.router import router as analytics

load_dotenv()

app = FastAPI(title="NeroAI Backend Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.ngrok-free\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(github, prefix="/api")
app.include_router(pull_requests, prefix="/api")
app.include_router(analytics, prefix="/api")
