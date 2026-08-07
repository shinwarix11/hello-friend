import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Mail, MoreHorizontal, Trash2, UserPlus, Users } from "lucide-react";

import {
  EmptyState,
  RoleBadge,
  RowSkeleton,
  SectionCard,
} from "@/components/app/applications/parts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  useAppInvitations,
  useAppMembers,
  useInviteMember,
  useMyAppRole,
  useRemoveMember,
  useRevokeInvitation,
  useTransferOwnership,
  useUpdateMemberRole,
} from "@/hooks/useApplications";
import {
  ASSIGNABLE_ROLES,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  atLeast,
  formatRelative,
  type AppRole,
} from "@/lib/applications";

export const Route = createFileRoute("/_authenticated/applications/$appId/members")({
  component: MembersPage,
});

function MembersPage() {
  const { appId } = Route.useParams();
  const { user } = useAuth();
  const { data: role } = useMyAppRole(appId);
  const { data: members, isLoading } = useAppMembers(appId);
  const { data: invitations } = useAppInvitations(appId);
  const invite = useInviteMember(appId);
  const updateRole = useUpdateMemberRole(appId);
  const removeMember = useRemoveMember(appId);
  const revoke = useRevokeInvitation(appId);
  const transfer = useTransferOwnership(appId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("developer");
  const [emailError, setEmailError] = useState("");

  const canManage = atLeast(role, "administrator");
  const isOwner = role === "owner";
  const currentOwner = (members ?? []).find((m) => m.role === "owner");

  function submitInvite() {
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) || value.length > 255) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    invite.mutate(
      { email: value, role: inviteRole },
      {
        onSuccess: () => {
          setEmail("");
          setInviteOpen(false);
        },
      },
    );
  }

  const pending = (invitations ?? []).filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <SectionCard
        title="Team members"
        description="Control who can access this application and what they can do."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Invite
            </Button>
          ) : null
        }
      >
        {isLoading ? (
          <RowSkeleton rows={3} />
        ) : (members ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite teammates to collaborate on this application."
          />
        ) : (
          <ul className="divide-y divide-border">
            {(members ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-[11px]">
                    {(m.profile?.full_name ?? m.profile?.email ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.profile?.full_name ?? m.profile?.email ?? "Unknown user"}
                    {m.user_id === user?.id ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.profile?.email ?? "—"} · joined {formatRelative(m.created_at)}
                  </p>
                </div>
                <RoleBadge role={m.role} />
                {canManage && m.role !== "owner" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                        Change role
                      </DropdownMenuLabel>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onSelect={() => updateRole.mutate({ memberId: m.id, role: r })}
                        >
                          {ROLE_LABEL[r]}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      {isOwner && currentOwner ? (
                        <DropdownMenuItem
                          onSelect={() =>
                            transfer.mutate({
                              newOwnerMemberId: m.id,
                              newOwnerUserId: m.user_id,
                              currentOwnerMemberId: currentOwner.id,
                            })
                          }
                        >
                          <Crown className="mr-2 h-4 w-4" /> Transfer ownership
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => removeMember.mutate(m.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {pending.length ? (
        <SectionCard title="Pending invitations" description="Invitations awaiting acceptance.">
          <ul className="divide-y divide-border">
            {pending.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited {formatRelative(inv.created_at)}
                  </p>
                </div>
                <Badge variant="outline" className="border-border text-[10px] uppercase">
                  {ROLE_LABEL[inv.role]}
                </Badge>
                {canManage ? (
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(inv.id)}>
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title="Role permissions" description="What each role can do in this application.">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["owner", ...ASSIGNABLE_ROLES] as AppRole[]).map((r) => (
            <div key={r} className="rounded-lg border border-border bg-card/60 p-3">
              <p className="text-sm font-medium">{ROLE_LABEL[r]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_DESCRIPTION[r]}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They will gain access to this application once they accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                maxLength={255}
                placeholder="teammate@company.com"
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTION[inviteRole]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitInvite} disabled={invite.isPending}>
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
