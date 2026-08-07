import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SDKS, SDK_STATUS_LABEL } from "@/lib/devportal/sdks";

export const Route = createFileRoute("/_authenticated/developers/sdks/")({
  component: SdkCatalogue,
});

function SdkCatalogue() {
  const [query, setQuery] = useState("");
  const sdks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SDKS;
    return SDKS.filter((sdk) => `${sdk.name} ${sdk.language} ${sdk.package} ${sdk.tagline}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Official SDKs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Idiomatic clients for {SDKS.length} languages, each with installation, initialization and licensing guides.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SDKs"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sdks.map((sdk) => (
          <Link
            key={sdk.id}
            to="/developers/sdks/$sdk"
            params={{ sdk: sdk.id }}
            className="surface-card hover-lift flex flex-col rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{sdk.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sdk.tagline}</p>
              </div>
              <Badge
                variant="outline"
                className={
                  sdk.status === "stable"
                    ? "border-success/40 text-[10px] uppercase tracking-wider text-success"
                    : sdk.status === "beta"
                      ? "border-warning/40 text-[10px] uppercase tracking-wider text-warning"
                      : "border-border text-[10px] uppercase tracking-wider text-muted-foreground"
                }
              >
                {SDK_STATUS_LABEL[sdk.status]}
              </Badge>
            </div>
            <div className="mt-3">
              <CodeBlock code={sdk.install} language={sdk.installLanguage} filename={sdk.package} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
              <span>v{sdk.latest}</span>
              <span>·</span>
              <span>{sdk.size}</span>
              <span>·</span>
              <span>{sdk.minimumRuntime}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
