import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_member_role"];
export type AppEnvironment = Database["public"]["Enums"]["app_environment"];
export type AppVisibility = Database["public"]["Enums"]["app_visibility"];
export type AppStatus = Database["public"]["Enums"]["app_status"];
export type AppVersionChannel = Database["public"]["Enums"]["app_version_channel"];
export type AppDownloadKind = Database["public"]["Enums"]["app_download_kind"];
export type AppInvitationStatus = Database["public"]["Enums"]["app_invitation_status"];

export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationMember = Database["public"]["Tables"]["application_members"]["Row"];
export type ApplicationInvitation =
  Database["public"]["Tables"]["application_invitations"]["Row"];
export type ApplicationSettings = Database["public"]["Tables"]["application_settings"]["Row"];
export type ApplicationVariable = Database["public"]["Tables"]["application_variables"]["Row"];
export type ApplicationVersion = Database["public"]["Tables"]["application_versions"]["Row"];
export type ApplicationDownload = Database["public"]["Tables"]["application_downloads"]["Row"];
export type ApplicationAuditLog =
  Database["public"]["Tables"]["application_audit_logs"]["Row"];
export type UserApplicationState =
  Database["public"]["Tables"]["user_application_state"]["Row"];

export type ApplicationWithState = Application & {
  state: Pick<UserApplicationState, "is_favorite" | "is_pinned" | "last_opened_at"> | null;
  member_count: number;
  role: AppRole | null;
};

export const ROLE_ORDER: Record<AppRole, number> = {
  owner: 5,
  administrator: 4,
  developer: 3,
  support: 2,
  viewer: 1,
};

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  developer: "Developer",
  support: "Support",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<AppRole, string> = {
  owner: "Full control, billing and ownership transfer.",
  administrator: "Manage settings, members, versions and variables.",
  developer: "Manage variables, versions and downloads.",
  support: "Read application data and assist end users.",
  viewer: "Read-only access to the application overview.",
};

export const ASSIGNABLE_ROLES: AppRole[] = ["administrator", "developer", "support", "viewer"];

export function atLeast(role: AppRole | null | undefined, minimum: AppRole) {
  if (!role) return false;
  return ROLE_ORDER[role] >= ROLE_ORDER[minimum];
}

export const ENVIRONMENTS: { value: AppEnvironment; label: string }[] = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export const VISIBILITIES: { value: AppVisibility; label: string; hint: string }[] = [
  { value: "private", label: "Private", hint: "Only invited members can see this app." },
  { value: "internal", label: "Internal", hint: "Visible to your workspace members." },
  { value: "public", label: "Public", hint: "Discoverable by any signed-in user." },
];

export const CATEGORIES = [
  "general",
  "desktop",
  "web",
  "mobile",
  "game",
  "api",
  "internal-tool",
  "plugin",
] as const;

export const VERSION_CHANNELS: { value: AppVersionChannel; label: string }[] = [
  { value: "stable", label: "Stable" },
  { value: "beta", label: "Beta" },
  { value: "alpha", label: "Alpha" },
  { value: "deprecated", label: "Deprecated" },
];

export const DOWNLOAD_KINDS: { value: AppDownloadKind; label: string }[] = [
  { value: "executable", label: "Executable" },
  { value: "zip", label: "ZIP archive" },
  { value: "dll", label: "DLL" },
  { value: "installer", label: "Installer" },
  { value: "documentation", label: "Documentation" },
  { value: "other", label: "Other" },
];

export const STATUS_TONE: Record<AppStatus, string> = {
  active: "text-success",
  paused: "text-warning",
  maintenance: "text-warning",
  archived: "text-muted-foreground",
};

export const APP_AUDIT_LABELS: Record<string, string> = {
  application_created: "Application created",
  application_updated: "Application updated",
  application_deleted: "Application deleted",
  settings_changed: "Settings changed",
  member_invited: "Member invited",
  member_removed: "Member removed",
  member_role_changed: "Member role changed",
  ownership_transferred: "Ownership transferred",
  variable_created: "Variable created",
  variable_updated: "Variable updated",
  variable_deleted: "Variable deleted",
  version_created: "Version published",
  version_updated: "Version updated",
  version_deleted: "Version removed",
  download_created: "Download added",
  download_deleted: "Download removed",
  security_changed: "Security settings changed",
  keys_rotated: "API keys rotated",
};

export function appEventLabel(event: string) {
  return APP_AUDIT_LABELS[event] ?? event.replace(/_/g, " ");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Deterministic accent pair for an application avatar. */
export function appGradient(id: string) {
  const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `linear-gradient(135deg, oklch(0.62 0.2 ${hue}), oklch(0.56 0.24 ${(hue + 55) % 360}))`;
}
