import React from "react";
import { GitPullRequest, CheckCircle2, UserCheck, ShieldAlert, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const PRReviewsPage: React.FC = () => {
  const prs = [
    {
      id: 519,
      title: "Add Async Payment Webhook Handler & Pool Release",
      author: "denis",
      repo: "codebot/apps/backend",
      status: "HITL_APPROVAL_REQUIRED",
      riskLevel: "HIGH",
      summary: "Modifies database connection pool logic in high-throughput webhook handler.",
      suggestedFix: "Approved after verifying defer pool.Release() is present.",
    },
    {
      id: 482,
      title: "Refactor Shared Auth System & JWT Verification",
      author: "raj",
      repo: "codebot/apps/backend",
      status: "APPROVED",
      riskLevel: "LOW",
      summary: "Clean refactoring of auth dependencies without breaking route contracts.",
      suggestedFix: "No changes needed.",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F1F] border border-[#333333] p-4 rounded-[3px]">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#F2F2F2]">
            Pull Request Reviews & HITL Queue
          </h1>
          <p className="text-xs text-[#9A9A9A] mt-0.5">
            Automated PR diff analysis, risk flags, and Human-in-the-Loop approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#22C993]">
          <span className="w-2 h-2 rounded-full bg-[#22C993]"></span> 1 Pending HITL Approval
        </div>
      </div>

      <div className="space-y-4">
        {prs.map((pr) => (
          <div key={pr.id} className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <GitPullRequest className="w-4 h-4 text-[#078A62] shrink-0" />
                <div>
                  <span className="font-bold text-sm text-[#F2F2F2]">
                    PR #{pr.id}: {pr.title}
                  </span>
                  <p className="text-xs text-[#9A9A9A] font-mono">
                    repo: {pr.repo} • author: @{pr.author}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold ${
                  pr.riskLevel === "HIGH"
                    ? "bg-[#D9A441]/10 text-[#D9A441] border border-[#D9A441]/30"
                    : "bg-[#22C993]/10 text-[#22C993] border border-[#22C993]/30"
                }`}
              >
                {pr.status === "HITL_APPROVAL_REQUIRED" ? "HITL APPROVAL NEEDED" : "AI APPROVED"}
              </span>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#9A9A9A] leading-relaxed">{pr.summary}</p>

              {pr.riskLevel === "HIGH" && (
                <div className="bg-[#151515] border border-[#D9A441]/40 p-3 rounded-[2px] text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-[#D9A441] font-mono">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-[#D9A441]" /> NeroAI Concurrency Warning
                  </div>
                  <p className="text-[#9A9A9A] text-[11px]">
                    High load concurrency risk detected in database pool allocation. Ensure connection release deferment is tested.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#333333]">
                <button className="px-3 py-1.5 rounded-[3px] bg-[#151515] border border-[#333333] text-[#F2F2F2] hover:bg-[#242424] transition-colors text-xs font-mono">
                  View Diff
                </button>
                <button className="px-3.5 py-1.5 rounded-[3px] bg-[#078A62] hover:bg-[#0A9B70] text-[#F2F2F2] font-semibold transition-colors text-xs flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Approve & Merge PR
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
