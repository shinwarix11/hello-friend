import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, ShieldCheck } from "lucide-react";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { AuthChips, MethodPill, ParamTable } from "@/components/devportal/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplications";
import { API_BASE_PATH, API_ENDPOINT_SPECS, exampleBody, type ApiEndpoint } from "@/lib/devportal/api-spec";
import { SNIPPET_LANGUAGES, generateSnippet, type SnippetLanguage } from "@/lib/devportal/snippets";

type ExplorerResponse = {
  status: number;
  durationMs: number;
  body: string;
  ok: boolean;
};

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ApiExplorer({
  endpointId,
  compact = false,
}: {
  endpointId?: string;
  compact?: boolean;
}) {
  const { data: apps } = useApplications();
  const [selectedId, setSelectedId] = useState(endpointId ?? API_ENDPOINT_SPECS[0]!.id);
  const [appId, setAppId] = useState<string>("");
  const [appKey, setAppKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sign, setSign] = useState(false);
  const [body, setBody] = useState("{}");
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const [response, setResponse] = useState<ExplorerResponse | null>(null);
  const [sending, setSending] = useState(false);

  const endpoint = useMemo<ApiEndpoint>(
    () => API_ENDPOINT_SPECS.find((e) => e.id === selectedId) ?? API_ENDPOINT_SPECS[0]!,
    [selectedId],
  );

  useEffect(() => {
    setBody(JSON.stringify(exampleBody(endpoint), null, 2));
    setResponse(null);
  }, [endpoint]);

  useEffect(() => {
    if (!apps?.length) return;
    const chosen = apps.find((a) => a.id === appId) ?? apps[0]!;
    if (!appId) setAppId(chosen.id);
    setAppKey(chosen.public_key ?? "");
    setSecretKey(chosen.secret_key ?? "");
  }, [apps, appId]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const snippet = useMemo(
    () =>
      generateSnippet(language, {
        endpoint,
        origin: origin || "https://your-app.lovable.app",
        appKey,
        body,
        sessionToken,
        apiKey,
      }),
    [language, endpoint, origin, appKey, body, sessionToken, apiKey],
  );

  async function send() {
    setSending(true);
    const started = performance.now();
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-app-key": appKey,
      };
      if (sessionToken) headers["x-session-token"] = sessionToken;
      if (apiKey) headers["x-api-key"] = apiKey;

      const raw = endpoint.method === "GET" ? "" : (body || "{}");
      if (sign && secretKey) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        headers["x-timestamp"] = timestamp;
        headers["x-nonce"] = crypto.randomUUID();
        headers["x-signature"] = await hmacHex(secretKey, `${timestamp}.${raw}`);
      }

      const init: RequestInit = { method: endpoint.method, headers };
      if (endpoint.method !== "GET") init.body = raw;
      const res = await fetch(`${origin}${API_BASE_PATH}/${endpoint.id}`, init);

      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw text */
      }
      setResponse({
        status: res.status,
        durationMs: Math.round(performance.now() - started),
        body: pretty,
        ok: res.ok,
      });
    } catch (error) {
      setResponse({
        status: 0,
        durationMs: Math.round(performance.now() - started),
        body: error instanceof Error ? error.message : "Request failed",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-[1.05fr_1fr]")}>
      <div className="surface-card space-y-4 rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Endpoint</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {API_ENDPOINT_SPECS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.method} /{e.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Application</Label>
            <Select value={appId} onValueChange={setAppId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select an application" />
              </SelectTrigger>
              <SelectContent>
                {(apps ?? []).map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2">
          <MethodPill method={endpoint.method} />
          <code className="font-mono text-[11.5px] text-muted-foreground">
            {API_BASE_PATH}/{endpoint.id}
          </code>
          <span className="ml-auto">
            <AuthChips endpoint={endpoint} />
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{endpoint.description}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">x-app-key</Label>
            <Input value={appKey} onChange={(e) => setAppKey(e.target.value)} className="h-9 font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {endpoint.requiresApiKey ? `x-api-key (${endpoint.requiresApiKey})` : "x-api-key (optional)"}
            </Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="aeg_live_…"
              className="h-9 font-mono text-xs"
            />
          </div>
          {endpoint.requiresSession ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">x-session-token</Label>
              <Input
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
                placeholder="Returned by /login"
                className="h-9 font-mono text-xs"
              />
            </div>
          ) : null}
        </div>

        {endpoint.method === "POST" ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Request body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              className="min-h-40 font-mono text-xs"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={sign} onCheckedChange={setSign} />
            <ShieldCheck className="h-3.5 w-3.5" /> Sign request (HMAC + nonce)
          </label>
          <Button onClick={() => void send()} disabled={sending || !appKey} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Send request
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="surface-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Response</h3>
            {response ? (
              <div className="flex items-center gap-2 text-[11px]">
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono",
                    response.ok ? "border-success/40 text-success" : "border-destructive/40 text-destructive",
                  )}
                >
                  {response.status || "ERR"}
                </span>
                <span className="text-muted-foreground">{response.durationMs} ms</span>
              </div>
            ) : null}
          </div>
          <CodeBlock
            language="json"
            filename={response ? "response.json" : "sample-response.json"}
            code={response ? response.body : JSON.stringify(endpoint.response, null, 2)}
            maxHeight={320}
          />
        </div>

        <div className="surface-card rounded-2xl p-4">
          <Tabs value={language} onValueChange={(v) => setLanguage(v as SnippetLanguage)}>
            <TabsList className="mb-3">
              {SNIPPET_LANGUAGES.map((lang) => (
                <TabsTrigger key={lang.id} value={lang.id} className="text-xs">
                  {lang.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <CodeBlock code={snippet} language={language === "curl" ? "shell" : language} maxHeight={320} />
        </div>

        {!compact ? (
          <div className="surface-card space-y-3 rounded-2xl p-4">
            <h3 className="text-sm font-medium">Parameters</h3>
            <ParamTable params={endpoint.params} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
