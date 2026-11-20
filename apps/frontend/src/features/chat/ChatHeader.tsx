import React from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  Globe,
  Cpu,
  SlidersHorizontal,
  Sun,
  Moon,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ModelSelection,
  PromptSelection,
  WebMode,
  ThemeName,
} from "@/types/chat";
import {
  manualModelOptions,
  manualPromptOptions,
  themeOptions,
} from "./useChatState";
import { cn } from "@/utils/cn";

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  modelSelection: ModelSelection;
  onModelChange: (model: ModelSelection) => void;
  promptSelection: PromptSelection;
  onPromptChange: (prompt: PromptSelection) => void;
  webMode: WebMode;
  onWebModeToggle: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  threadTitle?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onToggleSidebar,
  modelSelection,
  onModelChange,
  promptSelection,
  onPromptChange,
  webMode,
  onWebModeToggle,
  theme,
  onThemeChange,
  threadTitle,
}) => {
  return (
    <header className="h-14 px-4 border-b border-[var(--nero-bd,#262626)] bg-[var(--nero-bg,#0a0a0a)] flex items-center justify-between gap-3 shrink-0 font-sans z-10">
      {/* ─── Left: Sidebar Toggle & Title ─────────────────────────── */}
      <div className="flex items-center gap-3 truncate">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="h-8 w-8 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-sm text-[var(--nero-tx,#ededed)] truncate">
            {threadTitle || "New Conversation"}
          </span>
        </div>
      </div>

      {/* ─── Center / Right Controls ──────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Model Selector Dropdown */}
        <div className="hidden sm:block w-[130px]">
          <Select
            value={modelSelection}
            onValueChange={(val) => onModelChange(val as ModelSelection)}
          >
            <SelectTrigger className="h-8 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {manualModelOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt Mode Selector */}
        <div className="hidden md:block w-[120px]">
          <Select
            value={promptSelection}
            onValueChange={(val) => onPromptChange(val as PromptSelection)}
          >
            <SelectTrigger className="h-8 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {manualPromptOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Web Search Toggle Pill */}
        <button
          type="button"
          onClick={onWebModeToggle}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-mono transition-colors cursor-pointer",
            webMode === "on"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)]"
          )}
          title="Toggle live web search"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Web {webMode === "on" ? "On" : "Off"}</span>
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={() =>
            onThemeChange(
              theme === "normal" ? "black" : theme === "black" ? "white" : "normal"
            )
          }
          className="h-8 px-2 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] flex items-center gap-1 text-xs transition-colors cursor-pointer"
          title={`Theme: ${theme}`}
        >
          {theme === "white" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline text-[11px] font-mono capitalize">{theme}</span>
        </button>

        {/* Link back to Nero Dashboard */}
        <Link
          to="/dashboard/analytics"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-xs text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-g,#19e68c)] transition-colors"
          title="Return to Nero Dashboard"
        >
          <LayoutDashboard className="h-3.5 w-3.5 text-[var(--nero-g,#19e68c)]" />
          <span className="hidden lg:inline">Dashboard</span>
        </Link>
      </div>
    </header>
  );
};
