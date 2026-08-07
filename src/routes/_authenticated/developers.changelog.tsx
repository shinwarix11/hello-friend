import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { CHANGELOG, CHANGE_KIND_LABEL, type ChangeKind } from "@/lib/devportal/changelog";

export const Route = createFileRoute("/_authenticated/developers/changelog")({
  component: ChangelogPage,
});

const KIND_CLASS: Record<ChangeKind, string> = {
  breaking: "border-destructive/40 text-destructive",
  security: "border-warning/40 text-warning",
  feature: "border-success/40 text-success",
  improvement: "border-primary/40 text-primary",
  fix: "border-border text-muted-foreground",
};

function ChangelogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Changelog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform releases, breaking changes and security notes — newest first.
        </p>
      </div>

      <div className="relative space-y-6 border-l border-border pl-6">
        {CHANGELOG.map((entry) => (
          <article key={entry.version} id={`v${entry.version}`} className="scroll-mt-24">
            <span className="absolute -left-[5px] mt-2 h-2.5 w-2.5 rounded-full bg-[image:var(--gradient-brand)]" />
            <div className="surface-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-semibold">{entry.title}</h3>
                <Badge variant="outline" className="border-border font-mono text-[10px] font-normal">
                  v{entry.version}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{entry.date}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{entry.summary}</p>
              <ul className="mt-4 space-y-2">
                {entry.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Badge
                      variant="outline"
                      className={`mt-0.5 text-[10px] uppercase tracking-wider ${KIND_CLASS[change.kind]}`}
                    >
                      {CHANGE_KIND_LABEL[change.kind]}
                    </Badge>
                    <span className="text-muted-foreground">{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
