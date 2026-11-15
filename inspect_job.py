import argparse
import json
import sys
from datetime import datetime
from decimal import Decimal

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from apps.backend.bot.application.core.database import SessionLocal
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import ReviewJob
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_file_result import ReviewFileResult
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.pull_request import PullRequest
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.repository import Repository
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.model.ai_call_log import AICallLog


def default_serializer(obj):
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)


def inspect_job(job_id: int):
    session = SessionLocal()
    try:
        job = session.query(ReviewJob).filter(ReviewJob.id == job_id).first()
        if not job:
            print(f"\n[ERROR] ReviewJob with ID={job_id} does not exist in the database.")
            return

        pr = session.query(PullRequest).filter(PullRequest.id == job.pr_id).first() if job.pr_id else None
        repo = session.query(Repository).filter(Repository.id == pr.repo_id).first() if pr and pr.repo_id else None
        files = session.query(ReviewFileResult).filter(ReviewFileResult.job_id == job_id).order_by(ReviewFileResult.id.asc()).all()
        logs = session.query(AICallLog).filter(AICallLog.job_id == job_id).order_by(AICallLog.id.asc()).all()

        print("=" * 80)
        print(f"                       REVIEW JOB INSPECTION: JOB ID = {job_id}")
        print("=" * 80)

        # 1. Pull Request & Repository Info
        print("\n--- 1. CONTEXT / REPOSITORY & PR ---")
        if repo:
            print(f"  Repository:        {repo.full_name or repo.name} (ID: {repo.id})")
        if pr:
            print(f"  Pull Request:      PR #{pr.pr_number} - \"{pr.title}\" (ID: {pr.id})")
            print(f"  Author:            {pr.author}")
            print(f"  Branches:          {pr.source_branch} -> {pr.target_branch}")
            print(f"  PR State / Action: {pr.state} / {pr.pr_action}")
            print(f"  Head Commit SHA:   {pr.commit_sha}")
        else:
            print(f"  PR ID:             {job.pr_id} (Not found in pull_requests table)")

        # 2. Review Job Lifecycle & Status
        print("\n--- 2. REVIEW JOB DETAILS ---")
        print(f"  Status:            {job.status.value if hasattr(job.status, 'value') else job.status}")
        print(f"  Total Files:       {job.total_files}")
        print(f"  Processed Files:   {job.processed_files}")
        print(f"  Error Code:        {job.error_code}")
        print(f"  Base SHA:          {job.base_sha}")
        print(f"  Head SHA:          {job.head_sha}")
        print(f"  Queued At:         {job.queued_at}")
        print(f"  Started At:        {job.started_at}")
        print(f"  Finished At:       {job.finished_at}")

        # 3. GitHub Delivery Status
        print("\n--- 3. GITHUB DELIVERY STATUS ---")
        print(f"  Review Status:     {job.review_status}")
        print(f"  GitHub Review ID:  {job.github_review_id}")
        print(f"  Reviewed Commit:   {job.reviewed_commit_sha}")
        print(f"  Delivery Error:    {job.delivery_error}")

        # 4. AI Telemetry & Usage
        print("\n--- 4. AI TELEMETRY ROLLUP ---")
        print(f"  User Tier:         {getattr(job, 'user_tier', None)}")
        print(f"  Primary Provider:  {getattr(job, 'primary_provider', None)}")
        print(f"  Model Name:        {getattr(job, 'model_name', None)}")
        print(f"  Fallback Used:     {getattr(job, 'fallback_used', False)}")
        print(f"  Fallback Reason:   {getattr(job, 'fallback_reason', None)}")
        print(f"  Prompt Tokens:     {getattr(job, 'total_prompt_tokens', 0)}")
        print(f"  Completion Tokens: {getattr(job, 'total_completion_tokens', 0)}")
        print(f"  Total Tokens:      {getattr(job, 'total_tokens', 0)}")
        print(f"  Total Latency:     {getattr(job, 'total_latency_ms', 0)} ms")
        print(f"  Credits Deducted:  {getattr(job, 'credits_deducted', 0)}")

        # 5. File Review Results
        print(f"\n--- 5. REVIEW FILE RESULTS ({len(files)} records found in DB) ---")
        if not files:
            print("  [NONE] No file records found in review_file_results for this job ID.")
        else:
            for idx, f in enumerate(files, 1):
                print(f"\n  [File #{idx}] ID={f.id} | Filename: {f.filename}")
                print(f"    Status:          {f.status}")
                print(f"    Provider / Model:{f.provider_used} / {f.model_used}")
                print(f"    Tokens:          Prompt: {f.prompt_tokens} | Completion: {f.completion_tokens} | Latency: {f.latency_ms}ms")
                print(f"    Summary:         {f.summary}")
                print(f"    Findings Count:  {len(f.findings_json) if isinstance(f.findings_json, list) else 0}")
                if f.metadata_json:
                    print(f"    Metadata:        {json.dumps(f.metadata_json, default=default_serializer, ensure_ascii=True, indent=6)}")
                if f.findings_json:
                    print("    Findings:")
                    for finding in f.findings_json:
                        if isinstance(finding, dict):
                            print(f"      * [{finding.get('severity', 'info').upper()}] Line {finding.get('line')}: {finding.get('title') or finding.get('message')}")
                            if finding.get('recommendation'):
                                print(f"        -> {finding.get('recommendation')}")

        # 6. Granular AI Call Logs
        print(f"\n--- 6. GRANULAR AI CALL LOGS (ai_call_logs: {len(logs)} attempts recorded) ---")
        if not logs:
            print("  [NONE] No granular AI call logs found in ai_call_logs for this job ID.")
        else:
            for l in logs:
                print(f"  [Attempt #{l.attempt_number}] ID={l.id} | File: {l.filename}")
                print(f"    Provider:        {l.provider} (key alias: {l.key_alias})")
                print(f"    Model:           {l.model_name}")
                print(f"    Status Code:     {l.status_code}")
                print(f"    Tokens:          Prompt: {l.prompt_tokens} | Completion: {l.completion_tokens}")
                print(f"    Latency:         {l.latency_ms} ms")
                print(f"    Error Message:   {l.error_message or 'None'}")
                print(f"    Created At:      {l.created_at}")

        # 7. Final Review JSON
        print("\n--- 7. FINAL REVIEW JSON STORED IN DB ---")
        if job.final_review_json:
            print(json.dumps(job.final_review_json, default=default_serializer, ensure_ascii=True, indent=2))
        else:
            print("  [NONE] final_review_json is null.")

        print("=" * 80 + "\n")

    finally:
        session.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect a ReviewJob and all associated files/logs by ID.")
    parser.add_argument("job_id", type=int, nargs="?", default=57, help="ReviewJob ID to inspect (e.g. 57)")
    args = parser.parse_args()

    inspect_job(args.job_id)
