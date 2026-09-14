import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderGit2,
  Bot,
  GitPullRequest,
  BarChart2,
  Settings,
  Search,
  User,
  LogOut,
  Bell,
  ChevronDown,
  Filter,
  Download,
  Calendar,
  Layers,
  Users,
} from "lucide-react";

export const NeroLayout: React.FC = () => {
  const [userName, setUserName] = useState("Raj");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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

  const handleLogout = () => {
    localStorage.removeItem("codebot_access_token");
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/dashboard/repositories", label: "Repositories", icon: FolderGit2 },
    { to: "/codebot", label: "AI Chat", icon: Bot },
    { to: "/dashboard/pr-reviews", label: "PR Reviews", icon: GitPullRequest },
    { to: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#151515] text-[#F2F2F2] font-sans flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="bg-[#191919] border-b border-[#333333] px-5 py-2.5 flex items-center justify-between sticky top-0 z-50">
        {/* Brand & Filter Bar */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-[3px] bg-[#078A62] flex items-center justify-center text-[#F2F2F2] font-extrabold text-xs tracking-tight shadow-sm">
              N
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-[#F2F2F2]">
                Nero<span className="text-[#078A62]">AI</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-[2px] bg-[#222222] border border-[#333333] text-[9px] font-mono font-semibold tracking-wider text-[#9A9A9A] uppercase">
                ANALYTICS
              </span>
            </div>
          </Link>

          <span className="h-4 w-[1px] bg-[#333333] hidden lg:block"></span>

          {/* Quick Filter Controls */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] border border-[#333333] rounded-[3px] px-2.5 py-1 text-[#9A9A9A]">
              <Users className="w-3.5 h-3.5 text-[#6F6F6F]" />
              <span className="text-[#F2F2F2] font-medium">Team:</span>
              <span className="text-[#9A9A9A]">All Engineering</span>
              <ChevronDown className="w-3 h-3 text-[#6F6F6F]" />
            </div>

            <div className="flex items-center gap-1.5 bg-[#1F1F1F] border border-[#333333] rounded-[3px] px-2.5 py-1 text-[#9A9A9A]">
              <Layers className="w-3.5 h-3.5 text-[#6F6F6F]" />
              <span className="text-[#F2F2F2] font-medium">Repos:</span>
              <span className="text-[#9A9A9A]">24 Selected</span>
              <ChevronDown className="w-3 h-3 text-[#6F6F6F]" />
            </div>

            <div className="flex items-center gap-1.5 bg-[#1F1F1F] border border-[#333333] rounded-[3px] px-2.5 py-1 text-[#9A9A9A]">
              <Calendar className="w-3.5 h-3.5 text-[#6F6F6F]" />
              <span className="text-[#9A9A9A]">Last 30 Days</span>
              <ChevronDown className="w-3 h-3 text-[#6F6F6F]" />
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3 text-xs">
          {/* Global Search Bar */}
          <div className="hidden sm:flex items-center gap-2 bg-[#1F1F1F] border border-[#333333] rounded-[3px] px-2.5 py-1 w-48 md:w-64 focus-within:border-[#078A62] transition-colors">
            <Search className="w-3.5 h-3.5 text-[#6F6F6F] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repos, PRs, authors..."
              className="bg-transparent text-[#F2F2F2] placeholder-[#6F6F6F] focus:outline-none w-full text-xs"
            />
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#1F1F1F] border border-[#333333] text-[11px] text-[#22C993] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C993]"></span>
            System Live
          </div>

          <button className="p-1.5 text-[#9A9A9A] hover:text-[#F2F2F2] rounded-[3px] hover:bg-[#1F1F1F] transition-colors border border-transparent hover:border-[#333333]">
            <Bell className="w-4 h-4" />
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 bg-[#1F1F1F] border border-[#333333] pl-2 pr-2.5 py-1 rounded-[3px]">
            <div className="w-5 h-5 rounded-[2px] bg-[#078A62] text-[#F2F2F2] flex items-center justify-center font-bold text-[10px]">
              {userName.charAt(0)}
            </div>
            <span className="text-xs font-semibold text-[#F2F2F2]">{userName}</span>
            <button
              onClick={handleLogout}
              title="Log out"
              className="ml-1 text-[#6F6F6F] hover:text-[#D95C5C] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout: Sidebar + Content */}
      <div className="flex-1 flex max-w-[1800px] w-full mx-auto">
        {/* Left Sidebar Menu */}
        <aside className="w-56 shrink-0 bg-[#191919] border-r border-[#333333] p-3 flex flex-col justify-between hidden md:flex">
          <div className="space-y-4">
            <div className="px-2 pt-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6F6F6F]">
                NAVIGATION
              </span>
            </div>

            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#1F1F1F] text-[#F2F2F2] border-l-2 border-[#078A62]"
                          : "text-[#9A9A9A] hover:bg-[#1F1F1F] hover:text-[#F2F2F2]"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[#9A9A9A]" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="pt-3 border-t border-[#333333] text-[11px] font-mono text-[#6F6F6F] px-2 space-y-1">
            <div className="flex items-center justify-between">
              <span>Nero Engine</span>
              <span className="text-[#22C993]">v2.4</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto bg-[#151515]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
