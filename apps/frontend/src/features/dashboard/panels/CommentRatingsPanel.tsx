import React from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Info } from "lucide-react";
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
    <div className="rounded-none border border-[#262626] bg-[#111111] p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#8A8A8A]" />
              <span>Comment ratings</span>
              <span
                title="Developer feedback ratings on Nero review suggestions"
                className="cursor-help text-[#5A5A5A] hover:text-[#8A8A8A]"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              Developer feedback on AI review suggestions
            </p>
          </div>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-none border border-[#262626] bg-[#1A1A1A] text-[#EDEDED]">
            {satisfactionRate}% Helpful
          </span>
        </div>

        {/* Upvote & Downvote Counter Cards (Monochrome Greptile Style) */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          {/* Upvotes */}
          <div className="rounded-none border border-[#262626] bg-[#161616] p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#EDEDED]">
              <span className="font-medium">Helpful Feedback</span>
              <ThumbsUp className="h-4 w-4 text-[#8A8A8A]" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#FFFFFF]">
              {upvotes}
            </div>
            <div className="text-[11px] text-[#8A8A8A]">
              Marked as accurate findings
            </div>
          </div>

          {/* Downvotes */}
          <div className="rounded-none border border-[#262626] bg-[#161616] p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#EDEDED]">
              <span className="font-medium">Unhelpful / Noise</span>
              <ThumbsDown className="h-4 w-4 text-[#8A8A8A]" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#BDBDBD]">
              {downvotes}
            </div>
            <div className="text-[11px] text-[#8A8A8A]">
              Ignored or false positives
            </div>
          </div>
        </div>
      </div>

      {/* Most Upvoted Suggestions */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A]">
          Most Upvoted Findings
        </div>
        {data.most_upvoted_comments && data.most_upvoted_comments.length > 0 ? (
          <div className="space-y-2">
            {data.most_upvoted_comments.map((comment) => (
              <div
                key={comment.id}
                className="p-2.5 rounded-none border border-[#262626] bg-[#161616] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#EDEDED] truncate">
                    {comment.title}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#EDEDED] shrink-0">
                    <ThumbsUp className="h-3 w-3 text-[#8A8A8A]" />
                    <span>+{comment.upvotes}</span>
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#8A8A8A] truncate">
                  {comment.file_path}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center border border-[#262626] rounded-none text-xs text-[#8A8A8A]">
            No comment ratings yet
          </div>
        )}
      </div>
    </div>
  );
};
