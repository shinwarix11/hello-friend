/**
 * Long-form documentation guides: authentication, rate limits, best practices.
 * Rendered as prose + code on the documentation overview page.
 */

export type GuideBlock =
  | { type: "text"; value: string }
  | { type: "code"; language: string; value: string }
  | { type: "list"; items: string[] };

export type Guide = {
  id: string;
  title: string;
  summary: string;
  keywords: string;
  blocks: GuideBlock[];
};

export const GUIDES: Guide[] = [
  {
    id: "authentication",
    title: "Authentication guide",
    summary: "How application keys, session tokens and API keys fit together.",
    keywords: "authentication app key api key session token signature hmac nonce",
    blocks: [
      {
        type: "text",
        value:
          "Every request carries an application key in the `x-app-key` header. The key is public: it identifies which application the request belongs to and is safe to ship inside a client build. It grants no privileged access on its own.",
      },
      {
        type: "text",
        value:
          "Calls that act on behalf of an end user additionally carry `x-session-token`, returned by `login`. Calls that act on behalf of *you* — writing shared variables, triggering webhooks — carry `x-api-key`, a server-side key with explicit scopes. Never ship an API key inside a client binary.",
      },
      { type: "code", language: "shell", value: `# Public client call\ncurl -X POST "$BASE/login" \\\n  -H "content-type: application/json" \\\n  -H "x-app-key: $APP_KEY" \\\n  -d '{"username":"ada","password":"…","hwid":"A4E1-9C33"}'\n\n# Privileged server call\ncurl -X POST "$BASE/webhook/trigger" \\\n  -H "content-type: application/json" \\\n  -H "x-app-key: $APP_KEY" \\\n  -H "x-api-key: $API_KEY" \\\n  -d '{"event":"license.activated","payload":{}}'` },
      {
        type: "text",
        value:
          "For high-assurance integrations, sign requests. Send `x-timestamp` (unix seconds), a unique `x-nonce`, and `x-signature`: the HMAC-SHA256 of `\"{timestamp}.{raw_body}\"` keyed with your application secret. The timestamp must be within 300 seconds and each nonce is accepted exactly once.",
      },
      { type: "code", language: "typescript", value: `import { createHmac, randomUUID } from "node:crypto";\n\nconst timestamp = Math.floor(Date.now() / 1000).toString();\nconst body = JSON.stringify({ license_key: key });\nconst signature = createHmac("sha256", APP_SECRET).update(\`\${timestamp}.\${body}\`).digest("hex");\n\nawait fetch(\`\${BASE}/license/validate\`, {\n  method: "POST",\n  headers: {\n    "content-type": "application/json",\n    "x-app-key": APP_KEY,\n    "x-timestamp": timestamp,\n    "x-nonce": randomUUID(),\n    "x-signature": signature,\n  },\n  body,\n});` },
    ],
  },
  {
    id: "rate-limits",
    title: "Rate limits",
    summary: "Per-application limits, how they are enforced and how to stay inside them.",
    keywords: "rate limit throttle 429 requests per minute quota backoff",
    blocks: [
      {
        type: "text",
        value:
          "Each application defines its own limit under Settings → Security as requests per minute, counted per client IP across all endpoints. The default is generous enough for a heartbeat plus normal interactive traffic; raise it for shared-IP deployments such as corporate networks or cloud gaming.",
      },
      {
        type: "list",
        items: [
          "Heartbeat at 60 second intervals — anything faster provides no extra safety.",
          "Call `init` and `app/data` once at startup, then cache the result for the process lifetime.",
          "Validate a license on launch and after purchase, not on every scene change.",
          "Batch variable writes; write on meaningful state changes rather than every frame.",
          "Retry only on 5xx and network failures, with exponential backoff.",
        ],
      },
      {
        type: "text",
        value:
          "Every request is recorded in the application's Logs tab with endpoint, status code and latency, so you can see exactly which call is responsible before raising a limit.",
      },
    ],
  },
  {
    id: "best-practices",
    title: "Best practices",
    summary: "Production guidance for shipping a secure, resilient integration.",
    keywords: "best practices security production hwid offline caching secrets",
    blocks: [
      {
        type: "text",
        value:
          "Treat the client as untrusted. Anything a client can compute, an attacker can forge — so enforce entitlements on every meaningful action rather than once at startup, and keep privileged operations behind a scoped API key on your own backend.",
      },
      {
        type: "list",
        items: [
          "Never embed an API key or the application secret key in a shipped binary — the application key alone belongs there.",
          "Hold session tokens in memory only; re-authenticate on restart instead of persisting them to disk.",
          "Make the hardware identifier stable across reboots and driver updates, and never derive it from something a user can trivially change.",
          "Use separate applications for development, staging and production so test traffic never pollutes production logs or licenses.",
          "Handle `update_required` before showing any UI, so outdated clients cannot reach the rest of your API surface.",
          "Verify webhook signatures against the raw request body, and make handlers idempotent on the delivery id.",
          "Show the documented error meaning to users, and log the raw code for support.",
        ],
      },
      {
        type: "text",
        value:
          "Design for the network being down. Fail closed for entitlement decisions, but fail gracefully in the UI: a clear retry state is better than a crash, and a short grace period after a successful validation keeps brief outages from locking paying users out.",
      },
    ],
  },
  {
    id: "quickstart",
    title: "Quick start",
    summary: "From a new application to a validated license in four calls.",
    keywords: "quick start getting started integrate first request setup",
    blocks: [
      {
        type: "text",
        value:
          "Create an application, copy its public key from the API tab, then run the handshake. Four calls cover a complete integration: `init`, `login`, `license/validate` and `heartbeat`.",
      },
      { type: "code", language: "shell", value: `export BASE="https://your-app.lovable.app/api/public/v1"\nexport APP_KEY="pk_live_…"\n\n# 1. Handshake and version gate\ncurl -s -X POST "$BASE/init" -H "content-type: application/json" \\\n  -H "x-app-key: $APP_KEY" -d '{"version":"1.0.0"}'\n\n# 2. Sign the user in\ncurl -s -X POST "$BASE/login" -H "content-type: application/json" \\\n  -H "x-app-key: $APP_KEY" -d '{"username":"ada","password":"…"}'\n\n# 3. Confirm the entitlement\ncurl -s -X POST "$BASE/license/validate" -H "content-type: application/json" \\\n  -H "x-app-key: $APP_KEY" -d '{"license_key":"AEGS-4K7P-2M9X-QT31"}'` },
      {
        type: "text",
        value:
          "Every response uses the same envelope: `{ success: true, data, timestamp }` on success and `{ success: false, error: { code, message } }` on failure. Branch on `error.code`, never on the message text.",
      },
    ],
  },
];

export function findGuide(id: string) {
  return GUIDES.find((g) => g.id === id);
}
