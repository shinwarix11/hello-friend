/**
 * Platform changelog. Entries are ordered newest first and drive both the
 * changelog page and the "what's new" surface on the developer dashboard.
 */

export type ChangeKind = "breaking" | "security" | "feature" | "improvement" | "fix";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: { kind: ChangeKind; text: string }[];
};

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  breaking: "Breaking",
  security: "Security",
  feature: "New",
  improvement: "Improved",
  fix: "Fixed",
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "4.0.0",
    date: "2026-08-07",
    title: "Developer platform",
    summary:
      "The developer portal ships: interactive API reference, live explorer, SDK catalogue, download centre, examples and changelog.",
    changes: [
      { kind: "feature", text: "Developer portal with dashboard, quick start and global documentation search." },
      { kind: "feature", text: "Interactive API explorer that signs and sends real requests against your applications." },
      { kind: "feature", text: "Snippet generation for cURL, JavaScript fetch, Python requests and C# HttpClient." },
      { kind: "feature", text: "SDK pages for C#, C++, Python, JavaScript, TypeScript, Rust, Go, Java, PHP and Lua." },
      { kind: "feature", text: "Download centre with platform selection, version selection and published checksums." },
      { kind: "feature", text: "Developer preferences: default language, default SDK, explorer and notification settings." },
      { kind: "improvement", text: "Documentation, examples and error tables are generated from the live endpoint specification." },
    ],
  },
  {
    version: "3.2.0",
    date: "2026-07-24",
    title: "Licensing hardening",
    summary: "Replay protection and request signing became first-class across every endpoint.",
    changes: [
      { kind: "security", text: "Nonce replay protection: a reused `x-nonce` is rejected with `replay_detected`." },
      { kind: "security", text: "Optional HMAC request signatures verified against the application secret key." },
      { kind: "improvement", text: "Timestamp tolerance narrowed to 300 seconds with a clear `invalid_timestamp` error." },
      { kind: "fix", text: "Activation counts no longer drift when two clients activate the same key simultaneously." },
    ],
  },
  {
    version: "3.1.0",
    date: "2026-07-02",
    title: "Webhooks and delivery history",
    summary: "Outbound events with signing secrets, retries and a full delivery log.",
    changes: [
      { kind: "feature", text: "Webhook subscriptions with per-endpoint signing secrets." },
      { kind: "feature", text: "Delivery history with response status, attempt count and next retry time." },
      { kind: "feature", text: "`webhook/trigger` endpoint behind the `webhooks:trigger` API-key scope." },
    ],
  },
  {
    version: "3.0.0",
    date: "2026-06-12",
    title: "Licensing and application users",
    summary: "Full license lifecycle, subscription plans and end-user accounts.",
    changes: [
      { kind: "breaking", text: "`auth/login` moved to `login`; all endpoints are now flat under `/api/public/v1`." },
      { kind: "breaking", text: "Responses are wrapped as `{ success, data, timestamp }`; errors as `{ success, error }`." },
      { kind: "feature", text: "License keys with HWID locking, activation limits and duration presets." },
      { kind: "feature", text: "Subscription plans that licenses can be attached to." },
      { kind: "feature", text: "Application users with sessions, heartbeats and per-user variables." },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-05-19",
    title: "Application management",
    summary: "Applications became the unit of ownership, with teams, versions and variables.",
    changes: [
      { kind: "feature", text: "Applications with environments, visibility and lifecycle status." },
      { kind: "feature", text: "Team roles: owner, administrator, developer, support and viewer." },
      { kind: "feature", text: "Version channels with current and minimum-version gating." },
      { kind: "improvement", text: "Application variables support encrypted values." },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-04-28",
    title: "Initial release",
    summary: "Accounts, authentication and the audit trail.",
    changes: [
      { kind: "feature", text: "Email, password and Google sign-in with session management." },
      { kind: "feature", text: "Profiles, preferences and a complete account audit log." },
    ],
  },
];

export const LATEST_PLATFORM_VERSION = CHANGELOG[0]!.version;
