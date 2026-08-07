import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  Code2,
  User,
  ShieldCheck,
  Settings,
  Activity,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Plus,
  KeyRound,

} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, initials } from "@/hooks/useProfile";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: Boxes },
  { to: "/licenses", label: "Licenses", icon: KeyRound },
  { to: "/developers", label: "Developers", icon: Code2 },

  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/security", label: "Security", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  }, [dark]);

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  const current = NAV.find((n) => isActive(n.to));

  async function handleSignOut() {
    void logActivity("sign_out");
    await signOut();
    navigate({ to: "/auth", search: { mode: "signin", redirect: undefined }, replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        <div className="flex h-14 items-center px-4">
          <Logo showWordmark={!collapsed} />
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => setCmdOpen(true)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-card px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {!collapsed ? (
              <>
                <span>Search…</span>
                <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </>
            ) : null}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {!collapsed ? (
            <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Workspace
            </p>
          ) : null}
          {NAV.map((item) => {
            const active = isActive(item.to);
            const link = (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[image:var(--gradient-brand)]" />
                ) : null}
                <item.icon
                  className={cn("h-4 w-4 shrink-0", active && "text-primary")}
                />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="mx-3 mb-3 rounded-xl border border-sidebar-border bg-card p-4">
            <p className="text-xs font-medium">Developer plan</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              1,204 of 5,000 monthly actives used.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[24%] rounded-full bg-[image:var(--gradient-brand)]" />
            </div>
            <Button size="sm" className="mt-3 h-8 w-full bg-[image:var(--gradient-brand)] text-xs text-primary-foreground hover:opacity-90">
              <Plus className="mr-1 h-3 w-3" /> Upgrade
            </Button>
          </div>
        ) : null}

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed ? "Collapse" : null}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border px-4 sm:px-6">
          <div className="flex md:hidden">
            <Logo showWordmark={false} />
          </div>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              Aegis
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate font-medium">{current?.label ?? "Overview"}</span>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setCmdOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  ["New sign-in detected", "A new device signed in to your account."],
                  ["Security review ready", "Your monthly access review is available."],
                ].map(([t, d]) => (
                  <DropdownMenuItem key={t} className="flex-col items-start gap-1 py-2.5">
                    <span className="text-sm">{t}</span>
                    <span className="text-xs text-muted-foreground">{d}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setDark((v) => !v)}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-[image:var(--gradient-brand)] text-[11px] text-primary-foreground">
                      {initials(profile?.full_name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-28 truncate text-xs sm:block">
                    {profile?.full_name ?? user?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm">{profile?.full_name ?? "Your account"}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/security">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl animate-in-up">{children}</div>
        </main>

        {/* Mobile nav */}
        <nav className="glass sticky bottom-0 z-40 flex items-center justify-around border-t border-border py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px]",
                isActive(item.to) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Jump to a page or run a command…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {NAV.map((item) => (
              <CommandItem
                key={item.to}
                onSelect={() => {
                  setCmdOpen(false);
                  navigate({ to: item.to });
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                setDark((v) => !v);
              }}
            >
              <Sun className="mr-2 h-4 w-4" /> Toggle theme
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                void handleSignOut();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  badge,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {badge ? (
            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
              {badge}
            </Badge>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
