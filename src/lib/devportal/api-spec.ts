/**
 * Authoritative specification of the Aegis public API.
 *
 * This file is the single source of truth for the developer documentation,
 * the API explorer and every generated code snippet. It mirrors the runtime
 * handlers in `src/lib/api-core.server.ts` — when an endpoint changes there,
 * update it here so the docs never drift.
 */

export type ParamType = "string" | "number" | "boolean" | "object";

export type ApiParam = {
  name: string;
  type: ParamType;
  required: boolean;
  description: string;
  example?: string | number | boolean;
};

export type ApiEndpoint = {
  /** Path segment appended to the API base, e.g. `license/validate`. */
  id: string;
  name: string;
  method: "POST" | "GET";
  group: ApiGroupId;
  summary: string;
  description: string;
  /** Extra authorisation beyond the application key. */
  requiresApiKey?: string;
  requiresSession?: boolean;
  params: ApiParam[];
  response: Record<string, unknown>;
  errors: string[];
};

export type ApiGroupId =
  | "authentication"
  | "applications"
  | "licenses"
  | "users"
  | "variables"
  | "sessions"
  | "versions"
  | "downloads"
  | "webhooks"
  | "statistics";

export type ApiGroup = {
  id: ApiGroupId;
  name: string;
  description: string;
};

export const API_BASE_PATH = "/api/public/v1";

export const API_GROUPS: ApiGroup[] = [
  {
    id: "authentication",
    name: "Authentication",
    description:
      "Handshake, register and log in the end users of your application. Every call starts with an application key and returns a signed session token.",
  },
  {
    id: "applications",
    name: "Applications",
    description:
      "Read the public profile of the application the key belongs to: branding, status, version gates and integration settings.",
  },
  {
    id: "licenses",
    name: "Licenses",
    description:
      "Validate and activate license keys, enforce hardware locks and read remaining duration.",
  },
  { id: "users", name: "Users", description: "Read and manage the profile of the signed-in application user." },
  {
    id: "variables",
    name: "Variables",
    description:
      "Fetch application, license or per-user key/value configuration at runtime without shipping a new build.",
  },
  {
    id: "sessions",
    name: "Sessions",
    description: "Keep sessions alive, verify them server-side and terminate them cleanly.",
  },
  { id: "versions", name: "Versions", description: "Version gating, update prompts and forced upgrades." },
  { id: "downloads", name: "Downloads", description: "Resolve the download manifest for a released version." },
  { id: "webhooks", name: "Webhooks", description: "Trigger outbound events from a trusted server context." },
  { id: "statistics", name: "Statistics", description: "Lightweight health and status probes for your integration." },
];

const HWID: ApiParam = {
  name: "hwid",
  type: "string",
  required: false,
  description: "Hardware identifier of the machine. Required when HWID locking is enabled.",
  example: "A4E1-9C33-77B2",
};

