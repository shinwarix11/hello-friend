import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Aegis" },
      {
        name: "description",
        content: "Set a new password for your Aegis account using your secure recovery link.",
      },
      { property: "og:title", content: "Choose a new password — Aegis" },
      {
        property: "og:description",
        content: "Set a new password for your Aegis account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setReady(isRecovery || Boolean(data.session));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      void logActivity("password_change");
      toast.success("Password updated", { description: "You're signed in with your new password." });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_50%_40%,black,transparent_70%)]" />
        <div className="aurora absolute left-1/2 top-1/4 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet/20 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <Logo className="mb-8" />
        <div className="surface-card rounded-2xl p-7">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          </span>
          <h1 className="mt-5 text-xl font-semibold">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready
              ? "Pick something long and unique. This signs you back in."
              : "Open this page from the recovery link in your email to continue."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {[
              { id: "new", label: "New password", value: password, set: setPassword },
              { id: "confirm", label: "Confirm password", value: confirm, set: setConfirm },
            ].map((f) => (
              <div key={f.id} className="space-y-2">
                <Label htmlFor={f.id} className="text-xs text-muted-foreground">
                  {f.label}
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={f.id}
                    type="password"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={!ready}
                    className="h-11 bg-card pl-9"
                  />
                </div>
              </div>
            ))}

            <Button
              type="submit"
              disabled={loading || !ready}
              className="h-11 w-full bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/auth"
            search={{ mode: "signin", redirect: undefined }}
            className="text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
