import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Save, Trash2 } from "lucide-react";

import { SectionCard } from "@/components/app/applications/parts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAppSettings,
  useApplication,
  useDeleteApplication,
  useMyAppRole,
  useUpdateAppSettings,
  useUpdateApplication,
} from "@/hooks/useApplications";
import { CATEGORIES, ENVIRONMENTS, VISIBILITIES, atLeast } from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { appId } = Route.useParams();
  const navigate = useNavigate();
  const { data: app } = useApplication(appId);
  const { data: settings } = useAppSettings(appId);
  const { data: role } = useMyAppRole(appId);
  const updateApp = useUpdateApplication(appId);
  const updateSettings = useUpdateAppSettings(appId);
  const deleteApp = useDeleteApplication();

  const canManage = atLeast(role, "administrator");
  const isOwner = role === "owner";

  const [general, setGeneral] = useState({
    name: "",
    description: "",
    category: "general",
    environment: "development",
    visibility: "private",
    status: "active",
  });
  const [security, setSecurity] = useState({
    hwid_lock: false,
    require_2fa: false,
    force_https: true,
    session_timeout_minutes: 60,
    rate_limit_per_minute: 120,
    maintenance_message: "",
    support_email: "",
  });
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (!app) return;
    setGeneral({
      name: app.name,
      description: app.description ?? "",
      category: app.category,
      environment: app.environment,
      visibility: app.visibility,
      status: app.status,
    });
  }, [app]);

  useEffect(() => {
    if (!settings) return;
    setSecurity({
      hwid_lock: settings.hwid_lock,
      require_2fa: settings.require_2fa,
      force_https: settings.force_https,
      session_timeout_minutes: settings.session_timeout_minutes,
      rate_limit_per_minute: settings.rate_limit_per_minute,
      maintenance_message: settings.maintenance_message ?? "",
      support_email: settings.support_email ?? "",
    });
  }, [settings]);

  return (
    <div className="space-y-6">
      <SectionCard title="General" description="Naming, classification and lifecycle status.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="set-name">Display name</Label>
            <Input
              id="set-name"
              value={general.name}
              maxLength={60}
              disabled={!canManage}
              onChange={(e) => setGeneral((g) => ({ ...g, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="set-desc">Description</Label>
            <Textarea
              id="set-desc"
              rows={3}
              value={general.description}
              maxLength={400}
              disabled={!canManage}
              onChange={(e) => setGeneral((g) => ({ ...g, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={general.category}
              disabled={!canManage}
              onValueChange={(v) => setGeneral((g) => ({ ...g, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c.replace(/-/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={general.environment}
              disabled={!canManage}
              onValueChange={(v) => setGeneral((g) => ({ ...g, environment: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={general.visibility}
              disabled={!canManage}
              onValueChange={(v) => setGeneral((g) => ({ ...g, visibility: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={general.status}
              disabled={!canManage}
              onValueChange={(v) => setGeneral((g) => ({ ...g, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["active", "paused", "maintenance", "archived"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canManage ? (
          <div className="mt-5 flex justify-end border-t border-border pt-4">
            <Button
              disabled={updateApp.isPending || general.name.trim().length < 2}
              onClick={() =>
                updateApp.mutate({
                  name: general.name.trim(),
                  description: general.description.trim() || null,
                  category: general.category,
                  environment: general.environment as never,
                  visibility: general.visibility as never,
                  status: general.status as never,
                })
              }
            >
              <Save className="mr-1.5 h-4 w-4" /> Save changes
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Security" description="Protection rules applied to every client session.">
        <div className="space-y-3">
          {(
            [
              ["hwid_lock", "Hardware ID lock", "Bind sessions to a single machine fingerprint."],
              ["require_2fa", "Require 2FA", "Members must use two-factor authentication."],
              ["force_https", "Force HTTPS", "Reject any plaintext client connection."],
            ] as const
          ).map(([key, label, hint]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <Switch
                checked={security[key]}
                disabled={!canManage}
                onCheckedChange={(checked) => setSecurity((s) => ({ ...s, [key]: checked }))}
              />
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeout">Session timeout (minutes)</Label>
              <Input
                id="timeout"
                inputMode="numeric"
                disabled={!canManage}
                value={String(security.session_timeout_minutes)}
                onChange={(e) =>
                  setSecurity((s) => ({
                    ...s,
                    session_timeout_minutes: Math.min(
                      Number(e.target.value.replace(/\D/g, "") || 0),
                      44640,
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate limit (requests / minute)</Label>
              <Input
                id="rate"
                inputMode="numeric"
                disabled={!canManage}
                value={String(security.rate_limit_per_minute)}
                onChange={(e) =>
                  setSecurity((s) => ({
                    ...s,
                    rate_limit_per_minute: Math.min(
                      Number(e.target.value.replace(/\D/g, "") || 0),
                      100000,
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support">Support email</Label>
              <Input
                id="support"
                type="email"
                maxLength={255}
                disabled={!canManage}
                value={security.support_email}
                onChange={(e) => setSecurity((s) => ({ ...s, support_email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maint">Maintenance message</Label>
              <Input
                id="maint"
                maxLength={200}
                disabled={!canManage}
                value={security.maintenance_message}
                onChange={(e) =>
                  setSecurity((s) => ({ ...s, maintenance_message: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        {canManage ? (
          <div className="mt-5 flex justify-end border-t border-border pt-4">
            <Button
              disabled={updateSettings.isPending}
              onClick={() =>
                updateSettings.mutate({
                  hwid_lock: security.hwid_lock,
                  require_2fa: security.require_2fa,
                  force_https: security.force_https,
                  session_timeout_minutes: security.session_timeout_minutes,
                  rate_limit_per_minute: security.rate_limit_per_minute,
                  support_email: security.support_email.trim() || null,
                  maintenance_message: security.maintenance_message.trim() || null,
                })
              }
            >
              <Save className="mr-1.5 h-4 w-4" /> Save security
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {isOwner ? (
        <section className="animate-in-up rounded-2xl border border-destructive/30 bg-destructive/5">
          <header className="flex items-center gap-2 border-b border-destructive/20 px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm">Delete this application</p>
              <p className="text-xs text-muted-foreground">
                Removes every member, version, variable and artifact. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {app?.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Type the application name to confirm. This action is permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmName}
                  placeholder={app?.name ?? ""}
                  onChange={(e) => setConfirmName(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmName !== app?.name}
                    onClick={() =>
                      deleteApp.mutate(appId, {
                        onSuccess: () => navigate({ to: "/applications" }),
                      })
                    }
                  >
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      ) : null}
    </div>
  );
}