export const API_ENDPOINT_SPECS: ApiEndpoint[] = [
  {
    id: "status",
    name: "Status",
    method: "POST",
    group: "statistics",
    summary: "Probe the API and confirm the application key resolves.",
    description:
      "Returns the application lifecycle status and server time. Use it as a connectivity check before the main handshake — it is the only endpoint that keeps responding while an application is in maintenance mode.",
    params: [],
    response: {
      success: true,
      data: { status: "active", name: "Acme Desktop", environment: "production", server_time: "2026-08-07T04:00:00.000Z" },
    },
    errors: ["unauthorized", "application_unavailable"],
  },
  {
    id: "init",
    name: "Initialize",
    method: "POST",
    group: "authentication",
    summary: "Open the integration handshake and read runtime configuration.",
    description:
      "Call this once at process start. It resolves the application, checks the client build against the current and minimum published versions, and returns public application variables so the client can configure itself before showing any UI.",
    params: [
      {
        name: "version",
        type: "string",
        required: false,
        description: "Semantic version of the client build. Enables update and minimum-version gating.",
        example: "1.4.2",
      },
    ],
    response: {
      success: true,
      data: {
        application: { name: "Acme Desktop", status: "active", environment: "production" },
        version: { current: "1.4.2", latest: "1.5.0", minimum: "1.2.0", update_available: true, update_required: false },
        variables: { cdn_base: "https://cdn.acme.dev" },
      },
    },
    errors: ["unauthorized", "maintenance", "application_unavailable"],
  },
  {
    id: "register",
    name: "Register user",
    method: "POST",
    group: "authentication",
    summary: "Create an application user, optionally redeeming a license key.",
    description:
      "Registers a new end user. When a license key is supplied it is redeemed and bound to the new account in the same transaction, so a user can never exist without the entitlement they paid for.",
    params: [
      { name: "username", type: "string", required: true, description: "Unique username within the application.", example: "ada" },
      { name: "password", type: "string", required: true, description: "Plain password. Hashed with PBKDF2 before storage.", example: "correct horse battery staple" },
      { name: "email", type: "string", required: false, description: "Optional contact address.", example: "ada@acme.dev" },
      { name: "license_key", type: "string", required: false, description: "License key to redeem during registration.", example: "AEGS-4K7P-2M9X-QT31" },
      HWID,
    ],
    response: {
      success: true,
      data: { user: { id: "9f1c…", username: "ada", status: "active" }, license: { key: "AEGS-4K7P-2M9X-QT31", expires_at: "2027-01-01T00:00:00.000Z" } },
    },
    errors: ["invalid_request", "username_taken", "invalid_license", "license_exhausted", "hwid_mismatch"],
  },
  {
    id: "login",
    name: "Login",
    method: "POST",
    group: "authentication",
    summary: "Authenticate an application user and open a session.",
    description:
      "Verifies credentials, enforces the account status, HWID lock and license expiry, then issues a session token. Store the token in memory and send it as `x-session-token` on subsequent calls.",
    params: [
      { name: "username", type: "string", required: true, description: "Username of the application user.", example: "ada" },
      { name: "password", type: "string", required: true, description: "The user's password.", example: "correct horse battery staple" },
      HWID,
    ],
    response: {
      success: true,
      data: {
        session: { token: "sess_7f3a…", expires_at: "2026-08-07T16:00:00.000Z" },
        user: { id: "9f1c…", username: "ada", status: "active" },
        license: { status: "active", expires_at: "2027-01-01T00:00:00.000Z" },
      },
    },
    errors: ["invalid_credentials", "user_banned", "hwid_mismatch", "license_expired"],
  },
  {
    id: "logout",
    name: "Logout",
    method: "POST",
    group: "sessions",
    summary: "Terminate the current session.",
    description: "Marks the session inactive server-side. Always call it on clean shutdown so concurrent-session limits release immediately.",
    requiresSession: true,
    params: [],
    response: { success: true, data: { ended: true } },
    errors: ["unauthorized", "invalid_session"],
  },
  {
    id: "heartbeat",
    name: "Heartbeat",
    method: "POST",
    group: "sessions",
    summary: "Keep the session alive and detect revocation.",
    description:
      "Send on an interval (60 seconds is a good default). The response tells you whether the session is still valid so the client can lock itself the moment a license is banned or a session is revoked from the dashboard.",
    requiresSession: true,
    params: [],
    response: { success: true, data: { alive: true, expires_at: "2026-08-07T16:00:00.000Z" } },
    errors: ["unauthorized", "invalid_session", "session_expired"],
  },
  {
    id: "session/check",
    name: "Check session",
    method: "POST",
    group: "sessions",
    summary: "Validate a session token from your own backend.",
    description:
      "Stateless verification endpoint for server-to-server checks: pass a session token and receive the resolved user and license without touching the user's credentials.",
    requiresSession: true,
    params: [],
    response: { success: true, data: { valid: true, user: { id: "9f1c…", username: "ada" }, expires_at: "2026-08-07T16:00:00.000Z" } },
    errors: ["unauthorized", "invalid_session", "session_expired"],
  },
  {
    id: "license/validate",
    name: "Validate license",
    method: "POST",
    group: "licenses",
    summary: "Check a license key without consuming an activation.",
    description:
      "Read-only entitlement check. Returns the license status, expiry, activation count and HWID binding. Safe to call on every launch.",
    params: [
      { name: "license_key", type: "string", required: true, description: "The license key to validate.", example: "AEGS-4K7P-2M9X-QT31" },
      HWID,
    ],
    response: {
      success: true,
      data: { valid: true, status: "active", expires_at: "2027-01-01T00:00:00.000Z", activations: 1, max_activations: 3, hwid_locked: true },
    },
    errors: ["invalid_license", "license_expired", "license_banned", "hwid_mismatch"],
  },
  {
    id: "license/activate",
    name: "Activate license",
    method: "POST",
    group: "licenses",
    summary: "Bind a license to a machine and start its duration.",
    description:
      "Consumes one activation slot, binds the hardware identifier when HWID locking is on, and starts the duration clock for keys sold as “N days from first use”.",
    params: [
      { name: "license_key", type: "string", required: true, description: "The license key to activate.", example: "AEGS-4K7P-2M9X-QT31" },
      HWID,
      { name: "username", type: "string", required: false, description: "Attach the activation to an existing application user.", example: "ada" },
    ],
    response: { success: true, data: { activated: true, expires_at: "2027-01-01T00:00:00.000Z", activations: 2, max_activations: 3 } },
    errors: ["invalid_license", "license_exhausted", "license_banned", "hwid_mismatch"],
  },
  {
    id: "variables/get",
    name: "Get variables",
    method: "POST",
    group: "variables",
    summary: "Read application, license or user scoped variables.",
    description:
      "Remote configuration at runtime. Application scope returns public variables, license scope returns values bound to a key, user scope returns the signed-in user's own values.",
    params: [
      { name: "scope", type: "string", required: false, description: "One of `application`, `license` or `user`. Defaults to `application`.", example: "application" },
      { name: "license_key", type: "string", required: false, description: "Required when scope is `license`.", example: "AEGS-4K7P-2M9X-QT31" },
    ],
    response: { success: true, data: { scope: "application", variables: { cdn_base: "https://cdn.acme.dev", feature_flags: "beta_ui" } } },
    errors: ["unauthorized", "invalid_scope", "invalid_license"],
  },
  {
    id: "variables/set",
    name: "Set variable",
    method: "POST",
    group: "variables",
    summary: "Write a variable in user, license or application scope.",
    description:
      "User scope is writable with a valid session. License and application scope require an API key with the `variables:write` scope, so untrusted clients can never rewrite shared configuration.",
    requiresApiKey: "variables:write (license and application scope only)",
    params: [
      { name: "scope", type: "string", required: false, description: "One of `user`, `license` or `application`. Defaults to `user`.", example: "user" },
      { name: "key", type: "string", required: true, description: "Variable key.", example: "last_level" },
      { name: "value", type: "string", required: false, description: "Variable value. Defaults to an empty string.", example: "12" },
      { name: "license_key", type: "string", required: false, description: "Required when scope is `license`.", example: "AEGS-4K7P-2M9X-QT31" },
    ],
    response: { success: true, data: { scope: "user", key: "last_level", value: "12" } },
    errors: ["unauthorized", "forbidden_scope", "invalid_session", "invalid_license"],
  },
  {
    id: "user/data",
    name: "User data",
    method: "POST",
    group: "users",
    summary: "Read the signed-in user's profile, license and variables.",
    description: "Everything the client needs to render an account screen in one round trip.",
    requiresSession: true,
    params: [],
    response: {
      success: true,
      data: {
        user: { id: "9f1c…", username: "ada", email: "ada@acme.dev", status: "active", login_count: 42, last_login_at: "2026-08-07T03:12:00.000Z" },
        license: { status: "active", expires_at: "2027-01-01T00:00:00.000Z" },
        variables: { last_level: "12" },
      },
    },
    errors: ["unauthorized", "invalid_session"],
  },
  {
    id: "app/data",
    name: "Application data",
    method: "POST",
    group: "applications",
    summary: "Read the public profile and integration settings of the application.",
    description: "Branding, environment, lifecycle status, version gates and public settings such as session timeout and HWID locking.",
    params: [],
    response: {
      success: true,
      data: {
        name: "Acme Desktop",
        environment: "production",
        status: "active",
        current_version: "1.5.0",
        minimum_version: "1.2.0",
        settings: { hwid_lock: true, session_timeout_minutes: 720 },
      },
    },
    errors: ["unauthorized", "application_unavailable"],
  },
  {
    id: "version/check",
    name: "Check version",
    method: "POST",
    group: "versions",
    summary: "Compare a client build against the published release channel.",
    description:
      "Returns whether an update is available and whether it is mandatory. Use `update_required` to hard-block outdated builds and `release_notes` to render an in-app changelog.",
    params: [
      { name: "version", type: "string", required: true, description: "The running client version.", example: "1.4.2" },
      { name: "channel", type: "string", required: false, description: "One of `stable`, `beta`, `alpha`. Defaults to `stable`.", example: "stable" },
    ],
    response: {
      success: true,
      data: { latest_version: "1.5.0", minimum_version: "1.2.0", channel: "stable", update_available: true, update_required: false, release_notes: "Faster startup." },
    },
    errors: ["invalid_request", "unauthorized"],
  },
  {
    id: "downloads",
    name: "Download manifest",
    method: "POST",
    group: "downloads",
    summary: "List the artifacts published for a version.",
    description: "Returns installers, archives and documentation with checksums and sizes so the client can verify what it downloads.",
    params: [
      { name: "version", type: "string", required: false, description: "Limit the manifest to a single published version.", example: "1.5.0" },
    ],
    response: {
      success: true,
      data: { downloads: [{ name: "AcmeSetup.exe", kind: "installer", size_bytes: 24810112, checksum: "sha256:9f2c…", file_url: "https://cdn.acme.dev/1.5.0/AcmeSetup.exe" }] },
    },
    errors: ["unauthorized", "not_found"],
  },
  {
    id: "webhook/trigger",
    name: "Trigger webhook",
    method: "POST",
    group: "webhooks",
    summary: "Dispatch an event to every subscribed endpoint.",
    description:
      "Server-to-server only. Requires an API key with the `webhooks:trigger` scope; the payload is delivered to every active webhook subscribed to the event with an HMAC signature.",
    requiresApiKey: "webhooks:trigger",
    params: [
      { name: "event", type: "string", required: true, description: "Event name, e.g. `license.activated`.", example: "license.activated" },
      { name: "payload", type: "object", required: false, description: "Arbitrary JSON delivered to subscribers.", example: "{}" },
    ],
    response: { success: true, data: { dispatched: true, event: "license.activated" } },
    errors: ["unauthorized", "missing_scope", "invalid_request"],
  },
];

