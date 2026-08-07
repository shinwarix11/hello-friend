import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DeveloperPreferences = {
  user_id: string;
  default_language: string;
  default_sdk: string;
  docs_density: string;
  show_beta_docs: boolean;
  explorer_pretty_json: boolean;
  explorer_include_signature: boolean;
  notify_breaking_changes: boolean;
  notify_sdk_releases: boolean;
  notify_webhook_failures: boolean;
};

export const DEFAULT_DEVELOPER_PREFERENCES: Omit<DeveloperPreferences, "user_id"> = {
  default_language: "csharp",
  default_sdk: "csharp",
  docs_density: "comfortable",
  show_beta_docs: false,
  explorer_pretty_json: true,
  explorer_include_signature: false,
  notify_breaking_changes: true,
  notify_sdk_releases: true,
  notify_webhook_failures: true,
};

export const developerKeys = {
  preferences: (userId?: string) => ["developer-preferences", userId] as const,
  usage: (userId?: string) => ["developer-usage", userId] as const,
  webhookDeliveries: (userId?: string) => ["developer-webhook-deliveries", userId] as const,
  apiKeys: (userId?: string) => ["developer-api-keys", userId] as const,
};

export function useDeveloperPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: developerKeys.preferences(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DeveloperPreferences> => {
      const { data, error } = await supabase
        .from("developer_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as DeveloperPreferences;
      return { user_id: user!.id, ...DEFAULT_DEVELOPER_PREFERENCES };
    },
  });
}

export function useUpdateDeveloperPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<DeveloperPreferences, "user_id">>) => {
      const { error } = await supabase
        .from("developer_preferences")
        .upsert({ user_id: user!.id, ...DEFAULT_DEVELOPER_PREFERENCES, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: developerKeys.preferences(user?.id) });
      toast.success("Developer preferences saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export type EndpointUsage = { endpoint: string; calls: number; errors: number; avgMs: number };

export type DeveloperUsage = {
  totalCalls: number;
  errorCalls: number;
  successRate: number;
  avgLatency: number;
  endpoints: EndpointUsage[];
  daily: { day: string; calls: number }[];
  statusBuckets: { label: string; value: number }[];
};

/** Aggregated API usage across every application the developer can access. */
export function useDeveloperUsage(applicationIds: string[]) {
  const { user } = useAuth();
  const key = applicationIds.slice().sort().join(",");
  return useQuery({
    queryKey: [...developerKeys.usage(user?.id), key],
    enabled: applicationIds.length > 0,
    queryFn: async (): Promise<DeveloperUsage> => {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("endpoint, status_code, duration_ms, created_at")
        .in("application_id", applicationIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(4000);
      if (error) throw error;

      const rows = data ?? [];
      const byEndpoint = new Map<string, { calls: number; errors: number; total: number }>();
      const byDay = new Map<string, number>();
      const buckets = { "2xx": 0, "4xx": 0, "5xx": 0 };

      for (const row of rows) {
        const entry = byEndpoint.get(row.endpoint) ?? { calls: 0, errors: 0, total: 0 };
        entry.calls += 1;
        entry.total += row.duration_ms;
        if (row.status_code >= 400) entry.errors += 1;
        byEndpoint.set(row.endpoint, entry);

        const day = row.created_at.slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);

        if (row.status_code >= 500) buckets["5xx"] += 1;
        else if (row.status_code >= 400) buckets["4xx"] += 1;
        else buckets["2xx"] += 1;
      }

      const totalCalls = rows.length;
      const errorCalls = buckets["4xx"] + buckets["5xx"];
      const totalMs = rows.reduce((sum, r) => sum + r.duration_ms, 0);

      const daily: { day: string; calls: number }[] = [];
      for (let i = 13; i >= 0; i -= 1) {
        const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        daily.push({ day, calls: byDay.get(day) ?? 0 });
      }

      return {
        totalCalls,
        errorCalls,
        successRate: totalCalls ? ((totalCalls - errorCalls) / totalCalls) * 100 : 100,
        avgLatency: totalCalls ? Math.round(totalMs / totalCalls) : 0,
        endpoints: [...byEndpoint.entries()]
          .map(([endpoint, v]) => ({
            endpoint,
            calls: v.calls,
            errors: v.errors,
            avgMs: Math.round(v.total / v.calls),
          }))
          .sort((a, b) => b.calls - a.calls),
        daily,
        statusBuckets: [
          { label: "2xx", value: buckets["2xx"] },
          { label: "4xx", value: buckets["4xx"] },
          { label: "5xx", value: buckets["5xx"] },
        ],
      };
    },
  });
}

export type DeveloperDelivery = {
  id: string;
  application_id: string;
  event: string;
  status: string;
  response_status: number | null;
  attempts: number;
  error: string | null;
  next_retry_at: string | null;
  created_at: string;
};

/** Webhook deliveries across every accessible application. */
export function useDeveloperDeliveries(applicationIds: string[]) {
  const { user } = useAuth();
  const key = applicationIds.slice().sort().join(",");
  return useQuery({
    queryKey: [...developerKeys.webhookDeliveries(user?.id), key],
    enabled: applicationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("id, application_id, event, status, response_status, attempts, error, next_retry_at, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as DeveloperDelivery[];
    },
  });
}

export type DeveloperApiKey = {
  id: string;
  application_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

/** API keys across every accessible application. */
export function useDeveloperApiKeys(applicationIds: string[]) {
  const { user } = useAuth();
  const key = applicationIds.slice().sort().join(",");
  return useQuery({
    queryKey: [...developerKeys.apiKeys(user?.id), key],
    enabled: applicationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, application_id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeveloperApiKey[];
    },
  });
}
