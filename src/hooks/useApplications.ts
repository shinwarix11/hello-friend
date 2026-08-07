import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  AppRole,
  Application,
  ApplicationAuditLog,
  ApplicationDownload,
  ApplicationInvitation,
  ApplicationMember,
  ApplicationSettings,
  ApplicationVariable,
  ApplicationVersion,
  ApplicationWithState,
} from "@/lib/applications";
import type { Database } from "@/integrations/supabase/types";

type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export const appKeys = {
  list: (userId?: string) => ["applications", userId] as const,
  detail: (id: string) => ["application", id] as const,
  members: (id: string) => ["application-members", id] as const,
  invitations: (id: string) => ["application-invitations", id] as const,
  settings: (id: string) => ["application-settings", id] as const,
  variables: (id: string) => ["application-variables", id] as const,
  versions: (id: string) => ["application-versions", id] as const,
  downloads: (id: string) => ["application-downloads", id] as const,
  audit: (id: string) => ["application-audit", id] as const,
};

/** Best-effort application audit logging — never blocks the calling flow. */
export async function logAppEvent(
  applicationId: string,
  event: string,
  description?: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("application_audit_logs").insert({
      application_id: applicationId,
      user_id: data.user.id,
      event,
      description: description ?? null,
      metadata: metadata as never,
    });
  } catch {
    /* audit logging is non-critical */
  }
}

/* ------------------------------------------------------------------ */
/* Applications store                                                  */
/* ------------------------------------------------------------------ */

export function useApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: appKeys.list(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ApplicationWithState[]> => {
      const [apps, memberships, states] = await Promise.all([
        supabase.from("applications").select("*").order("created_at", { ascending: false }),
        supabase.from("application_members").select("application_id, user_id, role"),
        supabase
          .from("user_application_state")
          .select("application_id, is_favorite, is_pinned, last_opened_at")
          .eq("user_id", user!.id),
      ]);
      if (apps.error) throw apps.error;
      if (memberships.error) throw memberships.error;
      if (states.error) throw states.error;

      const counts = new Map<string, number>();
      const myRole = new Map<string, AppRole>();
      for (const m of memberships.data ?? []) {
        counts.set(m.application_id, (counts.get(m.application_id) ?? 0) + 1);
        if (m.user_id === user!.id) myRole.set(m.application_id, m.role);
      }
      const stateMap = new Map((states.data ?? []).map((s) => [s.application_id, s]));

      return (apps.data ?? []).map((app) => ({
        ...(app as Application),
        member_count: counts.get(app.id) ?? 1,
        role: myRole.get(app.id) ?? null,
        state: stateMap.get(app.id) ?? null,
      }));
    },
  });
}

export function useApplication(applicationId: string) {
  return useQuery({
    queryKey: appKeys.detail(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return data as Application | null;
    },
  });
}

export function useMyAppRole(applicationId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["application-my-role", applicationId, user?.id],
    enabled: Boolean(applicationId && user?.id),
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from("application_members")
        .select("role")
        .eq("application_id", applicationId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as AppRole | undefined) ?? null;
    },
  });
}

export type CreateApplicationInput = {
  name: string;
  internal_name: string;
  description?: string | null;
  logo_url?: string | null;
  category: string;
  environment: Application["environment"];
  visibility: Application["visibility"];
  tags: string[];
};

