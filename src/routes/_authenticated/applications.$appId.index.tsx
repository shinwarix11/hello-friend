import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Download,
  GitBranch,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  RowSkeleton,
  SectionCard,
  SecretField,
  StatCard,
} from "@/components/app/applications/parts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/devportal/CodeBlock";
import {
  useAppAudit,
  useAppDownloads,
  useAppMembers,
  useAppVariables,
  useAppVersions,
  useApplication,
} from "@/hooks/useApplications";
import { appEventLabel, formatDate, formatRelative } from "@/lib/applications";
import { PUBLIC_API_ORIGIN } from "@/lib/public-api";

export const Route = createFileRoute("/_authenticated/applications/$appId/")({
  component: ApplicationOverview,
});

function ApplicationOverview() {
  const { appId } = Route.useParams();
  const { data: app } = useApplication(appId);
  const { data: members } = useAppMembers(appId);
  const { data: versions } = useAppVersions(appId);
  const { data: variables } = useAppVariables(appId);
  const { data: downloads } = useAppDownloads(appId);
  const { data: audit, isLoading: auditLoading } = useAppAudit(appId, 8);

  const totalDownloads = (downloads ?? []).reduce((sum, d) => sum + (d.download_count ?? 0), 0);
  const csharpSnippet = `using AegisAuth;

public static api AegisApp = new api(
    name: "${app?.name ?? "…"}",
    ownerid: "${app?.public_key ?? "…"}",
    secret: "${app?.secret_key ?? "…"}",
    version: "${app?.current_version ?? "1.0.0"}",
    url: "${PUBLIC_API_ORIGIN}"
);

// Handshake in Form Load:
AegisApp.init();

// License Check:
AegisApp.license("USER-LICENSE-KEY");
if (AegisApp.response.success) {
    // Access Granted
}`;

  const pythonSnippet = `from aegis_auth import AegisAuth

aegis_app = AegisAuth(
    name="${app?.name ?? "…"}",
    ownerid="${app?.public_key ?? "…"}",
    secret="${app?.secret_key ?? "…"}",
    version="${app?.current_version ?? "1.0.0"}",
    url="${PUBLIC_API_ORIGIN}",
)

# Handshake at startup:
aegis_app.init()

# License check:
aegis_app.license("USER-LICENSE-KEY")
if aegis_app.response.success:
    # Access granted
    pass`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members" value={members?.length ?? 0} icon={Users} delay={0} />
        <StatCard label="Versions" value={versions?.length ?? 0} icon={GitBranch} delay={60} hint={`Current v${app?.current_version ?? "0.0.0"}`} />
        <StatCard label="Variables" value={variables?.length ?? 0} icon={KeyRound} delay={120} />
        <StatCard label="Downloads" value={totalDownloads} icon={Download} delay={180} hint={`${downloads?.length ?? 0} artifacts`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Recent activity"
          description="Everything that happened inside this application."
          action={
            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
              Live
            </Badge>
          }
        >
          {auditLoading ? (
            <RowSkeleton rows={4} />
          ) : (audit ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4 pl-5">
              <span className="absolute left-[5px] top-1.5 h-[calc(100%-12px)] w-px bg-border" />
              {(audit ?? []).map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border border-primary bg-background" />
                  <p className="text-sm">{appEventLabel(entry.event)}</p>
                  {entry.description ? (
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  ) : null}
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatRelative(entry.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Integration"
            description="Drop these credentials into the AegisAuth SDK."
          >
            <div className="space-y-3">
              <SecretField label="Application name" value={app?.name ?? ""} />
              <SecretField label="Application key (ownerid)" value={app?.public_key ?? ""} />
              <SecretField label="Secret key" value={app?.secret_key ?? ""} masked />
              <SecretField label="Version" value={app?.current_version ?? ""} />
              <SecretField label="Base API URL" value={PUBLIC_API_ORIGIN} />

              <Tabs defaultValue="csharp" className="pt-2">
                <TabsList className="h-8">
                  <TabsTrigger value="csharp" className="px-3 text-xs">C#</TabsTrigger>
                  <TabsTrigger value="python" className="px-3 text-xs">Python</TabsTrigger>
                </TabsList>
                <TabsContent value="csharp" className="mt-3">
                  <CodeBlock code={csharpSnippet} language="csharp" filename="Program.cs" />
                </TabsContent>
                <TabsContent value="python" className="mt-3">
                  <CodeBlock code={pythonSnippet} language="python" filename="main.py" />
                </TabsContent>
              </Tabs>
            </div>
          </SectionCard>

          <SectionCard title="Details">
            <dl className="space-y-3 text-sm">
              {[
                ["Category", app?.category ?? "—"],
                ["Environment", app?.environment ?? "—"],
                ["Visibility", app?.visibility ?? "—"],
                ["Minimum version", app?.minimum_version ?? "—"],
                ["Created", formatDate(app?.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate capitalize">{v}</dd>
                </div>
              ))}
            </dl>
            {(app?.tags ?? []).length ? (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                {(app?.tags ?? []).map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Shortcuts">
            <div className="grid gap-2">
              {[
                { to: "/applications/$appId/members", label: "Manage team", icon: Users },
                { to: "/applications/$appId/versions", label: "Publish a version", icon: GitBranch },
                { to: "/applications/$appId/settings", label: "Security settings", icon: ShieldCheck },
                { to: "/applications/$appId/downloads", label: "Release artifacts", icon: Activity },
              ].map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  params={{ appId }}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground"
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
