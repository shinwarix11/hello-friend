import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAppEvent } from "@/hooks/useApplications";
import type { Database } from "@/integrations/supabase/types";
import {
  expiryFromDays,
  generateLicenseKey,
  type ApiKey,
  type AppUser,
  type AppUserSession,
  type ApiUsageLog,
  type AuthenticationLog,
  type License,
  type LicenseActivation,
  type LicenseStatus,
  type Subscription,
  type Webhook,
  type WebhookDelivery,
  type WebhookEvent,
} from "@/lib/licensing";

type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export const licenseKeys = {
  licenses: (appId: string) => ["licenses", appId] as const,
  activations: (licenseId: string) => ["license-activations", licenseId] as const,
  subscriptions: (appId: string) => ["subscriptions", appId] as const,
  appUsers: (appId: string) => ["app-users", appId] as const,
  sessions: (appId: string) => ["app-user-sessions", appId] as const,
  apiKeys: (appId: string) => ["api-keys", appId] as const,
  webhooks: (appId: string) => ["webhooks", appId] as const,
  deliveries: (appId: string) => ["webhook-deliveries", appId] as const,
  authLogs: (appId: string) => ["authentication-logs", appId] as const,
  apiUsage: (appId: string) => ["api-usage-logs", appId] as const,
  overview: (userId?: string) => ["license-overview", userId] as const,
};

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  toast.error(fallback, { description: message });
}

/* ------------------------------------------------------------------ */
/* Licenses                                                            */
/* ------------------------------------------------------------------ */

export function useLicenses(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.licenses(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<License[]> => {
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type GenerateLicensesInput = {
  applicationId: string;
  amount: number;
  prefix?: string;
  durationDays: number | null;
  maxActivations: number;
  hwidLock: boolean;
  ownerLabel?: string | null;
  subscriptionId?: string | null;
  notes?: string | null;
  tags?: string[];
};

export function useGenerateLicenses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateLicensesInput) => {
      const rows: Insert<"licenses">[] = Array.from({ length: input.amount }).map(() => ({
        application_id: input.applicationId,
        license_key: generateLicenseKey(input.prefix ?? ""),
        duration_days: input.durationDays,
        max_activations: input.maxActivations,
        hwid_lock: input.hwidLock,
        owner_label: input.ownerLabel ?? null,
        subscription_id: input.subscriptionId ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? [],
        created_by: user?.id ?? null,
      }));
      const { data, error } = await supabase.from("licenses").insert(rows).select("*");
      if (error) throw error;
      await logAppEvent(
        input.applicationId,
        "licenses_generated",
        `${input.amount} license${input.amount === 1 ? "" : "s"} generated.`,
        { amount: input.amount },
      );
      return data ?? [];
    },
    onSuccess: (rows, input) => {
      qc.invalidateQueries({ queryKey: licenseKeys.licenses(input.applicationId) });
      qc.invalidateQueries({ queryKey: ["license-overview"] });
      toast.success(`${rows.length} license${rows.length === 1 ? "" : "s"} generated`);
    },
    onError: (e) => fail(e, "Could not generate licenses"),
  });
}

export function useImportLicenses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      keys,
      durationDays,
      maxActivations,
    }: {
      applicationId: string;
      keys: string[];
      durationDays: number | null;
      maxActivations: number;
    }) => {
      const rows: Insert<"licenses">[] = keys.map((key) => ({
        application_id: applicationId,
        license_key: key,
        duration_days: durationDays,
        max_activations: maxActivations,
        created_by: user?.id ?? null,
      }));
      const { data, error } = await supabase.from("licenses").insert(rows).select("id");
      if (error) throw error;
      await logAppEvent(applicationId, "licenses_imported", `${keys.length} licenses imported.`);
      return data ?? [];
    },
    onSuccess: (rows, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.licenses(vars.applicationId) });
      toast.success(`${rows.length} licenses imported`);
    },
    onError: (e) => fail(e, "Could not import licenses"),
  });
}

export function useUpdateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      id,
      patch,
      event,
    }: {
      applicationId: string;
      id: string;
      patch: Update<"licenses">;
      event?: string;
    }) => {
      const { data, error } = await supabase
        .from("licenses")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      if (event) await logAppEvent(applicationId, event, `License ${data.license_key}: ${event}.`);
      return data as License;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.licenses(vars.applicationId) });
      qc.invalidateQueries({ queryKey: ["license-overview"] });
    },
    onError: (e) => fail(e, "Could not update the license"),
  });
}

