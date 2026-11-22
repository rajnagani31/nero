import React, { useMemo } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  User,
  Shield,
  Sparkles,
  LogIn,
  Settings,
  X,
} from "lucide-react";
import { Thread, SessionUser } from "@/types/chat";
import { cn } from "@/utils/cn";

interface ChatSidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onThreadSelect: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
  sessionUser: SessionUser | null;
  isGuestSession: boolean;
  onOpenAuth: (view: "login" | "signup") => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  threads,
  activeThreadId,
  search,
  onSearchChange,
  onThreadSelect,
  onNewChat,
  onDeleteThread,
  sessionUser,
  isGuestSession,
  onOpenAuth,
  onOpenSettings,
  isOpen,
  onClose,
}) => {
  // ─── Group Threads by Relative Time ────────────────────────────────
  const groupedThreads = useMemo(() => {
    const today: Thread[] = [];
    const yesterday: Thread[] = [];
    const last7Days: Thread[] = [];
    const older: Thread[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 7 * 86400000;

    for (const thread of threads) {
      const threadTime = new Date(thread.updatedAt).getTime();
      if (threadTime >= startOfToday) {
        today.push(thread);
      } else if (threadTime >= startOfYesterday) {
        yesterday.push(thread);
      } else if (threadTime >= startOf7Days) {
        last7Days.push(thread);
      } else {
        older.push(thread);
      }
    }

    return [
      { label: "Today", list: today },
      { label: "Yesterday", list: yesterday },
      { label: "Previous 7 Days", list: last7Days },
      { label: "Older", list: older },
    ].filter((group) => group.list.length > 0);
  }, [threads]);

  return (
    <aside
      className={cn(
        "fixed lg:static inset-y-0 left-0 z-30 w-[280px] bg-[var(--nero-sf,#111111)] border-r border-[var(--nero-bd,#262626)] flex flex-col transition-transform duration-200 ease-in-out shrink-0 font-sans",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* ─── Top Actions (New Chat & Close for mobile) ─────────────── */}
      <div className="p-3.5 border-b border-[var(--nero-bd,#262626)] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden h-9 w-9 rounded-lg border border-[var(--nero-bd,#262626)] text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] flex items-center justify-center cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--nero-mu,#9a9a9a)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-8 pl-8 pr-3 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none focus:border-[var(--nero-g,#19e68c)] transition-colors"
          />
        </div>
      </div>

      {/* ─── Grouped Thread List ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {groupedThreads.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--nero-mu,#9a9a9a)]">
            No conversations yet.
          </div>
        ) : (
          groupedThreads.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--nero-mu,#9a9a9a)]">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.list.map((thread) => {
                  const isActive = thread.id === activeThreadId;

                  return (
                    <div
                      key={thread.id}
                      className={cn(
                        "group relative flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors cursor-pointer",
                        isActive
                          ? "bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)] font-medium"
                          : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:bg-[var(--nero-sf2,#1a1a1a)]/50"
                      )}
                      onClick={() => onThreadSelect(thread.id)}
                    >
                      <div className="flex items-center gap-2 truncate pr-6">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                        <span className="truncate">{thread.title}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--nero-mu,#9a9a9a)] hover:text-rose-400 rounded cursor-pointer"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Bottom Account / Guest Quota Card ─────────────────────── */}
      <div className="p-3 border-t border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)]/40 space-y-2">
        {isGuestSession ? (
          <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-[var(--nero-mu,#9a9a9a)]">
                Guest Mode
              </span>
              <span className="font-mono text-[11px] text-amber-400">
                {sessionUser?.remainingGuestMessages !== null && sessionUser?.remainingGuestMessages !== undefined
                  ? `${sessionUser.remainingGuestMessages} left`
                  : "Active"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuth("signup")}
              className="w-full inline-flex items-center justify-center gap-1.5 h-7 rounded border border-[var(--nero-g,#19e68c)]/40 bg-[var(--nero-g,#19e68c)]/10 text-[var(--nero-g,#19e68c)] hover:bg-[var(--nero-g,#19e68c)]/20 transition-colors font-semibold text-[11px] cursor-pointer"
            >
              <LogIn className="h-3 w-3" />
              <span>Upgrade / Sign Up</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-full bg-[var(--nero-gd,#0f2e22)] text-[var(--nero-g,#19e68c)] flex items-center justify-center font-bold text-[10px]">
                {(sessionUser?.displayName || sessionUser?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="font-medium text-[var(--nero-tx,#ededed)] truncate">
                  {sessionUser?.displayName || "Developer"}
                </div>
                <div className="text-[10px] text-[var(--nero-mu,#9a9a9a)] truncate font-mono">
                  {sessionUser?.email || "Registered Account"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
