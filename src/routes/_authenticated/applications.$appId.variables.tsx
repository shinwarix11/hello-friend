import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Lock, Pencil, Plus, Trash2 } from "lucide-react";

import {
  EmptyState,
  RowSkeleton,
  SectionCard,
} from "@/components/app/applications/parts";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/app/applications/parts";
import {
  useAppVariables,
  useDeleteVariable,
  useMyAppRole,
  useSaveVariable,
} from "@/hooks/useApplications";
import { atLeast, formatRelative, type ApplicationVariable } from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId/variables")({
  component: VariablesPage,
});

const EMPTY = { key: "", value: "", description: "", is_encrypted: false };

function VariablesPage() {
  const { appId } = Route.useParams();
  const { data: role } = useMyAppRole(appId);
  const { data: variables, isLoading } = useAppVariables(appId);
  const save = useSaveVariable(appId);
  const remove = useDeleteVariable(appId);
  const canManage = atLeast(role, "developer");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApplicationVariable | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  }

  function openEdit(v: ApplicationVariable) {
    setEditing(v);
    setForm({
      key: v.key,
      value: v.value ?? "",
      description: v.description ?? "",
      is_encrypted: v.is_encrypted,
    });
    setError("");
    setOpen(true);
  }

  function submit() {
    const key = form.key.trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,64}$/.test(key)) {
      setError("Keys use 2–64 uppercase letters, numbers or underscores.");
      return;
    }
    if (form.value.length > 4000) {
      setError("Value must be under 4000 characters.");
      return;
    }
    setError("");
    save.mutate(
      {
        ...(editing ? { id: editing.id } : {}),
        application_id: appId,
        key,
        name: key,
        value: form.value,
        description: form.description.trim() || null,
        is_encrypted: form.is_encrypted,
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <>
      <SectionCard
        title="Variables"
        description="Configuration and secrets delivered to your application at runtime."
        action={
          canManage ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New variable
            </Button>
          ) : null
        }
      >
        {isLoading ? (
          <RowSkeleton rows={3} />
        ) : (variables ?? []).length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No variables yet"
            description="Store feature flags, endpoints and secrets your client fetches securely."
          />
        ) : (
          <ul className="divide-y divide-border">
            {(variables ?? []).map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="truncate font-mono text-sm">{v.key}</code>
                    {v.is_encrypted ? (
                      <Badge variant="outline" className="gap-1 border-border text-[10px] uppercase">
                        <Lock className="h-3 w-3" /> Secret
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.is_encrypted ? "••••••••••••" : (v.value ?? "—")}
                    {v.description ? ` · ${v.description}` : ""}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {formatRelative(v.updated_at)}
                </span>
                {!v.is_encrypted && v.value ? <CopyButton value={v.value} /> : null}
                {canManage ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => remove.mutate(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit variable" : "New variable"}</DialogTitle>
            <DialogDescription>
              Secret values are hidden in the dashboard after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="var-key">Key</Label>
              <Input
                id="var-key"
                value={form.key}
                maxLength={64}
                placeholder="API_ENDPOINT"
                className="font-mono"
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-value">Value</Label>
              <Textarea
                id="var-value"
                rows={3}
                value={form.value}
                maxLength={4000}
                className="font-mono text-xs"
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-desc">Description</Label>
              <Input
                id="var-desc"
                value={form.description}
                maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm">Mark as secret</p>
                <p className="text-xs text-muted-foreground">Hide the value from the dashboard.</p>
              </div>
              <Switch
                checked={form.is_encrypted}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, is_encrypted: checked }))}
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              Save variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
