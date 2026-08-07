import { createFileRoute } from "@tanstack/react-router";

import { DocSection, Prose } from "@/components/devportal/parts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeveloperPreferences, useUpdateDeveloperPreferences } from "@/hooks/useDeveloper";
import { SDKS } from "@/lib/devportal/sdks";
import { SNIPPET_LANGUAGES } from "@/lib/devportal/snippets";

export const Route = createFileRoute("/_authenticated/developers/settings")({
  component: DeveloperSettings,
});

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function DeveloperSettings() {
  const { data: prefs, isLoading } = useDeveloperPreferences();
  const update = useUpdateDeveloperPreferences();

  if (isLoading || !prefs) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  const save = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  return (
    <div className="space-y-8">
      <DocSection title="Defaults" description="How documentation and snippets are presented to you.">
        <div className="surface-card grid gap-4 rounded-2xl p-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Default snippet language</Label>
            <Select value={prefs.default_language} onValueChange={(v) => save({ default_language: v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SNIPPET_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preferred SDK</Label>
            <Select value={prefs.default_sdk} onValueChange={(v) => save({ default_sdk: v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SDKS.map((sdk) => (
                  <SelectItem key={sdk.id} value={sdk.id}>
                    {sdk.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Documentation density</Label>
            <Select value={prefs.docs_density} onValueChange={(v) => save({ docs_density: v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DocSection>

      <DocSection title="Explorer" description="Behaviour of the interactive API explorer.">
        <div className="surface-card rounded-2xl px-5 py-2">
          <ToggleRow
            label="Pretty-print responses"
            description="Format JSON responses with indentation."
            checked={prefs.explorer_pretty_json}
            onChange={(v) => save({ explorer_pretty_json: v })}
          />
          <ToggleRow
            label="Sign requests by default"
            description="Attach a timestamp, nonce and HMAC signature to every explorer request."
            checked={prefs.explorer_include_signature}
            onChange={(v) => save({ explorer_include_signature: v })}
          />
          <ToggleRow
            label="Show beta documentation"
            description="Include endpoints and SDKs that are not yet marked stable."
            checked={prefs.show_beta_docs}
            onChange={(v) => save({ show_beta_docs: v })}
          />
        </div>
      </DocSection>

      <DocSection title="Notifications" description="What we tell you about, and when.">
        <div className="surface-card rounded-2xl px-5 py-2">
          <ToggleRow
            label="Breaking changes"
            description="Get notified before a breaking API change ships."
            checked={prefs.notify_breaking_changes}
            onChange={(v) => save({ notify_breaking_changes: v })}
          />
          <ToggleRow
            label="SDK releases"
            description="New versions of the SDKs you use."
            checked={prefs.notify_sdk_releases}
            onChange={(v) => save({ notify_sdk_releases: v })}
          />
          <ToggleRow
            label="Webhook failures"
            description="Alert when an endpoint starts failing deliveries."
            checked={prefs.notify_webhook_failures}
            onChange={(v) => save({ notify_webhook_failures: v })}
          />
        </div>
        <Prose>Preferences save automatically and apply across the developer portal.</Prose>
      </DocSection>
    </div>
  );
}
