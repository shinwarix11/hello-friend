/**
 * Code snippet generators for the API explorer and documentation.
 * Every generator produces a runnable request against the real Aegis API.
 */
import { API_BASE_PATH, type ApiEndpoint } from "./api-spec";

export type SnippetLanguage = "curl" | "javascript" | "python" | "csharp";

export const SNIPPET_LANGUAGES: { id: SnippetLanguage; label: string; hint: string }[] = [
  { id: "curl", label: "cURL", hint: "shell" },
  { id: "javascript", label: "JavaScript", hint: "fetch" },
  { id: "python", label: "Python", hint: "requests" },
  { id: "csharp", label: "C#", hint: "HttpClient" },
];

export type SnippetInput = {
  endpoint: Pick<ApiEndpoint, "id" | "method" | "requiresSession" | "requiresApiKey">;
  origin: string;
  appKey: string;
  body: string;
  sessionToken?: string;
  apiKey?: string;
};

function url(origin: string, id: string) {
  return `${origin}${API_BASE_PATH}/${id}`;
}

function headerPairs(input: SnippetInput) {
  const pairs: [string, string][] = [
    ["content-type", "application/json"],
    ["x-app-key", input.appKey || "YOUR_APP_KEY"],
  ];
  if (input.endpoint.requiresSession) pairs.push(["x-session-token", input.sessionToken || "YOUR_SESSION_TOKEN"]);
  if (input.endpoint.requiresApiKey || input.apiKey) pairs.push(["x-api-key", input.apiKey || "YOUR_API_KEY"]);
  return pairs;
}

function compactBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body || "{}"));
  } catch {
    return body || "{}";
  }
}

function prettyBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body || "{}"), null, 2);
  } catch {
    return body || "{}";
  }
}

export function generateSnippet(lang: SnippetLanguage, input: SnippetInput): string {
  const endpointUrl = url(input.origin, input.endpoint.id);
  const headers = headerPairs(input);

  if (lang === "curl") {
    const h = headers.map(([k, v]) => `  -H "${k}: ${v}"`).join(" \\\n");
    return `curl -X ${input.endpoint.method} "${endpointUrl}" \\\n${h} \\\n  -d '${compactBody(input.body)}'`;
  }

  if (lang === "javascript") {
    const h = headers.map(([k, v]) => `    "${k}": "${v}",`).join("\n");
    return `const response = await fetch("${endpointUrl}", {
  method: "${input.endpoint.method}",
  headers: {
${h}
  },
  body: JSON.stringify(${prettyBody(input.body).replace(/\n/g, "\n  ")}),
});

const result = await response.json();
if (!result.success) {
  throw new Error(\`[\${result.error.code}] \${result.error.message}\`);
}
console.log(result.data);`;
  }

  if (lang === "python") {
    const h = headers.map(([k, v]) => `    "${k}": "${v}",`).join("\n");
    const py = prettyBody(input.body)
      .replace(/\btrue\b/g, "True")
      .replace(/\bfalse\b/g, "False")
      .replace(/\bnull\b/g, "None")
      .replace(/\n/g, "\n");
    return `import requests

response = requests.${input.endpoint.method.toLowerCase()}(
    "${endpointUrl}",
    headers={
${h}
    },
    json=${py},
    timeout=15,
)

result = response.json()
if not result["success"]:
    raise RuntimeError(f"[{result['error']['code']}] {result['error']['message']}")

print(result["data"])`;
  }

  const csHeaders = headers
    .filter(([k]) => k !== "content-type")
    .map(([k, v]) => `request.Headers.Add("${k}", "${v}");`)
    .join("\n");
  return `using System.Net.Http;
using System.Text;
using System.Text.Json;

using var client = new HttpClient();

var payload = """
${prettyBody(input.body)}
""";

using var request = new HttpRequestMessage(HttpMethod.${input.endpoint.method === "GET" ? "Get" : "Post"}, "${endpointUrl}");
${csHeaders}
request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

using var response = await client.SendAsync(request);
var json = await response.Content.ReadAsStringAsync();
using var doc = JsonDocument.Parse(json);

if (!doc.RootElement.GetProperty("success").GetBoolean())
{
    var error = doc.RootElement.GetProperty("error");
    throw new Exception($"[{error.GetProperty("code").GetString()}] {error.GetProperty("message").GetString()}");
}

Console.WriteLine(doc.RootElement.GetProperty("data"));`;
}

export const SNIPPET_FILE_EXT: Record<SnippetLanguage, string> = {
  curl: "sh",
  javascript: "js",
  python: "py",
  csharp: "cs",
};
