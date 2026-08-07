import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, GitBranch, Plus, Shield, Trash2 } from "lucide-react";

import {
  ChannelPill,
  EmptyState,
  RowSkeleton,
  SectionCard,
} from "@/components/app/applications/parts";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAppVersions,
  useDeleteVersion,
  useMyAppRole,
  useSaveVersion,
  useSetCurrentVersion,
} from "@/hooks/useApplications";
import {
  VERSION_CHANNELS,
  atLeast,
  formatDate,
  type AppVersionChannel,
} from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId/versions")({
  component: VersionsPage,
});

function VersionsPage() {
  const { appId } = Route.useParams();
  const { data: role } = useMyAppRole(appId);
  const { data: versions, isLoading } = useAppVersions(appId);
  const save = useSaveVersion(appId);
  const setFlag = useSetCurrentVersion(appId);
  const remove = useDeleteVersion(appId);

  const canManage = atLeast(role, "developer");
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<AppVersionChannel>("stable");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const value = version.trim();
    if (!/^\d+\.\d+\.\d+([-.\w]*)$/.test(value)) {
      setError("Use semantic versioning, e.g. 1.4.0");
      return;
    }
    setError("");
    save.mutate(
      { application_id: appId, version: value, channel, release_notes: notes.trim() || null },
      {
        onSuccess: () => {
          setVersion("");
          setNotes("");
          setOpen(false);
        },
      },
    );
  }

  return (
    <>
      <SectionCard
        title="Version history"
        description="Publish releases and control which build your clients must run."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New version
            </Button>
          ) : null
        }
      >
        {isLoading ? (
          <RowSkeleton rows={3} />
        ) : (versions ?? []).length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No versions published"
            description="Publish your first release to start gating client builds."
          />
        ) : (
          <ol className="relative space-y-4 pl-6">
            <span className="absolute left-[7px] top-2 h-[calc(100%-16px)] w-px bg-border" />
            {(versions ?? []).map((v) => (
              <li key={v.id} className="relative">
                <span
                  className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-background ${
                    v.is_current ? "border-primary" : "border-border"
                  }`}
                />
                <div className="surface-card rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold">v{v.version}</p>
                    <ChannelPill channel={v.channel} />
                    {v.is_current ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        <CheckCircle2 className="h-3 w-3" /> Current
                      </span>
                    ) : null}
                    {v.is_minimum ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Shield className="h-3 w-3" /> Minimum
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(v.released_at)}
                    </span>
                  </div>
                  {v.release_notes ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {v.release_notes}
                    </p>
                  ) : null}
                  {canManage ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {!v.is_current ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setFlag.mutate({
                              versionId: v.id,
                              version: v.version,
                              field: "is_current",
                            })
                          }
                        >
                          Set current
                        </Button>
                      ) : null}
                      {!v.is_minimum ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setFlag.mutate({
                              versionId: v.id,
                              version: v.version,
                              field: "is_minimum",
                            })
                          }
                        >
                          Set minimum
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove.mutate(v.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publish a version</DialogTitle>
            <DialogDescription>Semantic versions keep clients predictable.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                maxLength={32}
                placeholder="1.4.0"
                className="font-mono"
                onChange={(e) => setVersion(e.target.value)}
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as AppVersionChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERSION_CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Release notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                maxLength={2000}
                placeholder="What changed in this release?"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
