import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";

import { EmptyState, RowSkeleton, SectionCard } from "@/components/app/applications/parts";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMyAppRole } from "@/hooks/useApplications";
import {
  useDeleteSubscription,
  useLicenses,
  useSaveSubscription,
  useSubscriptions,
} from "@/hooks/useLicenses";
import { atLeast, formatDate } from "@/lib/applications";
import {
  DURATION_PRESETS,
  SUBSCRIPTION_STATUSES,
  durationLabel,
  type Subscription,
  type SubscriptionStatus,
} from "@/lib/licensing";

export const Route = createFileRoute("/_authenticated/applications/$appId/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { appId } = Route.useParams();
  const { data: subscriptions, isLoading } = useSubscriptions(appId);
  const { data: licenses } = useLicenses(appId);
  const { data: role } = useMyAppRole(appId);
  const save = useSaveSubscription();
  const remove = useDeleteSubscription();

  const canWrite = atLeast(role, "developer");
  const canDelete = atLeast(role, "administrator");

  const [editing, setEditing] = useState<Subscription | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState("30");
  const [customDays, setCustomDays] = useState(45);
  const [features, setFeatures] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [price, setPrice] = useState(0);

  const openDialog = (sub: Subscription | null) => {
    setEditing(sub);
    setName(sub?.name ?? "");
    setDescription(sub?.description ?? "");
    const days = sub?.duration_days ?? 30;
    const match = DURATION_PRESETS.find((p) => p.days === days);
    setPreset(sub ? (sub.duration_days === null ? "lifetime" : match ? String(days) : "custom") : "30");
    setCustomDays(days || 45);
    setFeatures((sub?.features ?? []).join("\n"));
    setStatus(sub?.status ?? "active");
    setPrice((sub?.price_cents ?? 0) / 100);
    setOpen(true);
  };

  const submit = async () => {
    const durationDays =
      preset === "lifetime" ? null : preset === "custom" ? Math.max(1, customDays) : Number(preset);
    await save.mutateAsync({
      applicationId: appId,
      id: editing?.id ?? null,
      values: {
        name: name.trim(),
        description: description.trim() || null,
        duration_days: durationDays,
        features: features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        status,
        price_cents: Math.round(price * 100),
      },
    });
    setOpen(false);
  };

  const countFor = (id: string) => (licenses ?? []).filter((l) => l.subscription_id === id).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Subscriptions</h2>
          <p className="text-xs text-muted-foreground">
            Reusable plans that define duration and feature entitlements for licenses.
          </p>
        </div>
        {canWrite ? (
          <Button onClick={() => openDialog(null)}>
            <Plus className="mr-1.5 h-4 w-4" /> New plan
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <RowSkeleton rows={3} />
      ) : (subscriptions ?? []).length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No subscription plans"
          description="Create plans like Monthly, Yearly or Lifetime and attach them to generated licenses."
          action={
            canWrite ? (
              <Button onClick={() => openDialog(null)}>
                <Plus className="mr-1.5 h-4 w-4" /> Create plan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(subscriptions ?? []).map((sub, i) => (
            <SectionCard
              key={sub.id}
              title={sub.name}
              description={sub.description ?? durationLabel(sub.duration_days)}
              className="animate-in-up"
              action={
                canWrite ? (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(sub)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove.mutate({ applicationId: appId, id: sub.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : undefined
              }
            >
              <div style={{ animationDelay: `${i * 40}ms` }} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {sub.price_cents ? `$${(sub.price_cents / 100).toFixed(2)}` : "Free"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {durationLabel(sub.duration_days).toLowerCase()}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(sub.features ?? []).slice(0, 5).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {f}
                    </li>
                  ))}
                  {!sub.features?.length ? <li>No features listed.</li> : null}
                </ul>
                <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <span className="uppercase tracking-wider">{sub.status}</span>
                  <span>{countFor(sub.id)} licenses</span>
                  <span>{formatDate(sub.created_at)}</span>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit plan" : "New subscription plan"}</DialogTitle>
            <DialogDescription>
              Plans are attached to licenses at generation time and exposed through the API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">Name</Label>
              <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro Monthly" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-desc">Description</Label>
              <Input
                id="sub-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full access with priority support"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {preset === "custom" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="sub-days">Days</Label>
                  <Input
                    id="sub-days"
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="sub-price">Price (USD)</Label>
                  <Input
                    id="sub-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-features">Features (one per line)</Label>
              <Textarea
                id="sub-features"
                rows={4}
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder={"Unlimited seats\nPriority support"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={!name.trim() || save.isPending}>
              {editing ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
