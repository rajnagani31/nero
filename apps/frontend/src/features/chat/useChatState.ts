import { useState, useEffect, useRef, useMemo, useCallback, KeyboardEvent } from "react";
import {
  ChatMode,
  ThemeName,
  MessageStatus,
  ModelSelection,
  PromptSelection,
  WebMode,
  ChoiceConfig,
  Message,
  Thread,
  SessionUser,
  AuthSessionResponse,
  GoogleLoginUrlResponse,
  ThreadSummaryResponse,
  MessageResponse,
  ParsedStreamEvent,
  MessageMetadata,
} from "@/types/chat";

export const ACTIVE_THREAD_STORAGE_KEY = "codebot_active_thread";
export const CLIENT_SESSION_STORAGE_KEY = "codebot_client_session_id";
export const THEME_STORAGE_KEY = "codebot_theme";
export const ACCESS_TOKEN_STORAGE_KEY = "codebot_access_token";

export const themeOptions: Array<{
  value: ThemeName;
  label: string;
  description: string;
}> = [
  { value: "normal", label: "Normal", description: "Soft charcoal workspace" },
  { value: "black", label: "Black", description: "Pure black high contrast" },
  { value: "white", label: "White", description: "Bright light canvas" },
];

export const starterPrompts = [
  "Review this function and suggest optimizations",
  "Debug why my API request is failing",
  "Generate a clean React component for a dashboard card",
  "Explain this Python stack trace in simple steps",
];

export const manualModelOptions: Array<{ value: ModelSelection; label: string }> = [
  { value: "auto", label: "Model: Auto" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-5", label: "gpt-5" },
  { value: "gpt-5.4-mini", label: "gpt-5.4-mini" },
];

export const manualPromptOptions: Array<{ value: PromptSelection; label: string }> = [
  { value: "auto", label: "Prompt: Auto" },
  { value: "general", label: "General" },
  { value: "code", label: "Code" },
  { value: "debug", label: "Debug" },
  { value: "review", label: "Review" },
];

export const manualWebOptions: Array<{ value: WebMode; label: string }> = [
  { value: "on", label: "Web On" },
  { value: "off", label: "Web Off" },
];

function buildChoiceConfig(
  modelSelection: ModelSelection,
  promptSelection: PromptSelection,
  webMode: WebMode
): ChoiceConfig {
  return {
    mode: "manual",
    model_mode: modelSelection === "auto" ? "auto" : "manual",
    model_name: modelSelection === "auto" ? null : modelSelection,
    prompt_mode: promptSelection === "auto" ? "auto" : "manual",
    prompt_name: promptSelection === "auto" ? null : promptSelection,
    web_mode: webMode,
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function safeid() {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  const randomUUID = cryptoApi && typeof (cryptoApi as any).randomUUID === "function"
    ? (cryptoApi as any).randomUUID.bind(cryptoApi)
    : null;

  if (randomUUID) return randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getClientSessionId() {
  const saved = window.localStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
  if (saved) return saved;
  const generated = `session-${safeid()}`;
  window.localStorage.setItem(CLIENT_SESSION_STORAGE_KEY, generated);
  return generated;
}

export function getInitialTheme(): ThemeName {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "normal" || saved === "black" || saved === "white") {
    return saved;
  }
  return "normal";
}

export function getStoredAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function storeAccessToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(+date)) return "recently";
  const diffHours = Math.round((Date.now() - +date) / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function mapSessionUser(user: AuthSessionResponse["user"]): SessionUser {
  return {
    id: user.id,
    publicId: user.public_id,
    sessionLabel: user.session_label,
    email: user.email,
    displayName: user.display_name,
    userType: user.user_type,
    authProvider: user.auth_provider,
    emailVerified: user.email_verified,
    sessionId: user.session_id,
    sessionExpiresAt: user.session_expires_at,
    guestMessageLimit: user.guest_message_limit,
    guestMessagesUsed: user.guest_messages_used,
    remainingGuestMessages: user.remaining_guest_messages,
  };
}

function normalizeMessageMetadata(value: unknown): MessageMetadata | null {
  if (!value || typeof value !== "object") return null;
  return value as MessageMetadata;
}

function createMessage(
  role: "user" | "assistant",
  content: string,
  overrides?: Partial<Message>
): Message {
  return {
    id: overrides?.id ?? `msg-${safeid()}`,
    role,
    content,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    status: overrides?.status ?? "completed",
    metadata: overrides?.metadata ?? null,
  };
}

function mapThreadSummary(thread: ThreadSummaryResponse, current?: Thread): Thread {
  return {
    id: thread.id,
    title: thread.title || "Untitled chat",
    mode: thread.mode || "general",
    updatedAt: thread.last_message_at ?? thread.updated_at ?? new Date().toISOString(),
    preview: thread.preview || "No messages yet",
    messageCount: thread.message_count ?? 0,
    messagesLoaded: current?.id === thread.id ? current.messagesLoaded : false,
    messages: current?.id === thread.id ? current.messages : [],
  };
}

function mapMessageResponse(message: MessageResponse): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    status: message.status,
    metadata: normalizeMessageMetadata(message.metadata_json),
  };
}

function mergeThreads(current: Thread[], incoming: ThreadSummaryResponse[]) {
  const currentMap = new Map(current.map((t) => [t.id, t]));
  return incoming
    .map((item) => mapThreadSummary(item, currentMap.get(item.id)))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

function parseSseBuffer(buffer: string) {
  const lines = buffer.split("\n");
  const events: ParsedStreamEvent[] = [];
  let remainder = "";
  let currentEvent = "";
  let currentData = "";

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trimEnd();

    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      currentData = line.slice(5).trim();
    } else if (line === "") {
      if (currentEvent && currentData) {
        try {
          events.push({
            event: currentEvent,
            data: JSON.parse(currentData),
          });
        } catch {
          // ignore corrupted json packet
        }
      }
      currentEvent = "";
      currentData = "";
    }
  }

  remainder = lines[lines.length - 1];
  return { events, remainder };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.detail || data.message || "An error occurred";
  } catch {
    return response.statusText || "Request failed";
  }
}

