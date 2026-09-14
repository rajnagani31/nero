import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
  Bot,
  Zap,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Download,
  Filter,
  Users,
  AlertTriangle,
  FolderGit2,
  Code2,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const DashboardOverviewPage: React.FC = () => {
  const [userName, setUserName] = useState("Raj");
  const [isConnecting, setIsConnecting] = useState(false);
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D">("30D");

  useEffect(() => {
    try {
      const token = localStorage.getItem("codebot_access_token");
      if (token) {
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              const rawName =
                data.display_name ||
                data.name ||
                (typeof data.email === "string" ? data.email.split("@")[0] : null) ||
                "Raj";
              const formatted = String(rawName);
              setUserName(formatted.charAt(0).toUpperCase() + formatted.slice(1));
            }
          })
          .catch(() => {});
      }
    } catch {
      // Safe fallback stays "Raj"
    }
  }, []);

  const handleConnectRepo = async () => {
    setIsConnecting(true);
    try {
      const token = localStorage.getItem("codebot_access_token");
      const res = await fetch("/api/github/install", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      window.location.href = "https://github.com/apps/nero-ai-dev/installations/new";
    } catch {
      window.location.href = "https://github.com/apps/nero-ai-dev/installations/new";
    } finally {
      setIsConnecting(false);
    }
  };

  // Mock trend data points for chart bar visualization
  const weeklyTrends = [
    { day: "Mon", prs: 42, avgTime: "1.4h", height: "65%" },
    { day: "Tue", prs: 68, avgTime: "1.1h", height: "90%" },
    { day: "Wed", prs: 54, avgTime: "1.3h", height: "75%" },
    { day: "Thu", prs: 82, avgTime: "0.9h", height: "100%" },
    { day: "Fri", prs: 60, avgTime: "1.2h", height: "80%" },
    { day: "Sat", prs: 22, avgTime: "1.8h", height: "35%" },
    { day: "Sun", prs: 18, avgTime: "2.1h", height: "30%" },
  ];

  const topContributors = [
    { name: "Denis Smith", handle: "denis", commits: 142, reviews: 48, addressed: "98%", mergeTime: "42m", risk: "Low" },
    { name: "Raj Kumar", handle: "raj", commits: 128, reviews: 42, addressed: "96%", mergeTime: "1h 15m", risk: "Low" },
    { name: "Sarah Chen", handle: "sarah", commits: 94, reviews: 36, addressed: "94%", mergeTime: "1h 30m", risk: "Low" },
    { name: "Alex Rivera", handle: "arivera", commits: 76, reviews: 24, addressed: "91%", mergeTime: "2h 10m", risk: "Med" },
  ];

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Top Controls Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F1F] border border-[#333333] p-4 rounded-[3px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-[#F2F2F2]">
              Engineering Analytics Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-[2px] bg-[#151515] border border-[#333333] text-[10px] font-mono text-[#22C993]">
              LIVE METRICS
            </span>
          </div>
          <p className="text-xs text-[#9A9A9A] mt-0.5">
            PR velocity, code review quality, author addressed rate & security audits.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button className="px-3 py-1.5 rounded-[3px] bg-[#151515] border border-[#333333] text-[#F2F2F2] hover:bg-[#242424] transition-colors flex items-center gap-1.5 font-medium">
            <Download className="w-3.5 h-3.5 text-[#9A9A9A]" />
            <span>Export Report</span>
          </button>

          <button
            onClick={handleConnectRepo}
            disabled={isConnecting}
            className="px-3.5 py-1.5 rounded-[3px] bg-[#078A62] hover:bg-[#0A9B70] text-[#F2F2F2] font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isConnecting ? "Connecting..." : "Connect Repo"}</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total PRs */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden hover:border-[#444444] transition-colors">
          <div className="px-4 py-2.5 border-b border-[#333333] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9A9A9A]">
              TOTAL PRS PROCESSED
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#22C993]">
              <TrendingUp className="w-3 h-3" /> +12.4%
            </div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#F2F2F2]">1,482</div>
            <p className="text-xs text-[#9A9A9A] mt-1">1,340 merged • 142 closed</p>
          </div>
          <div className="px-4 py-2 bg-[#151515] border-t border-[#333333] text-[11px] text-[#6F6F6F] flex justify-between">
            <span>Period: Last 30 Days</span>
            <span className="text-[#9A9A9A]">98.2% Success</span>
          </div>
        </div>

        {/* KPI 2: Total Reviews */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden hover:border-[#444444] transition-colors">
          <div className="px-4 py-2.5 border-b border-[#333333] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9A9A9A]">
              AI REVIEWS EXECUTED
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#22C993]">
              <TrendingUp className="w-3 h-3" /> +8.1%
            </div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#F2F2F2]">1,120</div>
            <p className="text-xs text-[#9A9A9A] mt-1">92% automated without HITL block</p>
          </div>
          <div className="px-4 py-2 bg-[#151515] border-t border-[#333333] text-[11px] text-[#6F6F6F] flex justify-between">
            <span>Avg Response: 1.2s</span>
            <span className="text-[#078A62]">Nero Engine</span>
          </div>
        </div>

        {/* KPI 3: Avg Merge Time */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden hover:border-[#444444] transition-colors">
          <div className="px-4 py-2.5 border-b border-[#333333] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9A9A9A]">
              AVG TIME TO MERGE
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#22C993]">
              <TrendingDown className="w-3 h-3" /> -14.2%
            </div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#F2F2F2]">1h 45m</div>
            <p className="text-xs text-[#9A9A9A] mt-1">Reduced by 28m vs prior cycle</p>
          </div>
          <div className="px-4 py-2 bg-[#151515] border-t border-[#333333] text-[11px] text-[#6F6F6F] flex justify-between">
            <span>Target: &lt;2h</span>
            <span className="text-[#22C993]">Optimal</span>
          </div>
        </div>

        {/* KPI 4: Bugs & Risk Caught */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden hover:border-[#444444] transition-colors">
          <div className="px-4 py-2.5 border-b border-[#333333] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9A9A9A]">
              RISKS & BUGS CAUGHT
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#D9A441]">
              <ShieldCheck className="w-3 h-3" /> 0 Critical
            </div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#F2F2F2]">42</div>
            <p className="text-xs text-[#9A9A9A] mt-1">AST contract & concurrency checks</p>
          </div>
          <div className="px-4 py-2 bg-[#151515] border-t border-[#333333] text-[11px] text-[#6F6F6F] flex justify-between">
            <span>Security Index: 98/100</span>
            <span className="text-[#22C993]">Protected</span>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: PRs Reviewed & Merge Time Trends */}
        <div className="lg:col-span-7 bg-[#1F1F1F] border border-[#333333] rounded-[3px] flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#9A9A9A]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#F2F2F2]">
                PR REVIEW VOLUME & MERGE VELOCITY TRENDS
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono bg-[#151515] p-0.5 border border-[#333333] rounded-[2px]">
              {(["7D", "30D", "90D"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                    timeframe === t
                      ? "bg-[#078A62] text-[#F2F2F2] font-semibold"
                      : "text-[#9A9A9A] hover:text-[#F2F2F2]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Visual with Grid Lines */}
          <div className="p-5 space-y-4">
            <div className="h-44 border-b border-[#333333] relative flex items-end justify-between gap-3 pt-6 pb-2">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-[#333333] w-full"></div>
                <div className="border-b border-[#333333] w-full"></div>
                <div className="border-b border-[#333333] w-full"></div>
              </div>

              {weeklyTrends.map((w, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 z-10 group">
                  <div className="text-[10px] font-mono text-[#9A9A9A] opacity-0 group-hover:opacity-100 transition-opacity">
                    {w.prs} PRs
                  </div>
                  <div
                    style={{ height: w.height }}
                    className="w-full max-w-[28px] bg-[#078A62] group-hover:bg-[#22C993] rounded-[1px] transition-colors"
                  ></div>
                  <span className="text-[10px] font-mono text-[#6F6F6F]">{w.day}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-2.5 bg-[#151515] border border-[#333333] rounded-[2px]">
                <span className="text-[10px] text-[#6F6F6F] uppercase block">Peak PR Day</span>
                <span className="text-sm font-bold text-[#F2F2F2]">Thursday (82 PRs)</span>
              </div>
              <div className="p-2.5 bg-[#151515] border border-[#333333] rounded-[2px]">
                <span className="text-[10px] text-[#6F6F6F] uppercase block">Fastest Merge</span>
                <span className="text-sm font-bold text-[#22C993]">Thursday (0.9h)</span>
              </div>
              <div className="p-2.5 bg-[#151515] border border-[#333333] rounded-[2px]">
                <span className="text-[10px] text-[#6F6F6F] uppercase block">AI Pass Rate</span>
                <span className="text-sm font-bold text-[#F2F2F2]">96.4%</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#151515] border-t border-[#333333] text-xs text-[#9A9A9A] flex justify-between items-center">
            <span>Automation coverage: 92% of all active repositories</span>
            <Link to="/dashboard/analytics" className="text-[#078A62] hover:underline text-[11px] font-mono">
              View Detailed Breakdown &rarr;
            </Link>
          </div>
        </div>

        {/* Card 2: Addressed Rate & Comment Ratings */}
        <div className="lg:col-span-5 bg-[#1F1F1F] border border-[#333333] rounded-[3px] flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#9A9A9A]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#F2F2F2]">
                ADDRESSED RATE & AI COMMENT RATINGS
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#22C993]">96.4% Resolution</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9A9A9A]">AI Review Recommendation Resolution</span>
                <span className="text-[#F2F2F2] font-bold">96.4%</span>
              </div>
              <div className="w-full h-2 rounded-[1px] bg-[#151515] border border-[#333333] overflow-hidden flex">
                <div className="bg-[#22C993] h-full w-[96.4%]"></div>
                <div className="bg-[#D9A441] h-full w-[3.6%]"></div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9A9A9A]">Author Auto-Fix Acceptance Rate</span>
                <span className="text-[#F2F2F2] font-bold">92%</span>
              </div>
              <div className="w-full h-2 rounded-[1px] bg-[#151515] border border-[#333333] overflow-hidden flex">
                <div className="bg-[#078A62] h-full w-[92%]"></div>
                <div className="bg-[#333333] h-full w-[8%]"></div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#333333] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#6F6F6F] block">
                DEVELOPER SATISFACTION SCORES
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-[#151515] border border-[#333333] rounded-[2px]">
                  <span className="text-xs font-bold text-[#22C993] block">84%</span>
                  <span className="text-[10px] text-[#6F6F6F]">5-Star Ratings</span>
                </div>
                <div className="p-2 bg-[#151515] border border-[#333333] rounded-[2px]">
                  <span className="text-xs font-bold text-[#F2F2F2] block">12%</span>
                  <span className="text-[10px] text-[#6F6F6F]">4-Star Ratings</span>
                </div>
                <div className="p-2 bg-[#151515] border border-[#333333] rounded-[2px]">
                  <span className="text-xs font-bold text-[#9A9A9A] block">4%</span>
                  <span className="text-[10px] text-[#6F6F6F]">3-Star Ratings</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#151515] border-t border-[#333333] text-xs text-[#9A9A9A] flex justify-between items-center">
            <span>148 suggested code patches merged without edits</span>
            <span className="text-[#22C993] font-mono text-[11px]">High Trust</span>
          </div>
        </div>
      </div>

      {/* Top Contributors Table Card */}
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#9A9A9A]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#F2F2F2]">
              TOP CONTRIBUTORS & REVIEW PERFORMANCE
            </span>
          </div>
          <span className="text-xs text-[#9A9A9A]">Showing 4 Active Engineering Lead Authors</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#151515] border-b border-[#333333] text-[11px] font-mono text-[#6F6F6F] uppercase">
                <th className="py-2.5 px-4">Contributor</th>
                <th className="py-2.5 px-4">Commits</th>
                <th className="py-2.5 px-4">PRs Reviewed</th>
                <th className="py-2.5 px-4">Addressed Rate</th>
                <th className="py-2.5 px-4">Avg Merge Time</th>
                <th className="py-2.5 px-4 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {topContributors.map((c, i) => (
                <tr key={i} className="hover:bg-[#242424] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#F2F2F2]">{c.name}</div>
                    <div className="text-[11px] font-mono text-[#6F6F6F]">@{c.handle}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#9A9A9A]">{c.commits}</td>
                  <td className="py-3 px-4 font-mono text-[#F2F2F2] font-semibold">{c.reviews}</td>
                  <td className="py-3 px-4 font-mono text-[#22C993] font-semibold">{c.addressed}</td>
                  <td className="py-3 px-4 font-mono text-[#9A9A9A]">{c.mergeTime}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-bold ${
                        c.risk === "Low"
                          ? "bg-[#22C993]/10 text-[#22C993] border border-[#22C993]/30"
                          : "bg-[#D9A441]/10 text-[#D9A441] border border-[#D9A441]/30"
                      }`}
                    >
                      {c.risk} Risk
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity & Risk Audits Card */}
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#333333] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#9A9A9A]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#F2F2F2]">
              RECENT AI REVIEWS & RISK AUDIT LOGS
            </span>
          </div>
          <Link to="/dashboard/pr-reviews" className="text-[11px] font-mono text-[#078A62] hover:underline">
            View HITL Queue &rarr;
          </Link>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 bg-[#151515] border border-[#333333] rounded-[2px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#22C993]">● CLEAN</span>
              <span className="text-[#F2F2F2] font-semibold">PR #182 (checkout-service)</span>
              <span className="text-[#6F6F6F]">Added Redis cache retry logic</span>
            </div>
            <span className="text-[#9A9A9A]">4 mins ago</span>
          </div>

          <div className="p-3 bg-[#151515] border border-[#333333] rounded-[2px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#078A62]">● SYNC</span>
              <span className="text-[#F2F2F2] font-semibold">Architecture Graph Index</span>
              <span className="text-[#6F6F6F]">8 microservices parsed into Qdrant</span>
            </div>
            <span className="text-[#9A9A9A]">22 mins ago</span>
          </div>

          <div className="p-3 bg-[#151515] border border-[#333333] rounded-[2px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#D9A441]">▲ CAUTION</span>
              <span className="text-[#F2F2F2] font-semibold">PR #519 (backend-auth)</span>
              <span className="text-[#6F6F6F]">Database pool connection leak risk</span>
            </div>
            <span className="text-[#9A9A9A]">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
