import { useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ROLE_LABEL,
  appGradient,
  type AppRole,
  type AppStatus,
  type AppVersionChannel,
} from "@/lib/applications";

export function AppAvatar({
  id,
  name,
  logoUrl,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-semibold text-primary-foreground shadow-[var(--shadow-card)]",
        dims,
        className,
      )}
      style={logoUrl ? undefined : { backgroundImage: appGradient(id) }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

const STATUS_STYLES: Record<AppStatus, string> = {
  active: "border-success/30 bg-success/10 text-success",
  paused: "border-warning/30 bg-warning/10 text-warning",
  maintenance: "border-warning/30 bg-warning/10 text-warning",
  archived: "border-border bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: AppStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        STATUS_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const CHANNEL_STYLES: Record<AppVersionChannel, string> = {
  stable: "border-success/30 bg-success/10 text-success",
  beta: "border-primary/30 bg-primary/10 text-primary",
  alpha: "border-warning/30 bg-warning/10 text-warning",
  deprecated: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function ChannelPill({ channel }: { channel: AppVersionChannel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        CHANNEL_STYLES[channel],
      )}
    >
      {channel}
    </span>
  );
}

export function RoleBadge({ role }: { role: AppRole }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border text-[10px] uppercase tracking-wider",
        role === "owner" && "border-primary/40 text-primary",
      )}
    >
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  delay?: number;
}) {
  return (
    <div
      className="surface-card hover-lift animate-in-up group relative overflow-hidden rounded-xl p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[image:var(--gradient-brand)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7 shrink-0", className)}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function SecretField({
  label,
  value,
  masked = false,
}: {
  label: string;
  value: string;
  masked?: boolean;
}) {
  const [revealed, setRevealed] = useState(!masked);
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-1">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
          {revealed ? value : "•".repeat(Math.min(value.length, 34))}
        </code>
        {masked ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide" : "Reveal"}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        ) : null}
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-in-up surface-card flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-[image:var(--gradient-brand)] opacity-25 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="surface-card flex items-center gap-4 rounded-xl p-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="ml-auto h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card animate-in-up rounded-2xl", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
