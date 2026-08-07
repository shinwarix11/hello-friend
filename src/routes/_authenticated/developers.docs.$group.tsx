import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ApiExplorer } from "@/components/devportal/ApiExplorer";
import { CodeBlock } from "@/components/devportal/CodeBlock";
import { AuthChips, MethodPill, ParamTable, Prose } from "@/components/devportal/parts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplications";
import { useDeveloperPreferences } from "@/hooks/useDeveloper";
import {
  API_BASE_PATH,
  API_GROUPS,
  endpointsByGroup,
  exampleBody,
  type ApiEndpoint,
  type ApiGroupId,
} from "@/lib/devportal/api-spec";
import { SNIPPET_LANGUAGES, generateSnippet, type SnippetLanguage } from "@/lib/devportal/snippets";

export const Route = createFileRoute("/_authenticated/developers/docs/$group")({
  beforeLoad: ({ params }) => {
    if (!API_GROUPS.some((g) => g.id === params.group)) throw notFound();
  },
  component: DocsGroup,
});

function DocsGroup() {
  const { group } = Route.useParams();
  const groupId = group as ApiGroupId;
  const meta = API_GROUPS.find((g) => g.id === groupId)!;
  const endpoints = useMemo(() => endpointsByGroup(groupId), [groupId]);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Groups</p>
          {API_GROUPS.map((g) => (
            <Link
              key={g.id}
              to="/developers/docs/$group"
              params={{ group: g.id }}
              className={cn(
                "block rounded px-2 py-1 text-sm transition-colors",
                g.id === groupId ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {g.name}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-8">
        <div>
          <h2 className="text-lg font-semibold">{meta.name}</h2>
          <Prose>{meta.description}</Prose>
        </div>

        {endpoints.map((endpoint) => (
          <EndpointDoc key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
}

function EndpointDoc({ endpoint }: { endpoint: ApiEndpoint }) {
  const { data: apps } = useApplications();
  const { data: prefs } = useDeveloperPreferences();
  const initial = (SNIPPET_LANGUAGES.find((l) => l.id === prefs?.default_language)?.id ?? "curl") as SnippetLanguage;
  const [language, setLanguage] = useState<SnippetLanguage>(initial);
  const [tryIt, setTryIt] = useState(false);

  const origin = typeof window === "undefined" ? "https://your-app.lovable.app" : window.location.origin;
  const snippet = generateSnippet(language, {
    endpoint,
    origin,
    appKey: apps?.[0]?.public_key ?? "",
    body: JSON.stringify(exampleBody(endpoint), null, 2),
  });

  return (
    <section id={endpoint.id.replace(/\//g, "-")} className="scroll-mt-24 space-y-4 border-t border-border pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <MethodPill method={endpoint.method} />
        <code className="font-mono text-sm">
          {API_BASE_PATH}/{endpoint.id}
        </code>
        <span className="ml-auto">
          <AuthChips endpoint={endpoint} />
        </span>
      </div>

      <h3 className="text-base font-semibold">{endpoint.name}</h3>
      <Prose>{endpoint.description}</Prose>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Parameters</h4>
          <ParamTable params={endpoint.params} />
          <h4 className="pt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Errors</h4>
          <div className="flex flex-wrap gap-1.5">
            {endpoint.errors.map((code) => (
              <code
                key={code}
                className="rounded border border-destructive/30 bg-secondary/50 px-1.5 py-0.5 font-mono text-[11px] text-destructive"
              >
                {code}
              </code>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Tabs value={language} onValueChange={(v) => setLanguage(v as SnippetLanguage)}>
            <TabsList>
              {SNIPPET_LANGUAGES.map((lang) => (
                <TabsTrigger key={lang.id} value={lang.id} className="text-xs">
                  {lang.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <CodeBlock code={snippet} language={language === "curl" ? "shell" : language} maxHeight={280} />
          <CodeBlock
            code={JSON.stringify(endpoint.response, null, 2)}
            language="json"
            filename="200 response"
            maxHeight={240}
          />
          <Button variant="outline" size="sm" onClick={() => setTryIt((v) => !v)}>
            {tryIt ? "Hide explorer" : "Try it out"}
          </Button>
        </div>
      </div>

      {tryIt ? <ApiExplorer endpointId={endpoint.id} compact /> : null}
    </section>
  );
}
