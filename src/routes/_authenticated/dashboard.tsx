import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  KeyRound,
  Laptop,
  ShieldCheck,
  Users,
  Zap,
  Inbox,
} from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useRoles, useActivity, initials } from "@/hooks/useProfile";
import { eventLabel } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Aegis Dashboard" },
      {
        name: "description",
        content: "Your Aegis account overview: security posture, sessions and recent activity.",
      },
      { property: "og:title", content: "Overview — Aegis Dashboard" },
      { property: "og:description", content: "Security posture, sessions and recent activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const SPARK = [42, 58, 51, 70, 62, 84, 76, 92, 81, 96, 88, 100];

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="hover-lift surface-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface">
          <Icon className="h-4 w-4 text-primary" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-8 w-24" />
      ) : (
        <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      )}
      {delta ? <p className="mt-1 text-xs text-success">{delta}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: roles } = useRoles();
  const { data: activity, isLoading: activityLoading } = useActivity(6);

  const name = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const verified = Boolean(user?.email_confirmed_at);
  const score = 40 + (verified ? 30 : 0) + (profile?.full_name ? 15 : 0) + (profile?.job_title ? 15 : 0);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Here's the state of your identity layer today."
        badge={roles?.[0] ?? "user"}
        action={
          <Button asChild className="bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90">
            <Link to="/security">
              Review security <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active sessions" value="1" delta="This device" icon={Laptop} loading={isLoading} />
        <StatCard label="Security score" value={`${score}%`} delta={verified ? "Email verified" : "Verify your email"} icon={ShieldCheck} />
        <StatCard label="Logged events" value={String(activity?.length ?? 0)} delta="Last 30 days" icon={ActivityIcon} />
        <StatCard label="Roles assigned" value={String(roles?.length ?? 0)} delta="Database-enforced" icon={Users} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Authentication volume</h2>
              <p className="text-xs text-muted-foreground">Sign-in attempts across the last 12 hours</p>
            </div>
            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
              Live
            </Badge>
          </div>
          <div className="mt-8 flex h-44 items-end gap-2">
            {SPARK.map((h, i) => (
              <div key={i} className="group flex-1">
                <div
                  style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
                  className="animate-in-up w-full rounded-t-md bg-[image:var(--gradient-brand)] opacity-75 transition-all duration-300 group-hover:opacity-100"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>12h ago</span>
            <span>6h ago</span>
            <span>now</span>
          </div>
        </section>

        <section className="surface-card rounded-2xl p-6">
          <h2 className="text-base font-semibold">Your profile</h2>
          <div className="mt-5 flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-[image:var(--gradient-brand)] text-primary-foreground">
                {initials(profile?.full_name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{profile?.full_name ?? "Unnamed user"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Profile completeness</span>
              <span className="font-medium">{score}%</span>
            </div>
            <Progress value={score} className="mt-2 h-1.5" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm" className="border-border bg-surface">
              <Link to="/profile">Edit profile</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-border bg-surface">
              <Link to="/settings">Preferences</Link>
            </Button>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Link to="/activity">View all</Link>
            </Button>
          </div>

          {activityLoading ? (
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {activity.map((row) => (
                <li key={row.id} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{eventLabel(row.event)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-border py-10 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </span>
              <p className="mt-4 text-sm font-medium">No activity yet</p>
              <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                Security events will appear here as you use your account.
              </p>
            </div>
          )}
        </section>

        <section className="surface-card rounded-2xl p-6">
          <h2 className="text-base font-semibold">Quick actions</h2>
          <div className="mt-5 grid gap-3">
            {[
              { to: "/security", label: "Change password", desc: "Rotate your credentials", icon: KeyRound },
              { to: "/security", label: "Review sessions", desc: "See where you're signed in", icon: Laptop },
              { to: "/settings", label: "Notification rules", desc: "Choose what we email you", icon: Zap },
              { to: "/profile", label: "Complete your profile", desc: "Add role and company", icon: Users },
            ].map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition-all duration-300 hover:border-border-strong hover:bg-accent/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card transition-colors group-hover:border-primary/40">
                  <a.icon className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{a.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
