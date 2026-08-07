import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Laptop, Loader2, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security — Aegis" },
      { name: "description", content: "Rotate your password, change your email and review active sessions." },
      { property: "og:title", content: "Security — Aegis" },
      { property: "og:description", content: "Password, email and session controls for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be under 72 characters");

function SecurityPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const verified = Boolean(user?.email_confirmed_at);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    void logActivity("password_change");
    toast.success("Password updated");
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email("Enter a valid email").max(255).safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: parsed.data },
      { emailRedirectTo: `${window.location.origin}/dashboard` },
    );
    setSavingEmail(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmail("");
    void logActivity("email_change");
    toast.success("Confirmation sent to your new address");
  }

  async function requestDeletion() {
    void logActivity(
      "account_delete_requested",
      "User requested account deletion and signed out.",
    );
    toast.success("Deletion requested. You have been signed out.");
    await signOut();
    navigate({ to: "/auth", search: { mode: "signin", redirect: undefined }, replace: true });
  }

  return (
    <>
      <PageHeader
        title="Security"
        description="Credentials, verification status and active sessions."
        badge={verified ? "Verified" : "Unverified"}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface">
              <KeyRound className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Change password</h2>
              <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
            </div>
          </div>

          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-surface"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-surface"
              />
            </div>
            <Button
              type="submit"
              disabled={savingPassword}
              className="w-full bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90"
            >
              {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        </section>

        <section className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface">
              <Mail className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Change email</h2>
              <p className="truncate text-xs text-muted-foreground">Current: {user?.email}</p>
            </div>
          </div>

          <form onSubmit={changeEmail} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New email address</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={savingEmail}
              className="w-full border-border bg-surface"
            >
              {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send confirmation
            </Button>
            <p className="text-xs text-muted-foreground">
              We'll email both addresses to confirm the change.
            </p>
          </form>
        </section>

        <section className="surface-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Active sessions</h2>
                <p className="text-xs text-muted-foreground">Devices currently holding a valid token.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-border bg-surface" onClick={requestDeletion}>
              Sign out everywhere
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card">
              <Laptop className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">This device</p>
              <p className="truncate text-xs text-muted-foreground">
                {typeof navigator === "undefined" ? "Unknown client" : navigator.userAgent}
              </p>
            </div>
            <Badge className="shrink-0 bg-success/15 text-success">Current</Badge>
          </div>
        </section>

        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-destructive">Delete account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently removes your profile, preferences and audit history.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This request is logged and your session will be terminated immediately. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={requestDeletion}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </>
  );
}
