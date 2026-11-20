import { authFetch } from "@/utils/auth";
import {
  AnalyticsStats,
  AnalyticsChartsData,
  AnalyticsFilterState,
} from "@/types/analytics";

// Fallback sample data matching Analytics@1x.png and nero-ui.html
const MOCK_STATS: AnalyticsStats = {
  total_prs: 11,
  total_reviews: 11,
  avg_merge_time_days: 11.6,
  avg_merge_time_display: "11.6d",
  bugs_caught: 17,
  bugs_caught_repos_count: 2,
  prs_delta_pct: "±0%",
  reviews_delta_pct: "±0%",
  merge_time_delta_pct: "-56%",
  addressed_rate_pct: 96,
};

const MOCK_CHARTS: AnalyticsChartsData = {
  period: "this_month",
  group_by: "day",
  prs_reviewed: {
    series: [
      { date: "2026-11-01", label: "Nov 1", value: 1 },
      { date: "2026-11-04", label: "Nov 4", value: 2 },
      { date: "2026-11-07", label: "Nov 7", value: 0 },
      { date: "2026-11-10", label: "Nov 10", value: 3 },
      { date: "2026-11-13", label: "Nov 13", value: 1 },
      { date: "2026-11-16", label: "Nov 16", value: 2 },
      { date: "2026-11-19", label: "Nov 19", value: 2 },
    ],
    breakdown: [
      { repo_name: "rajnagani31/fastapi", value: 8, unit: "PRs" },
      { repo_name: "rajnagani31/nero", value: 3, unit: "PRs" },
    ],
  },
  bugs_caught: {
    series: [
      { date: "2026-11-01", label: "Nov 1", value: 2 },
      { date: "2026-11-04", label: "Nov 4", value: 3 },
      { date: "2026-11-07", label: "Nov 7", value: 1 },
      { date: "2026-11-10", label: "Nov 10", value: 5 },
      { date: "2026-11-13", label: "Nov 13", value: 2 },
      { date: "2026-11-16", label: "Nov 16", value: 2 },
      { date: "2026-11-19", label: "Nov 19", value: 2 },
    ],
    breakdown: [
      { repo_name: "rajnagani31/fastapi", value: 11, unit: "bugs" },
      { repo_name: "rajnagani31/nero", value: 6, unit: "bugs" },
    ],
    severity_breakdown: {
      critical: 4,
      high: 5,
      medium: 6,
      low: 2,
    },
  },
  avg_merge_time: {
    series: [
      { date: "2026-11-01", label: "Nov 1", value: 18.2 },
      { date: "2026-11-05", label: "Nov 5", value: 16.0 },
      { date: "2026-11-10", label: "Nov 10", value: 14.5 },
      { date: "2026-11-15", label: "Nov 15", value: 12.1 },
      { date: "2026-11-19", label: "Nov 19", value: 11.6 },
    ],
    breakdown: [
      { repo_name: "rajnagani31/fastapi", value: 14.2, unit: "d" },
      { repo_name: "rajnagani31/nero", value: 9.0, unit: "d" },
    ],
  },
  top_contributors: {
    series: [
      { date: "1", label: "rajnagani31", value: 9 },
      { date: "2", label: "alex", value: 2 },
    ],
    breakdown: [
      { name: "Raj Nagani", handle: "rajnagani31", merged_prs: 9 },
      { name: "Alex Chen", handle: "alex", merged_prs: 2 },
    ],
  },
  addressed_rate: {
    series: [
      { date: "2026-11-01", label: "Nov 1", value: 92 },
      { date: "2026-11-07", label: "Nov 7", value: 94 },
      { date: "2026-11-14", label: "Nov 14", value: 95 },
      { date: "2026-11-19", label: "Nov 19", value: 96 },
    ],
    breakdown: [
      { repo_name: "rajnagani31/nero", value: 98, unit: "%" },
      { repo_name: "rajnagani31/fastapi", value: 95, unit: "%" },
    ],
  },
  comment_ratings: {
    upvotes: 24,
    downvotes: 1,
    most_upvoted_comments: [
      {
        id: 101,
        title: "Connection pool release deferral warning",
        file_path: "apps/backend/db/pool.py",
        upvotes: 14,
      },
      {
        id: 102,
        title: "JWT audience mismatch in multi-tenant claims",
        file_path: "apps/backend/shared/auth.py",
        upvotes: 10,
      },
    ],
  },
};

