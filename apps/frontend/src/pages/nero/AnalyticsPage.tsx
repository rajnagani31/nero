import React from "react";
import { BarChart2, TrendingUp, ShieldCheck, Zap, Activity } from "lucide-react";

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F1F] border border-[#333333] p-4 rounded-[3px]">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#F2F2F2]">
            Engineering Quality & Velocity Analytics
          </h1>
          <p className="text-xs text-[#9A9A9A] mt-0.5">
            Monitor pull request velocity, code quality signals, and repository risk distribution.
          </p>
        </div>
        <span className="text-xs font-mono text-[#22C993]">● Real-time Metrics</span>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6F6F6F] font-mono">
            <span>PR REVIEW VELOCITY</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#22C993]" />
          </div>
          <div className="text-2xl font-extrabold text-[#F2F2F2]">4.2x</div>
          <p className="text-xs text-[#22C993] font-medium">+28% faster than last month</p>
        </div>

        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6F6F6F] font-mono">
            <span>RISKS CAUGHT</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C993]" />
          </div>
          <div className="text-2xl font-extrabold text-[#F2F2F2]">148</div>
          <p className="text-xs text-[#9A9A9A]">0 breaking API changes leaked</p>
        </div>

        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6F6F6F] font-mono">
            <span>CODEBASE HEALTH</span>
            <Activity className="w-3.5 h-3.5 text-[#22C993]" />
          </div>
          <div className="text-2xl font-extrabold text-[#22C993]">96/100</div>
          <p className="text-xs text-[#9A9A9A]">14 repositories indexed</p>
        </div>

        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6F6F6F] font-mono">
            <span>AI REVIEW SPEED</span>
            <Zap className="w-3.5 h-3.5 text-[#22C993]" />
          </div>
          <div className="text-2xl font-extrabold text-[#F2F2F2]">1.2s</div>
          <p className="text-xs text-[#9A9A9A]">Avg response per PR diff</p>
        </div>
      </div>

      {/* Main Analytics Graphs Section */}
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[#F2F2F2]">
            PR REVIEW AUTOMATION COVERAGE
          </span>
          <span className="text-[11px] font-mono text-[#22C993]">92% Automated</span>
        </div>

        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="space-y-2">
            <div className="flex justify-between text-[#9A9A9A]">
              <span>Automation vs Human Review</span>
              <span className="font-bold text-[#F2F2F2]">92% Automated</span>
            </div>
            <div className="w-full h-2.5 rounded-[1px] bg-[#151515] border border-[#333333] overflow-hidden flex">
              <div className="bg-[#078A62] h-full w-[92%]"></div>
              <div className="bg-[#333333] h-full w-[8%]"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
            <div className="bg-[#151515] p-3.5 rounded-[2px] border border-[#333333] space-y-1">
              <span className="text-xs text-[#6F6F6F]">High Risk Changes</span>
              <div className="text-lg font-bold text-[#D9A441]">4 Flagged</div>
              <p className="text-[11px] text-[#9A9A9A]">Requires HITL confirmation</p>
            </div>

            <div className="bg-[#151515] p-3.5 rounded-[2px] border border-[#333333] space-y-1">
              <span className="text-xs text-[#6F6F6F]">Clean Approvals</span>
              <div className="text-lg font-bold text-[#22C993]">144 Approved</div>
              <p className="text-[11px] text-[#9A9A9A]">Zero critical risks</p>
            </div>

            <div className="bg-[#151515] p-3.5 rounded-[2px] border border-[#333333] space-y-1">
              <span className="text-xs text-[#6F6F6F]">Auto Fixes Applied</span>
              <div className="text-lg font-bold text-[#F2F2F2]">38 Patches</div>
              <p className="text-[11px] text-[#9A9A9A]">Accepted by authors</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
