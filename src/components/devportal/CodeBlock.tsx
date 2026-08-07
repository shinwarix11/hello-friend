import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Lightweight, dependency-free syntax highlighter                     */
/* ------------------------------------------------------------------ */

type TokenKind = "keyword" | "string" | "number" | "comment" | "function" | "property" | "punctuation" | "plain";

const KEYWORDS: Record<string, string[]> = {
  common: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "try", "catch", "finally",
    "throw", "new", "await", "async", "import", "from", "export", "default", "class", "extends", "interface",
    "type", "enum", "public", "private", "static", "void", "using", "namespace", "var", "def", "raise",
    "with", "as", "not", "in", "and", "or", "None", "True", "False", "print", "package", "func", "go",
    "defer", "struct", "impl", "fn", "let", "mut", "match", "use", "pub", "crate", "self", "nil", "end",
    "local", "then", "do", "require", "echo", "foreach", "elseif", "null", "true", "false", "this",
    "switch", "case", "break", "continue", "throws", "implements", "override", "readonly", "curl",
  ],
};

const KEYWORD_SET = new Set(KEYWORDS["common"]);

function tokenize(code: string, language: string): { kind: TokenKind; value: string }[] {
  const tokens: { kind: TokenKind; value: string }[] = [];
  const isShell = language === "shell" || language === "bash" || language === "sh";
  let i = 0;

  const push = (kind: TokenKind, value: string) => {
    if (!value) return;
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) last.value += value;
    else tokens.push({ kind, value });
  };

  while (i < code.length) {
    const rest = code.slice(i);

    // Comments
    const comment = /^(\/\/[^\n]*|#[^\n]*|--[^\n]*|\/\*[\s\S]*?\*\/)/.exec(rest);
    if (comment && !(isShell && rest.startsWith("--"))) {
      push("comment", comment[0]);
      i += comment[0].length;
      continue;
    }

    // Strings (including template literals and triple quotes)
    const str = /^("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/.exec(rest);
    if (str) {
      push("string", str[0]);
      i += str[0].length;
      continue;
    }

    // Numbers
    const num = /^\b\d[\d_]*(\.\d+)?\b/.exec(rest);
    if (num) {
      push("number", num[0]);
      i += num[0].length;
      continue;
    }

    // Identifiers
    const ident = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(rest);
    if (ident) {
      const word = ident[0];
      const after = rest.slice(word.length);
      if (KEYWORD_SET.has(word)) push("keyword", word);
      else if (/^\s*\(/.test(after)) push("function", word);
      else if (/^\s*:/.test(after)) push("property", word);
      else push("plain", word);
      i += word.length;
      continue;
    }

    const punct = /^[{}[\]();,.:=<>+\-*/&|!?@%^~]+/.exec(rest);
    if (punct) {
      push("punctuation", punct[0]);
      i += punct[0].length;
      continue;
    }

    push("plain", code[i] ?? "");
    i += 1;
  }

  return tokens;
}

const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: "text-code-keyword",
  string: "text-code-string",
  number: "text-code-number",
  comment: "text-code-comment italic",
  function: "text-code-function",
  property: "text-code-property",
  punctuation: "text-code-punctuation",
  plain: "text-foreground/90",
};

export function Highlighted({ code, language }: { code: string; language: string }) {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} className={TOKEN_CLASS[token.kind]}>
          {token.value}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Code block                                                          */
/* ------------------------------------------------------------------ */

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground", className)}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  showLineNumbers = false,
  actions,
  className,
  maxHeight,
}: {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  actions?: ReactNode;
  className?: string;
  maxHeight?: number;
}) {
  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface)_88%,black)] transition-colors hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {filename ?? language}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {actions}
          <CopyButton value={code} />
        </div>
      </div>
      <div
        className="overflow-auto px-3 py-3"
        style={maxHeight ? { maxHeight, minHeight: 0 } : undefined}
      >
        <pre className="font-mono text-[12.5px] leading-relaxed">
          <code>
            {showLineNumbers
              ? lines.map((line, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="w-6 shrink-0 select-none text-right text-code-comment">{index + 1}</span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                      <Highlighted code={line} language={language} />
                    </span>
                  </div>
                ))
              : (
                <span className="whitespace-pre-wrap break-words">
                  <Highlighted code={code} language={language} />
                </span>
              )}
          </code>
        </pre>
      </div>
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">
      {children}
    </code>
  );
}
