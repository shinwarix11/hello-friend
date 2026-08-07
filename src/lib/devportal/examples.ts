/**
 * Runnable integration examples. Every snippet targets the real HTTP API, so
 * a developer can paste one into a scratch file and it works.
 */

export type ExampleCategory =
  | "authentication"
  | "licensing"
  | "variables"
  | "sessions"
  | "webhooks"
  | "errors";

export type CodeExample = {
  id: string;
  title: string;
  category: ExampleCategory;
  summary: string;
  language: string;
  languageLabel: string;
  code: string;
};

export const EXAMPLE_CATEGORIES: { id: ExampleCategory; label: string; description: string }[] = [
  { id: "authentication", label: "Authentication", description: "Register and sign in the users of your application." },
  { id: "licensing", label: "Licensing", description: "Validate, activate and enforce entitlements." },
  { id: "variables", label: "Variables", description: "Remote configuration and per-user state." },
  { id: "sessions", label: "Sessions", description: "Heartbeats, verification and clean shutdown." },
  { id: "webhooks", label: "Webhooks", description: "Receive and verify outbound events." },
  { id: "errors", label: "Error handling", description: "Turn error codes into good product behaviour." },
];

const BASE = "https://your-app.lovable.app/api/public/v1";

export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: "register",
    title: "Register a user with a license key",
    category: "authentication",
    summary: "Creates the account and redeems the key in a single call so a user can never exist without their entitlement.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `const response = await fetch("${BASE}/register", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-app-key": APP_KEY,
  },
  body: JSON.stringify({
    username,
    password,
    email,
    license_key: licenseKey,
    hwid: hardwareId(),
  }),
});

const result = await response.json();
if (!result.success) {
  switch (result.error.code) {
    case "username_taken": return showError("That username is taken.");
    case "invalid_license": return showError("That license key is not valid.");
    default: throw new Error(result.error.message);
  }
}

return result.data.user;`,
  },
  {
    id: "login",
    title: "Log in and keep the session token in memory",
    category: "authentication",
    summary: "Never persist a session token to disk — hold it in memory and re-authenticate on restart.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `let sessionToken: string | null = null;

export async function login(username: string, password: string) {
  const res = await fetch("${BASE}/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-key": APP_KEY },
    body: JSON.stringify({ username, password, hwid: hardwareId() }),
  });

  const result = await res.json();
  if (!result.success) throw new AegisError(result.error);

  sessionToken = result.data.session.token;
  return result.data.user;
}

export function authHeaders() {
  return { "x-app-key": APP_KEY, "x-session-token": sessionToken ?? "" };
}`,
  },
  {
    id: "validate",
    title: "Validate a license on every launch",
    category: "licensing",
    summary: "Validation is read-only and never consumes an activation, so it is safe on the hot path.",
    language: "csharp",
    languageLabel: "C#",
    code: `using var client = new HttpClient();
using var request = new HttpRequestMessage(HttpMethod.Post, "${BASE}/license/validate");
request.Headers.Add("x-app-key", AppKey);
request.Content = JsonContent.Create(new { license_key = key, hwid = HardwareId.Current });

using var response = await client.SendAsync(request);
var payload = await response.Content.ReadFromJsonAsync<ApiResponse<LicenseResult>>();

if (payload is null || !payload.Success)
    throw new AegisException(payload?.Error);

if (!payload.Data.Valid)
    Application.Lock($"License is {payload.Data.Status}.");`,
  },
  {
    id: "activate",
    title: "Activate a key and bind the machine",
    category: "licensing",
    summary: "Consumes an activation slot and starts the duration clock for keys sold as “N days from first use”.",
    language: "python",
    languageLabel: "Python",
    code: `import requests

response = requests.post(
    "${BASE}/license/activate",
    headers={"content-type": "application/json", "x-app-key": APP_KEY},
    json={"license_key": key, "hwid": hardware_id(), "username": username},
    timeout=15,
)

result = response.json()
if not result["success"]:
    code = result["error"]["code"]
    if code == "license_exhausted":
        raise SystemExit("All activation slots are used. Reset one in your account.")
    raise SystemExit(result["error"]["message"])

print("Active until", result["data"]["expires_at"])`,
  },
  {
    id: "variables-get",
    title: "Load remote configuration before showing UI",
    category: "variables",
    summary: "Ship feature flags and endpoints without publishing a new build.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `const res = await fetch("${BASE}/variables/get", {
  method: "POST",
  headers: { "content-type": "application/json", "x-app-key": APP_KEY },
  body: JSON.stringify({ scope: "application" }),
});

const { data } = await res.json();
const config = data.variables as Record<string, string>;

