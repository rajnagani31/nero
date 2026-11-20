import React, { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { Copy, Check, ExternalLink, Globe } from "lucide-react";
import {
  ContentBlock,
  SourceSummary,
  StructuredAnswer,
  StructuredCodeExample,
} from "@/types/chat";

// ─── Inline Formatting Parser ───────────────────────────────────────
export function renderInlineContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const [token] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      nodes.push(content.slice(lastIndex, start));
    }

    if (token.startsWith("`")) {
      nodes.push(
        <code className="assistant-inline-code" key={`inline-code-${tokenIndex}`}>
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`strong-${tokenIndex}`} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            className="text-[var(--accent-link)] underline decoration-[color:var(--accent-link-decoration)] underline-offset-4 transition hover:opacity-80"
            href={linkMatch[2]}
            key={`link-${tokenIndex}`}
            rel="noreferrer"
            target="_blank"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = start + token.length;
    tokenIndex += 1;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}

// ─── Block Parsers ──────────────────────────────────────────────────
function isSpecialBlockStart(line: string) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("```") ||
    /^#{1,4}\s+/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^[-*]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^\|.*\|$/.test(trimmed)
  );
}

function isPotentialTableRow(line: string) {
  return /^\|.*\|$/.test(line.trim());
}

function isTableSeparatorRow(line: string) {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line.trim());
}

function parseTableRow(line: string) {
  const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => cell.trim());
}

export function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeMatch = trimmed.match(/^```([\w+-]*)\s*$/);
    if (codeMatch) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: "code",
        language: codeMatch[1] || "text",
        content: codeLines.join("\n").trimEnd(),
      });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4,
        content: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current) break;

        const matcher = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
        const match = current.match(matcher);
        if (!match) break;

        items.push(match[1].trim());
        index += 1;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (isPotentialTableRow(trimmed)) {
      const tableLines: string[] = [];
      while (index < lines.length && isPotentialTableRow(lines[index])) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      if (tableLines.length >= 2) {
        const rawRows = tableLines
          .filter((tableLine) => !isTableSeparatorRow(tableLine))
          .map(parseTableRow)
          .filter((row) => row.some((cell) => cell));

        if (rawRows.length >= 2) {
          const columnCount = Math.max(...rawRows.map((row) => row.length));
          const normalizedRows = rawRows.map((row) =>
            Array.from({ length: columnCount }, (_, cellIndex) => row[cellIndex] ?? "")
          );

          blocks.push({
            type: "table",
            headers: normalizedRows[0],
            rows: normalizedRows.slice(1),
          });
          continue;
        }
      }

      blocks.push({
        type: "paragraph",
        content: tableLines.join(" "),
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index];
      const currentTrimmed = current.trim();

      if (!currentTrimmed || isSpecialBlockStart(current)) {
        break;
      }

      paragraphLines.push(currentTrimmed);
      index += 1;
    }

    if (paragraphLines.length) {
      blocks.push({
        type: "paragraph",
        content: paragraphLines.join(" "),
      });
      continue;
    }

    index += 1;
  }

  return blocks;
}

// ─── Structured Answer Parser ───────────────────────────────────────
export function parseStructuredAnswer(content: string): StructuredAnswer | null {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const titleMarkerIndex = lines.findIndex((line) =>
    /^#*\s*title\s*:/i.test(line.trim())
  );

  if (titleMarkerIndex === -1) {
    return null;
  }

  const rawTitle = lines[titleMarkerIndex].replace(/^#*\s*title\s*:/i, "").trim();
  if (!rawTitle) return null;

  let subtitle = "";
  const subtitleIndex = lines.findIndex((line) =>
    /^#*\s*subtitle\s*:/i.test(line.trim())
  );
  if (subtitleIndex !== -1) {
    subtitle = lines[subtitleIndex].replace(/^#*\s*subtitle\s*:/i, "").trim();
  }

  const steps: string[] = [];
  const notes: string[] = [];
  const examples: StructuredCodeExample[] = [];

  let currentSection: "none" | "steps" | "notes" | "examples" = "none";
  let exampleLabel = "Snippet";
  let exampleLines: string[] = [];
  let exampleLang = "typescript";

  for (let i = titleMarkerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^#*\s*steps\s*:/i.test(trimmed)) {
      currentSection = "steps";
      continue;
    } else if (/^#*\s*notes\s*:/i.test(trimmed)) {
      currentSection = "notes";
      continue;
    } else if (/^#*\s*examples?\s*:/i.test(trimmed)) {
      currentSection = "examples";
      continue;
    }

    if (currentSection === "steps") {
      const stepMatch = trimmed.match(/^[-*\d.]+\s*(.+)$/);
      if (stepMatch) {
        steps.push(stepMatch[1]);
      }
    } else if (currentSection === "notes") {
      const noteMatch = trimmed.match(/^[-*\d.]+\s*(.+)$/);
      if (noteMatch) {
        notes.push(noteMatch[1]);
      }
    } else if (currentSection === "examples") {
      if (trimmed.startsWith("```")) {
        if (exampleLines.length > 0) {
          examples.push({
            label: exampleLabel,
            code: exampleLines.join("\n"),
            language: exampleLang,
          });
          exampleLines = [];
        } else {
          exampleLang = trimmed.replace("```", "").trim() || "typescript";
        }
      } else {
        exampleLines.push(line);
      }
    }
  }

  if (exampleLines.length > 0) {
    examples.push({
      label: exampleLabel,
      code: exampleLines.join("\n"),
      language: exampleLang,
    });
  }

  if (!steps.length && !notes.length && !examples.length) {
    return null;
  }

  return {
    title: rawTitle,
    subtitle,
    steps,
    notes,
    examples,
  };
}

