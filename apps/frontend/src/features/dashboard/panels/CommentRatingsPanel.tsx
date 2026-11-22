import React from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, ExternalLink } from "lucide-react";
import { CommentRatingsData } from "@/types/analytics";

interface CommentRatingsPanelProps {
  data: CommentRatingsData;
}

export const CommentRatingsPanel: React.FC<CommentRatingsPanelProps> = ({
  data,
}) => {
  const upvotes = data?.upvotes || 0;
  const downvotes = data?.downvotes || 0;
  const totalVotes = upvotes + downvotes;
  const satisfactionRate =
    totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 100;

  return (
    <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--nero-tx,#ededed)] flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--nero-g,#19e68c)]" />
            <span>Comment ratings</span>
          </h3>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-0.5">
            Developer feedback on AI review suggestions
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          {satisfactionRate}% Helpful
        </span>
      </div>

      {/* Upvote & Downvote Counter Cards */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {/* Upvotes */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-medium">Helpful Feedback</span>
            <ThumbsUp className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {upvotes}
          </div>
          <div className="text-[11px] text-[var(--nero-mu,#9a9a9a)]">
            Marked as accurate findings
          </div>
        </div>

        {/* Downvotes */}
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span className="font-medium">Unhelpful / Noise</span>
            <ThumbsDown className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-400">
            {downvotes}
          </div>
          <div className="text-[11px] text-[var(--nero-mu,#9a9a9a)]">
            Ignored or false positives
          </div>
        </div>
      </div>

      {/* Most Upvoted Suggestions */}
      <div className="pt-3 border-t border-[var(--nero-bd,#262626)] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          Most Upvoted Findings
        </div>
        {data.most_upvoted_comments && data.most_upvoted_comments.length > 0 ? (
          <div className="space-y-2">
            {data.most_upvoted_comments.map((comment) => (
              <div
                key={comment.id}
                className="p-2.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[var(--nero-tx,#ededed)] truncate">
                    {comment.title}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400 shrink-0">
                    <ThumbsUp className="h-3 w-3" />
                    <span>+{comment.upvotes}</span>
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[var(--nero-mu,#9a9a9a)] truncate">
                  {comment.file_path}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center border border-dashed border-[var(--nero-bd,#262626)] rounded text-xs text-[var(--nero-mu,#9a9a9a)]">
            No feedback entries recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
