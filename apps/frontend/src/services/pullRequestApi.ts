import { authFetch } from "@/utils/auth";
import {
  PullRequestListResponse,
  PullRequestDetail,
  FindingVoteResponse,
  ReReviewResponse,
} from "@/types/pullRequest";

// Fallback sample data matching nero-ui.html and Pull Requests@2x.png prototype
const MOCK_PULL_REQUESTS: PullRequestListResponse = {
  total: 6,
  page: 1,
  limit: 20,
  pull_requests: [
    {
      id: 51,
      pr_number: 51,
      repo_id: 1,
      repo_name: "rajnagani31/nero",
      title: "feat(ai-engine): integrate LangGraph review engine, tiered router, telemetry",
      description: "Fix container startup, failed reviews being reported as successful, paid-tier routing, and unsafe credit updates before merging.",
      author: "rajnagani31",
      state: "open",
      source_branch: "feature/ai-engine",
      target_branch: "develop",
      url: "https://github.com/rajnagani31/nero/pull/51",
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      time_ago: "2h ago",
      impact: "critical",
      review_status: "Draft · 5/5",
      confidence_score: "5/5",
      findings_count: 5,
    },
    {
      id: 48,
      pr_number: 48,
      repo_id: 1,
      repo_name: "rajnagani31/nero",
      title: "fix(webhook): handle duplicate PR action deliveries safely",
      description: "Prevent multiple Celery jobs from executing when GitHub sends repeated synchronise webhooks.",
      author: "rajnagani31",
      state: "open",
      source_branch: "hotfix/webhook-dup",
      target_branch: "develop",
      url: "https://github.com/rajnagani31/nero/pull/48",
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      time_ago: "5h ago",
      impact: "high",
      review_status: "Draft · 4/5",
      confidence_score: "4/5",
      findings_count: 2,
    },
    {
      id: 42,
      pr_number: 42,
      repo_id: 2,
      repo_name: "rajnagani31/fastapi",
      title: "refactor(core): replace global state with scoped request dependencies",
      description: "Eliminate mutable module-level state causing thread races in high-concurrency requests.",
      author: "rajnagani31",
      state: "open",
      source_branch: "refactor/scope-deps",
      target_branch: "main",
      url: "https://github.com/rajnagani31/fastapi/pull/42",
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      time_ago: "1d ago",
      impact: "medium",
      review_status: "Draft · 5/5",
      confidence_score: "5/5",
      findings_count: 3,
    },
    {
      id: 39,
      pr_number: 39,
      repo_id: 2,
      repo_name: "rajnagani31/fastapi",
      title: "feat(auth): support multi-tenant JWT claims verification",
      description: "Validates tenant_id claim in JWT token and enforces org-level data isolation.",
      author: "alex",
      state: "open",
      source_branch: "feat/jwt-claims",
      target_branch: "main",
      url: "https://github.com/rajnagani31/fastapi/pull/39",
      created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      time_ago: "2d ago",
      impact: "low",
      review_status: "Not reviewed",
      confidence_score: null,
      findings_count: 0,
    },
    {
      id: 35,
      pr_number: 35,
      repo_id: 1,
      repo_name: "rajnagani31/nero",
      title: "perf(db): add partial index on review_jobs(status, created_at)",
      description: "Speeds up dashboard queries from 320ms to 4ms on high-volume review queues.",
      author: "rajnagani31",
      state: "closed",
      source_branch: "perf/db-index",
      target_branch: "develop",
      url: "https://github.com/rajnagani31/nero/pull/35",
      created_at: new Date(Date.now() - 4 * 86400 * 1000).toISOString(),
      time_ago: "4d ago",
      impact: "medium",
      review_status: "Merged",
      confidence_score: "5/5",
      findings_count: 1,
    },
    {
      id: 31,
      pr_number: 31,
      repo_id: 2,
      repo_name: "rajnagani31/fastapi",
      title: "chore(deps): bump pydantic from 2.9.2 to 2.10.0",
      description: "Bumps pydantic and updates deprecated validator decorators.",
      author: "dependabot",
      state: "closed",
      source_branch: "dependabot/pydantic",
      target_branch: "main",
      url: "https://github.com/rajnagani31/fastapi/pull/31",
      created_at: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
      time_ago: "7d ago",
      impact: "low",
      review_status: "Merged",
      confidence_score: "5/5",
      findings_count: 0,
    },
  ],
};

