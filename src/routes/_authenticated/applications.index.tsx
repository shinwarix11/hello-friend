import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  Grid2x2,
  LayoutList,
  Plus,
  Search,
  Star,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { CreateAppWizard } from "@/components/app/applications/CreateAppWizard";
import {
  AppAvatar,
  CardSkeletonGrid,
  EmptyState,
  RoleBadge,
  StatusPill,
} from "@/components/app/applications/parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApplications, useToggleAppState } from "@/hooks/useApplications";
import { ENVIRONMENTS, formatRelative } from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({
    meta: [
      { title: "Applications — Aegis" },
      {
        name: "description",
        content: "Manage every application connected to your Aegis authentication workspace.",
      },
      { property: "og:title", content: "Applications — Aegis" },
      {
        property: "og:description",
        content: "Manage every application connected to your Aegis authentication workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { data, isLoading } = useApplications();
  const toggleState = useToggleAppState();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [env, setEnv] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((a) => (env === "all" ? true : a.environment === env))
      .filter((a) => (status === "all" ? true : a.status === status))
      .filter((a) =>
        q
          ? a.name.toLowerCase().includes(q) ||
            a.internal_name.toLowerCase().includes(q) ||
            (a.tags ?? []).some((t) => t.toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => Number(b.state?.is_pinned ?? false) - Number(a.state?.is_pinned ?? false));
  }, [data, query, env, status]);

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every product protected by your Aegis workspace."
        badge={data ? `${data.length} total` : ""}
        action={
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New application
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications, slugs or tags…"
            className="pl-9"
          />
        </div>
        <Select value={env} onValueChange={setEnv}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {ENVIRONMENTS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[135px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "active", "paused", "maintenance", "archived"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border border-border p-0.5">
          {(
            [
              ["grid", Grid2x2],
              ["list", LayoutList],
            ] as const
          ).map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-label={`${mode} view`}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === mode
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CardSkeletonGrid />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={data?.length ? "No matching applications" : "Create your first application"}
          description={
            data?.length
              ? "Try a different search term or clear the filters."
              : "Applications hold your users, versions, variables and release downloads."
          }
          action={
            data?.length ? null : (
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New application
              </Button>
            )
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app, i) => (
            <Link
              key={app.id}
              to="/applications/$appId"
              params={{ appId: app.id }}
              className="surface-card hover-lift animate-in-up group relative overflow-hidden rounded-xl p-5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[image:var(--gradient-brand)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />
              <div className="relative flex items-start gap-3">
                <AppAvatar id={app.id} name={app.name} logoUrl={app.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{app.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {app.internal_name}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Toggle favorite"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleState.mutate({
                      applicationId: app.id,
                      patch: { is_favorite: !app.state?.is_favorite },
                    });
                  }}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-warning"
                >
                  <Star
                    className={cn("h-4 w-4", app.state?.is_favorite && "fill-warning text-warning")}
                  />
                </button>
              </div>
              <p className="mt-3 line-clamp-2 min-h-9 text-xs text-muted-foreground">
                {app.description ?? "No description provided."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusPill status={app.status} />
                <Badge variant="outline" className="border-border text-[10px] capitalize">
                  {app.environment}
                </Badge>
                {app.role ? <RoleBadge role={app.role} /> : null}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {app.member_count}
                </span>
                <span className="font-mono">v{app.current_version ?? "0.0.0"}</span>
                <span>{formatRelative(app.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="surface-card animate-in-up divide-y divide-border overflow-hidden rounded-xl">
          {apps.map((app) => (
            <Link
              key={app.id}
              to="/applications/$appId"
              params={{ appId: app.id }}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/50"
            >
              <AppAvatar id={app.id} name={app.name} logoUrl={app.logo_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{app.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {app.internal_name}
                </p>
              </div>
              <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                v{app.current_version ?? "0.0.0"}
              </span>
              <span className="hidden text-xs capitalize text-muted-foreground md:block">
                {app.environment}
              </span>
              <StatusPill status={app.status} />
            </Link>
          ))}
        </div>
      )}

      <CreateAppWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
