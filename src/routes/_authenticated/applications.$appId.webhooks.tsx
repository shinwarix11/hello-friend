import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { useMyAppRole } from "@/hooks/useApplications";
import {
  useDeleteWebhook,
  useSaveWebhook,
  useWebhookDeliveries,
  useWebhooks,
} from "@/hooks/useLicenses";
import { atLeast, formatRelative } from "@/lib/applications";
import { WEBHOOK_EVENTS, type Webhook, type WebhookEvent } from "@/lib/licensing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/applications/$appId/webhooks")({
  component: WebhooksPage,
});

function WebhooksPage() {
  const { appId } = Route.useParams();
  const { data: hooks, isLoading } = useWebhooks(appId);
  const { data: deliveries } = useWebhookDeliveries(appId);
  const { data: role } = useMyAppRole(appId);
  const save = useSaveWebhook();
  const remove = useDeleteWebhook();

  const canManage = atLeast(role, "administrator");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isActive, setIsActive] = useState(true);

  const openDialog = (hook: Webhook | null) => {
    setEditing(hook);
    setName(hook?.name ?? "");
    setUrl(hook?.url ?? "");
    setEvents((hook?.events ?? []) as WebhookEvent[]);
    setIsActive(hook?.is_active ?? true);
    setOpen(true);
  };

  const nameById = new Map((hooks ?? []).map((h) => [h.id, h.name]));

  return (
    <div className="space-y-5">
      <SectionCard
        title="Webhook endpoints"
        description="Aegis signs every delivery with HMAC-SHA256 in the x-aegis-signature header."
        action={
          canManage ? (
            <Button size="sm" onClick={() => openDialog(null)}>
              <Plus className="mr-1.5 h-4 w-4" /> New webhook
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <RowSkeleton rows={3} />
        ) : (hooks ?? []).length === 0 ? (
          <EmptyState
            icon={WebhookIcon}
            title="No webhooks configured"
            description="Receive real-time events when licenses activate, users register or versions ship."
            action={
              canManage ? (
                <Button onClick={() => openDialog(null)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Create webhook
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {(hooks ?? []).map((hook) => (
              <div key={hook.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      hook.is_active ? "bg-success" : "bg-muted-foreground",
                    )}
                  />
                  <p className="text-sm font-medium">{hook.name}</p>
                  <code className="truncate font-mono text-xs text-muted-foreground">{hook.url}</code>
                  {canManage ? (
                    <div className="ml-auto flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(hook)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove.mutate({ applicationId: appId, id: hook.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(hook.events ?? []).map((e) => (
                    <span
                      key={e}
                      className="rounded-full border border-border px-2 py-px text-[10px] text-muted-foreground"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                {canManage ? (
                  <div className="mt-3">
                    <SecretField label="Signing secret" value={hook.signing_secret} masked />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent deliveries" description="The last 50 delivery attempts and retries.">
        {(deliveries ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <DataTable head={["Event", "Endpoint", "Status", "Response", "Attempts", "When"]}>
            {(deliveries ?? []).map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3 font-mono text-xs">{d.event}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {nameById.get(d.webhook_id) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider",
                      d.status === "success" ? "text-success" : d.status === "failed" ? "text-destructive" : "text-warning",
                    )}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {d.response_status ?? d.error ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums">{d.attempts}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelative(d.created_at)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit webhook" : "New webhook"}</DialogTitle>
            <DialogDescription>
              We POST a JSON body and sign it with the endpoint&apos;s signing secret.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hook-name">Name</Label>
              <Input id="hook-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Billing sync" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hook-url">Endpoint URL</Label>
              <Input
                id="hook-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/hooks/aegis"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((e) => (
                  <label key={e.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={events.includes(e.value)}
                      onCheckedChange={(v) =>
                        setEvents((prev) =>
                          v ? [...prev, e.value] : prev.filter((x) => x !== e.value),
                        )
                      }
                    />
                    <span className="text-xs">{e.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3">
              <span className="text-sm">Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || !url.trim() || save.isPending}
              onClick={async () => {
                await save.mutateAsync({
                  applicationId: appId,
                  id: editing?.id ?? null,
                  name: name.trim(),
                  url: url.trim(),
                  events,
                  isActive,
                });
                setOpen(false);
              }}
            >
              {editing ? "Save changes" : "Create webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
