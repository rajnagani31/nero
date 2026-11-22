import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  useRef,
} from "react";
import {
  GitPullRequest,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/filters/SearchInput";
import { SegmentedFilter, SegmentOption } from "@/components/ui/filters/SegmentedFilter";
import { FilterChip } from "@/components/ui/filters/FilterChip";
import { PRDetailDrawer } from "@/features/dashboard/PRDetailDrawer";
import {
  fetchPullRequests,
  triggerReReview,
} from "@/services/pullRequestApi";
import {
  PullRequestSummary,
  FindingSeverity,
} from "@/types/pullRequest";
import { cn } from "@/utils/cn";

// ─── Status & Impact Helper Configurations ─────────────────────────
const IMPACT_CONFIG: Record<
  FindingSeverity,
  { label: string; badgeClass: string }
> = {
  critical: {
    label: "Critical",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  high: {
    label: "High",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  low: {
    label: "Low",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
};

type StateTab = "open" | "closed";

export const PRReviewsPage: React.FC = () => {
  // ─── State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<StateTab>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  // Filter chips state
  const [filterAuthorYou, setFilterAuthorYou] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [filterHighImpact, setFilterHighImpact] = useState(false);

  // Pagination & Data
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [allPrs, setAllPrs] = useState<PullRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state ($O(1)$ lookup via Set)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Drawer state
  const [inspectPrId, setInspectPrId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keyboard shortcut ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────
  const loadPullRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPullRequests({ page: 1, limit: 100 });
      setAllPrs(res.pull_requests || []);
    } catch {
      toast.error("Failed to load pull requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPullRequests();
  }, [loadPullRequests]);

  // ─── Keyboard Shortcuts (/ for search, Esc to deselect) ─────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an active input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size]);

  // ─── Derived Calculations (rerender-derived-state-no-effect) ────────
  // Live counts for open vs closed
  const counts = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    for (let i = 0; i < allPrs.length; i++) {
      if (allPrs[i].state === "closed" || allPrs[i].state === "merged") {
        closedCount++;
      } else {
        openCount++;
      }
    }
    return { open: openCount, closed: closedCount };
  }, [allPrs]);

  // Unique repositories with open counts
  const repoChips = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < allPrs.length; i++) {
      const pr = allPrs[i];
      if (pr.repo_name && pr.state === "open") {
        map.set(pr.repo_name, (map.get(pr.repo_name) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([repo, count]) => ({
      repo,
      count,
    }));
  }, [allPrs]);

  // Filtered dataset
  const filteredPrs = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return allPrs.filter((pr) => {
      // 1. Tab filter (open vs closed/merged)
      const isClosed = pr.state === "closed" || pr.state === "merged";
      if (activeTab === "open" && isClosed) return false;
      if (activeTab === "closed" && !isClosed) return false;

      // 2. Chip filter: Author is you (rajnagani31 / current user)
      if (filterAuthorYou) {
        const author = (pr.author || "").toLowerCase();
        if (!author.includes("raj") && !author.includes("you")) {
          return false;
        }
      }

      // 3. Chip filter: Repo selection
      if (selectedRepo && pr.repo_name !== selectedRepo) {
        return false;
      }

      // 4. Chip filter: High or critical impact
      if (filterHighImpact) {
        if (pr.impact !== "critical" && pr.impact !== "high") {
          return false;
        }
      }

      // 5. Search query matching
      if (query) {
        const matchTitle = pr.title.toLowerCase().includes(query);
        const matchNumber = String(pr.pr_number).includes(query);
        const matchRepo = (pr.repo_name || "").toLowerCase().includes(query);
        const matchAuthor = (pr.author || "").toLowerCase().includes(query);
        const matchBranch = (pr.source_branch || "").toLowerCase().includes(query);
        if (!matchTitle && !matchNumber && !matchRepo && !matchAuthor && !matchBranch) {
          return false;
        }
      }

      return true;
    });
  }, [
    allPrs,
    activeTab,
    deferredSearch,
    filterAuthorYou,
    selectedRepo,
    filterHighImpact,
  ]);

  // Paginated slice
  const paginatedPrs = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredPrs.slice(start, start + limit);
  }, [filteredPrs, page, limit]);

  const totalPages = Math.max(1, Math.ceil(filteredPrs.length / limit));

  // Selection handlers ($O(1)$ operations with Set)
  const isAllPageSelected = useMemo(() => {
    if (paginatedPrs.length === 0) return false;
    return paginatedPrs.every((pr) => selectedIds.has(pr.id));
  }, [paginatedPrs, selectedIds]);

  const isSomePageSelected = useMemo(() => {
    if (paginatedPrs.length === 0) return false;
    return (
      paginatedPrs.some((pr) => selectedIds.has(pr.id)) && !isAllPageSelected
    );
  }, [paginatedPrs, selectedIds, isAllPageSelected]);

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        for (let i = 0; i < paginatedPrs.length; i++) {
          next.delete(paginatedPrs[i].id);
        }
      } else {
        for (let i = 0; i < paginatedPrs.length; i++) {
          next.add(paginatedPrs[i].id);
        }
      }
      return next;
    });
  };

  const handleToggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Batch Actions ──────────────────────────────────────────────────
  const handleBatchReReview = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBatchActionLoading(true);
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => triggerReReview(id)));
      toast.success(`Queued re-review for ${ids.length} pull request${ids.length > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      await loadPullRequests();
    } catch {
      toast.error("Failed to queue batch re-reviews");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Inspect drawer
  const handleOpenDrawer = (prId: number) => {
    setInspectPrId(prId);
    setDrawerOpen(true);
  };

  // Segment tab options
  const segmentOptions: SegmentOption<StateTab>[] = [
    { value: "open", label: "Open", count: counts.open },
    { value: "closed", label: "Closed", count: counts.closed },
  ];

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterAuthorYou ||
    Boolean(selectedRepo) ||
    filterHighImpact;

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterAuthorYou(false);
    setSelectedRepo(null);
    setFilterHighImpact(false);
    setPage(1);
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* ─── Top Filter & Search Controls Bar ─────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input with / shortcut */}
        <SearchInput
          inputRef={searchInputRef}
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setPage(1);
          }}
          placeholder="Search pull requests by title, #ID, branch or author…"
          className="flex-1"
        />

        {/* Open / Closed Segmented Filter */}
        <SegmentedFilter
          value={activeTab}
          options={segmentOptions}
          onChange={(tab) => {
            setActiveTab(tab);
            setPage(1);
          }}
        />
      </div>

      {/* ─── Suggested Filter Chips Row ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)] mr-1 flex items-center gap-1.5">
          <SlidersHorizontal className="h-3 w-3" />
          <span>Filters:</span>
        </span>

        {/* Chip 1: Author is you */}
        <FilterChip
          label="author is you"
          active={filterAuthorYou}
          onClick={() => {
            setFilterAuthorYou((prev) => !prev);
            setPage(1);
          }}
        />

        {/* Chip 2: Repository specific chips */}
        {repoChips.map(({ repo, count }) => (
          <FilterChip
            key={repo}
            label={`repo is ${repo}`}
            count={count}
            active={selectedRepo === repo}
            onClick={() => {
              setSelectedRepo((prev) => (prev === repo ? null : repo));
              setPage(1);
            }}
          />
        ))}

        {/* Chip 3: High or Critical Impact */}
        <FilterChip
          label="impact is high or critical"
          active={filterHighImpact}
          onClick={() => {
            setFilterHighImpact((prev) => !prev);
            setPage(1);
          }}
        />

        {/* Clear All Filters button */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] underline ml-2 transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* ─── Sticky / Inline Batch Selection Toolbar ──────────────── */}
      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[var(--nero-g,#19e68c)] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{selectedIds.size} selected</span>
            </span>
            <span className="text-[var(--nero-mu,#9a9a9a)] text-[11px] hidden sm:inline">
              (Press <kbd className="font-mono px-1 border rounded text-[10px]">Esc</kbd> to deselect)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchReReview}
              disabled={batchActionLoading}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-xs"
            >
              {batchActionLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Batch Re-review</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="h-8 px-2.5 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] transition-colors cursor-pointer text-xs"
            >
              Deselect
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── High-Density PR Table ─────────────────────────────────── */}
      <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[var(--nero-bd,#262626)]">
              <TableHead className="w-[44px] px-3.5">
                <Checkbox
                  checked={
                    isAllPageSelected
                      ? true
                      : isSomePageSelected
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={handleToggleSelectAll}
                  aria-label="Select all PRs on current page"
                />
              </TableHead>
              <TableHead className="min-w-[420px]">Pull Request</TableHead>
              <TableHead className="w-[180px]">Merge Status</TableHead>
              <TableHead className="w-[150px] text-right pr-4">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : paginatedPrs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-44 text-center">
                  <EmptyPRState
                    hasActiveFilters={hasActiveFilters}
                    onReset={handleClearFilters}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedPrs.map((pr) => (
                <PRTableRow
                  key={pr.id}
                  pr={pr}
                  isSelected={selectedIds.has(pr.id)}
                  onToggleSelect={() => handleToggleRow(pr.id)}
                  onOpenDrawer={() => handleOpenDrawer(pr.id)}
                  onReReviewTriggered={loadPullRequests}
                />
              ))
            )}
          </TableBody>
        </Table>

        {/* ─── Table Pagination Footer ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-xs text-[var(--nero-mu,#9a9a9a)]">
          <div className="font-mono tabular-nums">
            Showing{" "}
            <span className="text-[var(--nero-tx,#ededed)] font-medium">
              {filteredPrs.length === 0 ? 0 : (page - 1) * limit + 1}–
              {Math.min(page * limit, filteredPrs.length)}
            </span>{" "}
            of{" "}
            <span className="text-[var(--nero-tx,#ededed)] font-medium">
              {filteredPrs.length}
            </span>{" "}
            pull requests
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-mono text-xs">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Review Detail Drawer ─────────────────────────────────── */}
      <PRDetailDrawer
        prId={inspectPrId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onReReviewTriggered={loadPullRequests}
      />
    </div>
  );
};

// ─── Subcomponent: PRTableRow (Hoisted to avoid re-renders) ─────────
interface PRTableRowProps {
  pr: PullRequestSummary;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
  onReReviewTriggered?: () => void;
}

const PRTableRow: React.FC<PRTableRowProps> = React.memo(
  ({ pr, isSelected, onToggleSelect, onOpenDrawer, onReReviewTriggered }) => {
    const [reReviewing, setReReviewing] = useState(false);

    const handleQuickReReview = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        setReReviewing(true);
        const res = await triggerReReview(pr.id);
        toast.success(res.message || `Re-review queued for PR #${pr.pr_number}`);
        if (onReReviewTriggered) onReReviewTriggered();
      } catch {
        toast.error("Failed to trigger re-review");
      } finally {
        setReReviewing(false);
      }
    };

    const impact = pr.impact ? IMPACT_CONFIG[pr.impact] : null;

    return (
      <TableRow
        data-state={isSelected ? "selected" : undefined}
        onClick={onOpenDrawer}
        className={cn(
          "cursor-pointer group transition-colors",
          isSelected
            ? "bg-[var(--nero-sf2,#1a1a1a)]"
            : "hover:bg-[var(--nero-sf2,#1a1a1a)]/50"
        )}
      >
        {/* Multi-Select Checkbox */}
        <TableCell
          className="w-[44px] px-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select PR #${pr.pr_number}`}
          />
        </TableCell>

        {/* PR Main Metadata & Description */}
        <TableCell className="py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--nero-mu,#9a9a9a)] group-hover:text-[var(--nero-g,#19e68c)] transition-colors">
                #{pr.pr_number}
              </span>
              <span className="text-sm font-medium text-[var(--nero-tx,#ededed)] group-hover:text-white transition-colors line-clamp-1">
                {pr.title}
              </span>
              {impact ? (
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase shrink-0",
                    impact.badgeClass
                  )}
                >
                  {impact.label}
                </span>
              ) : null}
            </div>

            {/* Sub-line metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nero-mu,#9a9a9a)]">
              <span className="font-mono text-[11px] text-[var(--nero-tx,#ededed)]/80">
                {pr.repo_name || "repository"}
              </span>
              <span>•</span>
              <span className="text-[11px]">@{pr.author || "author"}</span>
              {pr.source_branch ? (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--nero-mu,#9a9a9a)]">
                    <GitBranch className="h-3 w-3" />
                    <span>{pr.source_branch}</span>
                  </span>
                </>
              ) : null}
              <span>•</span>
              <span className="text-[11px]">{pr.time_ago || "recently"}</span>
            </div>
          </div>
        </TableCell>

        {/* Merge Status Pill */}
        <TableCell className="py-3">
          <MergeStatusPill status={pr.review_status} state={pr.state} />
        </TableCell>

        {/* Action Button & Quick Re-Review */}
        <TableCell className="py-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onOpenDrawer}
              className="h-8 px-3 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs font-medium text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-g,#19e68c)] hover:text-[var(--nero-g,#19e68c)] transition-colors cursor-pointer"
            >
              Review
            </button>
            <button
              type="button"
              onClick={handleQuickReReview}
              disabled={reReviewing}
              title="Queue re-review"
              className="h-8 w-8 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
            >
              {reReviewing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  }
);
PRTableRow.displayName = "PRTableRow";

