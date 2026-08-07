import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Ban,
  Check,
  Copy,
  Download,
  KeyRound,
  MonitorSmartphone,
  Plus,
  RotateCcw,
  Search,
  Timer,
  Trash2,
  Upload,
} from "lucide-react";

import { GenerateLicenseDialog } from "@/components/app/licenses/GenerateLicenseDialog";
import { DataTable, LicenseStatusPill } from "@/components/app/licenses/parts";
import { EmptyState, RowSkeleton } from "@/components/app/applications/parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMyAppRole } from "@/hooks/useApplications";
import {
  useBulkLicenseAction,
  useImportLicenses,
  useLicenses,
  useUpdateLicense,
} from "@/hooks/useLicenses";
import { atLeast, formatDate, formatRelative } from "@/lib/applications";
import {
  LICENSE_STATUSES,
  daysUntil,
  downloadFile,
  durationLabel,
  effectiveStatus,
  licensesToCsv,
  type LicenseStatus,
} from "@/lib/licensing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/applications/$appId/licenses")({
  component: LicensesPage,
});

function LicensesPage() {
  const { appId } = Route.useParams();
  const { data: licenses, isLoading } = useLicenses(appId);
  const { data: role } = useMyAppRole(appId);
  const bulk = useBulkLicenseAction();
  const update = useUpdateLicense();
  const importer = useImportLicenses();

  const canWrite = atLeast(role, "developer");
  const canDelete = atLeast(role, "administrator");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LicenseStatus>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (licenses ?? []).filter((l) => {
      if (status !== "all" && effectiveStatus(l) !== status) return false;
      if (!q) return true;
      return (
        l.license_key.toLowerCase().includes(q) ||
        (l.owner_label ?? "").toLowerCase().includes(q) ||
        (l.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [licenses, query, status]);

  const allSelected = rows.length > 0 && selected.length === rows.length;

  const runBulk = (action: Parameters<typeof bulk.mutate>[0]["action"], days?: number) => {
    if (!selected.length) return;
    bulk.mutate(
      { applicationId: appId, ids: selected, action, ...(days === undefined ? {} : { days }) },
      { onSuccess: () => setSelected([]) },
    );
  };

  const copy = (key: string) => {
    void navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keys, owners, tags…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LICENSE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => downloadFile(`licenses-${appId}.csv`, licensesToCsv(rows))}
          disabled={!rows.length}
        >
          <Download className="mr-1.5 h-4 w-4" /> Export
        </Button>
        {canWrite ? (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" /> Import
            </Button>
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Generate
            </Button>
          </>
        ) : null}
      </div>

      {selected.length && canWrite ? (
        <div className="surface-card animate-in-up flex flex-wrap items-center gap-2 rounded-xl px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {selected.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => runBulk("activate")}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("suspend")}>
              <Timer className="mr-1.5 h-3.5 w-3.5" /> Suspend
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("ban")}>
              <Ban className="mr-1.5 h-3.5 w-3.5" /> Ban
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("extend", 30)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Extend 30d
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("reset-hwid")}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset HWID
            </Button>
            {canDelete ? (
              <Button size="sm" variant="destructive" onClick={() => runBulk("delete")}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <RowSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={licenses?.length ? "No licenses match your filters" : "No licenses yet"}
          description={
            licenses?.length
              ? "Try a different search term or status filter."
              : "Generate your first batch of license keys to start authenticating users."
          }
          action={
            canWrite ? (
              <Button onClick={() => setGenerateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Generate licenses
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          head={[
            canWrite ? (
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])}
                aria-label="Select all"
              />
            ) : (
              ""
            ),
            "License key",
            "Status",
            "Owner",
            "Duration",
            "Activations",
            "Expires",
            "Created",
            "",
          ]}
        >
          {rows.map((license) => {
            const eff = effectiveStatus(license);
            const left = daysUntil(license.expires_at);
            return (
              <tr key={license.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3">
                  {canWrite ? (
                    <Checkbox
                      checked={selected.includes(license.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) =>
                          v ? [...prev, license.id] : prev.filter((id) => id !== license.id),
                        )
                      }
                      aria-label={`Select ${license.license_key}`}
                    />
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => copy(license.license_key)}
                    className="group inline-flex items-center gap-2 font-mono text-xs"
                  >
                    <span className="truncate">{license.license_key}</span>
                    {copied === license.license_key ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                  {license.tags?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {license.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border px-1.5 py-px text-[9px] uppercase tracking-wider text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <LicenseStatusPill status={eff} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {license.owner_label ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {durationLabel(license.duration_days)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
                    <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    {license.current_activations}/{license.max_activations}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={cn(
                      "text-muted-foreground",
                      left !== null && left <= 7 && left >= 0 && "text-warning",
                      left !== null && left < 0 && "text-destructive",
                    )}
                  >
                    {license.expires_at ? formatDate(license.expires_at) : "Lifetime"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatRelative(license.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  {canWrite ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Renew (reset from today)"
                        onClick={() =>
                          update.mutate({
                            applicationId: appId,
                            id: license.id,
                            event: "license_renewed",
                            patch: {
                              status: "active",
                              expires_at:
                                license.duration_days === null
                                  ? null
                                  : new Date(
                                      Date.now() + license.duration_days * 86_400_000,
                                    ).toISOString(),
                            },
                          })
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={eff === "banned" ? "Unban" : "Ban"}
                        onClick={() =>
                          update.mutate({
                            applicationId: appId,
                            id: license.id,
                            event: eff === "banned" ? "license_unbanned" : "license_banned",
                            patch: { status: eff === "banned" ? "active" : "banned" },
                          })
                        }
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <GenerateLicenseDialog applicationId={appId} open={generateOpen} onOpenChange={setGenerateOpen} />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import licenses</DialogTitle>
            <DialogDescription>
              Paste one license key per line. Duplicate keys are rejected by the database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="import">License keys</Label>
            <Textarea
              id="import"
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"AEGIS-XXXX-XXXX-XXXX\nAEGIS-YYYY-YYYY-YYYY"}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={importer.isPending}
              onClick={() => {
                const keys = importText
                  .split("\n")
                  .map((k) => k.trim())
                  .filter(Boolean);
                if (!keys.length) {
                  toast.error("Add at least one license key");
                  return;
                }
                importer.mutate(
                  { applicationId: appId, keys, durationDays: null, maxActivations: 1 },
                  {
                    onSuccess: () => {
                      setImportText("");
                      setImportOpen(false);
                    },
                  },
                );
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
