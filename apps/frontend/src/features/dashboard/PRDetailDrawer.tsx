import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  GitBranch,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/Badge";
import {
  PullRequestDetail,
  FindingItem,
  FindingSeverity,
} from "@/types/pullRequest";
import {
  fetchPullRequestDetail,
  triggerReReview,
  voteFinding,
} from "@/services/pullRequestApi";
import { cn } from "@/utils/cn";

interface PRDetailDrawerProps {
  prId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReReviewTriggered?: (prId: number) => void;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; badgeClass: string; borderClass: string }
> = {
  critical: {
    label: "CRITICAL",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    borderClass: "border-l-rose-500",
  },
  high: {
    label: "HIGH",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    borderClass: "border-l-amber-500",
  },
  medium: {
    label: "MEDIUM",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    borderClass: "border-l-emerald-500",
  },
  low: {
    label: "LOW",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    borderClass: "border-l-zinc-500",
  },
};

export const PRDetailDrawer: React.FC<PRDetailDrawerProps> = ({
  prId,
  open,
  onOpenChange,
  onReReviewTriggered,
}) => {
  const [detail, setDetail] = useState<PullRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reReviewing, setReReviewing] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!prId || !open) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchPullRequestDetail(prId)
      .then((data) => {
        if (isMounted && data) {
          setDetail(data);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [prId, open]);

  const handleVote = async (findingId: number, vote: "helpful" | "not_helpful") => {
    if (!detail) return;

    // Optimistic update
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        findings: prev.findings.map((f) =>
          f.id === findingId
            ? { ...f, vote: f.vote === vote ? null : vote }
            : f
        ),
      };
    });

    try {
      await voteFinding(findingId, vote);
      toast.success(
        vote === "helpful" ? "Marked as helpful feedback" : "Marked as not helpful"
      );
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const handleReReview = async () => {
    if (!detail) return;
    try {
      setReReviewing(true);
      const res = await triggerReReview(detail.id);
      toast.success(res.message || "Re-review job queued successfully");
      if (onReReviewTriggered) {
        onReReviewTriggered(detail.id);
      }
    } catch {
      toast.error("Failed to queue re-review");
    } finally {
      setReReviewing(false);
    }
  };

  const handleCopy = (path: string, line?: number | null) => {
    const text = line ? `${path}:${line}` : path;
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] p-0 flex flex-col bg-[#0e0e10] border-l border-white/[0.08] text-zinc-100"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--nero-g,#19e68c)]" />
            <span className="text-xs font-mono">Loading review analysis…</span>
          </div>
        ) : detail ? (
          <>
            {/* ─── Drawer Header ────────────────────────────────────── */}
            <SheetHeader className="p-6 border-b border-white/[0.08] space-y-3 bg-[#111113]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-400">
                  PR #{detail.pr_number} • {detail.repo_name || "Repository"}
                </span>
                {detail.confidence_score ? (
                  <Badge
                    variant="success"
                    className="font-mono text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    Confidence {detail.confidence_score}
                  </Badge>
                ) : null}
              </div>

              <SheetTitle className="text-base font-semibold leading-snug text-zinc-100 text-left">
                {detail.title}
              </SheetTitle>

              {/* Branch Routing & Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] font-mono text-[11px]">
                  <GitBranch className="h-3 w-3 text-zinc-400" />
                  <span>{detail.target_branch || "main"}</span>
                  <span className="text-zinc-600">←</span>
                  <span className="text-zinc-300">{detail.source_branch || "feature"}</span>
                </div>
                <span>@{detail.author || "author"}</span>
                <span>•</span>
                <span>{detail.time_ago || "recently"}</span>
              </div>
            </SheetHeader>

            {/* ─── Drawer Body (Scrollable Findings) ───────────────── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Risk Alert Banner */}
              {detail.risk_score && detail.risk_score >= 7.0 ? (
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-200">
                      High Risk Detected ({detail.risk_score}/10)
                    </div>
                    <p className="mt-1 text-zinc-300 leading-relaxed">
                      Resolve critical bugs and potential connection issues before merging to protected branches.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Findings Section Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {detail.findings.length} Review Finding{detail.findings.length === 1 ? "" : "s"}
                </span>
                {detail.totals ? (
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    {detail.totals.critical ? (
                      <span className="text-rose-400">{detail.totals.critical} critical</span>
                    ) : null}
                    {detail.totals.high ? (
                      <span className="text-amber-400">{detail.totals.high} high</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Findings Cards List */}
              {detail.findings.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/[0.08] rounded-xl text-zinc-500 text-xs">
                  No issues or vulnerabilities detected for this pull request.
                </div>
              ) : (
                detail.findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    copiedPath={copiedPath}
                    onCopy={handleCopy}
                    onVote={handleVote}
                  />
                ))
              )}
            </div>

            {/* ─── Drawer Footer ────────────────────────────────────── */}
            <div className="p-4 border-t border-white/[0.08] bg-[#111113] flex items-center justify-between gap-3 shrink-0">
              {detail.url ? (
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={handleReReview}
                disabled={reReviewing}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {reReviewing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Re-review PR</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-zinc-500 text-xs">
            Pull request details could not be found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ─── Subcomponent: FindingCard (Hoisted out of parent to avoid re-renders) ───
interface FindingCardProps {
  finding: FindingItem;
  copiedPath: string | null;
  onCopy: (path: string, line?: number | null) => void;
  onVote: (findingId: number, vote: "helpful" | "not_helpful") => void;
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  copiedPath,
  onCopy,
  onVote,
}) => {
  const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
  const pathStr = finding.line_number
    ? `${finding.file_path}:${finding.line_number}`
    : finding.file_path;
  const isCopied = copiedPath === pathStr;

  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.08] bg-[#141416] p-4 space-y-3 transition-colors hover:border-white/[0.14] border-l-4",
        config.borderClass
      )}
    >
      {/* Finding Header */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase",
            config.badgeClass
          )}
        >
          {config.label}
        </span>

        {/* Copyable File Path */}
        <button
          type="button"
          onClick={() => onCopy(finding.file_path, finding.line_number)}
          title="Copy file path"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-white/[0.04]"
        >
          <span className="truncate max-w-[260px]">{pathStr}</span>
          {isCopied ? (
            <Check className="h-3 w-3 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="h-3 w-3 text-zinc-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Finding Title & Description */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-200">{finding.title}</h4>
        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
          {finding.description}
        </p>
      </div>

      {/* Suggestion Codeblock */}
      {finding.suggestion ? (
        <div className="rounded border border-white/[0.06] bg-[#09090b] p-3 font-mono text-xs text-emerald-300/90 overflow-x-auto">
          <span className="text-[10px] uppercase text-zinc-500 block mb-1">
            Suggested Fix:
          </span>
          <code>{finding.suggestion}</code>
        </div>
      ) : null}

      {/* Feedback Voting Actions */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <span className="text-[11px] text-zinc-500">Was this finding accurate?</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onVote(finding.id, "helpful")}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
              finding.vote === "helpful"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-white/[0.02] text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:border-white/[0.16]"
            )}
          >
            <ThumbsUp className="h-3 w-3" />
            <span>Helpful</span>
          </button>
          <button
            type="button"
            onClick={() => onVote(finding.id, "not_helpful")}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
              finding.vote === "not_helpful"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-white/[0.02] text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:border-white/[0.16]"
            )}
          >
            <ThumbsDown className="h-3 w-3" />
            <span>Not helpful</span>
          </button>
        </div>
      </div>
    </div>
  );
};