// ─── Subcomponent: MergeStatusPill (Hoisted) ────────────────────────
const MergeStatusPill: React.FC<{ status: string; state: string }> = ({
  status,
  state,
}) => {
  if (state === "merged" || status.toLowerCase().includes("merged")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border bg-purple-500/10 text-purple-400 border-purple-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
        <span>Merged</span>
      </span>
    );
  }

  if (status.includes("Reviewing") || status.includes("In progress")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Reviewing…</span>
      </span>
    );
  }

  if (status.includes("Draft")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span>{status}</span>
      </span>
    );
  }

  if (status.includes("Failed")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        <span>Failed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      <span>{status || "Not reviewed"}</span>
    </span>
  );
};

// ─── Subcomponent: TableSkeleton (Hoisted) ──────────────────────────
const TableSkeleton: React.FC = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <TableRow key={i} className="animate-pulse border-b border-[var(--nero-bd,#262626)]">
        <TableCell className="w-[44px] px-3.5">
          <div className="h-4 w-4 rounded bg-white/[0.04]" />
        </TableCell>
        <TableCell className="py-3">
          <div className="space-y-2">
            <div className="h-4 w-72 rounded bg-white/[0.05]" />
            <div className="h-3 w-44 rounded bg-white/[0.03]" />
          </div>
        </TableCell>
        <TableCell className="py-3">
          <div className="h-6 w-24 rounded bg-white/[0.04]" />
        </TableCell>
        <TableCell className="py-3 text-right pr-4">
          <div className="h-8 w-16 ml-auto rounded bg-white/[0.04]" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

// ─── Subcomponent: EmptyPRState (Hoisted) ───────────────────────────
const EmptyPRState: React.FC<{
  hasActiveFilters: boolean;
  onReset: () => void;
}> = ({ hasActiveFilters, onReset }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-3 text-[var(--nero-mu,#9a9a9a)]">
    <GitPullRequest className="h-8 w-8 text-[var(--nero-mu,#9a9a9a)] opacity-40" />
    <div className="space-y-1">
      <div className="text-sm font-medium text-[var(--nero-tx,#ededed)]">
        No pull requests found
      </div>
      <p className="text-xs text-[var(--nero-mu,#9a9a9a)] max-w-sm">
        {hasActiveFilters
          ? "No pull requests match your active search or filter criteria."
          : "There are currently no active pull requests connected to this workspace."}
      </p>
    </div>
    {hasActiveFilters ? (
      <button
        type="button"
        onClick={onReset}
        className="mt-2 text-xs font-medium text-[var(--nero-g,#19e68c)] hover:underline cursor-pointer"
      >
        Reset all filters
      </button>
    ) : null}
  </div>
);
