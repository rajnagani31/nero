import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Bug, FolderGit2, Info } from "lucide-react";
import { ChartPoint, RepoMetricItem, SeverityBreakdown } from "@/types/analytics";
import { cn } from "@/utils/cn";

interface BugsCaughtPanelProps {
  series: ChartPoint[];
  breakdown: RepoMetricItem[];
  severityBreakdown?: SeverityBreakdown;
}

export const BugsCaughtPanel: React.FC<BugsCaughtPanelProps> = ({
  series = [],
  breakdown = [],
  severityBreakdown = { critical: 4, high: 5, medium: 6, low: 2 },
}) => {
  const safeSeries = Array.isArray(series) ? series : [];
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];
  const [viewMode, setViewMode] = useState<"trend" | "severity">("trend");

  // 100% Monochrome tints: Critical (white) -> Low (darker gray)
  const severityData = [
    { label: "Critical", value: severityBreakdown.critical, fill: "#FFFFFF" },
    { label: "High", value: severityBreakdown.high, fill: "#BDBDBD" },
    { label: "Medium", value: severityBreakdown.medium, fill: "#8A8A8A" },
    { label: "Low", value: severityBreakdown.low, fill: "#5A5A5A" },
  ];

  return (
    <div className="rounded-none border border-[#262626] bg-[#111111] p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Header with Sub-Toggle */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <Bug className="h-4 w-4 text-[#8A8A8A]" />
              <span>Bugs caught</span>
              <span
                title="Number of bugs and vulnerabilities caught by Nero filtered by severity"
                className="cursor-help text-[#5A5A5A] hover:text-[#8A8A8A]"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              Defects and security vulnerabilities caught before merge
            </p>
          </div>

          {/* View mode toggle */}
          <div className="inline-flex items-center p-0.5 rounded-none border border-[#2E2E2E] bg-[#1A1A1A]">
            <button
              type="button"
              onClick={() => setViewMode("trend")}
              className={cn(
                "px-2.5 py-0.5 rounded-none text-[11px] font-mono transition-colors cursor-pointer",
                viewMode === "trend"
                  ? "bg-[#262626] text-[#FFFFFF] font-medium"
                  : "text-[#8A8A8A] hover:text-[#EDEDED]"
              )}
            >
              Trend
            </button>
            <button
              type="button"
              onClick={() => setViewMode("severity")}
              className={cn(
                "px-2.5 py-0.5 rounded-none text-[11px] font-mono transition-colors cursor-pointer",
                viewMode === "severity"
                  ? "bg-[#262626] text-[#FFFFFF] font-medium"
                  : "text-[#8A8A8A] hover:text-[#EDEDED]"
              )}
            >
              Severity
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[200px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "trend" ? (
              <BarChart data={safeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#5A5A5A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#262626" }}
                />
                <YAxis
                  stroke="#5A5A5A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#262626" }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-none border border-[#262626] bg-[#111111] px-3 py-1.5 shadow-none text-xs font-mono">
                        <div className="text-[#8A8A8A]">{label}</div>
                        <div className="text-[#FFFFFF] font-semibold">
                          {payload[0].value} bugs caught
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" fill="#FFFFFF" radius={[0, 0, 0, 0]} maxBarSize={32} />
              </BarChart>
            ) : (
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#5A5A5A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#262626" }}
                />
                <YAxis
                  stroke="#5A5A5A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#262626" }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-none border border-[#262626] bg-[#111111] px-3 py-1.5 shadow-none text-xs font-mono">
                        <div className="text-[#8A8A8A]">{label}</div>
                        <div className="font-semibold text-[#FFFFFF]">
                          {payload[0].value} findings
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 0, 0, 0]} maxBarSize={36}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A]">
          Repos with Most Bugs
        </div>
        <div className="space-y-1.5">
          {safeBreakdown.map((item) => (
            <div
              key={item.repo_name}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-none hover:bg-[#161616] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderGit2 className="h-3.5 w-3.5 text-[#8A8A8A] shrink-0" />
                <span className="font-mono text-[#EDEDED] truncate">
                  {item.repo_name}
                </span>
              </div>
              <span className="font-mono text-xs text-[#EDEDED] font-medium shrink-0 ml-2">
                {item.value} {item.unit || "bugs"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