export function useCreateApplication() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateApplicationInput) => {
      const payload: Insert<"applications"> = { ...input, owner_id: user!.id };
      const { data, error } = await supabase
        .from("applications")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      await logAppEvent(data.id, "application_created", `${data.name} was created.`);
      return data as Application;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateApplication(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Update<"applications">) => {
      const { error } = await supabase
        .from("applications")
        .update(patch)
        .eq("id", applicationId);
      if (error) throw error;
      await logAppEvent(applicationId, "application_updated", "Application details updated.", {
        fields: Object.keys(patch),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.detail(applicationId) });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Application updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleAppState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      patch: Partial<Pick<ApplicationWithState, never>> & {
        is_favorite?: boolean;
        is_pinned?: boolean;
        last_opened_at?: string;
      };
    }) => {
      const { error } = await supabase.from("user_application_state").upsert(
        {
          user_id: user!.id,
          application_id: input.applicationId,
          ...input.patch,
        },
        { onConflict: "user_id,application_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Members store                                                       */
/* ------------------------------------------------------------------ */

export type MemberWithProfile = ApplicationMember & {
  profile: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
};

export function useAppMembers(applicationId: string) {
  return useQuery({
    queryKey: appKeys.members(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data, error } = await supabase
        .from("application_members")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at");
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const profiles = ids.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url")
            .in("id", ids)
        : { data: [], error: null };
      const map = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((m) => ({ ...m, profile: map.get(m.user_id) ?? null }));
    },
  });
}

export function useUpdateMemberRole(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("application_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
      await logAppEvent(applicationId, "member_role_changed", `Role changed to ${role}.`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.members(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveMember(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("application_members").delete().eq("id", memberId);
      if (error) throw error;
      await logAppEvent(applicationId, "member_removed", "A member was removed.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.members(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Member removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTransferOwnership(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newOwnerMemberId,
      newOwnerUserId,
      currentOwnerMemberId,
    }: {
      newOwnerMemberId: string;
      newOwnerUserId: string;
      currentOwnerMemberId: string;
    }) => {
      const app = await supabase
        .from("applications")
        .update({ owner_id: newOwnerUserId })
        .eq("id", applicationId);
      if (app.error) throw app.error;
      const promote = await supabase
        .from("application_members")
        .update({ role: "owner" })
        .eq("id", newOwnerMemberId);
      if (promote.error) throw promote.error;
      const demote = await supabase
        .from("application_members")
        .update({ role: "administrator" })
        .eq("id", currentOwnerMemberId);
      if (demote.error) throw demote.error;
      await logAppEvent(applicationId, "ownership_transferred", "Ownership was transferred.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.members(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.detail(applicationId) });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Ownership transferred");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAppInvitations(applicationId: string) {
  return useQuery({
    queryKey: appKeys.invitations(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_invitations")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationInvitation[];
    },
  });
}

export function useInviteMember(applicationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { error } = await supabase.from("application_invitations").insert({
        application_id: applicationId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user!.id,
      });
      if (error) throw error;
      await logAppEvent(applicationId, "member_invited", `${email} was invited as ${role}.`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.invitations(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Invitation sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeInvitation(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("application_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.invitations(applicationId) });
      toast.success("Invitation revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Settings store                                                      */
/* ------------------------------------------------------------------ */

export function useAppSettings(applicationId: string) {
  return useQuery({
    queryKey: appKeys.settings(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_settings")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return data as ApplicationSettings | null;
    },
  });
}

export function useUpdateAppSettings(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Update<"application_settings">) => {
      const { error } = await supabase
        .from("application_settings")
        .upsert({ application_id: applicationId, ...patch }, { onConflict: "application_id" });
      if (error) throw error;
      await logAppEvent(applicationId, "settings_changed", "Application settings updated.", {
        fields: Object.keys(patch),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.settings(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Variables store                                                     */
/* ------------------------------------------------------------------ */

export function useAppVariables(applicationId: string) {
  return useQuery({
    queryKey: appKeys.variables(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_variables")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationVariable[];
    },
  });
}

export function useSaveVariable(applicationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"application_variables"> & { id?: string }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase
          .from("application_variables")
          .update(patch)
          .eq("id", id);
        if (error) throw error;
        await logAppEvent(applicationId, "variable_updated", `${input.key} updated.`);
      } else {
        const { error } = await supabase
          .from("application_variables")
          .insert({ ...input, application_id: applicationId, created_by: user!.id });
        if (error) throw error;
        await logAppEvent(applicationId, "variable_created", `${input.key} created.`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.variables(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Variable saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVariable(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_variables").delete().eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "variable_deleted", "A variable was deleted.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.variables(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Variable deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Versions store                                                      */
/* ------------------------------------------------------------------ */

export function useAppVersions(applicationId: string) {
  return useQuery({
    queryKey: appKeys.versions(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_versions")
        .select("*")
        .eq("application_id", applicationId)
        .order("released_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationVersion[];
    },
  });
}

export function useSaveVersion(applicationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"application_versions"> & { id?: string }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("application_versions").update(patch).eq("id", id);
        if (error) throw error;
        await logAppEvent(applicationId, "version_updated", `${input.version} updated.`);
      } else {
        const { error } = await supabase
          .from("application_versions")
          .insert({ ...input, application_id: applicationId, created_by: user!.id });
        if (error) throw error;
        await logAppEvent(applicationId, "version_created", `${input.version} published.`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.versions(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Version saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetCurrentVersion(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      version,
      field,
    }: {
      versionId: string;
      version: string;
      field: "is_current" | "is_minimum";
    }) => {
      const clearPatch: Update<"application_versions"> =
        field === "is_current" ? { is_current: false } : { is_minimum: false };
      const setPatch: Update<"application_versions"> =
        field === "is_current" ? { is_current: true } : { is_minimum: true };
      const clear = await supabase
        .from("application_versions")
        .update(clearPatch)
        .eq("application_id", applicationId);
      if (clear.error) throw clear.error;
      const set = await supabase
        .from("application_versions")
        .update(setPatch)
        .eq("id", versionId);
      if (set.error) throw set.error;
      const app = await supabase
        .from("applications")
        .update(
          field === "is_current" ? { current_version: version } : { minimum_version: version },
        )
        .eq("id", applicationId);
      if (app.error) throw app.error;
      await logAppEvent(applicationId, "version_updated", `${version} set as ${field === "is_current" ? "current" : "minimum supported"}.`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.versions(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.detail(applicationId) });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Version updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVersion(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_versions").delete().eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "version_deleted", "A version was removed.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.versions(applicationId) });
      toast.success("Version removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Downloads store                                                     */
/* ------------------------------------------------------------------ */

export function useAppDownloads(applicationId: string) {
  return useQuery({
    queryKey: appKeys.downloads(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_downloads")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationDownload[];
    },
  });
}

export function useSaveDownload(applicationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"application_downloads"> & { id?: string }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("application_downloads").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("application_downloads")
          .insert({ ...input, application_id: applicationId, created_by: user!.id });
        if (error) throw error;
        await logAppEvent(applicationId, "download_created", `${input.name} added.`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.downloads(applicationId) });
      qc.invalidateQueries({ queryKey: appKeys.audit(applicationId) });
      toast.success("Download saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDownload(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_downloads").delete().eq("id", id);
      if (error) throw error;
      await logAppEvent(applicationId, "download_deleted", "A download was removed.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appKeys.downloads(applicationId) });
      toast.success("Download removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Audit store                                                         */
/* ------------------------------------------------------------------ */

export function useAppAudit(applicationId: string, limit = 50) {
  return useQuery({
    queryKey: [...appKeys.audit(applicationId), limit],
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_audit_logs")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ApplicationAuditLog[];
    },
  });
}
