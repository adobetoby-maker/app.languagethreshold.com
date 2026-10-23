// Server-only: platform-owner management of any company's team. The caller has already run
// requirePlatformOwner. Each mutation is audited with organization_id and detail.
import { MODULES } from "@/data/modules";
import {
  assignTeamModule,
  INVITATION_EMAIL_WARNING,
  resendTeamInvitation,
  revokeTeamInvitation,
} from "@/lib/team-actions-server";
import {
  confirmMatches,
  type OwnerTeamAction,
  type OwnerTeamDetail,
  type OwnerTeamResult,
} from "./owner-teams";
import {
  audit,
  requireCurrentTeamRequest,
  TeamOperationError,
  type TeamDb,
} from "@/lib/team-server";
import { requireNotPlatformStaff } from "./owner-guards-server";

const MAX_MEMBERS = 500;
const MAX_EMAIL_LOOKUPS = 100;

type Org = {
  id: string;
  name: string;
  billing_email: string;
  owner_user_id: string;
  created_at: string;
};
type Member = OwnerTeamDetail["members"][number];

async function readOrg(db: TeamDb, orgId: string): Promise<Org> {
  const { data, error } = await db
    .from("team_organizations")
    .select("id,name,billing_email,owner_user_id,created_at")
    .eq("id", orgId)
    .maybeSingle();
  requireCurrentTeamRequest(db);
  if (error) throw error;
  if (!data) throw new TeamOperationError("Company not found.");
  return data as Org;
}

async function isComplimentary(db: TeamDb, orgId: string) {
  const { data, error } = await db
    .from("platform_user_grants")
    .select("user_id")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function withEmails(db: TeamDb, members: Omit<Member, "email">[]): Promise<Member[]> {
  const lookups = [...members]
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "active" ? -1 : 1))
    .slice(0, MAX_EMAIL_LOOKUPS)
    .map((m) => m.user_id);
  const emails = new Map<string, string | null>();
  for (let i = 0; i < lookups.length; i += 5) {
    await Promise.all(
      lookups.slice(i, i + 5).map(async (userId) => {
        const { data } = await db.auth.admin.getUserById(userId);
        emails.set(userId, data?.user?.id === userId ? (data.user.email ?? null) : null);
      }),
    );
    requireCurrentTeamRequest(db);
  }
  return members.map((m) => ({ ...m, email: emails.get(m.user_id) ?? null }));
}

