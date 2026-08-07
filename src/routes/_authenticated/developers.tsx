import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";

import { KindBadge } from "@/components/devportal/parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { LATEST_PLATFORM_VERSION } from "@/lib/devportal/changelog";
import { SEARCH_INDEX, SEARCH_KIND_LABEL, searchDocs } from "@/lib/devportal/search";

export const Route = createFileRoute("/_authenticated/developers")({
  component: DevelopersLayout,
});

const TABS = [
  { to: "/developers", label: "Overview", exact: true },
  { to: "/developers/docs", label: "API reference", exact: false },
  { to: "/developers/explorer", label: "Explorer", exact: false },
  { to: "/developers/sdks", label: "SDKs", exact: false },
  { to: "/developers/examples", label: "Examples", exact: false },
  { to: "/developers/downloads", label: "Downloads", exact: false },
  { to: "/developers/webhooks", label: "Webhooks", exact: false },
  { to: "/developers/keys", label: "API keys", exact: false },
  { to: "/developers/changelog", label: "Changelog", exact: false },
  { to: "/developers/settings", label: "Settings", exact: false },
] as const;

function DevelopersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/" && !open && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const results = useMemo(
    () => (query.trim() ? searchDocs(query, 14) : SEARCH_INDEX.slice(0, 10)),
    [query],
  );

  return (
    <div className="space-y-6">
      <header className="surface-card animate-in-up relative overflow-hidden rounded-2xl p-5">
        <div className="pointer-events-none absolute -right-20 -top-28 h-56 w-56 rounded-full bg-[image:var(--gradient-aurora)] opacity-15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold">Developer platform</h1>
              <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                v{LATEST_PLATFORM_VERSION}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentation, SDKs, a live API explorer and everything you need to ship an integration today.
            </p>
          </div>
          <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
            <Search className="h-4 w-4" />
            Search docs
            <kbd className="ml-1 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </Button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search endpoints, SDKs, guides, errors…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No documentation matches that search.</CommandEmpty>
          <CommandGroup heading="Documentation">
            {results.map((entry) => (
              <CommandItem
                key={entry.id}
                value={`${entry.title} ${entry.keywords}`}
                onSelect={() => {
                  setOpen(false);
                  void navigate({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to: entry.to as any,
                    params: entry.params as never,
                    hash: entry.hash as never,
                  });
                }}
                className="gap-2"
              >
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                <KindBadge kind={entry.kind} label={SEARCH_KIND_LABEL[entry.kind]} />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
