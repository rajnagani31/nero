import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, TrendingDown } from "lucide-react";
import { ChartPoint, RepoMetricItem } from "@/types/analytics";

interface MergeTimePanelProps {
  series: ChartPoint[];
  breakdown: RepoMetricItem[];
}

export const MergeTimePanel: React.FC<MergeTimePanelProps> = ({
  series,
  breakdown,
}) => {
  const currentAvg = series.length > 0 ? series[series.length - 1].value : 0;

  return (
    <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--nero-tx,#ededed)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--nero-g,#19e68c)]" />
            <span>Average time to merge</span>
          </h3>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-0.5">
            Days elapsed from PR opened to merged
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold">
          <TrendingDown className="h-3 w-3" />
          <span>-56% velocity</span>
        </div>
      </div>

      {/* Chart Canvas with Gradient Fill */}
      <div className="h-[200px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mergeTimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--nero-g, #19e68c)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--nero-g, #19e68c)" stopOpacity={0.0} />
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
              unit="d"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] px-3 py-1.5 shadow-lg text-xs font-mono">
                    <div className="text-[var(--nero-mu,#9a9a9a)]">{label}</div>
                    <div className="text-[var(--nero-g,#19e68c)] font-semibold">
                      {payload[0].value} days to merge
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--nero-g, #19e68c)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#mergeTimeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[var(--nero-bd,#262626)] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          Merge Time by Repository
        </div>
        <div className="space-y-1.5">
          {breakdown.map((item) => (
            <div
              key={item.repo_name}
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--nero-sf2,#1a1a1a)] transition-colors"
            >
              <span className="font-mono text-[var(--nero-tx,#ededed)] truncate">
                {item.repo_name}
              </span>
              <span className="font-mono text-xs text-[var(--nero-tx,#ededed)] font-medium shrink-0 ml-2">
                {item.value} {item.unit || "d"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