export function useBulkLicenseAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      ids,
      action,
      days,
    }: {
      applicationId: string;
      ids: string[];
      action: "suspend" | "activate" | "ban" | "delete" | "extend" | "reset-hwid";
      days?: number;
    }) => {
      if (action === "delete") {
        const { error } = await supabase.from("licenses").delete().in("id", ids);
        if (error) throw error;
      } else if (action === "reset-hwid") {
        const { error } = await supabase
          .from("license_activations")
          .update({ is_active: false })
          .in("license_id", ids);
        if (error) throw error;
        const { error: e2 } = await supabase
          .from("licenses")
          .update({ current_activations: 0 })
          .in("id", ids);
        if (e2) throw e2;
      } else if (action === "extend") {
        const { data: rows, error } = await supabase.from("licenses").select("*").in("id", ids);
        if (error) throw error;
        await Promise.all(
          (rows ?? []).map((row) => {
            const base = row.expires_at ? new Date(row.expires_at) : new Date();
            const next = expiryFromDays(days ?? 30, base);
            return supabase
              .from("licenses")
              .update({ expires_at: next, status: row.status === "expired" ? "active" : row.status })
              .eq("id", row.id);
          }),
        );
      } else {
        const status: LicenseStatus =
          action === "suspend" ? "suspended" : action === "ban" ? "banned" : "active";
        const { error } = await supabase.from("licenses").update({ status }).in("id", ids);
        if (error) throw error;
      }
      await logAppEvent(applicationId, `licenses_${action.replace("-", "_")}`, `${ids.length} licenses updated.`);
      return ids.length;
    },
    onSuccess: (count, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.licenses(vars.applicationId) });
      qc.invalidateQueries({ queryKey: ["license-overview"] });
      toast.success(`${count} license${count === 1 ? "" : "s"} updated`);
    },
    onError: (e) => fail(e, "Bulk action failed"),
  });
}

export function useLicenseActivations(licenseId: string | null) {
  return useQuery({
    queryKey: licenseKeys.activations(licenseId ?? "none"),
    enabled: Boolean(licenseId),
    queryFn: async (): Promise<LicenseActivation[]> => {
      const { data, error } = await supabase
        .from("license_activations")
        .select("*")
        .eq("license_id", licenseId!)
        .order("activated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

export function useSubscriptions(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.subscriptions(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<Subscription[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveSubscription() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      id,
      values,
    }: {
      applicationId: string;
      id?: string | null;
      values: Omit<Insert<"subscriptions">, "application_id">;
    }) => {
      if (id) {
        const { error } = await supabase.from("subscriptions").update(values).eq("id", id);
        if (error) throw error;
        await logAppEvent(applicationId, "subscription_updated", `${values.name} updated.`);
        return id;
      }
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({ ...values, application_id: applicationId, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      await logAppEvent(applicationId, "subscription_created", `${values.name} created.`);
      return data.id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.subscriptions(vars.applicationId) });
      toast.success("Subscription saved");
    },
    onError: (e) => fail(e, "Could not save the subscription"),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, id }: { applicationId: string; id: string }) => {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "subscription_deleted", "Subscription removed.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.subscriptions(vars.applicationId) });
      toast.success("Subscription deleted");
    },
    onError: (e) => fail(e, "Could not delete the subscription"),
  });
}

/* ------------------------------------------------------------------ */
/* Application end users                                               */
/* ------------------------------------------------------------------ */

export function useAppUsers(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.appUsers(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<AppUser[]> => {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateAppUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      id,
      patch,
    }: {
      applicationId: string;
      id: string;
      patch: Update<"app_users">;
    }) => {
      const { error } = await supabase.from("app_users").update(patch).eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "app_user_updated", "Application user updated.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.appUsers(vars.applicationId) });
      toast.success("User updated");
    },
    onError: (e) => fail(e, "Could not update the user"),
  });
}

export function useDeleteAppUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, id }: { applicationId: string; id: string }) => {
      const { error } = await supabase.from("app_users").delete().eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "app_user_deleted", "Application user deleted.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.appUsers(vars.applicationId) });
      toast.success("User deleted");
    },
    onError: (e) => fail(e, "Could not delete the user"),
  });
}

