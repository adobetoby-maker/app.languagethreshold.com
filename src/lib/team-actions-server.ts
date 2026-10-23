// Shared company-team actions used by /api/team (company admins) and /api/owner-teams (platform
// owner). Callers authorize and audit; these helpers only validate and perform the write.
// Imports use the "@/lib/team-server" specifier so route tests can substitute the transport.
import { getModule } from "@/data/modules";
import { inviteToken, sendTeamEmail, TeamOperationError, type TeamDb } from "@/lib/team-server";

// Delivery can succeed before bookkeeping fails, so an email error is an unknown outcome.
export const INVITATION_EMAIL_WARNING =
  "Invitation saved. Email delivery could not be confirmed. Share the invitation link or check your workspace before retrying.";
export const ASSIGNMENT_EMAIL_WARNING =
  "Assignment saved. Email delivery could not be confirmed. Check your workspace before retrying.";

export async function sendInvitation(
  to: string,
  name: string,
  company: string,
  module: string | null,
  certificate: boolean,
  token: string,
  origin: string,
) {
  const link = `${origin}/team/accept?token=${encodeURIComponent(token)}`;
  await sendTeamEmail(
    to,
    `${company} invited you to Language Threshold`,
    `Hello ${name},\n\n${company} invited you to learn with Language Threshold. Your seat includes every published module.${module ? ` Your first focus is ${getModule(module)?.name ?? module}.` : ""}${certificate ? " Your assignment includes a completion certificate goal: finish the required lessons and pass the reviewed final test at 80% or higher." : ""}\n\nAccept your invitation: ${link}\n\nThe link expires in seven days. Your company admin can see practice time and module progress, but not your private AI conversations.\n\nLanguage Threshold`,
  );
}

/** Module must exist; a certificate goal is only offered where a reviewed final test exists. */
export function validateModuleAssignment(moduleId: string | null, requireCertificate: boolean) {
  if (moduleId && !getModule(moduleId)) throw new TeamOperationError("Unknown module.");
  if (requireCertificate && moduleId !== "roofing")
    throw new TeamOperationError("A reviewed final test is not yet available for this module.");
}

/** Rotates the token of a pending invitation and optionally emails it. */
export async function resendTeamInvitation(
  db: TeamDb,
  input: {
    orgId: string;
    invitationId: string;
    delivery: "manual" | "email";
    orgName: string;
    origin: string;
  },
) {
  const { data: invite, error } = await db
    .from("team_invitations")
    .select("email,display_name,module_id,require_certificate,status")
    .eq("id", input.invitationId)
    .eq("organization_id", input.orgId)
    .single();
  if (error || !invite || invite.status !== "pending")
    throw new TeamOperationError("Pending invitation not found.");
  const { token, hash } = inviteToken();
  const { error: updateError } = await db
    .from("team_invitations")
    .update({
      token_hash: hash,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      last_email_error: null,
    })
    .eq("id", input.invitationId);
  if (updateError) throw updateError;
  const inviteUrl = `${input.origin}/team/accept?token=${encodeURIComponent(token)}`;
  let warning: string | null = null;
  if (input.delivery === "email") {
    try {
      await sendInvitation(
        invite.email,
        invite.display_name,
        input.orgName,
        invite.module_id,
        invite.require_certificate,
        token,
        input.origin,
      );
      await db
        .from("team_invitations")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", input.invitationId);
    } catch {
      warning = INVITATION_EMAIL_WARNING;
      await db
        .from("team_invitations")
        .update({ last_email_error: warning })
        .eq("id", input.invitationId);
    }
  }
  return { inviteUrl: input.delivery === "manual" || warning ? inviteUrl : null, warning };
}

/** Revokes a pending invitation of this organization only. */
export async function revokeTeamInvitation(db: TeamDb, orgId: string, invitationId: string) {
  const { error } = await db
    .from("team_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", orgId)
    .eq("status", "pending");
  if (error) throw error;
}

/** Assigns a module to an active member of this organization and emails the learner. */
export async function assignTeamModule(
  db: TeamDb,
  input: {
    orgId: string;
    memberId: string;
    moduleId: string;
    requireCertificate: boolean;
    dueAt?: string | null;
    orgName: string;
    origin: string;
  },
) {
  if (!getModule(input.moduleId)) throw new TeamOperationError("Unknown module.");
  validateModuleAssignment(input.moduleId, input.requireCertificate);
  const { data: target, error } = await db
    .from("team_members")
    .select("user_id,display_name,role,status")
    .eq("id", input.memberId)
    .eq("organization_id", input.orgId)
    .single();
  if (error || !target || target.status !== "active")
    throw new TeamOperationError("Active employee not found.");
  const { error: upsertError } = await db.from("team_assignments").upsert(
    {
      organization_id: input.orgId,
      user_id: target.user_id,
      module_id: input.moduleId,
      require_certificate: input.requireCertificate,
      due_at: input.dueAt ?? null,
    },
    { onConflict: "organization_id,user_id,module_id" },
  );
  if (upsertError) throw upsertError;
  let warning: string | null = null;
  const { data: account } = await db.auth.admin.getUserById(target.user_id);
  if (account.user?.email) {
    try {
      await sendTeamEmail(
        account.user.email,
        `${input.orgName} assigned ${getModule(input.moduleId)?.name}`,
        `Hello ${target.display_name},\n\n${input.orgName} assigned ${getModule(input.moduleId)?.name} as a focus in Language Threshold. Your seat includes every published module.${input.requireCertificate ? " Complete the required lessons and pass the reviewed final test at 80% or higher to earn your module completion certificate." : ""}\n\nOpen your team workspace: ${input.origin}/team\n\nLanguage Threshold`,
      );
    } catch {
      warning = ASSIGNMENT_EMAIL_WARNING;
    }
  }
  return { warning, userId: target.user_id as string };
}