// ─── Copy Button ────────────────────────────────────────────────────
export const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      className="assistant-copy-button inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
      onClick={() => void handleCopy()}
      type="button"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-zinc-400" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};

// ─── Code Surface ───────────────────────────────────────────────────
export const CodeSurface: React.FC<{
  content: string;
  language: string;
  label?: string;
}> = ({ content, language, label = "Code" }) => {
  return (
    <div className="assistant-codeblock my-3 rounded-lg border border-[var(--assistant-border)] bg-[var(--assistant-code-surface)] overflow-hidden font-mono text-xs">
      <div className="assistant-codeblock-header flex items-center justify-between px-3.5 py-2 border-b border-[var(--assistant-border)] bg-[var(--assistant-code-header-bg)] text-[var(--assistant-muted)]">
        <div className="assistant-codeblock-meta flex items-center gap-2 text-[11px]">
          <span className="uppercase font-semibold text-[var(--nero-g,#19e68c)]">{language}</span>
          <span>•</span>
          <span>{label}</span>
        </div>
        <CopyButton value={content} />
      </div>
      <pre className="assistant-codeblock-pre p-4 overflow-x-auto text-[var(--assistant-code-text)] leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  );
};

// ─── Table Block ────────────────────────────────────────────────────
export const TableBlockContent: React.FC<{
  headers: string[];
  rows: string[][];
}> = ({ headers, rows }) => {
  return (
    <div className="assistant-table-wrap my-3 rounded-lg border border-[var(--assistant-border)] overflow-x-auto">
      <table className="assistant-table w-full text-xs text-left">
        <thead>
          <tr className="border-b border-[var(--assistant-border)] bg-[var(--assistant-code-header-bg)]">
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5 font-semibold text-[var(--assistant-muted)]">
                {renderInlineContent(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--assistant-border)] last:border-0 hover:bg-white/[0.02]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3.5 py-2">
                  {renderInlineContent(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Structured Answer Content ──────────────────────────────────────
export const StructuredAnswerContent: React.FC<{ answer: StructuredAnswer }> = ({ answer }) => {
  return (
    <article className="assistant-structured space-y-4">
      <header className="assistant-structured-hero p-4 rounded-lg border border-[var(--assistant-border)] bg-[var(--assistant-hero-bg)]">
        <span className="assistant-structured-tag text-[10px] font-mono uppercase tracking-wider text-[var(--nero-g,#19e68c)]">
          Solution
        </span>
        <h2 className="assistant-structured-title text-base font-semibold text-[var(--text-primary)] mt-1">
          {answer.title}
        </h2>
        {answer.subtitle ? (
          <p className="assistant-structured-subtitle text-xs text-[var(--assistant-muted)] mt-1">
            {answer.subtitle}
          </p>
        ) : null}
      </header>

      {answer.steps.length ? (
        <section className="assistant-structured-section space-y-2">
          <span className="assistant-structured-tag text-[10px] font-mono uppercase tracking-wider text-[var(--assistant-muted)]">
            Steps
          </span>
          <div className="assistant-step-list space-y-2">
            {answer.steps.map((step, index) => (
              <article
                className="assistant-step-card flex items-start gap-3 p-3 rounded border border-[var(--assistant-border)] bg-[var(--assistant-card-bg)] text-xs"
                key={`step-${index}`}
              >
                <span className="assistant-step-index font-mono font-bold text-[var(--nero-g,#19e68c)] shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="assistant-step-text leading-relaxed text-[var(--assistant-body)]">
                  {renderInlineContent(step)}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {answer.notes.length ? (
        <section className="assistant-structured-section space-y-2">
          <span className="assistant-structured-tag text-[10px] font-mono uppercase tracking-wider text-[var(--assistant-muted)]">
            Key Considerations
          </span>
          <div className="assistant-note-list space-y-2">
            {answer.notes.map((note, index) => (
              <article
                className="assistant-note-card p-3 rounded border border-[var(--assistant-border)] bg-[var(--assistant-card-bg)] text-xs"
                key={`note-${index}`}
              >
                <div className="assistant-note-text text-[var(--assistant-body)] leading-relaxed">
                  {renderInlineContent(note)}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {answer.examples.length ? (
        <section className="assistant-structured-section space-y-2">
          <span className="assistant-structured-tag text-[10px] font-mono uppercase tracking-wider text-[var(--assistant-muted)]">
            Code Implementation
          </span>
          <div className="assistant-example-stack space-y-3">
            {answer.examples.map((example, index) => (
              <section className="assistant-example-card" key={`structured-example-${index}`}>
                <p className="assistant-example-title text-xs font-medium text-[var(--text-primary)] mb-1">
                  {example.label}
                </p>
                <CodeSurface content={example.code} label="Snippet" language={example.language} />
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
};

// ─── Source Citations Cards ─────────────────────────────────────────
export const SourceCards: React.FC<{ sources: SourceSummary[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--assistant-border)] space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--assistant-muted)]">
        <Globe className="h-3 w-3 text-[var(--nero-g,#19e68c)]" />
        <span>Sources & Citations ({sources.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 p-2.5 rounded border border-[var(--assistant-border)] bg-[var(--assistant-code-surface)] hover:border-[var(--nero-g,#19e68c)] transition-colors text-xs group"
          >
            <div className="w-5 h-5 rounded bg-white/[0.04] text-[var(--nero-g,#19e68c)] flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
              {src.rank || i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--nero-g,#19e68c)] transition-colors">
                {src.title}
              </div>
              <div className="font-mono text-[10px] text-[var(--assistant-muted)] truncate">
                {src.domain || src.url}
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-zinc-500 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
};

// ─── Assistant Progress Indicator ───────────────────────────────────
export const AssistantProgress: React.FC<{ label: string | null }> = ({ label }) => {
  if (!label) return null;

  return (
    <div className="assistant-progress inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--assistant-border)] bg-[var(--assistant-card-bg)] text-xs font-mono text-[var(--nero-g,#19e68c)] mb-3 animate-fade-in">
      <span className="assistant-progress-dot h-2 w-2 rounded-full bg-[var(--nero-g,#19e68c)] animate-pulse" />
      <span>{label}</span>
    </div>
  );
};

// ─── Main Markdown Content Renderer ─────────────────────────────────
export const MarkdownContent: React.FC<{
  content: string;
  isStreaming?: boolean;
}> = ({ content, isStreaming = false }) => {
  const structuredAnswer = useMemo(() => parseStructuredAnswer(content), [content]);
  const blocks = useMemo(() => parseContentBlocks(content), [content]);

  if (!content) {
    return <p className="assistant-thinking text-xs font-mono text-[var(--assistant-thinking)]">{isStreaming ? "Thinking…" : ""}</p>;
  }

  if (structuredAnswer) {
    return <StructuredAnswerContent answer={structuredAnswer} />;
  }

  if (!blocks.length) {
    return <p className="assistant-paragraph text-sm leading-relaxed text-[var(--assistant-body)]">{content}</p>;
  }

  return (
    <div className="assistant-markdown space-y-3 text-sm leading-relaxed text-[var(--assistant-body)]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
          return (
            <Tag key={`h-${index}`} className="font-semibold text-[var(--text-primary)] tracking-tight pt-2">
              {renderInlineContent(block.content)}
            </Tag>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`p-${index}`} className="assistant-paragraph text-sm leading-relaxed">
              {renderInlineContent(block.content)}
            </p>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={`q-${index}`}
              className="assistant-quote border-l-2 border-[var(--nero-g,#19e68c)] pl-3.5 my-2 italic text-zinc-300"
            >
              {block.lines.map((l, li) => (
                <p key={li}>{renderInlineContent(l)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`l-${index}`}
              className={block.ordered ? "list-decimal list-inside space-y-1 my-2" : "list-disc list-inside space-y-1 my-2"}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineContent(item)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "table") {
          return <TableBlockContent headers={block.headers} key={`t-${index}`} rows={block.rows} />;
        }

        return <CodeSurface content={block.content} key={`c-${index}`} language={block.language} />;
      })}
    </div>
  );
};
