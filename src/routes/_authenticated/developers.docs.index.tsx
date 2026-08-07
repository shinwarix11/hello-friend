import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CodeBlock, InlineCode } from "@/components/devportal/CodeBlock";
import { DocSection, MethodPill, Prose } from "@/components/devportal/parts";
import { API_BASE_PATH, API_ERROR_CODES, API_GROUPS, API_HEADERS, endpointsByGroup } from "@/lib/devportal/api-spec";
import { GUIDES } from "@/lib/devportal/guides";

export const Route = createFileRoute("/_authenticated/developers/docs/")({
  component: DocsIndex,
});

function DocsIndex() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1 text-sm">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">On this page</p>
          <a href="#overview" className="block rounded px-2 py-1 text-muted-foreground hover:text-foreground">
            Overview
          </a>
          <a href="#headers" className="block rounded px-2 py-1 text-muted-foreground hover:text-foreground">
            Headers
          </a>
          {GUIDES.map((guide) => (
            <a
              key={guide.id}
              href={`#${guide.id}`}
              className="block rounded px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              {guide.title}
            </a>
          ))}
          <a href="#groups" className="block rounded px-2 py-1 text-muted-foreground hover:text-foreground">
            Endpoint groups
          </a>
          <a href="#errors" className="block rounded px-2 py-1 text-muted-foreground hover:text-foreground">
            Error codes
          </a>
        </nav>
      </aside>

      <div className="min-w-0 space-y-10">
        <DocSection id="overview" title="Overview" description="One base URL, JSON in, JSON out.">
          <Prose>
            Every endpoint lives under <InlineCode>{API_BASE_PATH}</InlineCode> and returns{" "}
            <InlineCode>{`{ success, data }`}</InlineCode> on success or{" "}
            <InlineCode>{`{ success: false, error }`}</InlineCode> on failure. Requests are authenticated with your
            application key; privileged and per-user calls add one extra header.
          </Prose>
          <CodeBlock
            language="json"
            filename="response envelope"
            code={JSON.stringify(
              { success: true, data: { "…": "endpoint specific payload" } },
              null,
              2,
            )}
          />
        </DocSection>

        <DocSection id="headers" title="Headers" description="What to send, and when.">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Header</th>
                  <th className="px-3 py-2 font-medium">Required</th>
                  <th className="px-3 py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {API_HEADERS.map((header) => (
                  <tr key={header.name} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-mono text-[11.5px]">{header.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{header.required}</td>
                    <td className="px-3 py-2 text-muted-foreground">{header.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        {GUIDES.map((guide) => (
          <DocSection key={guide.id} id={guide.id} title={guide.title} description={guide.summary}>
            <div className="space-y-3">
              {guide.blocks.map((block, index) => {
                if (block.type === "text") return <Prose key={index}>{block.value}</Prose>;
                if (block.type === "list")
                  return (
                    <ul key={index} className="space-y-1.5">
                      {block.items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  );
                return <CodeBlock key={index} code={block.value} language={block.language} />;
              })}
            </div>
          </DocSection>
        ))}

        <DocSection id="groups" title="Endpoint groups" description="Browse the reference by capability.">
          <div className="grid gap-3 sm:grid-cols-2">
            {API_GROUPS.map((group) => {
              const endpoints = endpointsByGroup(group.id);
              return (
                <Link
                  key={group.id}
                  to="/developers/docs/$group"
                  params={{ group: group.id }}
                  className="surface-card hover-lift group rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{group.name}</h3>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{group.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {endpoints.slice(0, 4).map((endpoint) => (
                      <span key={endpoint.id} className="flex items-center gap-1">
                        <MethodPill method={endpoint.method} />
                        <code className="font-mono text-[10.5px] text-muted-foreground">/{endpoint.id}</code>
                      </span>
                    ))}
                    {endpoints.length > 4 ? (
                      <span className="text-[10.5px] text-muted-foreground">+{endpoints.length - 4} more</span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </DocSection>

        <DocSection id="errors" title="Error codes" description="Every error the API can return, and how to handle it.">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Meaning</th>
                  <th className="px-3 py-2 font-medium">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {API_ERROR_CODES.map((error) => (
                  <tr key={error.code} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-mono text-[11.5px] text-destructive">{error.code}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{error.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{error.meaning}</td>
                    <td className="px-3 py-2 text-muted-foreground">{error.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>
      </div>
    </div>
  );
}