export const API_ERROR_CODES: { code: string; status: number; meaning: string; fix: string }[] = [
  { code: "unauthorized", status: 401, meaning: "The application key, API key or session token was missing or unknown.", fix: "Send `x-app-key`; add `x-api-key` or `x-session-token` when the endpoint requires it." },
  { code: "invalid_request", status: 400, meaning: "A required parameter was missing or the body was not valid JSON.", fix: "Check the parameter table for the endpoint and send `content-type: application/json`." },
  { code: "invalid_credentials", status: 401, meaning: "Username or password did not match.", fix: "Never reveal which half was wrong; rate-limit retries client-side." },
  { code: "invalid_session", status: 401, meaning: "The session token is unknown or has been revoked.", fix: "Re-authenticate and open a new session." },
  { code: "session_expired", status: 401, meaning: "The session passed its expiry window.", fix: "Send heartbeats, or re-login when a heartbeat fails." },
  { code: "user_banned", status: 403, meaning: "The application user is banned or suspended.", fix: "Show a support contact; the state is controlled from the Users tab." },
  { code: "invalid_license", status: 403, meaning: "The license key does not exist for this application.", fix: "Verify the key and that it belongs to the same application." },
  { code: "license_expired", status: 403, meaning: "The license passed its expiry date.", fix: "Prompt for renewal." },
  { code: "license_banned", status: 403, meaning: "The license was banned or suspended.", fix: "Direct the user to support." },
  { code: "license_exhausted", status: 403, meaning: "All activation slots are used.", fix: "Reset activations from the Licenses tab or raise `max_activations`." },
  { code: "hwid_mismatch", status: 403, meaning: "The hardware identifier does not match the locked machine.", fix: "Reset the HWID for that license, or ship a stable HWID implementation." },
  { code: "missing_scope", status: 403, meaning: "The API key lacks the scope required by the endpoint.", fix: "Create a key with the needed scope in the application's API tab." },
  { code: "invalid_timestamp", status: 401, meaning: "`x-timestamp` was outside the 300 second window.", fix: "Sync the client clock, or send the server time from your backend." },
  { code: "replay_detected", status: 409, meaning: "The `x-nonce` value was already used.", fix: "Generate a fresh random nonce per request." },
  { code: "invalid_signature", status: 401, meaning: "`x-signature` did not match the expected HMAC.", fix: "Sign `\"{timestamp}.{raw_body}\"` with the application secret key using HMAC-SHA256." },
  { code: "maintenance", status: 503, meaning: "The application is in maintenance mode.", fix: "Only `status` and `init` respond; show the maintenance message." },
  { code: "application_unavailable", status: 503, meaning: "The application is paused or archived.", fix: "Reactivate it from the application settings." },
  { code: "not_found", status: 404, meaning: "Unknown endpoint.", fix: "Check the path against the endpoint reference." },
  { code: "server_error", status: 500, meaning: "An unexpected error occurred and was logged.", fix: "Retry with backoff; inspect the application's Logs tab." },
];

