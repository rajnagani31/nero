import time
from celery import chord

from apps.backend.bot.application.core.database import SessionLocal
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.repository.git_repository import (
    CodeReviewRepository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.git_service import (
    CodeReviewService,
    PullRequestAction,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.pr_schema import (
    PullRequestFile,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import ReviewJob
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.model.ai_call_log import AICallLog
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks import (
    aggregate_review,
    review_file,
)


# Set to True to test aggregate_review failure, or False for normal success!
SIMULATE_AGGREGATION_ERROR = False


def run_test():
    # 1. Initialize CodeReviewService and Repository
    repository = CodeReviewRepository(SessionLocal)
    service = CodeReviewService(repository)

    # 2. Build dummy GitHub payload (simulates incoming webhook payload)
    dummy_payload = {
        "action": "opened",
        "number": 42,
        "pull_request": {
            "number": 42,
            "state": "open",
            "title": "Local Dummy Test PR",
            "body": "Testing Celery file review locally",
            "user": {"login": "local_user"},
            "head": {
                "ref": "feature-branch",
                "sha": "dummy_head_sha_123",
                "repo": {
                    "id": 101,
                    "name": "sample_repo",
                    "full_name": "local_dev/sample_repo",
                    "owner": {"login": "local_dev"},
                },
            },
            "base": {
                "ref": "main",
                "sha": "dummy_base_sha_456",
                "repo": {
                    "id": 101,
                    "name": "sample_repo",
                    "full_name": "local_dev/sample_repo",
                    "owner": {"login": "local_dev"},
                },
            },
            "html_url": "https://github.com/local_dev/sample_repo/pull/42",
        },
        "installation": {
            "id": 99999,
            "account": {"id": 1001},
        },
    }

    # Save Repository, PullRequest, and ReviewJob into database via exact system service
    pull_request = service.process_webhook(
        payload=dummy_payload, action=PullRequestAction.OPENED
    )
    if not pull_request:
        raise RuntimeError("Failed to process webhook and create pull request")

    review_job_id = repository.get_latest_queued_review_job_id(pull_request.id)
    if not review_job_id:
        raise RuntimeError("No queued review job found for pull request")

    print(f"[OK] Created ReviewJob ID in DB: {review_job_id}")

    # 3. Define dummy changed files with diff patches
    dummy_files = [
        PullRequestFile(
            filename="apps/backend/auth.py",
            status="modified",
            additions=3,
            deletions=1,
            changes=4,
            patch="@@ -10,3 +10,5 @@\n def login():\n-    pass\n+    # TODO: potential security vulnerability\n+    if password == 'admin123':\n+        return True",
        ),
        PullRequestFile(
            filename="apps/backend/calculator.py",
            status="modified",
            additions=2,
            deletions=0,
            changes=2,
            patch="@@ -1,2 +1,4 @@\n def divide(a, b):\n+    if b == 0:\n+        raise ValueError('Division by zero')\n     return a / b",
        ),
        PullRequestFile(
            filename="docs/architecture.png",
            status="added",
            additions=0,
            deletions=0,
            changes=0,
            patch=None,  # Binary/missing patch file (tests patch skipping)
        ),
    ]

    # Update job state to RUNNING and set total files count
    repository.mark_review_job_running(review_job_id)
    repository.set_review_job_total_files(review_job_id, len(dummy_files))

    # 4. Enqueue Celery chord: parallel review_file tasks -> aggregate_review task
    file_payloads = [file.model_dump(mode="json") for file in dummy_files]
    
    print("\n" + "=" * 50)
    print("--- FILES ENQUEUED FOR CELERY REVIEW ---")
    print("=" * 50)
    for idx, f_data in enumerate(file_payloads, 1):
        print(f"\n[File {idx}/{len(file_payloads)}]")
        print(f"  Filename:  {f_data.get('filename')}")
        print(f"  Status:    {f_data.get('status')}")
        print(f"  Additions: {f_data.get('additions')} | Deletions: {f_data.get('deletions')}")
        print(f"  Patch:")
        patch_str = f_data.get("patch")
        if patch_str:
            for line in patch_str.splitlines():
                print(f"    {line}")
        else:
            print("    [None - Binary or Missing Patch]")
    print("=" * 50 + "\n")

    header = [review_file.s(review_job_id, file_data) for file_data in file_payloads]

    if SIMULATE_AGGREGATION_ERROR:
        print("[TEST MODE] SIMULATE_AGGREGATION_ERROR is True! Injecting invalid file result to force aggregate_review failure...")
        async_result = aggregate_review.delay([{"invalid_key": "force_fail"}], review_job_id)
        print(f"[INFO] Dispatched failing aggregate_review Task ID: {async_result.id}")
    else:
        print(f"[START] Enqueuing {len(file_payloads)} file review tasks to Celery...")
        async_result = chord(header)(aggregate_review.s(review_job_id))
        print(f"[INFO] Celery Chord enqueued! Chord Callback Task ID: {async_result.id}")

    # 5. Poll database for job progress and completion
    print("\n[POLLING] Waiting for local database job progress...")
    session = SessionLocal()
    try:
        current_job = None
        status_str = "QUEUED"
        for step in range(45):
            time.sleep(1)
            session.expire_all()
            current_job = (
                session.query(ReviewJob)
                .filter(ReviewJob.id == review_job_id)
                .first()
            )
            if not current_job:
                print("   Job record not found yet...")
                continue

            status_str = (
                current_job.status.value
                if hasattr(current_job.status, "value")
                else str(current_job.status)
            )
            print(
                f"   [Step {step+1:02d}] Status: {status_str:<10} | Processed: {current_job.processed_files}/{current_job.total_files} files"
            )
            if status_str in ("SUCCEEDED", "FAILED", "succeeded", "failed"):
                break

        print("\n" + "=" * 50)
        print("--- FINAL DB REVIEW JOB RESULT ---")
        print("=" * 50)
        if current_job:
            print(f"Job ID:          {current_job.id}")
            print(f"Status:          {status_str}")
            print(f"Error Code:      {current_job.error_code}")
            print(f"Total Files:     {current_job.total_files}")
            print(f"Processed Files: {current_job.processed_files}")
            print(f"Provider:        {getattr(current_job, 'primary_provider', None)}")
            print(f"Model Name:      {getattr(current_job, 'model_name', None)}")
            print(f"Fallback Used:   {getattr(current_job, 'fallback_used', False)}")
            print(f"Fallback Reason: {getattr(current_job, 'fallback_reason', None)}")
            print(f"Total Tokens:    {getattr(current_job, 'total_tokens', 0)} (Prompt: {getattr(current_job, 'total_prompt_tokens', 0)}, Comp: {getattr(current_job, 'total_completion_tokens', 0)})")
            print(f"Total Latency:   {getattr(current_job, 'total_latency_ms', 0)} ms")
            print(f"Credits Deduct:  {getattr(current_job, 'credits_deducted', 0)}")
            
            final_json = current_job.final_review_json or {}
            print(f"Summary:         {final_json.get('summary')}")
            print(f"Total Findings:  {final_json.get('total_findings')}")
            print(f"Severities:      {final_json.get('findings_by_severity')}")
            
            files_reviewed = final_json.get("files", [])
            if files_reviewed:
                print("\n--- PER-FILE AI REVIEW FINDINGS ---")
                for f_rev in files_reviewed:
                    print(f"\n[FILE] {f_rev.get('filename')} (Skipped: {f_rev.get('skipped')})")
                    print(f"   Summary:  {f_rev.get('summary')}")

                    findings = f_rev.get("findings", [])
                    if findings:
                        print("   Findings:")
                        for finding in findings:
                            print(f"     - [{finding.get('severity', 'info').upper()}] ({finding.get('category')}): {finding.get('title') or finding.get('message')}")
                            if finding.get("recommendation"):
                                print(f"       Recommendation: {finding.get('recommendation')}")
                    else:
                        print("   No findings reported for this file.")

            # Query and display granular call audit logs
            logs = session.query(AICallLog).filter(AICallLog.job_id == current_job.id).all()
            if logs:
                print("\n--- AI CALL AUDIT LOGS (ai_call_logs) ---")
                for l in logs:
                    print(f"  [Call #{l.id}] File: {l.filename} | Provider: {l.provider} ({l.key_alias}) | Model: {l.model_name} | Status: {l.status_code} | Latency: {l.latency_ms}ms | Tokens: {l.prompt_tokens + l.completion_tokens}")
        print("=" * 50)
    finally:
        session.close()


if __name__ == "__main__":
    run_test()
