import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile, initials } from "@/hooks/useProfile";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Aegis" },
      { name: "description", content: "Manage your Aegis identity: name, handle, role and bio." },
      { property: "og:title", content: "Profile — Aegis" },
      { property: "og:description", content: "Manage your Aegis identity details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    job_title: "",
    company: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      job_title: profile.job_title ?? "",
      company: profile.company ?? "",
      bio: profile.bio ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync({
      full_name: form.full_name.trim() || null,
      username: form.username.trim() || null,
      job_title: form.job_title.trim() || null,
      company: form.company.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
    });
    void logActivity("profile_update");
  }

  return (
    <>
      <PageHeader title="Profile" description="How you appear across the Aegis workspace." />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <section className="surface-card flex flex-wrap items-center gap-5 rounded-2xl p-6">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={form.avatar_url || undefined} alt="" />
              <AvatarFallback className="bg-[image:var(--gradient-brand)] text-primary-foreground">
                {initials(form.full_name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                placeholder="https://…"
                value={form.avatar_url}
                onChange={(e) => set("avatar_url", e.target.value)}
                className="bg-surface"
              />
            </div>
          </section>

          <section className="surface-card rounded-2xl p-6">
            <h2 className="text-base font-semibold">Details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  maxLength={100}
                  onChange={(e) => set("full_name", e.target.value)}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  maxLength={40}
                  onChange={(e) => set("username", e.target.value)}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Job title</Label>
                <Input
                  id="job_title"
                  value={form.job_title}
                  maxLength={80}
                  onChange={(e) => set("job_title", e.target.value)}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={form.company}
                  maxLength={80}
                  onChange={(e) => set("company", e.target.value)}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} disabled className="bg-surface" />
                <p className="text-xs text-muted-foreground">
                  Change your email from the Security page.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  className="resize-none bg-surface"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                disabled={update.isPending}
                className="bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90"
              >
                {update.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </section>
        </form>
      )}
    </>
  );
}