// ─── Custom Hook: useChatState ──────────────────────────────────────
export function useChatState() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("general");
  const [manualModelSelection, setManualModelSelection] = useState<ModelSelection>("auto");
  const [manualPromptSelection, setManualPromptSelection] = useState<PromptSelection>("auto");
  const [manualWebMode, setManualWebMode] = useState<WebMode>("on");
  const [codeContext, setCodeContext] = useState("");
  const [showCodeContext, setShowCodeContext] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{
    assistantMessageId: string;
    stage: string;
    label: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });

  const abortRef = useRef<AbortController | null>(null);
  const bootstrapStartedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeThread = useMemo(() => {
    return threads.find((thread) => thread.id === activeThreadId) ?? null;
  }, [threads, activeThreadId]);

  const isGuestSession = !sessionUser || sessionUser.userType === "guest";

  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const accessToken = getStoredAccessToken();
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });

    if (response.status === 401 && !String(input).includes("/api/auth/")) {
      try {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (refreshResponse.ok) {
          const session = (await refreshResponse.json()) as AuthSessionResponse;
          storeAccessToken(session.access_token);
          const retryHeaders = new Headers(init?.headers);
          retryHeaders.set("Authorization", `Bearer ${session.access_token}`);
          return fetch(input, {
            ...init,
            headers: retryHeaders,
            credentials: "include",
          });
        }
      } catch {
        // refresh failed
      }
    }

    return response;
  }, []);

  const loadThreadsFromApi = useCallback(async (preferredThreadId?: string | null) => {
    const response = await authFetch("/api/threads");
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    const data = (await response.json()) as ThreadSummaryResponse[];
    setThreads((current) => mergeThreads(current, data));
    setActiveThreadId((current) => {
      const nextId = preferredThreadId ?? current;
      if (nextId && data.some((thread) => thread.id === nextId)) {
        return nextId;
      }
      return data[0]?.id ?? null;
    });
  }, [authFetch]);

  const loadMessagesForThread = useCallback(async (threadId: string) => {
    if (!sessionUser) return;
    setIsLoadingMessages(true);
    try {
      const response = await authFetch(`/api/threads/${threadId}/messages`);
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const data = (await response.json()) as MessageResponse[];
      const nextMessages = data.map(mapMessageResponse);

      setThreads((current) =>
        current
          .map((thread) => {
            if (thread.id !== threadId) return thread;
            return {
              ...thread,
              messages: nextMessages,
              messagesLoaded: true,
              preview: nextMessages[nextMessages.length - 1]?.content ?? thread.preview,
              messageCount: nextMessages.length,
              updatedAt: nextMessages[nextMessages.length - 1]?.createdAt ?? thread.updatedAt,
            };
          })
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load chat messages.");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [authFetch, sessionUser]);

  const bootstrapSession = useCallback(async () => {
    let meResponse = await authFetch("/api/auth/me");
    if (meResponse.status === 401) {
      const refreshResponse = await authFetch("/api/auth/refresh", { method: "POST" });
      if (refreshResponse.ok) {
        const refreshedSession = (await refreshResponse.json()) as AuthSessionResponse;
        storeAccessToken(refreshedSession.access_token);
        setSessionUser(mapSessionUser(refreshedSession.user));
        return;
      }
      storeAccessToken(null);
      meResponse = await fetch("/api/auth/me", { credentials: "include" });
    }

    if (meResponse.ok) {
      const user = (await meResponse.json()) as AuthSessionResponse["user"];
      setSessionUser(mapSessionUser(user));
      return;
    }

    const guestResponse = await authFetch("/api/auth/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_session_id: getClientSessionId() }),
    });

    if (!guestResponse.ok) {
      throw new Error(await readErrorMessage(guestResponse));
    }

    const session = (await guestResponse.json()) as AuthSessionResponse;
    storeAccessToken(session.access_token);
    setSessionUser(mapSessionUser(session.user));
  }, [authFetch]);

  useEffect(() => {
    if (bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await bootstrapSession();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize session.");
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [bootstrapSession]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!sessionUser) return;
    const preferredThreadId = window.localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY);
    void loadThreadsFromApi(preferredThreadId).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load chats.");
    });
  }, [sessionUser, loadThreadsFromApi]);

  useEffect(() => {
    if (!activeThreadId) {
      window.localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, activeThreadId, isStreaming]);

  useEffect(() => {
    if (!sessionUser || !activeThreadId) return;
    const thread = threads.find((entry) => entry.id === activeThreadId);
    if (!thread || thread.messagesLoaded) return;
    void loadMessagesForThread(activeThreadId);
  }, [sessionUser, activeThreadId, threads, loadMessagesForThread]);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.preview.toLowerCase().includes(query)
    );
  }, [threads, search]);

  const updateThreadMessages = useCallback(
    (threadId: string, updater: (messages: Message[]) => Message[], nextTitle?: string) => {
      setThreads((current) =>
        current
          .map((thread) => {
            if (thread.id !== threadId) return thread;
            const nextMessages = updater(thread.messages);
            const lastMessage = nextMessages[nextMessages.length - 1];
            return {
              ...thread,
              title: nextTitle ?? thread.title,
              updatedAt: new Date().toISOString(),
              preview: lastMessage?.content ?? thread.preview,
              messageCount: nextMessages.length,
              messagesLoaded: true,
              messages: nextMessages,
            };
          })
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      );
    },
    []
  );

  const createThread = async (firstPrompt?: string) => {
    if (!sessionUser) throw new Error("Session not ready.");
    const response = await authFetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: firstPrompt?.slice(0, 48) || "New conversation",
        mode,
        client_session_id: getClientSessionId(),
      }),
    });

    if (!response.ok) throw new Error(await readErrorMessage(response));
    const thread = (await response.json()) as ThreadSummaryResponse;
    const newThread = mapThreadSummary(thread);
    setThreads((current) => [newThread, ...current]);
    setActiveThreadId(thread.id);
    return thread.id;
  };

  const deleteThread = async (threadId: string) => {
    try {
      const response = await authFetch(`/api/threads/${threadId}`, { method: "DELETE" });
      if (response.ok) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        if (activeThreadId === threadId) {
          setActiveThreadId(null);
        }
      }
    } catch {
      // fallback delete from local state
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    }
  };

  const startFreshChat = () => {
    if (isStreaming) return;
    setInput("");
    setError("");
    setCodeContext("");
    setShowCodeContext(false);
    setActiveThreadId(null);
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  };

  const sendMessage = async (presetPrompt?: string) => {
    const prompt = (presetPrompt ?? input).trim();
    if (!prompt || isStreaming || !sessionUser) return;

    setError("");
    setInput("");
    setStreamProgress(null);

    let threadId = activeThread?.id;
    const choiceConfig = buildChoiceConfig(manualModelSelection, manualPromptSelection, manualWebMode);

    if (!threadId) {
      try {
        threadId = await createThread(prompt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create chat.");
        return;
      }
    }

    const title = prompt.slice(0, 48);
    const tempUserMessageId = `temp-user-${uid()}`;
    const tempAssistantMessageId = `temp-assistant-${uid()}`;
    const optimisticUserMessage = createMessage("user", prompt, {
      id: tempUserMessageId,
      status: "completed",
    });
    const optimisticAssistantMessage = createMessage("assistant", "", {
      id: tempAssistantMessageId,
      status: "streaming",
      metadata: null,
    });

    updateThreadMessages(
      threadId,
      (messages) => [...messages, optimisticUserMessage, optimisticAssistantMessage],
      title
    );
    setActiveThreadId(threadId);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let currentAssistantMessageId = tempAssistantMessageId;
    let sseBuffer = "";

    try {
      const response = await authFetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          query: prompt,
          code: codeContext || null,
          mode,
          choice_config: choiceConfig,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parsed = parseSseBuffer(sseBuffer);
        sseBuffer = parsed.remainder;

        for (const event of parsed.events) {
          if (event.event === "message.created") {
            const payload = event.data as any;
            currentAssistantMessageId = payload.assistant_message.id;
            updateThreadMessages(threadId, (messages) =>
              messages.map((m) => {
                if (m.id === tempUserMessageId) {
                  return { ...m, id: payload.user_message.id, createdAt: payload.user_message.created_at };
                }
                if (m.id === tempAssistantMessageId) {
                  return { ...m, id: payload.assistant_message.id, createdAt: payload.assistant_message.created_at };
                }
                return m;
              })
            );
          }

          if (event.event === "message.delta") {
            const payload = event.data as { assistant_message_id: string; delta: string };
            currentAssistantMessageId = payload.assistant_message_id;
            updateThreadMessages(threadId, (messages) =>
              messages.map((m) =>
                m.id === currentAssistantMessageId || m.id === tempAssistantMessageId
                  ? { ...m, id: currentAssistantMessageId, content: `${m.content}${payload.delta}`, status: "streaming" }
                  : m
              )
            );
          }

          if (event.event === "message.progress") {
            const payload = event.data as { assistant_message_id: string; stage: string; label: string };
            setStreamProgress({
              assistantMessageId: payload.assistant_message_id,
              stage: payload.stage,
              label: payload.label,
            });
          }

          if (event.event === "message.sources") {
            const payload = event.data as { assistant_message_id: string; metadata_json: MessageMetadata | null };
            updateThreadMessages(threadId, (messages) =>
              messages.map((m) =>
                m.id === payload.assistant_message_id || m.id === tempAssistantMessageId
                  ? { ...m, metadata: normalizeMessageMetadata(payload.metadata_json) }
                  : m
              )
            );
          }

          if (event.event === "message.completed") {
            const payload = event.data as { assistant_message_id: string; content: string; metadata_json?: MessageMetadata | null };
            currentAssistantMessageId = payload.assistant_message_id;
            setStreamProgress(null);
            updateThreadMessages(threadId, (messages) =>
              messages.map((m) =>
                m.id === currentAssistantMessageId || m.id === tempAssistantMessageId
                  ? {
                      ...m,
                      id: currentAssistantMessageId,
                      content: payload.content ?? m.content,
                      status: "completed",
                      metadata: normalizeMessageMetadata(payload.metadata_json),
                    }
                  : m
              )
            );
          }

          if (event.event === "message.failed") {
            const payload = event.data as { assistant_message_id: string; error?: string };
            currentAssistantMessageId = payload.assistant_message_id;
            setError(payload.error || "Streaming failed.");
            setStreamProgress(null);
            updateThreadMessages(threadId, (messages) =>
              messages.map((m) =>
                m.id === currentAssistantMessageId || m.id === tempAssistantMessageId
                  ? { ...m, id: currentAssistantMessageId, status: "failed" }
                  : m
              )
            );
          }

          if (event.event === "user.updated") {
            const payload = event.data as { user: AuthSessionResponse["user"] };
            if (payload.user) {
              setSessionUser(mapSessionUser(payload.user));
            }
          }
        }
      }
    } catch (streamError) {
      const msg = streamError instanceof Error
        ? streamError.name === "AbortError"
          ? "Generation stopped."
          : streamError.message
        : "Unknown streaming error";

      setError(msg);
      setStreamProgress(null);
      updateThreadMessages(threadId, (messages) =>
        messages.map((m) =>
          m.id === currentAssistantMessageId || m.id === tempAssistantMessageId
            ? { ...m, id: currentAssistantMessageId, status: "stopped" }
            : m
        )
      );
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setStreamProgress(null);
    }
  };

  const handleComposerKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await sendMessage();
    }
  };

  const openAuthDialog = (view: "login" | "signup") => {
    setError("");
    setAuthView(view);
    setIsAuthDialogOpen(true);
  };

  const submitAuthForm = async () => {
    const normalizedEmail = authEmail.trim();
    if (!normalizedEmail || !authPassword.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsAuthSubmitting(true);
    setError("");

    try {
      const response = await authFetch(authView === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: authPassword,
          display_name: authView === "signup" ? authName.trim() || null : null,
          client_session_id: getClientSessionId(),
        }),
      });

      if (!response.ok) throw new Error(await readErrorMessage(response));
      const session = (await response.json()) as AuthSessionResponse;
      storeAccessToken(session.access_token);
      setSessionUser(mapSessionUser(session.user));
      setIsAuthDialogOpen(false);
      setAuthPassword("");
      await loadThreadsFromApi();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setError("");
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
      storeAccessToken(null);
      setSessionUser(null);
      setThreads([]);
      setActiveThreadId(null);
      setIsSettingsOpen(false);
      await bootstrapSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const response = await authFetch("/api/auth/google/url");
      if (!response.ok) throw new Error(await readErrorMessage(response));
      const payload = (await response.json()) as GoogleLoginUrlResponse;
      if (!payload.enabled || !payload.login_url) {
        throw new Error(payload.detail || "Google login is not configured.");
      }
      window.location.assign(payload.login_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed.");
    }
  };

  return {
    threads,
    filteredThreads,
    activeThreadId,
    activeThread,
    setActiveThreadId,
    input,
    setInput,
    mode,
    setMode,
    manualModelSelection,
    setManualModelSelection,
    manualPromptSelection,
    setManualPromptSelection,
    manualWebMode,
    setManualWebMode,
    codeContext,
    setCodeContext,
    showCodeContext,
    setShowCodeContext,
    isStreaming,
    streamProgress,
    error,
    setError,
    search,
    setSearch,
    sessionUser,
    isBootstrapping,
    isLoadingMessages,
    isAuthDialogOpen,
    setIsAuthDialogOpen,
    authView,
    setAuthView,
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    isAuthSubmitting,
    theme,
    setTheme,
    isSettingsOpen,
    setIsSettingsOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    isGuestSession,
    messagesEndRef,
    textAreaRef,
    createThread,
    deleteThread,
    startFreshChat,
    stopStreaming,
    sendMessage,
    handleComposerKeyDown,
    openAuthDialog,
    submitAuthForm,
    handleLogout,
    handleGoogleLogin,
    handleThreadSelect: (threadId: string) => {
      setActiveThreadId(threadId);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    },
  };
}
