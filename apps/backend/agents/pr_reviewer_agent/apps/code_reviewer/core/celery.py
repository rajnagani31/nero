from dotenv import load_dotenv
load_dotenv()
import os

from celery import Celery


def _redis_url(database: int) -> str:
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        return redis_url.rsplit("/", 1)[0] + f"/{database}"
    return f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/{database}"


celery_app = Celery(
    "codebot",
    broker=os.getenv("CELERY_BROKER_URL", _redis_url(0)),
    backend=os.getenv("CELERY_RESULT_BACKEND", _redis_url(1)),
    include=[
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.review_pull_request_task",
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.review_file_task",
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task",
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.dummy_ai_review_task",
    ],
)

celery_app.conf.update(
    accept_content=["json"],
    result_accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=30,
    task_annotations={
        "*": {
            "autoretry_for": (),
            "retry_backoff": True,
            "retry_backoff_max": 300,
            "retry_jitter": True,
        }
    },
)
