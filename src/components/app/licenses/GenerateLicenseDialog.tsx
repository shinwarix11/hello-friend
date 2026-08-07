import { useState } from "react";
import { KeyRound, Sparkles } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateLicenses, useSubscriptions } from "@/hooks/useLicenses";
import { DURATION_PRESETS } from "@/lib/licensing";

export function GenerateLicenseDialog({
  applicationId,
  open,
  onOpenChange,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const generate = useGenerateLicenses();
  const { data: subscriptions } = useSubscriptions(applicationId);

  const [amount, setAmount] = useState(1);
  const [preset, setPreset] = useState("30");
  const [customDays, setCustomDays] = useState(45);
  const [prefix, setPrefix] = useState("");
  const [maxActivations, setMaxActivations] = useState(1);
  const [hwidLock, setHwidLock] = useState(true);
  const [owner, setOwner] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("none");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const durationDays =
    preset === "lifetime" ? null : preset === "custom" ? Math.max(1, customDays) : Number(preset);

  const submit = async () => {
    await generate.mutateAsync({
      applicationId,
      amount: Math.min(Math.max(1, amount), 500),
      prefix,
      durationDays,
      maxActivations: Math.max(1, maxActivations),
      hwidLock,
      ownerLabel: owner.trim() || null,
      subscriptionId: subscriptionId === "none" ? null : subscriptionId,
      notes: notes.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Generate licenses
          </DialogTitle>
          <DialogDescription>
            Keys are generated locally and stored immediately. Bulk generate up to 500 at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                max={500}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prefix">Key prefix</Label>
              <Input
                id="prefix"
                placeholder="AEGIS"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </div>
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
                <Label htmlFor="days">Custom days</Label>
                <Input
                  id="days"
                  type="number"
                  min={1}
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="acts">Max activations</Label>
                <Input
                  id="acts"
                  type="number"
                  min={1}
                  value={maxActivations}
                  onChange={(e) => setMaxActivations(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {preset === "custom" ? (
            <div className="space-y-1.5">
              <Label htmlFor="acts2">Max activations</Label>
              <Input
                id="acts2"
                type="number"
                min={1}
                value={maxActivations}
                onChange={(e) => setMaxActivations(Number(e.target.value))}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Subscription</Label>
            <Select value={subscriptionId} onValueChange={setSubscriptionId}>
              <SelectTrigger>
                <SelectValue placeholder="No subscription" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subscription</SelectItem>
                {(subscriptions ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="owner">Owner label</Label>
              <Input
                id="owner"
                placeholder="Reseller, campaign, customer…"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="beta, promo"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for your team"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Hardware lock</p>
              <p className="text-xs text-muted-foreground">
                Bind each activation to a device hardware id.
              </p>
            </div>
            <Switch checked={hwidLock} onCheckedChange={setHwidLock} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={generate.isPending}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {generate.isPending ? "Generating…" : `Generate ${Math.max(1, amount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
