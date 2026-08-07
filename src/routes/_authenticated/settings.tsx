import { createFileRoute } from "@tanstack/react-router";
import { Bell, Loader2, Palette, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { usePreferences, useUpdatePreferences } from "@/hooks/useProfile";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Aegis" },
      { name: "description", content: "Control notification rules and appearance for your Aegis account." },
      { property: "og:title", content: "Settings — Aegis" },
      { property: "og:description", content: "Notification rules and appearance preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const NOTIFICATIONS = [
  {
    key: "security_emails" as const,
    title: "Security alerts",
    description: "Sign-ins from new devices, password and email changes.",
  },
  {
    key: "product_emails" as const,
    title: "Product updates",
    description: "New features, SDK releases and changelog highlights.",
  },
  {
    key: "marketing_emails" as const,
    title: "Marketing",
    description: "Occasional offers and community news. Never more than monthly.",
  },
];

function SettingsPage() {
  const { data: prefs, isLoading } = usePreferences();
  const update = useUpdatePreferences();

  function toggle(key: (typeof NOTIFICATIONS)[number]["key"], value: boolean) {
    update.mutate({ [key]: value });
    void logActivity("preferences_update");
  }

  return (
    <>
      <PageHeader title="Settings" description="Tune how Aegis communicates and looks." />

      <div className="grid gap-6">
        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface">
              <Bell className="h-4 w-4 text-primary" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">Choose which emails reach your inbox.</p>
            </div>
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {isLoading ? (
            <div className="mt-6 space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-1">
              {NOTIFICATIONS.map((n, i) => (
                <div key={n.key}>
                  {i > 0 ? <Separator className="bg-border" /> : null}
                  <div className="flex items-center justify-between gap-6 py-4">
                    <div className="min-w-0">
                      <Label htmlFor={n.key} className="text-sm">
                        {n.title}
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">{n.description}</p>
                    </div>
                    <Switch
                      id={n.key}
                      checked={Boolean(prefs?.[n.key])}
                      onCheckedChange={(v) => toggle(n.key, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface">
              <Palette className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Appearance</h2>
              <p className="text-xs text-muted-foreground">
                Aegis is dark-first. Use the sun icon in the top bar to switch themes.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { name: "Midnight", note: "Default dark surface", cls: "bg-[#050505]" },
              { name: "Daylight", note: "High-contrast light", cls: "bg-[#fafafa]" },
            ].map((t) => (
              <div
                key={t.name}
                className="hover-lift overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className={`h-24 ${t.cls} relative`}>
                  <div className="absolute inset-x-4 top-4 h-2 rounded-full bg-[image:var(--gradient-brand)] opacity-80" />
                  <div className="absolute inset-x-4 top-9 h-2 w-1/2 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Workspace</h2>
              <p className="text-xs text-muted-foreground">Regional and locale defaults.</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Timezone", prefs ? "Automatic" : "—"],
              ["Language", "English (US)"],
              ["Data region", "EU / Frankfurt"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