export const API_HEADERS = [
  { name: "x-app-key", required: "Always", description: "Public application key. Identifies which application the request belongs to." },
  { name: "content-type", required: "POST requests", description: "Must be `application/json`." },
  { name: "x-session-token", required: "Session endpoints", description: "Token returned by `login`. Identifies the application user." },
  { name: "x-api-key", required: "Privileged endpoints", description: "Server-side API key. Grants scopes such as `variables:write` and `webhooks:trigger`." },
  { name: "x-timestamp", required: "Optional", description: "Unix timestamp. Validated within a 300 second window when present." },
  { name: "x-nonce", required: "Optional", description: "Unique random string per request. Rejected on reuse — replay protection." },
  { name: "x-signature", required: "Optional", description: "HMAC-SHA256 of `\"{timestamp}.{body}\"` keyed with the application secret." },
];

export function endpointsByGroup(group: ApiGroupId) {
  return API_ENDPOINT_SPECS.filter((e) => e.group === group);
}

export function findEndpoint(id: string) {
  return API_ENDPOINT_SPECS.find((e) => e.id === id);
}

export function exampleBody(endpoint: ApiEndpoint) {
  const body: Record<string, unknown> = {};
  for (const p of endpoint.params) {
    if (p.example === undefined) continue;
    if (p.type === "object") body[p.name] = {};
    else if (p.type === "number") body[p.name] = Number(p.example);
    else if (p.type === "boolean") body[p.name] = Boolean(p.example);
    else body[p.name] = p.example;
  }
  return body;
}
