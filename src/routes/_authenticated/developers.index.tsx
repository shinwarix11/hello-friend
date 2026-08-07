import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  Boxes,
  Code2,
  Download,
  Gauge,
  KeyRound,
  Package,
  Rocket,
  Terminal,
  Webhook,
} from "lucide-react";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { DocSection, ResourceCard, Sparkline, StatTile } from "@/components/devportal/parts";
import { Badge } from "@/components/ui/badge";
import { useApplications } from "@/hooks/useApplications";
import { useDeveloperUsage, useDeveloperPreferences } from "@/hooks/useDeveloper";
import { CHANGELOG, CHANGE_KIND_LABEL } from "@/lib/devportal/changelog";
import { API_BASE_PATH, API_ENDPOINT_SPECS } from "@/lib/devportal/api-spec";
import { SDKS } from "@/lib/devportal/sdks";

export const Route = createFileRoute("/_authenticated/developers/")({
  component: DeveloperDashboard,
});

function DeveloperDashboard() {
  const { data: apps } = useApplications();
  const { data: prefs } = useDeveloperPreferences();
  const appIds = useMemo(() => (apps ?? []).map((a) => a.id), [apps]);
  const { data: usage } = useDeveloperUsage(appIds);

  const firstApp = apps?.[0];
  const quickStart = `curl -X POST "${typeof window === "undefined" ? "" : window.location.origin}${API_BASE_PATH}/init" \\
  -H "content-type: application/json" \\
  -H "x-app-key: ${firstApp?.public_key ?? "YOUR_APP_KEY"}" \\
  -d '{"version":"1.0.0","hwid":"A4E1-9C33-77BD"}'`;

  const latest = CHANGELOG[0]!;
  const recommendedSdk = SDKS.find((s) => s.id === (prefs?.default_sdk ?? "csharp")) ?? SDKS[0]!;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Applications" value={apps?.length ?? 0} icon={Boxes} hint="Integrations you can reach" />
        <StatTile
          label="API calls · 14d"
          value={(usage?.totalCalls ?? 0).toLocaleString()}
          icon={Activity}
          hint="Across every application"
        />
        <StatTile
          label="Success rate"
          value={`${(usage?.successRate ?? 100).toFixed(1)}%`}
          icon={Gauge}
          tone={(usage?.successRate ?? 100) >= 98 ? "success" : "warning"}
          hint={`${usage?.errorCalls ?? 0} failed calls`}
        />
        <StatTile
          label="Avg latency"
          value={`${usage?.avgLatency ?? 0} ms`}
          icon={Rocket}
          hint="Server processing time"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">Request volume</h2>
              <p className="text-xs text-muted-foreground">Daily calls over the last 14 days</p>
            </div>
            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
              Live
            </Badge>
          </div>
          <Sparkline points={(usage?.daily ?? []).map((d) => d.calls)} className="h-28" />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{usage?.daily?.[0]?.day ?? ""}</span>
            <span>{usage?.daily?.[usage.daily.length - 1]?.day ?? ""}</span>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-5">
          <h2 className="text-sm font-medium">Top endpoints</h2>
          <div className="mt-3 space-y-2">
            {(usage?.endpoints ?? []).slice(0, 6).map((endpoint) => (
              <div key={endpoint.endpoint} className="flex items-center gap-3">
                <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">
                  /{endpoint.endpoint}
                </code>
                <span className="text-xs tabular-nums">{endpoint.calls}</span>
                <span className="w-12 text-right text-[10px] text-muted-foreground">{endpoint.avgMs} ms</span>
              </div>
            ))}
            {(usage?.endpoints?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">
                No API traffic yet. Send your first request from the explorer.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <DocSection
        title="Quick start"
        description="Three calls to a working integration: handshake, authenticate, validate."
        action={
          <Link to="/developers/docs" className="text-xs text-primary hover:underline">
            Full reference →
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <CodeBlock code={quickStart} language="shell" filename="1. handshake" showLineNumbers />
          <div className="surface-card space-y-3 rounded-2xl p-4">
            <h3 className="text-sm font-medium">Recommended SDK</h3>
            <p className="text-xs text-muted-foreground">{recommendedSdk.tagline}</p>
            <CodeBlock code={recommendedSdk.setup} language={recommendedSdk.setupLanguage} filename="setup" />
            <a
              href={sdkDownloadUrl(recommendedSdk)}
              download={sdkArchiveName(recommendedSdk)}
              className="inline-block text-xs text-primary hover:underline"
            >
              Download the {recommendedSdk.name} SDK ({sdkPackageSize(recommendedSdk)})
            </a>
            <Link
              to="/developers/sdks/$sdk"
              params={{ sdk: recommendedSdk.id }}
              className="inline-block text-xs text-primary hover:underline"
            >
              Open the {recommendedSdk.name} guide →
            </Link>
          </div>
        </div>
      </DocSection>

      <DocSection title="Explore the platform" description="Everything a developer needs, one click away.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ResourceCard
            to="/developers/docs"
            icon={BookOpen}
            title="API reference"
            description={`${API_ENDPOINT_SPECS.length} documented endpoints with parameters, responses and error codes.`}
          />
          <ResourceCard
            to="/developers/explorer"
            icon={Terminal}
            title="API explorer"
            description="Send signed, authenticated requests against your real applications from the browser."
          />
          <ResourceCard
            to="/developers/sdks"
            icon={Package}
            title="Official SDKs"
            description={`${SDKS.length} languages with installation, initialization and licensing guides.`}
          />
          <ResourceCard
            to="/developers/examples"
            icon={Code2}
            title="Code examples"
            description="Copy-paste integrations for auth, licensing, variables, sessions and webhooks."
          />
          <ResourceCard
            to="/developers/downloads"
            icon={Download}
            title="Download centre"
            description="SDK packages, CLI tooling and sample projects with published checksums."
          />
          <ResourceCard
            to="/developers/webhooks"
            icon={Webhook}
            title="Webhook centre"
            description="Inspect deliveries, retries and signature verification across applications."
          />
          <ResourceCard
            to="/developers/keys"
            icon={KeyRound}
            title="API keys"
            description="Every server key you own, its scopes and when it was last used."
          />
          <ResourceCard
            to="/developers/changelog"
            icon={Activity}
            title="Changelog"
            description="Platform releases, breaking changes and security notes."
          />
          <ResourceCard
            to="/developers/settings"
            icon={Gauge}
            title="Developer settings"
            description="Default language, SDK, explorer behaviour and notification preferences."
          />
        </div>
      </DocSection>

      <DocSection title={`What's new in v${latest.version}`} description={latest.summary}>
        <div className="surface-card rounded-2xl p-4">
          <ul className="space-y-2">
            {latest.changes.slice(0, 5).map((change, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="mt-0.5 border-border text-[10px] uppercase tracking-wider">
                  {CHANGE_KIND_LABEL[change.kind]}
                </Badge>
                <span className="text-muted-foreground">{change.text}</span>
              </li>
            ))}
          </ul>
          <Link to="/developers/changelog" className="mt-4 inline-block text-xs text-primary hover:underline">
            Read the full changelog →
          </Link>
        </div>
      </DocSection>
    </div>
  );
}
