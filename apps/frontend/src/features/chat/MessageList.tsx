import React from "react";
import { Bot, Sparkles, Loader2 } from "lucide-react";
import { Thread } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { starterPrompts } from "./useChatState";

interface MessageListProps {
  activeThread: Thread | null;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamProgress: { assistantMessageId: string; stage: string; label: string } | null;
  onSelectPrompt: (prompt: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({
  activeThread,
  isLoadingMessages,
  isStreaming,
  streamProgress,
  onSelectPrompt,
  messagesEndRef,
}) => {
  const messages = activeThread?.messages || [];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
      {isLoadingMessages ? (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--nero-mu,#9a9a9a)] font-mono text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--nero-g,#19e68c)]" />
          <span>Loading messages…</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="h-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center p-6 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--nero-gd,#0f2e22)] border border-[var(--nero-g,#19e68c)]/40 text-[var(--nero-g,#19e68c)] flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-[var(--nero-tx,#ededed)]">
              How can Codebot help you today?
            </h2>
            <p className="text-xs text-[var(--nero-mu,#9a9a9a)] max-w-md">
              Ask about architecture decisions, debug complex tracebacks, write clean React/Python code, or review pull request diffs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
            {starterPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(prompt)}
                className="p-3.5 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] hover:border-[var(--nero-g,#19e68c)] hover:bg-[var(--nero-sf2,#1a1a1a)] transition-all text-xs text-[var(--nero-tx,#ededed)] group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1 text-[var(--nero-mu,#9a9a9a)] group-hover:text-[var(--nero-g,#19e68c)] font-mono text-[10px] uppercase">
                  <Sparkles className="h-3 w-3" />
                  <span>Prompt #{i + 1}</span>
                </div>
                <div className="font-medium">{prompt}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-2">
          {messages.map((message) => {
            const isThisStreaming =
              isStreaming &&
              message.role === "assistant" &&
              (message.status === "streaming" ||
                message.id === streamProgress?.assistantMessageId);

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isThisStreaming}
                streamProgress={
                  message.id === streamProgress?.assistantMessageId
                    ? streamProgress
                    : null
                }
              />
            );
          })}
        </div>
      )}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};
