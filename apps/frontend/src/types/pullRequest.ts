export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type FindingVote = "helpful" | "not_helpful" | null;
export type PRState = "open" | "closed" | "merged";
export type PRReviewStatus =
  | "Not reviewed"
  | "Draft"
  | "Reviewing…"
  | "Merged"
  | "Failed"
  | string;

export interface FindingItem {
  id: number;
  file_path: string;
  line_number?: number | null;
  severity: FindingSeverity;
  title: string;
  description: string;
  suggestion?: string | null;
  vote?: FindingVote;
}

export interface PullRequestSummary {
  id: number;
  pr_number: number;
  repo_id?: number | null;
  repo_name?: string | null;
  title: string;
  description?: string | null;
  author?: string | null;
  state: PRState | string;
  source_branch?: string | null;
  target_branch?: string | null;
  url?: string | null;
  created_at?: string | null;
  time_ago?: string | null;
  impact?: FindingSeverity | null;
  review_status: PRReviewStatus;
  confidence_score?: string | null;
  findings_count: number;
}

export interface PullRequestListResponse {
  total: number;
  page: number;
  limit: number;
  pull_requests: PullRequestSummary[];
}

export interface PullRequestDetail extends PullRequestSummary {
  risk_score?: number | null;
  findings: FindingItem[];
  totals?: {
    total_findings?: number;
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
}

export interface FindingVoteResponse {
  success: boolean;
  finding_id: number;
  vote: "helpful" | "not_helpful";
  message: string;
}

export interface ReReviewResponse {
  status: string;
  pr_id: number;
  review_job_id: number;
  message: string;
}
