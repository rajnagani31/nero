import React from "react";
import { X, LogOut, Sun, Moon, Shield } from "lucide-react";
import { ThemeName, SessionUser } from "@/types/chat";
import { themeOptions } from "./useChatState";
import { cn } from "@/utils/cn";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  sessionUser: SessionUser | null;
  onLogout: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  sessionUser,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-6 text-[var(--nero-tx,#ededed)] shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--nero-g,#19e68c)]">
              Preferences
            </span>
            <h2 className="text-lg font-bold tracking-tight text-[var(--nero-tx,#ededed)] mt-0.5">
              Workspace Settings
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--nero-tx,#ededed)]">
            Interface Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange(opt.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors cursor-pointer space-y-1",
                  theme === opt.value
                    ? "border-[var(--nero-g,#19e68c)] bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-g,#19e68c)]"
                    : "border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)]"
                )}
              >
                <div className="font-mono text-xs font-semibold">{opt.label}</div>
                <div className="text-[10px] text-[var(--nero-mu,#9a9a9a)] line-clamp-1">
                  {opt.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Session Details */}
        {sessionUser ? (
          <div className="p-3.5 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--nero-mu,#9a9a9a)]">
              <span>Account Type:</span>
              <span className="capitalize text-[var(--nero-tx,#ededed)]">
                {sessionUser.userType}
              </span>
            </div>
            {sessionUser.email ? (
              <div className="flex items-center justify-between text-[var(--nero-mu,#9a9a9a)]">
                <span>Email:</span>
                <span className="text-[var(--nero-tx,#ededed)] truncate max-w-[200px]">
                  {sessionUser.email}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-[var(--nero-mu,#9a9a9a)]">
              <span>Session ID:</span>
              <span className="text-[var(--nero-mu,#9a9a9a)] truncate max-w-[180px]">
                {sessionUser.publicId || sessionUser.sessionId}
              </span>
            </div>
          </div>
        ) : null}

        {/* Logout action */}
        {sessionUser && sessionUser.userType === "registered" ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors text-xs font-semibold cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
