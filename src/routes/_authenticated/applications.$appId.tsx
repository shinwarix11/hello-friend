import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { AppAvatar, StatusPill } from "@/components/app/applications/parts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useApplication,
  useMyAppRole,
  useToggleAppState,
} from "@/hooks/useApplications";
import { ROLE_LABEL } from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId")({
  component: ApplicationLayout,
});

const TABS = [
  { to: "/applications/$appId", label: "Overview", exact: true },
  { to: "/applications/$appId/licenses", label: "Licenses", exact: false },
  { to: "/applications/$appId/subscriptions", label: "Subscriptions", exact: false },
  { to: "/applications/$appId/users", label: "Users", exact: false },
  { to: "/applications/$appId/members", label: "Team", exact: false },
  { to: "/applications/$appId/versions", label: "Versions", exact: false },
  { to: "/applications/$appId/variables", label: "Variables", exact: false },
  { to: "/applications/$appId/downloads", label: "Downloads", exact: false },
  { to: "/applications/$appId/api", label: "API", exact: false },
  { to: "/applications/$appId/webhooks", label: "Webhooks", exact: false },
  { to: "/applications/$appId/logs", label: "Logs", exact: false },
  { to: "/applications/$appId/settings", label: "Settings", exact: false },
] as const;


function ApplicationLayout() {
  const { appId } = Route.useParams();
  const { data: app, isLoading } = useApplication(appId);
  const { data: role } = useMyAppRole(appId);
  const touch = useToggleAppState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!appId) return;
    touch.mutate({ applicationId: appId, patch: { last_opened_at: new Date().toISOString() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-9 w-96 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="surface-card rounded-2xl p-10 text-center">
        <h1 className="text-lg font-semibold">Application not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or you no longer have access.
        </p>
        <Link
          to="/applications"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to applications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/applications"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Applications
      </Link>

      <header className="surface-card animate-in-up relative overflow-hidden rounded-2xl p-5">
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-[image:var(--gradient-brand)] opacity-15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <AppAvatar id={app.id} name={app.name} logoUrl={app.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-xl font-semibold">{app.name}</h1>
              <StatusPill status={app.status} />
              {role ? (
                <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                  {ROLE_LABEL[role]}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {app.internal_name} · {app.environment} · v{app.current_version ?? "0.0.0"}
            </p>
          </div>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((tab) => {
          const href = tab.to.replace("$appId", appId);
          const active = tab.exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              params={{ appId }}
              className={cn(
                "relative whitespace-nowrap px-3 py-2 text-sm transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[image:var(--gradient-brand)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
