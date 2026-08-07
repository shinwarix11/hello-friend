/**
 * Global developer documentation search index.
 * Built once from the API spec, SDK catalogue, examples, guides and changelog.
 */
import { API_ENDPOINT_SPECS, API_ERROR_CODES, API_GROUPS } from "./api-spec";
import { CHANGELOG } from "./changelog";
import { CODE_EXAMPLES } from "./examples";
import { GUIDES } from "./guides";
import { SDKS } from "./sdks";

export type SearchKind = "endpoint" | "sdk" | "guide" | "example" | "error" | "changelog";

export type SearchEntry = {
  id: string;
  kind: SearchKind;
  title: string;
  description: string;
  keywords: string;
  to: string;
  params?: Record<string, string>;
  hash?: string;
};

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  endpoint: "API",
  sdk: "SDK",
  guide: "Guide",
  example: "Example",
  error: "Error code",
  changelog: "Changelog",
};

export const SEARCH_INDEX: SearchEntry[] = [
  ...API_GROUPS.map<SearchEntry>((group) => ({
    id: `group-${group.id}`,
    kind: "guide",
    title: `${group.name} reference`,
    description: group.description,
    keywords: `${group.name} ${group.id} reference api`,
    to: "/developers/docs/$group",
    params: { group: group.id },
  })),
  ...API_ENDPOINT_SPECS.map<SearchEntry>((endpoint) => ({
    id: `endpoint-${endpoint.id}`,
    kind: "endpoint",
    title: `${endpoint.method} /${endpoint.id}`,
    description: endpoint.summary,
    keywords: `${endpoint.id} ${endpoint.name} ${endpoint.summary} ${endpoint.params.map((p) => p.name).join(" ")}`,
    to: "/developers/docs/$group",
    params: { group: endpoint.group },
    hash: endpoint.id.replace(/\//g, "-"),
  })),
  ...SDKS.map<SearchEntry>((sdk) => ({
    id: `sdk-${sdk.id}`,
    kind: "sdk",
    title: `${sdk.name} SDK`,
    description: sdk.tagline,
    keywords: `${sdk.name} ${sdk.id} sdk ${sdk.package} ${sdk.platforms.join(" ")}`,
    to: "/developers/sdks/$sdk",
    params: { sdk: sdk.id },
  })),
  ...GUIDES.map<SearchEntry>((guide) => ({
    id: `guide-${guide.id}`,
    kind: "guide",
    title: guide.title,
    description: guide.summary,
    keywords: `${guide.title} ${guide.summary} ${guide.keywords}`,
    to: "/developers/docs",
    hash: guide.id,
  })),
  ...CODE_EXAMPLES.map<SearchEntry>((example) => ({
    id: `example-${example.id}`,
    kind: "example",
    title: example.title,
    description: example.summary,
    keywords: `${example.title} ${example.summary} ${example.category} ${example.languageLabel}`,
    to: "/developers/examples",
    hash: example.id,
  })),
  ...API_ERROR_CODES.map<SearchEntry>((error) => ({
    id: `error-${error.code}`,
    kind: "error",
    title: error.code,
    description: error.meaning,
    keywords: `${error.code} ${error.status} ${error.meaning} ${error.fix}`,
    to: "/developers/docs",
    hash: "errors",
  })),
  ...CHANGELOG.map<SearchEntry>((entry) => ({
    id: `changelog-${entry.version}`,
    kind: "changelog",
    title: `v${entry.version} — ${entry.title}`,
    description: entry.summary,
    keywords: `${entry.version} ${entry.title} ${entry.summary} ${entry.changes.map((c) => c.text).join(" ")}`,
    to: "/developers/changelog",
    hash: `v${entry.version}`,
  })),
];

export function searchDocs(query: string, limit = 12): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);

  return SEARCH_INDEX.map((entry) => {
    const haystack = `${entry.title} ${entry.description} ${entry.keywords}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (!haystack.includes(term)) return { entry, score: -1 };
      if (entry.title.toLowerCase().includes(term)) score += 3;
      if (entry.title.toLowerCase().startsWith(term)) score += 2;
      score += 1;
    }
    return { entry, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
