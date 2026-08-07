import type { Database } from "@/integrations/supabase/types";

export type LicenseStatus = Database["public"]["Enums"]["license_status"];
export type AppUserStatus = Database["public"]["Enums"]["app_user_status"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type WebhookEvent = Database["public"]["Enums"]["webhook_event"];
export type WebhookDeliveryStatus = Database["public"]["Enums"]["webhook_delivery_status"];
export type AuthLogKind = Database["public"]["Enums"]["auth_log_kind"];

export type License = Database["public"]["Tables"]["licenses"]["Row"];
export type LicenseActivation = Database["public"]["Tables"]["license_activations"]["Row"];
export type LicenseVariable = Database["public"]["Tables"]["license_variables"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type AppUser = Database["public"]["Tables"]["app_users"]["Row"];
export type AppUserSession = Database["public"]["Tables"]["app_user_sessions"]["Row"];
export type AppUserVariable = Database["public"]["Tables"]["app_user_variables"]["Row"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];
export type Webhook = Database["public"]["Tables"]["webhooks"]["Row"];
export type WebhookDelivery = Database["public"]["Tables"]["webhook_deliveries"]["Row"];
export type AuthenticationLog = Database["public"]["Tables"]["authentication_logs"]["Row"];
export type ApiUsageLog = Database["public"]["Tables"]["api_usage_logs"]["Row"];

/* ------------------------------------------------------------------ */
/* Durations                                                           */
/* ------------------------------------------------------------------ */

export type DurationPreset = {
  value: string;
  label: string;
  /** null = lifetime / unlimited */
  days: number | null;
};

export const DURATION_PRESETS: DurationPreset[] = [
  { value: "lifetime", label: "Lifetime", days: null },
  { value: "1", label: "1 Day", days: 1 },
  { value: "7", label: "7 Days", days: 7 },
  { value: "30", label: "30 Days", days: 30 },
  { value: "90", label: "90 Days", days: 90 },
  { value: "180", label: "180 Days", days: 180 },
  { value: "365", label: "365 Days", days: 365 },
  { value: "custom", label: "Custom duration", days: 0 },
];

export function durationLabel(days: number | null) {
  if (days === null) return "Lifetime";
  const preset = DURATION_PRESETS.find((p) => p.days === days);
  return preset ? preset.label : `${days} Days`;
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const LICENSE_STATUSES: { value: LicenseStatus; label: string }[] = [
  { value: "unused", label: "Unused" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

export const LICENSE_STATUS_STYLES: Record<LicenseStatus, string> = {
  unused: "border-primary/30 bg-primary/10 text-primary",
  active: "border-success/30 bg-success/10 text-success",
  expired: "border-border bg-muted text-muted-foreground",
  suspended: "border-warning/30 bg-warning/10 text-warning",
  banned: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const APP_USER_STATUS_STYLES: Record<AppUserStatus, string> = {
  active: "border-success/30 bg-success/10 text-success",
  suspended: "border-warning/30 bg-warning/10 text-warning",
  banned: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const SUBSCRIPTION_STATUSES: { value: SubscriptionStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "application.created", label: "Application created" },
  { value: "license.created", label: "License created" },
  { value: "license.activated", label: "License activated" },
  { value: "license.expired", label: "License expired" },
  { value: "license.banned", label: "License banned" },
  { value: "user.registered", label: "User registered" },
  { value: "user.login", label: "User logged in" },
  { value: "subscription.updated", label: "Subscription updated" },
  { value: "version.published", label: "Version published" },
  { value: "secret.rotated", label: "Secret rotated" },
];

export const AUTH_LOG_LABELS: Record<AuthLogKind, string> = {
  init: "Initialize",
  register: "Register",
  login: "Login",
  logout: "Logout",
  validate: "Validate license",
  activate: "Activate license",
  session: "Session check",
  heartbeat: "Heartbeat",
  variable: "Variables",
  version: "Version check",
  download: "Downloads",
  error: "Error",
  log: "Client log",
};

export const API_SCOPES = [
  "licenses:read",
  "licenses:write",
  "users:read",
  "users:write",
  "variables:read",
  "variables:write",
  "webhooks:trigger",
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generates a formatted license key, e.g. `AEGIS-4F7K-9QW2-XR1M-8LTB`. */
export function generateLicenseKey(prefix = "", groups = 4, size = 4) {
  const bytes = new Uint32Array(groups * size);
  crypto.getRandomValues(bytes);
  const parts: string[] = [];
  for (let g = 0; g < groups; g += 1) {
    let chunk = "";
    for (let i = 0; i < size; i += 1) {
      chunk += KEY_ALPHABET[bytes[g * size + i]! % KEY_ALPHABET.length];
    }
    parts.push(chunk);
  }
  const clean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return (clean ? [clean, ...parts] : parts).join("-");
}

export function expiryFromDays(days: number | null, from: Date = new Date()) {
  if (days === null) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isExpired(license: Pick<License, "expires_at">) {
  return Boolean(license.expires_at && new Date(license.expires_at).getTime() < Date.now());
}

export function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

/** Effective status accounting for time-based expiry. */
export function effectiveStatus(license: License): LicenseStatus {
  if (license.status === "banned" || license.status === "suspended") return license.status;
  if (isExpired(license)) return "expired";
  return license.status;
}

export function maskKey(key: string) {
  if (key.length <= 8) return key;
  return `${key.slice(0, 5)}••••••••${key.slice(-4)}`;
}

export function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function licensesToCsv(rows: License[]) {
  const headers = [
    "license_key",
    "status",
    "owner_label",
    "duration_days",
    "created_at",
    "activated_at",
    "expires_at",
    "hwid_lock",
    "max_activations",
    "current_activations",
    "tags",
    "notes",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.license_key,
        r.status,
        r.owner_label,
        r.duration_days,
        r.created_at,
        r.activated_at,
        r.expires_at,
        r.hwid_lock,
        r.max_activations,
        r.current_activations,
        (r.tags ?? []).join("|"),
        r.notes,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadFile(filename: string, contents: string, type = "text/csv") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