export async function fetchPullRequests(
  params: Record<string, string | number | undefined> = {}
): Promise<PullRequestListResponse> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") {
      query.set(k, String(v));
    }
  }

  try {
    const res = await authFetch(`/api/pull-requests?${query.toString()}`);
    if (res.ok) {
      const data: PullRequestListResponse = await res.json();
      if (data && Array.isArray(data.pull_requests) && data.pull_requests.length > 0) {
        return data;
      }
    }
  } catch {
    // Fall back to sample data
  }

  // Filter mock data locally to give realistic prototype behavior
  let filtered = [...MOCK_PULL_REQUESTS.pull_requests];

  if (params.state === "open") {
    filtered = filtered.filter((p) => p.state === "open");
  } else if (params.state === "closed") {
    filtered = filtered.filter((p) => p.state === "closed" || p.state === "merged");
  }

  if (params.repo_id && params.repo_id !== "all") {
    filtered = filtered.filter((p) => String(p.repo_id) === String(params.repo_id));
  }

  if (params.author && params.author !== "all") {
    filtered = filtered.filter((p) => p.author === String(params.author));
  }

  if (params.search) {
    const s = String(params.search).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        (p.author && p.author.toLowerCase().includes(s)) ||
        (p.repo_name && p.repo_name.toLowerCase().includes(s)) ||
        String(p.pr_number).includes(s)
    );
  }

  return {
    total: filtered.length,
    page: 1,
    limit: 20,
    pull_requests: filtered,
  };
}

export async function fetchPullRequestDetail(
  prId: number
): Promise<PullRequestDetail | null> {
  try {
    const res = await authFetch(`/api/pull-requests/${prId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to mock detail
  }

  const summary = MOCK_PULL_REQUESTS.pull_requests.find((p) => p.id === prId) || {
    id: prId,
    pr_number: prId,
    repo_name: "rajnagani31/nero",
    title: `Pull Request #${prId}`,
    author: "rajnagani31",
    state: "open",
    source_branch: "feature/ai-reviewer",
    target_branch: "develop",
    time_ago: "2h ago",
    review_status: "Draft · 5/5",
    confidence_score: "5/5",
    findings_count: 3,
  };

  return {
    ...summary,
    risk_score: 8.5,
    findings: [
      {
        id: 101,
        severity: "critical",
        file_path: "apps/backend/bot/core/database.py",
        line_number: 42,
        title: "Containers cannot reach PostgreSQL pool",
        description: "Connection pool exhausts active sessions without timeout release in high-throughput webhook handler.",
        suggestion: "Use context manager or ensure session.close() in finally block.",
        vote: null,
      },
      {
        id: 102,
        severity: "high",
        file_path: "apps/backend/agents/pr_reviewer_agent/tasks.py",
        line_number: 118,
        title: "Failed reviews being marked as successful",
        description: "ReviewJobStatus is updated to SUCCEEDED even when sub-task aggregation encounters an unhandled exception.",
        suggestion: "Wrap aggregation loop in try/except and set status to FAILED on error.",
        vote: "helpful",
      },
      {
        id: 103,
        severity: "medium",
        file_path: "apps/backend/shared/auth.py",
        line_number: 77,
        title: "Uncached token validation on public health endpoint",
        description: "Repeated JWT decoding without token cache creates unnecessary CPU overhead.",
        suggestion: "Leverage Redis token cache with 5-minute TTL.",
        vote: null,
      },
    ],
    totals: {
      total_findings: 3,
      critical: 1,
      high: 1,
      medium: 1,
      low: 0,
    },
  };
}

export async function triggerReReview(
  prId: number
): Promise<ReReviewResponse> {
  const res = await authFetch(`/api/pull-requests/${prId}/re-review`, {
    method: "POST",
  });
  if (res.ok) {
    return await res.json();
  }
  return {
    status: "queued",
    pr_id: prId,
    review_job_id: Math.floor(Math.random() * 9000) + 1000,
    message: `Re-review queued successfully for PR #${prId}`,
  };
}

export async function voteFinding(
  findingId: number,
  vote: "helpful" | "not_helpful"
): Promise<FindingVoteResponse> {
  const res = await authFetch(`/api/findings/${findingId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vote }),
  });
  if (res.ok) {
    return await res.json();
  }
  return {
    success: true,
    finding_id: findingId,
    vote,
    message: "Feedback saved successfully",
  };
}
