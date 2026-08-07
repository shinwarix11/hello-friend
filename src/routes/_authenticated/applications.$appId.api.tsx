import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeySquare, Plus, ShieldAlert, Trash2 } from "lucide-react";

import { EmptyState, RowSkeleton, SecretField, SectionCard } from "@/components/app/applications/parts";
import { DataTable } from "@/components/app/licenses/parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApplication, useMyAppRole } from "@/hooks/useApplications";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/hooks/useLicenses";
import { atLeast, formatDate, formatRelative } from "@/lib/applications";
import { API_SCOPES } from "@/lib/licensing";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/applications/$appId/api")({
  component: ApiPage,
});

function ApiPage() {
  const { appId } = Route.useParams();
  const { data: app } = useApplication(appId);
  const { data: keys, isLoading } = useApiKeys(appId);
  const { data: role } = useMyAppRole(appId);
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();

  const canManage = atLeast(role, "administrator");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([...API_SCOPES]);
  const [issued, setIssued] = useState<string | null>(null);

  const base =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/v1` : "/api/public/v1";

  const example = `curl -X POST ${base}/login \\
  -H "content-type: application/json" \\
  -H "x-app-key: ${app?.public_key ?? "<application key>"}" \\
  -d '{"username":"demo","password":"secret","hwid":"DEVICE-1"}'`;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Application credentials"
        description="Ship the application key inside your SDK. Keep the secret key on your servers only."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <SecretField label="Application key (public)" value={app?.public_key ?? ""} />
          <SecretField label="Secret key (signing)" value={app?.secret_key ?? ""} masked />
          <SecretField label="API base URL" value={base} />
          <SecretField label="API version" value="v1" />
        </div>
      </SectionCard>

      <SectionCard
        title="API keys"
        description="Server-side keys for privileged endpoints such as variable writes and webhook triggers."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New key
            </Button>
          ) : undefined
        }
      >
        {!canManage ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> Only administrators and owners can view API keys.
          </p>
        ) : isLoading ? (
          <RowSkeleton rows={3} />
        ) : (keys ?? []).length === 0 ? (
          <EmptyState
            icon={KeySquare}
            title="No API keys"
            description="Create a key to authorise server-to-server calls against this application."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Create API key
              </Button>
            }
          />
        ) : (
          <DataTable head={["Name", "Key", "Scopes", "Last used", "Created", ""]}>
            {(keys ?? []).map((key) => (
              <tr key={key.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3 text-sm font-medium">
                  {key.name}
                  {key.revoked_at ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-destructive">
                      revoked
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {key.key_prefix}••••••
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[260px] flex-wrap gap-1">
                    {(key.scopes ?? []).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border px-1.5 py-px text-[9px] uppercase tracking-wider text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatRelative(key.last_used_at)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(key.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {!key.revoked_at ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => revoke.mutate({ applicationId: appId, id: key.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard title="Quick start" description="A first authenticated call, copy and paste.">
        <pre className="overflow-x-auto rounded-lg border border-border bg-card/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {example}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            void navigator.clipboard.writeText(example);
            toast.success("Snippet copied");
          }}
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy snippet
        </Button>
      </SectionCard>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setIssued(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{issued ? "API key created" : "New API key"}</DialogTitle>
            <DialogDescription>
              {issued
                ? "Copy this key now — it is hashed on the server and cannot be shown again."
                : "Scopes limit what this key is allowed to do."}
            </DialogDescription>
          </DialogHeader>

          {issued ? (
            <SecretField label="Secret API key" value={issued} />
          ) : (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Backend server"
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                {API_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={scopes.includes(scope)}
                      onCheckedChange={(v) =>
                        setScopes((prev) =>
                          v ? [...prev, scope] : prev.filter((s) => s !== scope),
                        )
                      }
                    />
                    <span className="font-mono text-xs">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {issued ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!name.trim() || create.isPending}
                  onClick={async () => {
                    const key = await create.mutateAsync({
                      applicationId: appId,
                      name: name.trim(),
                      scopes,
                    });
                    setIssued(key);
                    setName("");
                  }}
                >
                  Create key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
