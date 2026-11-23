import React, { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { authFetch } from "@/utils/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";

export interface GlobalFilterValues {
  team: string;
  repo: string;
  author: string;
  period: string;
}

interface RepositoryOption {
  id: number;
  repo_id?: number;
  full_name: string;
}

interface GlobalScopeToolbarProps {
  filters: GlobalFilterValues;
  onFilterChange: (key: keyof GlobalFilterValues, value: string) => void;
  onExport?: () => void;
  isExporting?: boolean;
  className?: string;
}

export const GlobalScopeToolbar: React.FC<GlobalScopeToolbarProps> = ({
  filters,
  onFilterChange,
  onExport,
  isExporting = false,
  className,
}) => {
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchRepos = async () => {
      try {
        setLoadingRepos(true);
        const res = await authFetch("/api/repositories");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.repositories && Array.isArray(data.repositories)) {
            setRepositories(data.repositories);
          }
        }
      } catch {
        // Fallback to defaults
      } finally {
        if (isMounted) setLoadingRepos(false);
      }
    };

    fetchRepos();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExportClick = () => {
    if (onExport) {
      onExport();
      return;
    }
    // Default export download
    const query = new URLSearchParams();
    if (filters.period) query.set("period", filters.period);
    if (filters.repo && filters.repo !== "all") query.set("repo_id", filters.repo);
    if (filters.author && filters.author !== "all") query.set("author", filters.author);

    window.open(`/api/analytics/export?${query.toString()}`, "_blank");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 text-sm",
        className
      )}
    >
      {/* Team Filter */}
      <div className="w-[140px]">
        <Select
          value={filters.team || "all"}
          onValueChange={(val) => onFilterChange("team", val)}
        >
          <SelectTrigger className="h-9 text-xs rounded-none bg-[#1A1A1A] border-[#2E2E2E] text-[#EDEDED] hover:border-[#3E3E3E]">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-[#262626] bg-[#111111]">
            <SelectItem value="all" className="rounded-none">All teams</SelectItem>
            <SelectItem value="core" className="rounded-none">Core Platform</SelectItem>
            <SelectItem value="backend" className="rounded-none">Backend Eng</SelectItem>
            <SelectItem value="frontend" className="rounded-none">Frontend Eng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Repository Filter */}
      <div className="w-[180px]">
        <Select
          value={filters.repo || "all"}
          onValueChange={(val) => onFilterChange("repo", val)}
        >
          <SelectTrigger className="h-9 text-xs rounded-none bg-[#1A1A1A] border-[#2E2E2E] text-[#EDEDED] hover:border-[#3E3E3E]">
            <SelectValue placeholder={loadingRepos ? "Loading repos..." : "All repositories"} />
          </SelectTrigger>
          <SelectContent className="rounded-none border-[#262626] bg-[#111111]">
            <SelectItem value="all" className="rounded-none">All repositories</SelectItem>
            {repositories.length > 0 ? (
              repositories.map((r) => (
                <SelectItem key={r.id} value={String(r.id)} className="rounded-none">
                  {r.full_name}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="1" className="rounded-none">rajnagani31/nero</SelectItem>
                <SelectItem value="2" className="rounded-none">rajnagani31/codebot</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Author Filter */}
      <div className="w-[140px]">
        <Select
          value={filters.author || "all"}
          onValueChange={(val) => onFilterChange("author", val)}
        >
          <SelectTrigger className="h-9 text-xs rounded-none bg-[#1A1A1A] border-[#2E2E2E] text-[#EDEDED] hover:border-[#3E3E3E]">
            <SelectValue placeholder="All authors" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-[#262626] bg-[#111111]">
            <SelectItem value="all" className="rounded-none">All authors</SelectItem>
            <SelectItem value="rajnagani31" className="rounded-none">rajnagani31</SelectItem>
            <SelectItem value="dependabot" className="rounded-none">dependabot[bot]</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Period Filter */}
      <div className="w-[140px]">
        <Select
          value={filters.period || "month"}
          onValueChange={(val) => onFilterChange("period", val)}
        >
          <SelectTrigger className="h-9 text-xs rounded-none bg-[#1A1A1A] border-[#2E2E2E] text-[#EDEDED] hover:border-[#3E3E3E]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-[#262626] bg-[#111111]">
            <SelectItem value="month" className="rounded-none">This month</SelectItem>
            <SelectItem value="week" className="rounded-none">Last 7 days</SelectItem>
            <SelectItem value="last" className="rounded-none">Last month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Export Action */}
      <button
        type="button"
        onClick={handleExportClick}
        disabled={isExporting}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none bg-[#FFFFFF] text-[#000000] font-medium text-xs hover:bg-[#E5E5E5] transition-colors disabled:opacity-50 cursor-pointer border-none shadow-none"
      >
        {isExporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#000000]" />
        ) : (
          <Download className="h-3.5 w-3.5 text-[#000000]" />
        )}
        <span>Export</span>
      </button>
    </div>
  );
};
