import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, Info } from "lucide-react";
import { ChartPoint, ContributorMetricItem } from "@/types/analytics";

interface TopContributorsPanelProps {
  series: ChartPoint[];
  breakdown: ContributorMetricItem[];
}

export const TopContributorsPanel: React.FC<TopContributorsPanelProps> = ({
  series = [],
  breakdown = [],
}) => {
  const safeSeries = Array.isArray(series) ? series : [];
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];

  return (
    <div className="rounded-none border border-[#262626] bg-[#111111] p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#8A8A8A]" />
              <span>Top contributors</span>
              <span
                title="Merged PRs split by PR author."
                className="cursor-help text-[#5A5A5A] hover:text-[#8A8A8A]"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              Merged pull requests by author
            </p>
          </div>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-none border border-[#262626] bg-[#1A1A1A] text-[#EDEDED]">
            {safeBreakdown.length} Authors
          </span>
        </div>

        {/* Chart Canvas */}
        <div className="h-[200px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={safeSeries}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
            >
              <XAxis
                type="number"
                stroke="#5A5A5A"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#262626" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#5A5A5A"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#262626" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-none border border-[#262626] bg-[#111111] px-3 py-1.5 shadow-none text-xs font-mono">
                      <div className="text-[#8A8A8A]">@{label}</div>
                      <div className="text-[#FFFFFF] font-semibold">
                        {payload[0].value} merged PRs
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="#FFFFFF"
                radius={[0, 0, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A]">
          Leaderboard
        </div>
        <div className="space-y-1.5">
          {safeBreakdown.map((item, idx) => (
            <div
              key={item.handle}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-none hover:bg-[#161616] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#8A8A8A] w-3">
                  #{idx + 1}
                </span>
                <div className="w-5 h-5 rounded-none bg-[#262626] text-[#EDEDED] flex items-center justify-center font-mono font-medium text-[10px]">
                  {item.handle.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-[#EDEDED]">
                  {item.name}
                </span>
                <span className="font-mono text-xs text-[#8A8A8A]">
                  @{item.handle}
                </span>
              </div>
              <span className="font-mono text-xs text-[#EDEDED] font-medium">
                {item.merged_prs} PRs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
