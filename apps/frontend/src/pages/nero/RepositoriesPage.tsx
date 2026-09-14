import React, { useState, useEffect } from "react";
import { FolderGit2, Plus, RefreshCw, Lock, Globe, Power, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RepositoryItem {
  id: number;
  repo_id: number;
  full_name: string;
  owner: string;
  default_branch: string;
  is_private: boolean;
  is_active: boolean;
}

export const RepositoriesPage: React.FC = () => {
  const [repositories, setRepositories] = useState<RepositoryItem[]>([
    {
      id: 1,
      repo_id: 101,
      full_name: "nero/checkout-service",
      owner: "nero",
      default_branch: "main",
      is_private: true,
      is_active: true,
    },
    {
      id: 2,
      repo_id: 102,
      full_name: "nero/auth-service",
      owner: "nero",
      default_branch: "main",
      is_private: true,
      is_active: true,
    },
    {
      id: 3,
      repo_id: 103,
      full_name: "nero/frontend-web",
      owner: "nero",
      default_branch: "main",
      is_private: false,
      is_active: true,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("codebot_access_token");
      const res = await fetch("/api/github/repositories", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.repositories && data.repositories.length > 0) {
          setRepositories(data.repositories);
        }
      }
    } catch {
      // Keep mock data if API unavailable
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
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
    }
  };

  const toggleRepo = (id: number) => {
    setRepositories((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F1F] border border-[#333333] p-4 rounded-[3px]">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#F2F2F2]">
            Connected GitHub Repositories
          </h1>
          <p className="text-xs text-[#9A9A9A] mt-0.5">
            Manage repository access, AST indexing status, and automated PR review triggers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={fetchRepositories}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-[3px] bg-[#151515] border border-[#333333] text-[#F2F2F2] hover:bg-[#242424] transition-colors flex items-center gap-1.5 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#9A9A9A] ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Status</span>
          </button>

          <button
            onClick={handleConnect}
            className="px-3.5 py-1.5 rounded-[3px] bg-[#078A62] hover:bg-[#0A9B70] text-[#F2F2F2] font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect GitHub App</span>
          </button>
        </div>
      </div>

      <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[#F2F2F2]">
            INSTALLED REPOSITORIES ({repositories.length})
          </span>
          <span className="text-[11px] font-mono text-[#22C993]">● GitHub App Active</span>
        </div>

        <div className="divide-y divide-[#333333]">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="p-4 bg-[#1F1F1F] hover:bg-[#242424] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[2px] bg-[#151515] border border-[#333333] flex items-center justify-center text-[#078A62] shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F2F2F2]">{repo.full_name}</span>
                    {repo.is_private ? (
                      <span className="px-1.5 py-0.5 rounded-[2px] bg-[#151515] border border-[#333333] text-[10px] font-mono text-[#9A9A9A] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#6F6F6F]" /> Private
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-[2px] bg-[#151515] border border-[#333333] text-[10px] font-mono text-[#9A9A9A] flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#6F6F6F]" /> Public
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[#6F6F6F] mt-0.5">
                    Branch: <span className="text-[#9A9A9A]">{repo.default_branch || "main"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold ${
                    repo.is_active
                      ? "bg-[#22C993]/10 text-[#22C993] border border-[#22C993]/30"
                      : "bg-[#151515] text-[#6F6F6F] border border-[#333333]"
                  }`}
                >
                  {repo.is_active ? "NeroAI Enabled" : "Disabled"}
                </span>

                <button
                  onClick={() => toggleRepo(repo.id)}
                  className={`p-1.5 rounded-[2px] border transition-colors ${
                    repo.is_active
                      ? "border-[#078A62] bg-[#078A62]/10 text-[#078A62] hover:bg-[#078A62]/20"
                      : "border-[#333333] bg-[#151515] text-[#6F6F6F] hover:text-[#F2F2F2]"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
