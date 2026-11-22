export type PeriodOption = "this_month" | "last_7_days" | "last_month";
export type AnalyticsSubTab = "pr" | "bug";

export interface AnalyticsStats {
  total_prs: number;
  total_reviews: number;
  avg_merge_time_days: number;
  avg_merge_time_display: string;
  bugs_caught: number;
  bugs_caught_repos_count: number;
  prs_delta_pct: string;
  reviews_delta_pct: string;
  merge_time_delta_pct: string;
  addressed_rate_pct: number;
}

export interface ChartPoint {
  date: string;
  label: string;
  value: number;
  [key: string]: any;
}

export interface RepoMetricItem {
  repo_name: string;
  value: number;
  unit?: string;
}

export interface ContributorMetricItem {
  name: string;
  handle: string;
  merged_prs: number;
}

export interface SeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CommentRatingsData {
  upvotes: number;
  downvotes: number;
  most_upvoted_comments?: Array<{
    id: number;
    title: string;
    file_path: string;
    upvotes: number;
  }>;
}

export interface AnalyticsChartsData {
  period: string;
  group_by: string;
  prs_reviewed: {
    series: ChartPoint[];
    breakdown: RepoMetricItem[];
  };
  bugs_caught: {
    series: ChartPoint[];
    breakdown: RepoMetricItem[];
    severity_breakdown?: SeverityBreakdown;
  };
  avg_merge_time: {
    series: ChartPoint[];
    breakdown: RepoMetricItem[];
  };
  top_contributors: {
    series: ChartPoint[];
    breakdown: ContributorMetricItem[];
  };
  addressed_rate: {
    series: ChartPoint[];
    breakdown: RepoMetricItem[];
  };
  comment_ratings: CommentRatingsData;
}

export interface AnalyticsFilterState {
  period: PeriodOption | string;
  repo_id?: string;
  author?: string;
  tab?: AnalyticsSubTab;
}
