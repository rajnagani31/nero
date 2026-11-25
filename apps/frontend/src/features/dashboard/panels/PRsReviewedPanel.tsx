import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GitPullRequest, FolderGit2, Info } from "lucide-react";
import { ChartPoint, RepoMetricItem } from "@/types/analytics";

interface PRsReviewedPanelProps {
  series: ChartPoint[];
  breakdown: RepoMetricItem[];
}

export const PRsReviewedPanel: React.FC<PRsReviewedPanelProps> = ({
  series = [],
  breakdown = [],
}) => {
  const safeSeries = Array.isArray(series) ? series : [];
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];
  const totalInPeriod = safeSeries.reduce((acc, curr) => acc + (curr?.value || 0), 0);

  return (
    <div className="rounded-none border border-[#262626] bg-[#111111] p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Panel Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-[#8A8A8A]" />
              <span>PRs reviewed by Nero</span>
              <span
                title="Total unique pull requests successfully reviewed in the selected period"
                className="cursor-help text-[#5A5A5A] hover:text-[#8A8A8A]"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              Review throughput and distribution across connected repositories
            </p>
          </div>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-none border border-[#262626] bg-[#1A1A1A] text-[#EDEDED]">
            {totalInPeriod} Total
          </span>
        </div>

        {/* Chart Canvas */}
        <div className="h-[200px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
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
                        {payload[0].value} PRs reviewed
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="#FFFFFF"
                radius={[0, 0, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A]">
          Top Repositories
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
                {item.value} {item.unit || "PRs"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
