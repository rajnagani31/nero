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
import { CheckCircle2, FolderGit2, Info } from "lucide-react";
import { ChartPoint, RepoMetricItem } from "@/types/analytics";

interface AddressedRatePanelProps {
  series: ChartPoint[];
  breakdown: RepoMetricItem[];
}

export const AddressedRatePanel: React.FC<AddressedRatePanelProps> = ({
  series = [],
  breakdown = [],
}) => {
  const safeSeries = Array.isArray(series) ? series : [];
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];
  const currentRate = safeSeries.length > 0 ? safeSeries[safeSeries.length - 1]?.value || 96 : 96;

  // Calculate period average
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
              <CheckCircle2 className="h-4 w-4 text-[#8A8A8A]" />
              <span>Addressed rate</span>
              <span
                title="The percentage of Nero comments that developers acted on (code modified or marked fixed/resolved)"
                className="cursor-help text-[#5A5A5A] hover:text-[#8A8A8A]"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              Percentage of AI review comments acted upon before merge
            </p>
          </div>
          <div className="flex items-center px-1.5 py-0.5 rounded-[2px] border border-[#065F46] bg-[#064E3B] text-[#34D399] font-mono text-xs font-medium">
            <span>+67 pts</span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[200px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="addressedRateMonochrome" x1="0" y1="0" x2="0" y2="1">
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
                domain={[80, 100]}
                unit="%"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-none border border-[#262626] bg-[#111111] px-3 py-1.5 shadow-none text-xs font-mono">
                      <div className="text-[#8A8A8A]">{label}</div>
                      <div className="text-[#FFFFFF] font-semibold">
                        {payload[0].value}% comments addressed
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
                fill="url(#addressedRateMonochrome)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A]">
          Addressed Rate by Repository
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
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-none bg-[#262626] overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-[#FFFFFF] rounded-none"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-[#EDEDED] font-medium shrink-0">
                  {item.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
