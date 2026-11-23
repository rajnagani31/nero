import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Clock, FolderGit2, Info } from "lucide-react";
import { ChartPoint, RepoMetricItem } from "@/types/analytics";

interface MergeTimePanelProps {
  series: ChartPoint[];
  breakdown: RepoMetricItem[];
}

export const MergeTimePanel: React.FC<MergeTimePanelProps> = ({
  series = [],
  breakdown = [],
}) => {
  const safeSeries = Array.isArray(series) ? series : [];
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];

  // Calculate period average for reference line
  const periodAvg =
    safeSeries.length > 0
      ? (
          safeSeries.reduce((acc, curr) => acc + (curr?.value || 0), 0) /
          safeSeries.length
        ).toFixed(1)
      : null;

  return (
    <div className="rounded-none border border-[#262626] bg-[#111111] p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#8A8A8A]" />
              <span>Average time to merge</span>
              <span
                title="Time elapsed from PR opened to PR merged for pull requests merged in that bucket"
                className="cursor-help text-[#5A5A5A] hover:text-[#8A8A8A]"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              Days elapsed from PR opened to merged
            </p>
          </div>
          <div className="flex items-center px-1.5 py-0.5 rounded-[2px] border border-[#065F46] bg-[#064E3B] text-[#34D399] font-mono text-xs font-medium">
            <span>-56%</span>
          </div>
        </div>

        {/* Chart Canvas with Monochrome Fill & Reference Line */}
        <div className="h-[200px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mergeTimeGradientMonochrome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                unit="d"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-none border border-[#262626] bg-[#111111] px-3 py-1.5 shadow-none text-xs font-mono">
                      <div className="text-[#8A8A8A]">{label}</div>
                      <div className="text-[#FFFFFF] font-semibold">
                        {payload[0].value} days to merge
                      </div>
                    </div>
                  );
                }}
              />
              {periodAvg ? (
                <ReferenceLine
                  y={parseFloat(periodAvg)}
                  stroke="#5A5A5A"
                  strokeDasharray="3 3"
                  label={{
                    value: "Period average",
                    fill: "#8A8A8A",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#mergeTimeGradientMonochrome)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A]">
          Merge Time by Repository
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
                {item.value} {item.unit || "d"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