applyTheme(config.theme ?? "dark");
setCdnBase(config.cdn_base);`,
  },
  {
    id: "variables-set",
    title: "Persist per-user state",
    category: "variables",
    summary: "User scope is writable with a session token; license and application scope need an API key.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `await fetch("${BASE}/variables/set", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-app-key": APP_KEY,
    "x-session-token": sessionToken,
  },
  body: JSON.stringify({ scope: "user", key: "last_level", value: String(level) }),
});`,
  },
  {
    id: "heartbeat",
    title: "Heartbeat and lock on revocation",
    category: "sessions",
    summary: "A 60 second heartbeat means a banned license locks the client within a minute.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `const timer = setInterval(async () => {
  const res = await fetch("${BASE}/heartbeat", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: "{}",
  });

  const result = await res.json();
  if (!result.success || !result.data.alive) {
    clearInterval(timer);
    app.lock("Your session ended.");
  }
}, 60_000);`,
  },
  {
    id: "session-check",
    title: "Verify a session from your own backend",
    category: "sessions",
    summary: "Server-to-server verification that never touches the user's credentials.",
    language: "python",
    languageLabel: "Python",
    code: `def require_session(token: str):
    result = requests.post(
        "${BASE}/session/check",
        headers={"content-type": "application/json", "x-app-key": APP_KEY, "x-session-token": token},
        json={},
        timeout=10,
    ).json()

    if not result["success"] or not result["data"]["valid"]:
        raise PermissionError("Invalid session")

    return result["data"]["user"]`,
  },
  {
    id: "logout",
    title: "Log out cleanly on shutdown",
    category: "sessions",
    summary: "Releases the session immediately so concurrent-session limits do not strand the user.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `window.addEventListener("beforeunload", () => {
  navigator.sendBeacon(
    "${BASE}/logout",
    new Blob([JSON.stringify({ app_key: APP_KEY })], { type: "application/json" }),
  );
});

// Preferred, when you control shutdown:
await fetch("${BASE}/logout", {
  method: "POST",
  headers: { "content-type": "application/json", ...authHeaders() },
  body: "{}",
});`,
  },
  {
    id: "webhook-verify",
    title: "Verify a webhook signature",
    category: "webhooks",
    summary: "Compare the HMAC of the raw body with the delivered signature before trusting anything.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `import { createHmac, timingSafeEqual } from "node:crypto";

app.post("/webhooks/aegis", express.raw({ type: "application/json" }), (req, res) => {
  const signature = String(req.header("x-aegis-signature") ?? "").replace(/^sha256=/, "");
  const expected = createHmac("sha256", process.env.AEGIS_WEBHOOK_SECRET!)
    .update(req.body)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).send("invalid signature");
  }

  const event = JSON.parse(req.body.toString("utf8"));
  handleEvent(event);
  res.status(200).send("ok");
});`,
  },
  {
    id: "webhook-idempotency",
    title: "Handle retries idempotently",
    category: "webhooks",
    summary: "Deliveries are retried on failure — key your handler on the delivery id.",
    language: "python",
    languageLabel: "Python",
    code: `def handle_event(event: dict) -> None:
    delivery_id = event["id"]

    if store.seen(delivery_id):
        return  # already processed, acknowledge silently

    if event["event"] == "license.activated":
        crm.mark_activated(event["payload"]["license_key"])

    store.remember(delivery_id)`,
  },
  {
    id: "error-mapping",
    title: "Map error codes to product behaviour",
    category: "errors",
    summary: "One switch keeps every failure path deliberate instead of showing a raw message.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `export function explain(code: string): string {
  switch (code) {
    case "invalid_credentials": return "Incorrect username or password.";
    case "user_banned": return "This account has been suspended. Contact support.";
    case "license_expired": return "Your license expired. Renew to continue.";
    case "license_exhausted": return "All activation slots are used.";
    case "hwid_mismatch": return "This license is locked to another machine.";
    case "maintenance": return "We are performing maintenance. Try again shortly.";
    default: return "Something went wrong. Please try again.";
  }
}`,
  },
  {
    id: "retry-backoff",
    title: "Retry transient failures with backoff",
    category: "errors",
    summary: "Retry only 5xx and network errors. Never retry a 4xx — the request will keep failing.",
    language: "typescript",
    languageLabel: "TypeScript",
    code: `async function call(path: string, body: unknown, attempt = 0): Promise<any> {
  const res = await fetch(\`${BASE}/\${path}\`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-key": APP_KEY },
    body: JSON.stringify(body),
  });

  if (res.status >= 500 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    return call(path, body, attempt + 1);
  }

  return res.json();
}`,
  },
];

export function examplesByCategory(category: ExampleCategory) {
  return CODE_EXAMPLES.filter((e) => e.category === category);
}