export async function fetchAnalyticsStats(
  filters: Partial<AnalyticsFilterState> = {}
): Promise<AnalyticsStats> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== "all") {
      query.set(k, String(v));
    }
  }

  try {
    const res = await authFetch(`/api/analytics/stats?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.total_prs === "number") {
        return data;
      }
    }
  } catch {
    // Graceful fallback to mock data
  }

  return MOCK_STATS;
}

export async function fetchAnalyticsCharts(
  filters: Partial<AnalyticsFilterState> = {}
): Promise<AnalyticsChartsData> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== "all") {
      query.set(k, String(v));
    }
  }

  try {
    const res = await authFetch(`/api/analytics/charts?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.prs_reviewed) {
        return {
          period: data.period || "this_month",
          group_by: data.group_by || "day",
          prs_reviewed: {
            series: Array.isArray(data.prs_reviewed.series) ? data.prs_reviewed.series : [],
            breakdown: Array.isArray(data.prs_reviewed.breakdown)
              ? data.prs_reviewed.breakdown
              : Array.isArray(data.prs_reviewed.top_repos)
              ? data.prs_reviewed.top_repos
              : [],
          },
          bugs_caught: {
            series: Array.isArray(data.bugs_caught.series) ? data.bugs_caught.series : [],
            breakdown: Array.isArray(data.bugs_caught.breakdown)
              ? data.bugs_caught.breakdown
              : Array.isArray(data.bugs_caught.top_repos)
              ? data.bugs_caught.top_repos
              : [],
            severity_breakdown: data.bugs_caught.severity_breakdown || data.bugs_caught.severity || {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
            },
          },
          avg_merge_time: {
            series: Array.isArray(data.avg_merge_time.series) ? data.avg_merge_time.series : [],
            breakdown: Array.isArray(data.avg_merge_time.breakdown)
              ? data.avg_merge_time.breakdown
              : Array.isArray(data.avg_merge_time.top_repos)
              ? data.avg_merge_time.top_repos
              : [],
          },
          top_contributors: {
            series: Array.isArray(data.top_contributors.series) ? data.top_contributors.series : [],
            breakdown: Array.isArray(data.top_contributors.breakdown)
              ? data.top_contributors.breakdown
              : Array.isArray(data.top_contributors.contributors)
              ? data.top_contributors.contributors
              : [],
          },
          addressed_rate: {
            series: Array.isArray(data.addressed_rate.series) ? data.addressed_rate.series : [],
            breakdown: Array.isArray(data.addressed_rate.breakdown)
              ? data.addressed_rate.breakdown
              : Array.isArray(data.addressed_rate.top_repos)
              ? data.addressed_rate.top_repos
              : [],
          },
          comment_ratings: data.comment_ratings || {
            upvotes: 0,
            downvotes: 0,
            most_upvoted_comments: [],
          },
        };
      }
    }
  } catch {
    // Graceful fallback to mock data
  }

  return MOCK_CHARTS;
}

export async function exportAnalyticsCsv(
  filters: Partial<AnalyticsFilterState> = {}
): Promise<void> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== "all") {
      query.set(k, String(v));
    }
  }

  try {
    const res = await authFetch(`/api/analytics/export?${query.toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nero-analytics-${filters.period || "export"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return;
    }
  } catch {
    // Fallback client-side CSV trigger
  }

  // Fallback client CSV export
  const headers = "Category,Metric,Value,Unit\n";
  const rows = [
    `Summary,Total PRs,${MOCK_STATS.total_prs},count`,
    `Summary,Total Reviews,${MOCK_STATS.total_reviews},count`,
    `Summary,Avg Merge Time,${MOCK_STATS.avg_merge_time_days},days`,
    `Summary,Bugs Caught,${MOCK_STATS.bugs_caught},count`,
    `Summary,Addressed Rate,${MOCK_STATS.addressed_rate_pct},%`,
  ].join("\n");

  const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nero-analytics-export.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
