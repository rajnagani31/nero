import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle2, TrendingUp } from "lucide-react";
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

  return (
    <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--nero-tx,#ededed)] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Addressed rate</span>
          </h3>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-0.5">
            Percentage of AI review comments acted upon before merge
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold">
          <TrendingUp className="h-3 w-3" />
          <span>{currentRate}% current</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[200px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="addressedRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              domain={[80, 100]}
              unit="%"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] px-3 py-1.5 shadow-lg text-xs font-mono">
                    <div className="text-[var(--nero-mu,#9a9a9a)]">{label}</div>
                    <div className="text-emerald-400 font-semibold">
                      {payload[0].value}% comments addressed
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#addressedRateGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[var(--nero-bd,#262626)] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          Addressed Rate by Repository
        </div>
        <div className="space-y-1.5">
          {safeBreakdown.map((item) => (
            <div
              key={item.repo_name}
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--nero-sf2,#1a1a1a)] transition-colors"
            >
              <span className="font-mono text-[var(--nero-tx,#ededed)] truncate">
                {item.repo_name}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-[var(--nero-sf2,#1a1a1a)] overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-emerald-400 font-medium shrink-0">
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
