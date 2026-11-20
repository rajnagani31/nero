import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, User } from "lucide-react";
import { ChartPoint, ContributorMetricItem } from "@/types/analytics";

interface TopContributorsPanelProps {
  series: ChartPoint[];
  breakdown: ContributorMetricItem[];
}

export const TopContributorsPanel: React.FC<TopContributorsPanelProps> = ({
  series,
  breakdown,
}) => {
  return (
    <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--nero-tx,#ededed)] flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--nero-g,#19e68c)]" />
            <span>Top contributors</span>
          </h3>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-0.5">
            Merged pull requests by author
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)]">
          {breakdown.length} Authors
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="h-[200px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          >
            <XAxis
              type="number"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] px-3 py-1.5 shadow-lg text-xs font-mono">
                    <div className="text-[var(--nero-mu,#9a9a9a)]">@{label}</div>
                    <div className="text-[var(--nero-g,#19e68c)] font-semibold">
                      {payload[0].value} merged PRs
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill="var(--nero-g, #19e68c)"
              radius={[0, 3, 3, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leaderboard List */}
      <div className="pt-3 border-t border-[var(--nero-bd,#262626)] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          Leaderboard
        </div>
        <div className="space-y-1.5">
          {breakdown.map((item, idx) => (
            <div
              key={item.handle}
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--nero-sf2,#1a1a1a)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--nero-mu,#9a9a9a)] w-3">
                  #{idx + 1}
                </span>
                <div className="w-5 h-5 rounded-full bg-[var(--nero-gd,#0f2e22)] text-[var(--nero-g,#19e68c)] flex items-center justify-center font-bold text-[10px]">
                  {item.handle.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-[var(--nero-tx,#ededed)]">
                  {item.name}
                </span>
                <span className="font-mono text-xs text-[var(--nero-mu,#9a9a9a)]">
                  @{item.handle}
                </span>
              </div>
              <span className="font-mono text-xs text-[var(--nero-tx,#ededed)] font-medium">
                {item.merged_prs} PRs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
