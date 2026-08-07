import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, MonitorSmartphone, ShieldCheck, TimerReset } from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { CardSkeletonGrid, EmptyState, SectionCard, StatCard } from "@/components/app/applications/parts";
import { BarChart, DonutChart, DataTable, LicenseStatusPill } from "@/components/app/licenses/parts";
import { useLicenseOverview } from "@/hooks/useLicenses";
import { formatRelative } from "@/lib/applications";
import { effectiveStatus, maskKey, type LicenseStatus } from "@/lib/licensing";

export const Route = createFileRoute("/_authenticated/licenses")({
  component: LicenseOverviewPage,
  head: () => ({
    meta: [
      { title: "License overview — Aegis" },
      {
        name: "description",
        content: "Every license across all of your Aegis applications, in one live view.",
      },
      { property: "og:title", content: "License overview — Aegis" },
      {
        property: "og:description",
        content: "Every license across all of your Aegis applications, in one live view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LicenseOverviewPage() {
  const { data, isLoading } = useLicenseOverview();

  const stats = useMemo(() => {
    const licenses = data?.licenses ?? [];
    const counts: Record<string, number> = {};
    for (const l of licenses) {
      const s = effectiveStatus(l);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    const appName = new Map((data?.applications ?? []).map((a) => [a.id, a.name]));
    const perApp = Object.entries(
      licenses.reduce<Record<string, number>>((acc, l) => {
        acc[l.application_id] = (acc[l.application_id] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([id, value]) => ({ label: appName.get(id) ?? "Unknown", value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return { licenses, counts, appName, perApp };
  }, [data]);

  const DONUT_COLORS: Record<string, string> = {
    active: "var(--success)",
    expired: "var(--muted-foreground)",
    banned: "var(--destructive)",
    suspended: "var(--warning)",
    unused: "var(--primary)",
  };

  const donut = (["active", "expired", "banned", "suspended", "unused"] as LicenseStatus[])
    .map((status) => ({
      label: status as string,
      value: stats.counts[status] ?? 0,
      color: DONUT_COLORS[status] ?? "var(--primary)",
    }))
    .filter((d) => d.value > 0);


  return (
    <>
      <PageHeader
        title="Licenses"
        description="A cross-application view of every key you have issued."
      />



      {isLoading ? (
        <CardSkeletonGrid count={4} />
      ) : stats.licenses.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No licenses yet"
          description="Generate keys from any application's Licenses tab and they will roll up here."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total licenses" value={stats.licenses.length} icon={KeyRound} />
            <StatCard
              label="Active"
              value={stats.counts["active"] ?? 0}
              icon={ShieldCheck}
              delay={60}
            />
            <StatCard
              label="Activations"
              value={data?.activations.length ?? 0}
              icon={MonitorSmartphone}
              delay={120}
            />
            <StatCard
              label="Expired"
              value={stats.counts["expired"] ?? 0}
              icon={TimerReset}
              delay={180}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Status split" description="Distribution across every application.">
              <DonutChart
                segments={donut}
                total={donut.reduce((a, d) => a + d.value, 0)}
                caption="Live across every application you can access."
              />

            </SectionCard>
            <SectionCard title="Licenses per application" description="Your busiest products.">
              <BarChart data={stats.perApp} />
            </SectionCard>
          </div>

          <SectionCard title="Newest licenses" description="The 20 most recently issued keys.">
            <DataTable head={["Key", "Application", "Status", "Created", ""]}>
              {stats.licenses.slice(0, 20).map((license) => (
                <tr key={license.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs">{maskKey(license.license_key)}</td>
                  <td className="px-4 py-3 text-sm">
                    {stats.appName.get(license.application_id) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <LicenseStatusPill status={effectiveStatus(license)} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatRelative(license.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/applications/$appId/licenses"
                      params={{ appId: license.application_id }}
                      className="text-xs text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          </SectionCard>
        </div>
      )}
    </>
  );
}
