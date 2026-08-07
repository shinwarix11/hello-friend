import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CODE_EXAMPLES, EXAMPLE_CATEGORIES, type ExampleCategory } from "@/lib/devportal/examples";

export const Route = createFileRoute("/_authenticated/developers/examples")({
  component: ExamplesPage,
});

function ExamplesPage() {
  const [category, setCategory] = useState<ExampleCategory | "all">("all");
  const [query, setQuery] = useState("");

  const examples = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CODE_EXAMPLES.filter((example) => {
      if (category !== "all" && example.category !== category) return false;
      if (!q) return true;
      return `${example.title} ${example.summary} ${example.languageLabel}`.toLowerCase().includes(q);
    });
  }, [category, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Code examples</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Runnable integrations against the live API — paste one into a scratch file and it works.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search examples"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[{ id: "all" as const, label: "All" }, ...EXAMPLE_CATEGORIES].map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setCategory(entry.id as ExampleCategory | "all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              category === entry.id
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {examples.map((example) => (
          <article key={example.id} id={example.id} className="surface-card scroll-mt-24 space-y-3 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-medium">{example.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{example.summary}</p>
            </div>
            <CodeBlock
              code={example.code}
              language={example.language}
              filename={example.languageLabel}
              showLineNumbers
              maxHeight={420}
            />
          </article>
        ))}
        {examples.length === 0 ? (
          <p className="text-sm text-muted-foreground">No examples match that filter.</p>
        ) : null}
      </div>
    </div>
  );
}