export async function readOwnerTeam(
  db: TeamDb,
  actorId: string,
  orgId: string,
): Promise<OwnerTeamDetail> {
  const org = await readOrg(db, orgId);
  const [entitlement, members, invitations, assignments, complimentary] = await Promise.all([
    db
      .from("team_entitlements")
      .select("seat_limit,term,status,period_end,stripe_subscription_id")
      .eq("organization_id", orgId)
      .maybeSingle(),
    db
      .from("team_members")
      .select("id,user_id,display_name,role,status,joined_at")
      .eq("organization_id", orgId)
      .order("joined_at")
      .limit(MAX_MEMBERS),
    db
      .from("team_invitations")
      .select(
        "id,email,display_name,role,module_id,require_certificate,status,expires_at,sent_at,last_email_error",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("team_assignments")
      .select("id,user_id,module_id,require_certificate,due_at,assigned_at")
      .eq("organization_id", orgId)
      .limit(2000),
    isComplimentary(db, orgId),
  ]);
  for (const result of [entitlement, members, invitations, assignments])
    if (result.error) throw result.error;
  requireCurrentTeamRequest(db);
  const e = entitlement.data as {
    seat_limit: number;
    term: string | null;
    status: string;
    period_end: string | null;
    stripe_subscription_id: string | null;
  } | null;
  const detail: OwnerTeamDetail = {
    organization: org,
    entitlement: e
      ? {
          seat_limit: e.seat_limit,
          term: e.term,
          status: e.status,
          period_end: e.period_end,
          stripeManaged: !!e.stripe_subscription_id,
        }
      : null,
    complimentary,
    members: await withEmails(db, (members.data ?? []) as Omit<Member, "email">[]),
    invitations: ((invitations.data ?? []) as OwnerTeamDetail["invitations"]).map((invitation) => ({
      ...invitation,
      // Old records may hold provider diagnostics; only the fixed warning leaves the server.
      last_email_error:
        invitation.last_email_error == null || invitation.last_email_error === ""
          ? null
          : INVITATION_EMAIL_WARNING,
    })),
    assignments: (assignments.data ?? []) as OwnerTeamDetail["assignments"],
    modules: MODULES.map((m) => ({ id: m.id, name: m.name })),
    emailEnabled: Boolean(process.env.RESEND_API_KEY && process.env.TEAM_FROM_EMAIL),
  };
  await audit(db, actorId, "owner_team.view", orgId);
  return detail;
}

async function readMember(db: TeamDb, orgId: string, memberId: string) {
  const { data, error } = await db
    .from("team_members")
    .select("id,user_id,display_name,role,status")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .maybeSingle();
  requireCurrentTeamRequest(db);
  if (error) throw error;
  if (!data) throw new TeamOperationError("Member not found in this company.");
  return data as {
    id: string;
    user_id: string;
    display_name: string;
    role: Member["role"];
    status: string;
  };
}

async function activeOwnerCount(db: TeamDb, orgId: string) {
  const { count, error } = await db
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("role", "owner")
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

/** Same rule as team_reserve_invitation: active learners + live pending learner invites < seats. */
async function requireLearnerSeat(db: TeamDb, orgId: string) {
  const [entitlement, learners, pending] = await Promise.all([
    db
      .from("team_entitlements")
      .select("seat_limit,status,period_end")
      .eq("organization_id", orgId)
      .maybeSingle(),
    db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "learner")
      .eq("status", "active"),
    db
      .from("team_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "learner")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);
  for (const result of [entitlement, learners, pending]) if (result.error) throw result.error;
  const e = entitlement.data as {
    seat_limit: number;
    status: string;
    period_end: string | null;
  } | null;
  const live =
    !!e &&
    (e.status === "active" ||
      (e.status === "manual" && !!e.period_end && Date.parse(e.period_end) > Date.now()));
  if (!live) throw new TeamOperationError("An active team plan is required for a learner seat.");
  if ((learners.count ?? 0) + (pending.count ?? 0) >= e.seat_limit)
    throw new TeamOperationError("No learner seats are available. Add seats first.");
}

export async function manageOwnerTeam(
  db: TeamDb,
  actorId: string,
  body: OwnerTeamAction,
  origin: string,
): Promise<OwnerTeamResult> {
  requireCurrentTeamRequest(db);
  const org = await readOrg(db, body.orgId);
  if (await isComplimentary(db, body.orgId))
    throw new TeamOperationError(
      "This is a complimentary-access workspace. Manage it from the Users tab (Free access).",
    );
  requireCurrentTeamRequest(db);
  if (body.action === "resend_invite") {
    const { inviteUrl, warning } = await resendTeamInvitation(db, {
      orgId: org.id,
      invitationId: body.invitationId,
      delivery: body.delivery,
      orgName: org.name,
      origin,
    });
    await audit(db, actorId, "owner_team.invite_resent", org.id, {
      invitationId: body.invitationId,
      delivery: body.delivery,
    });
    return {
      notice:
        body.delivery === "email" && !warning
          ? "Invitation email sent again."
          : "New invitation link created.",
      inviteUrl,
      warning,
    };
  }
  if (body.action === "revoke_invite") {
    await revokeTeamInvitation(db, org.id, body.invitationId);
    await audit(db, actorId, "owner_team.invite_revoked", org.id, {
      invitationId: body.invitationId,
    });
    return { notice: "Invitation revoked." };
  }
  if (body.action === "assign") {
    const { warning, userId } = await assignTeamModule(db, {
      orgId: org.id,
      memberId: body.memberId,
      moduleId: body.moduleId,
      requireCertificate: body.requireCertificate,
      dueAt: body.dueAt,
      orgName: org.name,
      origin,
    });
    await audit(db, actorId, "owner_team.assigned", org.id, {
      memberId: body.memberId,
      userId,
      moduleId: body.moduleId,
      requireCertificate: body.requireCertificate,
    });
    return { notice: "Module assigned.", warning };
  }
  const member = await readMember(db, org.id, body.memberId);
  // Same protection as the Users tab: platform owner/support accounts are not changed here.
  const account = await db.auth.admin.getUserById(member.user_id);
  requireCurrentTeamRequest(db);
  if (account.error || account.data?.user?.id !== member.user_id)
    throw new TeamOperationError(
      "The member's account could not be confirmed. Refresh before retrying.",
      503,
    );
  await requireNotPlatformStaff(db, member.user_id, account.data.user.email);
  requireCurrentTeamRequest(db);
  if (body.action === "change_role") {
    if (member.status !== "active")
      throw new TeamOperationError("Only active members can change role.");
    if (member.role === body.role)
      return { notice: `${member.display_name} is already ${body.role}.` };
    if (member.user_id === org.owner_user_id)
      throw new TeamOperationError(
        "Transfer company ownership before changing the account owner's role.",
      );
    if (member.role === "owner" && (await activeOwnerCount(db, org.id)) <= 1)
      throw new TeamOperationError("A company needs at least one owner.");
    if (body.role === "learner") await requireLearnerSeat(db, org.id);
    requireCurrentTeamRequest(db);
    const { error } = await db
      .from("team_members")
      .update({ role: body.role })
      .eq("id", member.id)
      .eq("organization_id", org.id);
    if (error) throw error;
    await audit(db, actorId, "owner_team.role_changed", org.id, {
      memberId: member.id,
      userId: member.user_id,
      from: member.role,
      to: body.role,
    });
    return { notice: `${member.display_name} is now ${body.role}.` };
  }
  if (body.action === "remove_member") {
    if (!confirmMatches(body.confirmName, member.display_name))
      throw new TeamOperationError("Type the member's name exactly to confirm removal.");
    if (member.status !== "active") return { notice: `${member.display_name} is already removed.` };
    if (member.user_id === org.owner_user_id)
      throw new TeamOperationError("Transfer company ownership before removing the account owner.");
    if (member.role === "owner" && (await activeOwnerCount(db, org.id)) <= 1)
      throw new TeamOperationError("A company needs at least one owner.");
    requireCurrentTeamRequest(db);
    const { error } = await db
      .from("team_members")
      .update({ status: "inactive" })
      .eq("id", member.id)
      .eq("organization_id", org.id);
    if (error) throw error;
    await audit(db, actorId, "owner_team.member_removed", org.id, {
      memberId: member.id,
      userId: member.user_id,
      role: member.role,
    });
    return { notice: `${member.display_name} was removed from ${org.name}.` };
  }
  // transfer_ownership
  if (!confirmMatches(body.confirmName, org.name))
    throw new TeamOperationError("Type the company name exactly to confirm the transfer.");
  if (member.status !== "active") throw new TeamOperationError("Choose an active member.");
  if (member.user_id === org.owner_user_id)
    return { notice: `${member.display_name} already owns ${org.name}.` };
  // The current account owner is demoted to admin below, so it gets the same staff protection.
  // (change_role and remove_member already refuse the account owner outright.)
  const current = await db.auth.admin.getUserById(org.owner_user_id);
  requireCurrentTeamRequest(db);
  if (current.error || current.data?.user?.id !== org.owner_user_id)
    throw new TeamOperationError(
      "The current owner's account could not be confirmed. Refresh before retrying.",
      503,
    );
  await requireNotPlatformStaff(db, org.owner_user_id, current.data.user.email);
  requireCurrentTeamRequest(db);
  // Promote first, then move the pointer, then demote: a partial failure leaves two owners, never none.
  const promoted = await db
    .from("team_members")
    .update({ role: "owner" })
    .eq("id", member.id)
    .eq("organization_id", org.id);
  if (promoted.error) throw promoted.error;
  const moved = await db
    .from("team_organizations")
    .update({ owner_user_id: member.user_id })
    .eq("id", org.id);
  if (moved.error) throw moved.error;
  const demoted = await db
    .from("team_members")
    .update({ role: "admin" })
    .eq("organization_id", org.id)
    .eq("user_id", org.owner_user_id)
    .eq("role", "owner");
  await audit(db, actorId, "owner_team.ownership_transferred", org.id, {
    fromUserId: org.owner_user_id,
    toUserId: member.user_id,
    memberId: member.id,
    previousOwnerDemoted: !demoted.error,
  });
  return {
    notice: `${member.display_name} now owns ${org.name}. The previous owner is an admin.${demoted.error ? " The previous owner's role could not be confirmed; refresh to check." : ""}`,
  };
}
