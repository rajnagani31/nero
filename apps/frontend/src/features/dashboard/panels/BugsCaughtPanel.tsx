import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Bug, ShieldAlert } from "lucide-react";
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
  const totalBugs = safeSeries.reduce((acc, curr) => acc + (curr?.value || 0), 0);

  const severityData = [
    { label: "Critical", value: severityBreakdown.critical, fill: "#f43f5e" },
    { label: "High", value: severityBreakdown.high, fill: "#f59e0b" },
    { label: "Medium", value: severityBreakdown.medium, fill: "#10b981" },
    { label: "Low", value: severityBreakdown.low, fill: "#71717a" },
  ];

  return (
    <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-5 space-y-4">
      {/* Header with Sub-Toggle */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--nero-tx,#ededed)] flex items-center gap-2">
            <Bug className="h-4 w-4 text-rose-400" />
            <span>Bugs caught</span>
          </h3>
          <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-0.5">
            Defects and security vulnerabilities caught before merge
          </p>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex items-center p-0.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)]">
          <button
            type="button"
            onClick={() => setViewMode("trend")}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
              viewMode === "trend"
                ? "bg-[var(--nero-sf,#111111)] text-[var(--nero-tx,#ededed)] font-semibold shadow-sm"
                : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)]"
            )}
          >
            Trend
          </button>
          <button
            type="button"
            onClick={() => setViewMode("severity")}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
              viewMode === "severity"
                ? "bg-[var(--nero-sf,#111111)] text-[var(--nero-tx,#ededed)] font-semibold shadow-sm"
                : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)]"
            )}
          >
            Severity
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[200px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "trend" ? (
            <BarChart data={safeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <div className="text-rose-400 font-semibold">
                        {payload[0].value} bugs caught
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          ) : (
            <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <div className="font-semibold text-rose-400">
                        {payload[0].value} findings
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
                fill="#f43f5e"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Breakdown List */}
      <div className="pt-3 border-t border-[var(--nero-bd,#262626)] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
          Repos with Most Bugs
        </div>
        <div className="space-y-1.5">
          {safeBreakdown.map((item) => (
            <div
              key={item.repo_name}
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--nero-sf2,#1a1a1a)] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="font-mono text-[var(--nero-tx,#ededed)] truncate">
                  {item.repo_name}
                </span>
              </div>
              <span className="font-mono text-xs text-rose-400 font-medium shrink-0 ml-2">
                {item.value} {item.unit || "bugs"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