export function useAppUserSessions(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.sessions(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<AppUserSession[]> => {
      const { data, error } = await supabase
        .from("app_user_sessions")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, id }: { applicationId: string; id: string }) => {
      const { error } = await supabase.from("app_user_sessions").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "session_revoked", "Session revoked.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.sessions(vars.applicationId) });
      toast.success("Session revoked");
    },
    onError: (e) => fail(e, "Could not revoke the session"),
  });
}

/* ------------------------------------------------------------------ */
/* API keys                                                            */
/* ------------------------------------------------------------------ */

async function sha256Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useApiKeys(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.apiKeys(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<ApiKey[]> => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateApiKey() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      name,
      scopes,
    }: {
      applicationId: string;
      name: string;
      scopes: string[];
    }) => {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const secret = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      const plaintext = `aegis_sk_${secret}`;
      const { error } = await supabase.from("api_keys").insert({
        application_id: applicationId,
        name,
        scopes,
        key_prefix: plaintext.slice(0, 14),
        key_hash: await sha256Hex(plaintext),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await logAppEvent(applicationId, "api_key_created", `API key "${name}" created.`);
      return plaintext;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.apiKeys(vars.applicationId) });
    },
    onError: (e) => fail(e, "Could not create the API key"),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, id }: { applicationId: string; id: string }) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "api_key_revoked", "API key revoked.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.apiKeys(vars.applicationId) });
      toast.success("API key revoked");
    },
    onError: (e) => fail(e, "Could not revoke the API key"),
  });
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

export function useWebhooks(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.webhooks(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<Webhook[]> => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveWebhook() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      id,
      name,
      url,
      events,
      isActive,
    }: {
      applicationId: string;
      id?: string | null;
      name: string;
      url: string;
      events: WebhookEvent[];
      isActive: boolean;
    }) => {
      if (id) {
        const { error } = await supabase
          .from("webhooks")
          .update({ name, url, events, is_active: isActive })
          .eq("id", id);
        if (error) throw error;
        await logAppEvent(applicationId, "webhook_updated", `Webhook "${name}" updated.`);
        return;
      }
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const signingSecret = `whsec_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      const { error } = await supabase.from("webhooks").insert({
        application_id: applicationId,
        name,
        url,
        events,
        is_active: isActive,
        signing_secret: signingSecret,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await logAppEvent(applicationId, "webhook_created", `Webhook "${name}" created.`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.webhooks(vars.applicationId) });
      toast.success("Webhook saved");
    },
    onError: (e) => fail(e, "Could not save the webhook"),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, id }: { applicationId: string; id: string }) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "webhook_deleted", "Webhook removed.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: licenseKeys.webhooks(vars.applicationId) });
      toast.success("Webhook deleted");
    },
    onError: (e) => fail(e, "Could not delete the webhook"),
  });
}

export function useWebhookDeliveries(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.deliveries(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<WebhookDelivery[]> => {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Logs                                                                */
/* ------------------------------------------------------------------ */

export function useAuthenticationLogs(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.authLogs(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<AuthenticationLog[]> => {
      const { data, error } = await supabase
        .from("authentication_logs")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApiUsageLogs(applicationId: string) {
  return useQuery({
    queryKey: licenseKeys.apiUsage(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<ApiUsageLog[]> => {
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Cross-application overview                                          */
/* ------------------------------------------------------------------ */

export type LicenseOverview = {
  licenses: License[];
  activations: LicenseActivation[];
  applications: { id: string; name: string }[];
};

export function useLicenseOverview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: licenseKeys.overview(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LicenseOverview> => {
      const [licenses, activations, apps] = await Promise.all([
        supabase.from("licenses").select("*").order("created_at", { ascending: false }),
        supabase
          .from("license_activations")
          .select("*")
          .order("activated_at", { ascending: false })
          .limit(500),
        supabase.from("applications").select("id, name"),
      ]);
      if (licenses.error) throw licenses.error;
      if (activations.error) throw activations.error;
      if (apps.error) throw apps.error;
      return {
        licenses: licenses.data ?? [],
        activations: activations.data ?? [],
        applications: apps.data ?? [],
      };
    },
  });
}
