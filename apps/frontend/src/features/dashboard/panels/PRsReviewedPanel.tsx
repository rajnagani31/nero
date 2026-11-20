import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GitPullRequest, FolderGit2 } from "lucide-react";
import { ChartPoint, RepoMetricItem } from "@/types/analytics";

interface PRsReviewedPanelProps {
  series: ChartPoint[];
  breakdown: RepoMetricItem[];
}

export const PRsReviewedPanel: React.FC<PRsReviewedPanelProps> = ({
  series,
  breakdown,
}) => {
  const totalInPeriod = series.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4">
      {/* Panel Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--nero-tx,#ededed)] flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-[var(--nero-g,#19e68c)]" />
            <span>PRs reviewed by Nero</span>
          </h3>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-0.5">
            Review throughput and distribution across connected repositories
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)]">
          {totalInPeriod} Total
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="h-[200px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] px-3 py-1.5 shadow-lg text-xs font-mono">
                    <div className="text-[var(--nero-mu,#9a9a9a)]">{label}</div>
                    <div className="text-[var(--nero-g,#19e68c)] font-semibold">
                      {payload[0].value} PRs reviewed
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill="var(--nero-g, #19e68c)"
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[var(--nero-bd,#262626)] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          Top Repositories
        </div>
        <div className="space-y-1.5">
          {breakdown.map((item) => (
            <div
              key={item.repo_name}
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--nero-sf2,#1a1a1a)] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderGit2 className="h-3.5 w-3.5 text-[var(--nero-mu,#9a9a9a)] shrink-0" />
                <span className="font-mono text-[var(--nero-tx,#ededed)] truncate">
                  {item.repo_name}
                </span>
              </div>
              <span className="font-mono text-xs text-[var(--nero-tx,#ededed)] font-medium shrink-0 ml-2">
                {item.value} {item.unit || "PRs"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
