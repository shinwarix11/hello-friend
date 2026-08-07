import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink, Package, Plus, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAppDownloads,
  useAppVersions,
  useDeleteDownload,
  useMyAppRole,
  useSaveDownload,
} from "@/hooks/useApplications";
import {
  DOWNLOAD_KINDS,
  atLeast,
  formatBytes,
  formatRelative,
  type AppDownloadKind,
} from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId/downloads")({
  component: DownloadsPage,
});

function DownloadsPage() {
  const { appId } = Route.useParams();
  const { data: role } = useMyAppRole(appId);
  const { data: downloads, isLoading } = useAppDownloads(appId);
  const { data: versions } = useAppVersions(appId);
  const save = useSaveDownload(appId);
  const remove = useDeleteDownload(appId);
  const canManage = atLeast(role, "developer");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<AppDownloadKind>("installer");
  const [versionId, setVersionId] = useState<string>("none");
  const [size, setSize] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (name.trim().length < 2) {
      setError("Give the artifact a name.");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      setError("Enter a valid https download URL.");
      return;
    }
    if (parsed.protocol !== "https:") {
      setError("Download URLs must use https.");
      return;
    }
    setError("");
    save.mutate(
      {
        application_id: appId,
        name: name.trim(),
        file_url: parsed.toString(),
        kind,
        size_bytes: size ? Number(size) : 0,
        version_id: versionId === "none" ? null : versionId,
      },
      {
        onSuccess: () => {
          setName("");
          setUrl("");
          setSize("");
          setOpen(false);
        },
      },
    );
  }

  return (
    <>
      <SectionCard
        title="Downloads"
        description="Installers, archives and documentation your users can fetch."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add artifact
            </Button>
          ) : null
        }
      >
        {isLoading ? (
          <RowSkeleton rows={3} />
        ) : (downloads ?? []).length === 0 ? (
          <EmptyState
            icon={Package}
            title="No artifacts yet"
            description="Attach installers or archives so your users always get the right build."
          />
        ) : (
          <ul className="divide-y divide-border">
            {(downloads ?? []).map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatBytes(d.size_bytes ?? 0)} · {d.download_count ?? 0} downloads ·{" "}
                    {formatRelative(d.created_at)}
                  </p>
                </div>
                <Badge variant="outline" className="border-border text-[10px] uppercase">
                  {d.kind}
                </Badge>
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <a href={d.file_url ?? "#"} target="_blank" rel="noreferrer noopener" aria-label="Open">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a download</DialogTitle>
            <DialogDescription>Link an artifact hosted over https.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dl-name">Name</Label>
              <Input
                id="dl-name"
                value={name}
                maxLength={80}
                placeholder="Aegis Client Setup"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dl-url">File URL</Label>
              <Input
                id="dl-url"
                value={url}
                maxLength={500}
                placeholder="https://cdn.example.com/setup.exe"
                className="font-mono text-xs"
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as AppDownloadKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOWNLOAD_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dl-size">Size (bytes)</Label>
                <Input
                  id="dl-size"
                  value={size}
                  inputMode="numeric"
                  onChange={(e) => setSize(e.target.value.replace(/\D/g, "").slice(0, 12))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Linked version</Label>
              <Select value={versionId} onValueChange={setVersionId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {(versions ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              Add download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
