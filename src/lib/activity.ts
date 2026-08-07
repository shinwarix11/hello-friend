import { supabase } from "@/integrations/supabase/client";

export type AuditEvent =
  | "sign_in"
  | "sign_up"
  | "sign_out"
  | "password_change"
  | "password_reset_requested"
  | "email_change"
  | "profile_update"
  | "preferences_update"
  | "account_delete_requested";

const LABELS: Record<AuditEvent, string> = {
  sign_in: "Signed in",
  sign_up: "Account created",
  sign_out: "Signed out",
  password_change: "Password changed",
  password_reset_requested: "Password reset requested",
  email_change: "Email address changed",
  profile_update: "Profile updated",
  preferences_update: "Preferences updated",
  account_delete_requested: "Account deletion requested",
};

export function eventLabel(event: string) {
  return LABELS[event as AuditEvent] ?? event.replace(/_/g, " ");
}

/** Best-effort activity logging — never blocks or breaks the calling flow. */
export async function logActivity(
  event: AuditEvent,
  description?: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({
      user_id: data.user.id,
      event,
      description: description ?? LABELS[event],
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
      metadata: metadata as never,
    });
  } catch {
    /* activity logging is non-critical */
  }
}
