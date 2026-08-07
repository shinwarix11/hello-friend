import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).catch("signin").optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Aegis Identity" },
      {
        name: "description",
        content:
          "Sign in or create your Aegis workspace to manage authentication, sessions, roles and audit trails.",
      },
      { property: "og:title", content: "Sign in — Aegis Identity" },
      {
        property: "og:description",
        content: "Access your Aegis workspace to manage authentication and security.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

function safePath(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const destination = safePath(search.redirect);

  useEffect(() => {
    if (session) navigate({ to: destination, replace: true });
  }, [session, destination, navigate]);

  useEffect(() => {
    setMode(search.mode ?? "signin");
  }, [search.mode]);

  const switchMode = (next: Mode) => {
    setSentTo(null);
    setMode(next);
    navigate({ to: "/auth", search: { mode: next, redirect: search.redirect }, replace: true });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const parsed = z.string().trim().email("Enter a valid email address").safeParse(email);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentTo(parsed.data);
        toast.success("Reset link sent", { description: "Check your inbox to continue." });
        return;
      }

      const parsed = credentials.safeParse({ email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check your details");
        return;
      }

      if (mode === "signup") {
        const name = fullName.trim().slice(0, 80);
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${destination}`,
            data: { full_name: name || parsed.data.email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentTo(parsed.data.email);
          toast.success("Confirm your email", {
            description: "We sent a verification link to finish setting up your account.",
          });
          return;
        }
        void logActivity("sign_up");
        toast.success("Welcome to Aegis");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      if (!remember && typeof window !== "undefined") {
        window.sessionStorage.setItem("aegis:ephemeral-session", "1");
      }
      void logActivity("sign_in");
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("aegis:post-auth", destination);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      void logActivity("sign_in", "Signed in with Google");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setOauthLoading(false);
    }
  }

  const copy = {
    signin: { title: "Welcome back", sub: "Sign in to your Aegis workspace." },
    signup: { title: "Create your workspace", sub: "Free forever up to 5,000 monthly users." },
    forgot: { title: "Reset your password", sub: "We'll email you a secure recovery link." },
  }[mode];

  return (
    <div className="relative grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="aurora absolute -left-20 top-10 h-[30rem] w-[30rem] rounded-full bg-primary/25 blur-[130px]" />
          <div className="aurora absolute bottom-0 right-0 h-[26rem] w-[26rem] rounded-full bg-violet/25 blur-[130px] [animation-delay:-8s]" />
        </div>
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight">
            Identity infrastructure with <span className="text-gradient">taste</span>.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Sessions, roles and audit trails in one place — enforced in the database, observable
            from a dashboard your whole team can read.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              ["Row-level security on every table", ShieldCheck],
              ["Device-level session revocation", Lock],
              ["Full audit trail from day one", User],
            ].map(([label, Icon]) => (
              <li key={label as string} className="flex items-center gap-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card">
                  {/* @ts-expect-error icon component from tuple */}
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <span className="text-muted-foreground">{label as string}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          SOC2-ready controls · 99.99% uptime
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>

          <h1 className="mt-6 text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.sub}</p>

          {sentTo ? (
            <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="mt-1.5 leading-relaxed text-muted-foreground">
                We sent a secure link to <span className="text-foreground">{sentTo}</span>. It
                expires in 60 minutes.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 px-0 text-primary hover:bg-transparent"
                onClick={() => switchMode("signin")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogle}
                    disabled={oauthLoading}
                    className="mt-8 h-11 w-full border-border bg-card hover:bg-accent"
                  >
                    {oauthLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z" />
                        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
                        <path fill="#FBBC05" d="M5.3 14.2a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.2Z" />
                        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>

                  <div className="my-6 flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      or
                    </span>
                    <Separator className="flex-1" />
                  </div>
                </>
              ) : null}

              <form onSubmit={handleSubmit} className={cn("space-y-4", mode === "forgot" && "mt-8")}>
                {mode === "signup" ? (
                  <Field
                    id="name"
                    label="Full name"
                    icon={User}
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                  />
                ) : null}

                <Field
                  id="email"
                  label="Work email"
                  type="email"
                  icon={Mail}
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />

                {mode !== "forgot" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs text-muted-foreground">
                        Password
                      </Label>
                      {mode === "signin" ? (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot?
                        </button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        required
                        className="h-11 bg-card pl-9"
                      />
                    </div>
                    {mode === "signup" ? (
                      <p className="text-[11px] text-muted-foreground">
                        Minimum 8 characters. Checked against known breach databases.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {mode === "signin" ? (
                  <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(Boolean(v))}
                      className="border-border"
                    />
                    Keep me signed in on this device
                  </label>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full bg-[image:var(--gradient-brand)] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
                  {!loading ? <ArrowRight className="ml-1.5 h-4 w-4" /> : null}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button onClick={() => switchMode("signin")} className="text-primary hover:underline">
                      Sign in
                    </button>
                  </>
                ) : mode === "signin" ? (
                  <>
                    New to Aegis?{" "}
                    <button onClick={() => switchMode("signup")} className="text-primary hover:underline">
                      Create an account
                    </button>
                  </>
                ) : (
                  <button onClick={() => switchMode("signin")} className="text-primary hover:underline">
                    Back to sign in
                  </button>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="h-11 bg-card pl-9"
        />
      </div>
    </div>
  );
}
