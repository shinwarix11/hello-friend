import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, LogOut, Search, ShieldCheck, Trash2, Users } from "lucide-react";

import { DataTable, UserStatusPill } from "@/components/app/licenses/parts";
import { EmptyState, RowSkeleton, SectionCard } from "@/components/app/applications/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyAppRole } from "@/hooks/useApplications";
import {
  useAppUserSessions,
  useAppUsers,
  useDeleteAppUser,
  useRevokeSession,
  useUpdateAppUser,
} from "@/hooks/useLicenses";
import { atLeast, formatRelative } from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId/users")({
  component: AppUsersPage,
});

function AppUsersPage() {
  const { appId } = Route.useParams();
  const { data: users, isLoading } = useAppUsers(appId);
  const { data: sessions } = useAppUserSessions(appId);
  const { data: role } = useMyAppRole(appId);
  const update = useUpdateAppUser();
  const remove = useDeleteAppUser();
  const revoke = useRevokeSession();

  const canWrite = atLeast(role, "developer");
  const canDelete = atLeast(role, "administrator");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.hwid ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const activeSessions = (sessions ?? []).filter(
    (s) => s.is_active && new Date(s.expires_at).getTime() > Date.now(),
  );
  const usernameById = new Map((users ?? []).map((u) => [u.id, u.username]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name, email or hardware id…"
            className="pl-9"
          />
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          {activeSessions.length} active session{activeSessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <RowSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={users?.length ? "No users match your search" : "No application users yet"}
          description="Users appear here as soon as your SDK calls the register or login endpoints."
        />
      ) : (
        <DataTable head={["User", "Status", "Hardware id", "Logins", "Last login", "Last IP", ""]}>
          {rows.map((user) => (
            <tr key={user.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email ?? "no email"}</p>
              </td>
              <td className="px-4 py-3">
                <UserStatusPill status={user.status} />
              </td>
              <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                {user.hwid ?? "—"}
              </td>
              <td className="px-4 py-3 font-mono text-xs tabular-nums">{user.login_count}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatRelative(user.last_login_at)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {user.last_ip ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {canWrite ? (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Reset hardware id"
                      onClick={() =>
                        update.mutate({ applicationId: appId, id: user.id, patch: { hwid: null } })
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={user.status === "banned" ? "Unban" : "Ban"}
                      onClick={() =>
                        update.mutate({
                          applicationId: appId,
                          id: user.id,
                          patch: { status: user.status === "banned" ? "active" : "banned" },
                        })
                      }
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        title="Delete user"
                        onClick={() => remove.mutate({ applicationId: appId, id: user.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <SectionCard
        title="Sessions"
        description="Live sessions issued through the authentication API."
      >
        {activeSessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {activeSessions.slice(0, 20).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-xs">
                <span className="font-medium">{usernameById.get(s.app_user_id) ?? "unknown"}</span>
                <span className="font-mono text-muted-foreground">{s.ip_address ?? "—"}</span>
                <span className="text-muted-foreground">seen {formatRelative(s.last_seen_at)}</span>
                <span className="ml-auto text-muted-foreground">
                  expires {formatRelative(s.expires_at)}
                </span>
                {canWrite ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revoke.mutate({ applicationId: appId, id: s.id })}
                  >
                    <LogOut className="mr-1.5 h-3.5 w-3.5" /> Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
