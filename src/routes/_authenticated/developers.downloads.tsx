import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DOWNLOADS,
  DOWNLOAD_KIND_LABEL,
  DOWNLOAD_PLATFORM_LABEL,
  type DownloadKind,
  type DownloadPlatform,
} from "@/lib/devportal/downloads";

export const Route = createFileRoute("/_authenticated/developers/downloads")({
  component: DownloadsPage,
});

const KINDS: (DownloadKind | "all")[] = ["all", "sdk", "cli", "sample", "tool", "documentation"];
const PLATFORMS: (DownloadPlatform | "all")[] = ["all", "windows", "macos", "linux", "any"];

function DownloadsPage() {
  const [kind, setKind] = useState<DownloadKind | "all">("all");
  const [platform, setPlatform] = useState<DownloadPlatform | "all">("all");

  const artifacts = useMemo(
    () =>
      DOWNLOADS.filter(
        (artifact) =>
          (kind === "all" || artifact.kind === kind) && (platform === "all" || artifact.platform === platform),
      ),
    [kind, platform],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Download centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          SDK packages, CLI tooling and sample projects. Verify every artifact against its published checksum.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setKind(entry)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                kind === entry
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {entry === "all" ? "All types" : DOWNLOAD_KIND_LABEL[entry]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setPlatform(entry)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                platform === entry
                  ? "border-violet/50 bg-violet/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {entry === "all" ? "All platforms" : DOWNLOAD_PLATFORM_LABEL[entry]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {artifacts.map((artifact) => (
          <article key={artifact.id} className="surface-card hover-lift space-y-3 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{artifact.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{artifact.description}</p>
              </div>
              <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                {DOWNLOAD_KIND_LABEL[artifact.kind]}
              </Badge>
            </div>
            <CodeBlock code={artifact.command} language="shell" filename={artifact.commandLabel} />
            <div className="space-y-1 text-[10.5px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>v{artifact.version}</span>
                <span>·</span>
                <span>{DOWNLOAD_PLATFORM_LABEL[artifact.platform]}</span>
                <span>·</span>
                <span>{artifact.size}</span>
              </div>
              <code className="block truncate font-mono">{artifact.checksum}</code>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
