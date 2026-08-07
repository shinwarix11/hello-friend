import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

import { DocSection, Prose, StatTile } from "@/components/devportal/parts";
import { Badge } from "@/components/ui/badge";
import { useApplications } from "@/hooks/useApplications";
import { useDeveloperApiKeys } from "@/hooks/useDeveloper";

export const Route = createFileRoute("/_authenticated/developers/keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { data: apps } = useApplications();
  const appIds = useMemo(() => (apps ?? []).map((a) => a.id), [apps]);
  const { data: keys } = useDeveloperApiKeys(appIds);

  const active = (keys ?? []).filter((k) => !k.revoked_at);
  const revoked = (keys ?? []).filter((k) => k.revoked_at);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Active keys" value={active.length} icon={KeyRound} tone="success" />
        <StatTile label="Revoked" value={revoked.length} icon={KeyRound} />
        <StatTile label="Applications" value={apps?.length ?? 0} icon={KeyRound} />
      </div>

      <DocSection
        title="Server API keys"
        description="Scoped, hashed keys used by your backend. Secret values are shown only once, at creation."
      >
        <div className="surface-card overflow-hidden rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Application</th>
                <th className="px-3 py-2 font-medium">Prefix</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 font-medium">Last used</th>
                <th className="px-3 py-2 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {(keys ?? []).map((key) => (
                <tr key={key.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">{key.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <Link
                      to="/applications/$appId/api"
                      params={{ appId: key.application_id }}
                      className="hover:text-foreground hover:underline"
                    >
                      {apps?.find((a) => a.id === key.application_id)?.name ?? "Application"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{key.key_prefix}…</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <code key={scope} className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">
                          {scope}
                        </code>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={
                        key.revoked_at
                          ? "border-destructive/40 text-[10px] uppercase tracking-wider text-destructive"
                          : "border-success/40 text-[10px] uppercase tracking-wider text-success"
                      }
                    >
                      {key.revoked_at ? "Revoked" : "Active"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(keys?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No API keys yet. Create one from an application's API tab.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Prose>
          Keys are stored hashed — Aegis cannot show a key again after creation. Rotate a key by creating its
          replacement, deploying it, then revoking the old one.
        </Prose>
      </DocSection>
    </div>
  );
}
