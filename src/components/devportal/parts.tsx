import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InlineCode } from "@/components/devportal/CodeBlock";
import type { ApiEndpoint, ApiParam } from "@/lib/devportal/api-spec";
import type { SearchKind } from "@/lib/devportal/search";

export function MethodPill({ method, className }: { method: string; className?: string }) {
  const tone =
    method === "GET"
      ? "border-cyan/40 text-cyan"
      : method === "DELETE"
        ? "border-destructive/40 text-destructive"
        : "border-success/40 text-success";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded border bg-secondary/60 px-1.5 font-mono text-[10px] font-semibold tracking-wider",
        tone,
        className,
      )}
    >
      {method}
    </span>
  );
}

const KIND_TONE: Record<SearchKind, string> = {
  endpoint: "border-primary/40 text-primary",
  sdk: "border-violet/40 text-violet",
  guide: "border-cyan/40 text-cyan",
  example: "border-success/40 text-success",
  error: "border-destructive/40 text-destructive",
  changelog: "border-warning/40 text-warning",
};

export function KindBadge({ kind, label }: { kind: SearchKind; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded border bg-secondary/50 px-1.5 text-[10px] uppercase tracking-wider",
        KIND_TONE[kind],
      )}
    >
      {label}
    </span>
  );
}

export function AuthChips({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="border-border font-mono text-[10px] font-normal">
        x-app-key
      </Badge>
      {endpoint.requiresSession ? (
        <Badge variant="outline" className="border-cyan/40 font-mono text-[10px] font-normal text-cyan">
          x-session-token
        </Badge>
      ) : null}
      {endpoint.requiresApiKey ? (
        <Badge variant="outline" className="border-violet/40 font-mono text-[10px] font-normal text-violet">
          x-api-key · {endpoint.requiresApiKey}
        </Badge>
      ) : null}
    </div>
  );
}

export function ParamTable({ params }: { params: ApiParam[] }) {
  if (params.length === 0) {
    return <p className="text-xs text-muted-foreground">This endpoint takes no body parameters.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Parameter</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Required</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((param) => (
            <tr key={param.name} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-[11.5px] text-foreground">{param.name}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{param.type}</td>
              <td className="px-3 py-2">
                {param.required ? (
                  <span className="text-[11px] text-warning">required</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">optional</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="surface-card hover-lift rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const max = Math.max(1, ...points);
  return (
    <div className={cn("flex h-14 items-end gap-1", className)}>
      {points.map((point, index) => (
        <div
          key={index}
          className="flex-1 rounded-sm bg-[image:var(--gradient-brand)] opacity-70 transition-opacity hover:opacity-100"
          style={{ height: `${Math.max(4, (point / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function ResourceCard({
  to,
  params,
  hash,
  title,
  description,
  meta,
  icon: Icon,
}: {
  to: string;
  params?: Record<string, string>;
  hash?: string;
  title: string;
  description: string;
  meta?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      params={params as never}
      hash={hash as never}
      className="surface-card hover-lift group flex flex-col rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50">
            <Icon className="h-4 w-4 text-primary" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-medium">{title}</h3>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {meta ? <div className="mt-3 flex flex-wrap items-center gap-1.5">{meta}</div> : null}
    </Link>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs">{typeof value === "string" ? <InlineCode>{value}</InlineCode> : value}</span>
    </div>
  );
}
