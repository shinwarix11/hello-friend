import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { DocSection, KeyValue, Prose } from "@/components/devportal/parts";
import { Badge } from "@/components/ui/badge";
import { SDKS, SDK_STATUS_LABEL, findSdk } from "@/lib/devportal/sdks";

export const Route = createFileRoute("/_authenticated/developers/sdks/$sdk")({
  beforeLoad: ({ params }) => {
    if (!findSdk(params.sdk)) throw notFound();
  },
  component: SdkDetail,
});

function SdkDetail() {
  const { sdk: sdkId } = Route.useParams();
  const sdk = findSdk(sdkId)!;

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1">
          <Link
            to="/developers/sdks"
            className="mb-2 inline-flex items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All SDKs
          </Link>
          {SDKS.map((entry) => (
            <Link
              key={entry.id}
              to="/developers/sdks/$sdk"
              params={{ sdk: entry.id }}
              className={
                entry.id === sdk.id
                  ? "block rounded bg-secondary px-2 py-1 text-sm"
                  : "block rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {entry.name}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-8">
        <div className="surface-card rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold">{sdk.name}</h2>
            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
              {SDK_STATUS_LABEL[sdk.status]}
            </Badge>
            <Badge variant="outline" className="border-border font-mono text-[10px] font-normal">
              v{sdk.latest}
            </Badge>
          </div>
          <Prose>{sdk.tagline}</Prose>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <CodeBlock code={sdk.install} language={sdk.installLanguage} filename="install" />
            <div>
              <KeyValue label="Package" value={sdk.package} />
              <KeyValue label="Language" value={sdk.language} />
              <KeyValue label="Runtime" value={sdk.minimumRuntime} />
              <KeyValue label="Platforms" value={sdk.platforms.join(", ")} />
              <KeyValue label="Package size" value={sdk.size} />
            </div>
          </div>
        </div>

        {sdk.sections.map((section) => (
          <DocSection key={section.title} title={section.title}>
            <Prose>{section.body}</Prose>
            <CodeBlock code={section.code} language={section.language} showLineNumbers />
          </DocSection>
        ))}

        <DocSection title="Releases" description="Version history for this SDK.">
          <div className="surface-card divide-y divide-border rounded-2xl">
            {sdk.releases.map((release) => (
              <div key={release.version} className="flex flex-wrap items-baseline gap-3 p-4">
                <code className="font-mono text-xs text-primary">v{release.version}</code>
                <span className="text-[11px] text-muted-foreground">{release.date}</span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">{release.notes}</span>
              </div>
            ))}
          </div>
        </DocSection>
      </div>
    </div>
  );
}
