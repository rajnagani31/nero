export type ChatMode = "general" | "code" | "debug" | "review";
export type ThemeName = "normal" | "black" | "white";
export type MessageStatus = "pending" | "streaming" | "completed" | "failed" | "stopped";
export type SelectorMode = "auto" | "manual";
export type WebMode = "off" | "on";
export type ModelName = "gpt-4o-mini" | "gpt-4o" | "gpt-5" | "gpt-5.4-mini";
export type PromptName = "general" | "code" | "debug" | "review" | "web_research";
export type ModelSelection = "auto" | ModelName;
export type PromptSelection = "auto" | PromptName;

export interface ChoiceConfig {
  mode: "manual";
  model_mode: SelectorMode;
  model_name: ModelName | null;
  prompt_mode: SelectorMode;
  prompt_name: PromptName | null;
  web_mode: WebMode;
}

export interface SourceSummary {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  summary: string;
  content_preview?: string;
  rank: number;
}

export interface MessageMetadata {
  process?: {
    execution_mode?: string | null;
    model_name?: string | null;
    prompt_name?: string | null;
    web_search_used?: boolean;
    tools_used?: string[];
  } | null;
  sources?: SourceSummary[];
  citations?: Array<{ title?: string; url?: string; rank?: number }>;
  web_search_run_id?: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status: MessageStatus;
  metadata: MessageMetadata | null;
}

export interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  mode: ChatMode;
  preview: string;
  messageCount: number;
  messagesLoaded: boolean;
  messages: Message[];
}

export interface SessionUser {
  id: number;
  publicId: string;
  sessionLabel: string;
  email: string | null;
  displayName: string | null;
  userType: "guest" | "registered";
  authProvider: string;
  emailVerified: boolean;
  sessionId: string;
  sessionExpiresAt: string;
  guestMessageLimit: number | null;
  guestMessagesUsed: number;
  remainingGuestMessages: number | null;
}

export interface AuthSessionResponse {
  access_token: string;
  token: string;
  user_id: number;
  session_label: string;
  session_id: string;
  expires_at: number;
  refresh_expires_at: number;
  user: {
    id: number;
    public_id: string;
    session_label: string;
    email: string | null;
    display_name: string | null;
    user_type: "guest" | "registered";
    auth_provider: string;
    email_verified: boolean;
    session_id: string;
    session_expires_at: string;
    guest_message_limit: number | null;
    guest_messages_used: number;
    remaining_guest_messages: number | null;
  };
}

export interface GoogleLoginUrlResponse {
  enabled: boolean;
  login_url: string | null;
  detail: string | null;
}

export interface ThreadSummaryResponse {
  id: string;
  title: string;
  mode: ChatMode;
  updated_at: string;
  last_message_at: string | null;
  preview: string;
  message_count: number;
}

export interface MessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  created_at: string;
  completed_at: string | null;
  metadata_json: MessageMetadata | null;
}

export interface ParsedStreamEvent {
  event: string;
  data: Record<string, unknown>;
}

export type ContentBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3 | 4;
      content: string;
    }
  | {
      type: "paragraph";
      content: string;
    }
  | {
      type: "list";
      ordered: boolean;
      items: string[];
    }
  | {
      type: "blockquote";
      lines: string[];
    }
  | {
      type: "code";
      language: string;
      content: string;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    };

export interface StructuredCodeExample {
  label: string;
  code: string;
  language: string;
}

export interface StructuredAnswer {
  title: string;
  subtitle: string;
  steps: string[];
  notes: string[];
  examples: StructuredCodeExample[];
}
