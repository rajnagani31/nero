import React from "react";
import { Bot, User, Cpu, Wrench, Globe, Check, Copy } from "lucide-react";
import { Message } from "@/types/chat";
import {
  MarkdownContent,
  SourceCards,
  AssistantProgress,
} from "./MarkdownContent";
import { formatRelativeTime } from "./useChatState";
import { cn } from "@/utils/cn";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamProgress?: { stage: string; label: string } | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(
  ({ message, isStreaming = false, streamProgress = null }) => {
    const isUser = message.role === "user";
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // copy failed
      }
    };

    const process = message.metadata?.process;
    const sources = message.metadata?.sources;

    return (
      <div
        className={cn(
          "group flex gap-3 px-4 py-3 transition-colors",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {!isUser ? (
          <div className="w-7 h-7 rounded-lg bg-[var(--nero-gd,#0f2e22)] text-[var(--nero-g,#19e68c)] border border-[var(--nero-g,#19e68c)]/30 flex items-center justify-center shrink-0 mt-1 shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
        ) : null}

        <div
          className={cn(
            "max-w-[85%] sm:max-w-[78%] rounded-xl text-sm space-y-2",
            isUser
              ? "bg-[var(--nero-sf2,#1a1a1a)] border border-[var(--nero-bd,#262626)] text-[var(--nero-tx,#ededed)] p-3.5"
              : "bg-transparent text-[var(--nero-tx,#ededed)] w-full py-1"
          )}
        >
          {/* Metadata pill for assistant (Model, Tools, Web Search) */}
          {!isUser && process ? (
            <div className="flex flex-wrap items-center gap-2 pb-1 text-[11px] font-mono text-[var(--nero-mu,#9a9a9a)]">
              {process.model_name ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-[var(--nero-tx,#ededed)]">
                  <Cpu className="h-3 w-3 text-[var(--nero-g,#19e68c)]" />
                  <span>{process.model_name}</span>
                </span>
              ) : null}

              {process.web_search_used ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] text-emerald-400">
                  <Globe className="h-3 w-3" />
                  <span>Web research</span>
                </span>
              ) : null}

              {process.tools_used && process.tools_used.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)]">
                  <Wrench className="h-3 w-3 text-amber-400" />
                  <span>{process.tools_used.join(", ")}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Live Progress for Assistant Message */}
          {!isUser && isStreaming && streamProgress ? (
            <AssistantProgress label={streamProgress.label} />
          ) : null}

          {/* Message Body */}
          {isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
          ) : (
            <MarkdownContent content={message.content} isStreaming={isStreaming} />
          )}

          {/* Sources and Citations if web search was used */}
          {!isUser && sources && sources.length > 0 ? (
            <SourceCards sources={sources} />
          ) : null}

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--nero-mu,#9a9a9a)] opacity-70 group-hover:opacity-100 transition-opacity">
            <span className="font-mono text-[10px]">
              {formatRelativeTime(message.createdAt)}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-[var(--nero-tx,#ededed)] transition-colors p-1 rounded"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {isUser ? (
          <div className="w-7 h-7 rounded-lg bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-tx,#ededed)] border border-[var(--nero-bd,#262626)] flex items-center justify-center shrink-0 mt-1">
            <User className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    );
  }
);
MessageBubble.displayName = "MessageBubble";
