import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Bug,
  ShieldCheck,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  GlobalScopeToolbar,
  GlobalFilterValues,
} from "@/components/ui/filters/GlobalScopeToolbar";
import { PRsReviewedPanel } from "@/features/dashboard/panels/PRsReviewedPanel";
import { BugsCaughtPanel } from "@/features/dashboard/panels/BugsCaughtPanel";
import { MergeTimePanel } from "@/features/dashboard/panels/MergeTimePanel";
import { TopContributorsPanel } from "@/features/dashboard/panels/TopContributorsPanel";
import { AddressedRatePanel } from "@/features/dashboard/panels/AddressedRatePanel";
import { CommentRatingsPanel } from "@/features/dashboard/panels/CommentRatingsPanel";
import {
  fetchAnalyticsStats,
  fetchAnalyticsCharts,
  exportAnalyticsCsv,
} from "@/services/analyticsApi";
import {
  AnalyticsStats,
  AnalyticsChartsData,
  AnalyticsSubTab,
} from "@/types/analytics";
import { cn } from "@/utils/cn";

export const AnalyticsPage: React.FC = () => {
  // ─── Filter State ───────────────────────────────────────────────────
  const [filters, setFilters] = useState<GlobalFilterValues>({
    team: "all",
    repo: "all",
    author: "all",
    period: "this_month",
  });
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>("pr");

  // ─── Data State ─────────────────────────────────────────────────────
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [charts, setCharts] = useState<AnalyticsChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // ─── Concurrent Data Loading (async-parallel) ───────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = {
        period: filters.period,
        repo_id: filters.repo !== "all" ? filters.repo : undefined,
        author: filters.author !== "all" ? filters.author : undefined,
        tab: activeSubTab,
      };

      const [statsData, chartsData] = await Promise.all([
        fetchAnalyticsStats(queryParams),
        fetchAnalyticsCharts(queryParams),
      ]);

      setStats(statsData);
      setCharts(chartsData);
    } catch {
      toast.error("Failed to load analytics metrics");
    } finally {
      setLoading(false);
    }
  }, [filters, activeSubTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (key: keyof GlobalFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportAnalyticsCsv({
        period: filters.period,
        repo_id: filters.repo !== "all" ? filters.repo : undefined,
        author: filters.author !== "all" ? filters.author : undefined,
      });
      toast.success("Analytics CSV exported successfully");
    } catch {
      toast.error("Failed to export analytics CSV");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ─── Page Title & Filter Toolbar ──────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--nero-bd,#262626)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--nero-tx,#ededed)] flex items-center gap-2.5">
            <span>Analytics</span>
            <span className="text-[var(--nero-mu,#9a9a9a)] font-normal text-base hidden sm:inline">
              — How Nero is reviewing your pull requests
            </span>
          </h1>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-1">
            Review velocity, defect detection rates, and engineering throughput across active repositories.
          </p>
        </div>

        {/* Global Toolbar with Selectors & Export */}
        <GlobalScopeToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </div>

      {/* ─── Sub-Tabs Navigation (PR Reviews vs Bugs Caught) ───────── */}
      <div className="flex items-center gap-2 border-b border-[var(--nero-bd,#262626)] pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab("pr")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer",
            activeSubTab === "pr"
              ? "bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)] shadow-sm border border-[var(--nero-bd,#262626)]"
              : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:bg-[var(--nero-sf,#111111)]"
          )}
        >
          <GitPullRequest className="h-3.5 w-3.5 text-[var(--nero-g,#19e68c)]" />
          <span>PR Reviews</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("bug")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer",
            activeSubTab === "bug"
              ? "bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)] shadow-sm border border-[var(--nero-bd,#262626)]"
              : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:bg-[var(--nero-sf,#111111)]"
          )}
        >
          <Bug className="h-3.5 w-3.5 text-rose-400" />
          <span>Bugs Caught</span>
        </button>
      </div>

      {/* ─── 4 Top KPI Metric Cards ───────────────────────────────── */}
      {loading && !stats ? (
        <KPISkeletonGrid />
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total PRs */}
          <KPICard
            title="Total PRs"
            value={stats.total_prs}
            delta={stats.prs_delta_pct}
            icon={<GitPullRequest className="h-4 w-4 text-[var(--nero-g,#19e68c)]" />}
            subtitle="Pull requests processed in period"
          />

          {/* Card 2: Total Reviews */}
          <KPICard
            title="Total Reviews"
            value={stats.total_reviews}
            delta={stats.reviews_delta_pct}
            icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            subtitle="Autonomous reviews completed"
          />

          {/* Card 3: Avg Merge Time */}
          <KPICard
            title="Avg Merge Time"
            value={stats.avg_merge_time_display}
            delta={stats.merge_time_delta_pct}
            icon={<Clock className="h-4 w-4 text-[var(--nero-g,#19e68c)]" />}
            subtitle="PR open to merge turnaround"
          />

          {/* Card 4: # of Bugs Caught */}
          <KPICard
            title="# of bugs caught"
            value={stats.bugs_caught}
            delta={`in ${stats.bugs_caught_repos_count} repos`}
            icon={<Bug className="h-4 w-4 text-rose-400" />}
            subtitle="Caught before protected branch merge"
          />
        </div>
      ) : null}

      {/* ─── 6 Interactive Chart Panels (2-Column Grid) ──────────── */}
      {loading && !charts ? (
        <ChartSkeletonGrid />
      ) : charts ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel 1: PRs Reviewed */}
          <PRsReviewedPanel
            series={charts.prs_reviewed.series}
            breakdown={charts.prs_reviewed.breakdown}
          />

          {/* Panel 2: Bugs Caught */}
          <BugsCaughtPanel
            series={charts.bugs_caught.series}
            breakdown={charts.bugs_caught.breakdown}
            severityBreakdown={charts.bugs_caught.severity_breakdown}
          />

          {/* Panel 3: Average Time to Merge */}
          <MergeTimePanel
            series={charts.avg_merge_time.series}
            breakdown={charts.avg_merge_time.breakdown}
          />

          {/* Panel 4: Top Contributors */}
          <TopContributorsPanel
            series={charts.top_contributors.series}
            breakdown={charts.top_contributors.breakdown}
          />

          {/* Panel 5: Addressed Rate */}
          <AddressedRatePanel
            series={charts.addressed_rate.series}
            breakdown={charts.addressed_rate.breakdown}
          />

          {/* Panel 6: Comment Ratings */}
          <CommentRatingsPanel data={charts.comment_ratings} />
        </div>
      ) : null}
    </div>
  );
};

