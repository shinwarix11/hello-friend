import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppAvatar } from "@/components/app/applications/parts";
import { useCreateApplication } from "@/hooks/useApplications";
import {
  CATEGORIES,
  ENVIRONMENTS,
  VISIBILITIES,
  slugify,
  type AppEnvironment,
  type AppVisibility,
} from "@/lib/applications";

const STEPS = [
  { title: "Identity", hint: "Name your application" },
  { title: "Classification", hint: "Category and environment" },
  { title: "Access", hint: "Visibility and tags" },
  { title: "Review", hint: "Confirm and create" },
];

export function CreateAppWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const create = useCreateApplication();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [internalName, setInternalName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [environment, setEnvironment] = useState<AppEnvironment>("development");
  const [visibility, setVisibility] = useState<AppVisibility>("private");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName("");
    setInternalName("");
    setSlugTouched(false);
    setDescription("");
    setCategory("general");
    setEnvironment("development");
    setVisibility("private");
    setTags([]);
    setTagDraft("");
  }, [open]);

  useEffect(() => {
    if (!slugTouched) setInternalName(slugify(name));
  }, [name, slugTouched]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e['name'] = "Name must be at least 2 characters.";
    if (name.trim().length > 60) e['name'] = "Name must be under 60 characters.";
    if (!/^[a-z0-9-]{2,48}$/.test(internalName))
      e['internal_name'] = "Use 2–48 lowercase letters, numbers or dashes.";
    if (description.length > 400) e['description'] = "Keep the description under 400 characters.";
    return e;
  }, [name, internalName, description]);

  const stepValid = step === 0 ? !errors['name'] && !errors['internal_name'] && !errors['description'] : true;

  function addTag() {
    const value = slugify(tagDraft);
    if (!value || tags.includes(value) || tags.length >= 8) return;
    setTags((t) => [...t, value]);
    setTagDraft("");
  }

  async function submit() {
    const app = await create.mutateAsync({
      name: name.trim(),
      internal_name: internalName,
      description: description.trim() || null,
      category,
      environment,
      visibility,
      tags,
    });
    onOpenChange(false);
    navigate({ to: "/applications/$appId", params: { appId: app.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="relative border-b border-border px-6 py-5">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-[image:var(--gradient-brand)] opacity-20 blur-3xl" />
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              New application
            </DialogTitle>
          </DialogHeader>
          <ol className="relative mt-5 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-all duration-300",
                    i < step && "border-primary bg-primary text-primary-foreground",
                    i === step && "border-primary text-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_15%,transparent)]",
                    i > step && "border-border text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
                {i < STEPS.length - 1 ? (
                  <span
                    className={cn(
                      "h-px flex-1 transition-colors duration-300",
                      i < step ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div key={step} className="animate-in-up min-h-[290px] space-y-5 px-6 py-6">
          {step === 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="app-name">Display name</Label>
                <Input
                  id="app-name"
                  autoFocus
                  value={name}
                  maxLength={60}
                  placeholder="Aegis Desktop Client"
                  onChange={(e) => setName(e.target.value)}
                />
                {errors['name'] ? (
                  <p className="text-xs text-destructive">{errors['name']}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-slug">Internal name</Label>
                <Input
                  id="app-slug"
                  value={internalName}
                  maxLength={48}
                  placeholder="aegis-desktop-client"
                  onChange={(e) => {
                    setSlugTouched(true);
                    setInternalName(slugify(e.target.value));
                  }}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Used in SDK calls and API references. Lowercase, dashes only.
                </p>
                {errors['internal_name'] ? (
                  <p className="text-xs text-destructive">{errors['internal_name']}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-desc">Description</Label>
                <Textarea
                  id="app-desc"
                  value={description}
                  maxLength={400}
                  rows={3}
                  placeholder="What does this application do?"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
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
                <div className="grid gap-2 sm:grid-cols-3">
                  {ENVIRONMENTS.map((env) => (
                    <button
                      key={env.value}
                      type="button"
                      onClick={() => setEnvironment(env.value)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200",
                        environment === env.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="space-y-2">
                  {VISIBILITIES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setVisibility(v.value)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                        visibility === v.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border",
                          visibility === v.value ? "border-primary bg-primary" : "border-border",
                        )}
                      />
                      <span>
                        <span className="block text-sm">{v.label}</span>
                        <span className="block text-xs text-muted-foreground">{v.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="app-tags"
                    value={tagDraft}
                    placeholder="production, internal…"
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {tags.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <Badge key={t} variant="outline" className="gap-1 border-border">
                        {t}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                          aria-label={`Remove ${t}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="surface-card flex items-center gap-4 rounded-xl p-4">
                <AppAvatar id={internalName} name={name || "AP"} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {internalName}
                  </p>
                </div>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Category", category.replace(/-/g, " ")],
                  ["Environment", environment],
                  ["Visibility", visibility],
                  ["Tags", tags.length ? tags.join(", ") : "None"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border bg-card/60 px-3 py-2">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="mt-0.5 text-sm capitalize">{v}</dd>
                  </div>
                ))}
              </dl>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || create.isPending}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" disabled={create.isPending} onClick={() => void submit()}>
              {create.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Create application
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
