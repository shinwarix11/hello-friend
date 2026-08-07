import { createFileRoute } from "@tanstack/react-router";
import { Inbox, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/hooks/useProfile";
import { eventLabel } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity log — Aegis" },
      { name: "description", content: "A complete audit trail of security events on your Aegis account." },
      { property: "og:title", content: "Activity log — Aegis" },
      { property: "og:description", content: "A complete audit trail of security events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { data, isLoading } = useActivity(100);

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every security-relevant event recorded against your account."
        badge="Audited"
      />

      <div className="surface-card overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-border">
            {data.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{eventLabel(row.event)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.description ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className="hidden shrink-0 border-border font-mono text-[10px] sm:inline-flex">
                  {new Date(row.created_at).toLocaleString()}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </span>
            <p className="mt-4 font-medium">Nothing logged yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Sign-ins, password changes and profile updates will be recorded here automatically.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
