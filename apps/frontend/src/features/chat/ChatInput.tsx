import React, { useRef, useEffect } from "react";
import {
  Send,
  Square,
  Code2,
  Bug,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { ChatMode } from "@/types/chat";
import { cn } from "@/utils/cn";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isStreaming: boolean;
  onStop: () => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  codeContext: string;
  onCodeContextChange: (value: string) => void;
  showCodeContext: boolean;
  onToggleCodeContext: () => void;
  error?: string;
  disabled?: boolean;
  guestMessagesRemaining?: number | null;
}

const MODES: Array<{ value: ChatMode; label: string; icon: React.ReactNode }> = [
  { value: "general", label: "General", icon: <MessageSquare className="h-3 w-3" /> },
  { value: "code", label: "Code", icon: <Code2 className="h-3 w-3" /> },
  { value: "debug", label: "Debug", icon: <Bug className="h-3 w-3" /> },
  { value: "review", label: "Review", icon: <Search className="h-3 w-3" /> },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  onInputChange,
  onKeyDown,
  onSend,
  isStreaming,
  onStop,
  mode,
  onModeChange,
  codeContext,
  onCodeContextChange,
  showCodeContext,
  onToggleCodeContext,
  error,
  disabled = false,
  guestMessagesRemaining,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-expand textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  return (
    <div className="p-4 border-t border-[var(--nero-bd,#262626)] bg-[var(--nero-bg,#0a0a0a)] font-sans">
      <div className="max-w-3xl mx-auto space-y-2.5">
        {/* Error notification */}
        {error ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        ) : null}

        {/* Mode Selector Pill Bar & Code Context Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onModeChange(m.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer",
                  mode === m.value
                    ? "bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold shadow-sm"
                    : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:bg-[var(--nero-sf2,#1a1a1a)]"
                )}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleCodeContext}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded transition-colors cursor-pointer",
              showCodeContext || codeContext
                ? "text-[var(--nero-g,#19e68c)] bg-[var(--nero-gd,#0f2e22)]/30 border border-[var(--nero-g,#19e68c)]/30"
                : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)]"
            )}
          >
            <Code2 className="h-3 w-3" />
            <span className="hidden sm:inline">Code Context</span>
            {showCodeContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Optional Collapsible Code Context Drawer */}
        {showCodeContext ? (
          <div className="rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-2.5 space-y-1 animate-fade-in font-mono">
            <div className="flex items-center justify-between text-[11px] text-[var(--nero-mu,#9a9a9a)]">
              <span>Attached Code / Traceback</span>
              {codeContext ? (
                <button
                  type="button"
                  onClick={() => onCodeContextChange("")}
                  className="text-rose-400 hover:underline"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <textarea
              value={codeContext}
              onChange={(e) => onCodeContextChange(e.target.value)}
              placeholder="Paste relevant snippet, diff, or traceback here…"
              rows={4}
              className="w-full bg-transparent text-xs text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none resize-none font-mono leading-relaxed"
            />
          </div>
        ) : null}

        {/* Main Textarea Container */}
        <div className="relative flex items-end rounded-xl border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] px-3.5 py-2.5 transition-colors focus-within:border-[var(--nero-g,#19e68c)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              isStreaming
                ? "Codebot is replying…"
                : "Ask Codebot anything (Enter to send, Shift+Enter for newline)…"
            }
            disabled={disabled || isStreaming}
            rows={1}
            className="w-full max-h-[200px] bg-transparent text-sm text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors text-xs font-mono font-semibold cursor-pointer"
                title="Stop generation"
              >
                <Square className="h-3.5 w-3.5 fill-current mr-1" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                disabled={!input.trim() || disabled}
                className="h-8 w-8 rounded-lg bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer shadow-sm"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Guest limit indicator */}
        {guestMessagesRemaining !== null && guestMessagesRemaining !== undefined ? (
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--nero-mu,#9a9a9a)] px-1">
            <span>Guest session active</span>
            <span className={guestMessagesRemaining <= 2 ? "text-amber-400 font-semibold" : ""}>
              {guestMessagesRemaining} message{guestMessagesRemaining === 1 ? "" : "s"} remaining
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
