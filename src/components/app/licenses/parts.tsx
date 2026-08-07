import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  APP_USER_STATUS_STYLES,
  LICENSE_STATUS_STYLES,
  type AppUserStatus,
  type LicenseStatus,
} from "@/lib/licensing";

export function LicenseStatusPill({ status }: { status: LicenseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        LICENSE_STATUS_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function UserStatusPill({ status }: { status: AppUserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        APP_USER_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

/** Lightweight dependency-free sparkline / bar chart. */
export function BarChart({
  data,
  className,
}: {
  data: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex h-40 items-end gap-1.5", className)}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="animate-in-up w-full rounded-t-md bg-[image:var(--gradient-brand)] opacity-80 transition-all duration-300 group-hover:opacity-100"
              style={{ height: `${(d.value / max) * 100}%`, animationDelay: `${i * 25}ms`, minHeight: d.value ? 4 : 2 }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
              {d.value}
            </span>
          </div>
          <span className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  segments,
  total,
  caption,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  caption?: string;
}) {
  let offset = 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="16" className="stroke-muted" />
        {segments.map((s) => {
          const length = total ? (s.value / total) * circumference : 0;
          const dash = `${length} ${circumference - length}`;
          const el = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="16"
              stroke={s.color}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return el;
        })}
      </svg>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-mono tabular-nums">{s.value}</span>
          </div>
        ))}
        {caption ? <p className="pt-1 text-[11px] text-muted-foreground">{caption}</p> : null}
      </div>
    </div>
  );
}

export function DataTable({
  head,
  children,
  empty,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <div className="surface-card animate-in-up overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border">
              {head.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">{children}</tbody>
        </table>
      </div>
      {empty}
    </div>
  );
}