// ─── Subcomponent: KPICard (Hoisted) ───────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  delta?: string;
  icon: React.ReactNode;
  subtitle: string;
}

const KPICard: React.FC<KPICardProps> = React.memo(
  ({ title, value, delta, icon, subtitle }) => {
    return (
      <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-4 space-y-2 hover:border-[var(--nero-mu,#9a9a9a)] transition-colors">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          <span>{title}</span>
          <span>{icon}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--nero-tx,#ededed)]">
            {value}
          </div>
          {delta ? (
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-mono font-medium border",
                delta.startsWith("-") || delta.includes("repos")
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
              )}
            >
              {delta}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-[var(--nero-mu,#9a9a9a)] truncate">
          {subtitle}
        </p>
      </div>
    );
  }
);
KPICard.displayName = "KPICard";

// ─── Subcomponent: KPISkeletonGrid (Hoisted) ───────────────────────
const KPISkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-4 space-y-2 animate-pulse"
      >
        <div className="h-3 w-20 rounded bg-white/[0.04]" />
        <div className="h-7 w-28 rounded bg-white/[0.06]" />
        <div className="h-3 w-36 rounded bg-white/[0.03]" />
      </div>
    ))}
  </div>
);

// ─── Subcomponent: ChartSkeletonGrid (Hoisted) ─────────────────────
const ChartSkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4 animate-pulse h-[320px]"
      >
        <div className="h-4 w-44 rounded bg-white/[0.05]" />
        <div className="h-[180px] w-full rounded bg-white/[0.02]" />
        <div className="h-3 w-32 rounded bg-white/[0.04]" />
      </div>
    ))}
  </div>
);
