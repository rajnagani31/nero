import React, { useState, useEffect } from "react";
import { authFetch, getAuthToken, clearAuthToken, refreshAuthToken } from "@/utils/auth";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Sun,
  Moon,
  LogOut,
  Bot,
  User,
  FolderGit2,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/utils/cn";

export const NeroLayout: React.FC = () => {
  const [userName, setUserName] = useState("Raj");
  const [userEmail, setUserEmail] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("nero_theme");
    if (saved === "light" || saved === "dark") return saved;
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Initialize theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nero_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        let token = getAuthToken();
        if (!token) {
          token = (await refreshAuthToken()) || "";
        }

        if (!token) {
          const currentPath = window.location.pathname + window.location.search;
          navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            const rawName =
              data.display_name ||
              data.name ||
              (typeof data.email === "string" ? data.email.split("@")[0] : null) ||
              "Raj";
            const formatted = String(rawName);
            setUserName(formatted.charAt(0).toUpperCase() + formatted.slice(1));
            if (data.email) setUserEmail(data.email);
          }
        } else if (res.status === 401) {
          clearAuthToken();
          const currentPath = window.location.pathname + window.location.search;
          navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        // Check for GitHub App installation redirect query params
        const urlParams = new URLSearchParams(window.location.search);
        const installationId = urlParams.get("installation_id");
        if (installationId) {
          authFetch(`/api/github/callback?installation_id=${installationId}`)
            .then((cbRes) => cbRes.json())
            .then(() => {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            })
            .catch(() => {});
        }
      } catch {
        // Safe fallback
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login");
  };

  const navTabs = [
    { to: "/dashboard/analytics", label: "Analytics" },
    { to: "/dashboard/pr-reviews", label: "Pull Requests" },
    { to: "/dashboard/memory", label: "Memory" },
    { to: "/dashboard/settings", label: "Settings" },
  ];

  return (
    <div className="nero-shell flex flex-col min-h-screen bg-[var(--nero-bg,#0a0a0a)] text-[var(--nero-tx,#ededed)] font-sans antialiased">
      {/* ─── Top Bar ────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-6 py-3.5 border-b border-[var(--nero-bd,#262626)] bg-[var(--nero-bg,#0a0a0a)] shrink-0">
        <Link to="/dashboard/analytics" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-bold text-sm flex items-center justify-center shadow-sm">
            N
          </div>
          <span className="font-semibold text-base tracking-tight text-[var(--nero-tx,#ededed)]">
            nero
          </span>
        </Link>

        <Badge variant="admin" className="ml-1 text-[11px] font-medium">
          Admin
        </Badge>

        <div className="ml-auto flex items-center gap-2.5">
          {/* Quick link to Codebot Chat */}
          <Link
            to="/codebot"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-xs text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)] transition-colors"
          >
            <Bot className="h-3.5 w-3.5 text-[var(--nero-g,#19e68c)]" />
            <span>Codebot Chat</span>
          </Link>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-xs font-medium text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)] transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Theme</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Theme</span>
              </>
            )}
          </button>

          {/* User Session Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-8 pl-2 pr-2.5 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-xs font-medium text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)] transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--nero-gd,#0f2e22)] text-[var(--nero-g,#19e68c)] flex items-center justify-center font-semibold text-[10px]">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span>{userName}</span>
                <ChevronDown className="h-3 w-3 text-[var(--nero-mu,#9a9a9a)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="font-medium text-sm text-[var(--nero-tx,#ededed)]">{userName}</div>
                {userEmail && (
                  <div className="text-[11px] text-[var(--nero-mu,#9a9a9a)] truncate">{userEmail}</div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/repositories" className="flex items-center gap-2 cursor-pointer">
                  <FolderGit2 className="h-3.5 w-3.5 text-[var(--nero-mu,#9a9a9a)]" />
                  <span>Repositories</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/codebot" className="flex items-center gap-2 cursor-pointer">
                  <Bot className="h-3.5 w-3.5 text-[var(--nero-mu,#9a9a9a)]" />
                  <span>Codebot Chat</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Top Navigation Tabs ─────────────────────────────────── */}
      <nav
        aria-label="Main Navigation"
        className="flex items-center gap-1 px-6 border-b border-[var(--nero-bd,#262626)] bg-[var(--nero-bg,#0a0a0a)] overflow-x-auto shrink-0"
      >
        {navTabs.map((tab) => {
          // Highlight active tab
          const isActive =
            location.pathname === tab.to ||
            (tab.to === "/dashboard/analytics" && location.pathname === "/dashboard");

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                "inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all min-h-[44px]",
                isActive
                  ? "border-[var(--nero-g,#19e68c)] text-[var(--nero-tx,#ededed)]"
                  : "border-transparent text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)]"
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      {/* ─── Main Content Container ─────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-6 py-7 pb-20 flex flex-col gap-6">
        <Outlet />
      </main>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};
