import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getModule } from "@/data/modules";
import {
  audit,
  authenticatedUser,
  hashInviteToken,
  inviteToken,
  json,
  memberRole,
  requireTeamAdmin,
  sendTeamEmail,
  teamAdminClient,
  teamBillingReady,
  teamError,
} from "@/lib/team-server";

const id = z.string().uuid();
const email = z.string().email().max(254);
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(2).max(120),
    billingEmail: email,
  }),
  z.object({
    action: z.literal("invite"),
    orgId: id,
    name: z.string().trim().min(2).max(120),
    email,
    role: z.enum(["admin", "learner"]).default("learner"),
    moduleId: z.string().max(80).nullable().default("roofing"),
    requireCertificate: z.boolean().default(false),
    delivery: z.enum(["manual", "email"]).default("manual"),
  }),
  z.object({ action: z.literal("accept"), token: z.string().min(20).max(100) }),
  z.object({
    action: z.literal("resend"),
    orgId: id,
    invitationId: id,
    delivery: z.enum(["manual", "email"]).default("manual"),
  }),
  z.object({
    action: z.literal("revoke"),
    orgId: id,
    invitationId: id.optional(),
    memberId: id.optional(),
  }),
  z.object({
    action: z.literal("assign"),
    orgId: id,
    memberId: id,
    moduleId: z.string().min(1).max(80),
    requireCertificate: z.boolean(),
    dueAt: z.string().datetime().nullable().optional(),
  }),
  z.object({ action: z.literal("onboarding"), orgId: id, step: z.number().int().min(1).max(6) }),
  z.object({ action: z.literal("email_summary"), orgId: id }),
]);

async function sendInvitation(
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

export const Route = createFileRoute("/api/team")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          const orgId = new URL(request.url).searchParams.get("org");
          if (!orgId) {
            const { data, error } = await db
              .from("team_members")
              .select(
                "organization_id,role,status,team_organizations(id,name,billing_email,onboarding_step,created_at)",
              )
              .eq("user_id", user.id)
              .eq("status", "active");
            if (error) throw error;
            return json({ organizations: data ?? [] });
          }
          id.parse(orgId);
          const member = await memberRole(db, orgId, user.id);
          if (!member) throw new Error("Team access required.");
          const isAdmin = member.role === "owner" || member.role === "admin";
          const [
            org,
            entitlement,
            members,
            invitations,
            assignments,
            activity,
            activity7,
            lessons,
            attempts,
            certificates,
          ] = await Promise.all([
            db
              .from("team_organizations")
              .select("id,name,billing_email,onboarding_step,created_at")
              .eq("id", orgId)
              .single(),
            db
              .from("team_entitlements")
              .select("seat_limit,term,status,period_end")
              .eq("organization_id", orgId)
              .single(),
            isAdmin
              ? db
                  .from("team_members")
                  .select("id,user_id,display_name,role,status,joined_at")
                  .eq("organization_id", orgId)
              : db
                  .from("team_members")
                  .select("id,user_id,display_name,role,status,joined_at")
                  .eq("organization_id", orgId)
                  .eq("user_id", user.id),
            isAdmin
              ? db
                  .from("team_invitations")
                  .select(
                    "id,email,display_name,role,module_id,require_certificate,status,expires_at,sent_at,last_email_error",
                  )
                  .eq("organization_id", orgId)
                  .order("created_at", { ascending: false })
              : Promise.resolve({ data: [], error: null }),
            isAdmin
              ? db
                  .from("team_assignments")
                  .select("id,user_id,module_id,require_certificate,due_at,assigned_at")
                  .eq("organization_id", orgId)
              : db
                  .from("team_assignments")
                  .select("id,user_id,module_id,require_certificate,due_at,assigned_at")
                  .eq("organization_id", orgId)
                  .eq("user_id", user.id),
            db.rpc("team_usage_summary", {
              p_org: orgId,
              p_since: new Date(Date.now() - 30 * 86400000).toISOString(),
              p_user: isAdmin ? null : user.id,
            }),
            db.rpc("team_usage_summary", {
              p_org: orgId,
              p_since: new Date(Date.now() - 7 * 86400000).toISOString(),
              p_user: isAdmin ? null : user.id,
            }),
            isAdmin
              ? db
                  .from("team_lesson_completions")
                  .select("user_id,module_id,lesson_number,completed_at")
                  .eq("organization_id", orgId)
              : db
                  .from("team_lesson_completions")
                  .select("user_id,module_id,lesson_number,completed_at")
                  .eq("organization_id", orgId)
                  .eq("user_id", user.id),
            isAdmin
              ? db
                  .from("team_assessment_attempts")
                  .select("id,user_id,module_id,score,total,started_at,submitted_at")
                  .eq("organization_id", orgId)
                  .not("submitted_at", "is", null)
              : db
                  .from("team_assessment_attempts")
                  .select("id,user_id,module_id,score,total,started_at,submitted_at")
                  .eq("organization_id", orgId)
                  .eq("user_id", user.id)
                  .not("submitted_at", "is", null),
            isAdmin
              ? db
                  .from("team_certificates")
                  .select("id,user_id,learner_name,module_id,score,lesson_count,status,issued_at")
                  .eq("organization_id", orgId)
              : db
                  .from("team_certificates")
                  .select("id,user_id,learner_name,module_id,score,lesson_count,status,issued_at")
                  .eq("organization_id", orgId)
                  .eq("user_id", user.id),
          ]);
          for (const result of [
            org,
            entitlement,
            members,
            invitations,
            assignments,
            activity,
            activity7,
            lessons,
            attempts,
            certificates,
          ])
            if (result.error) throw result.error;
          return json({
            organization: org.data,
            entitlement: entitlement.data,
            enrollmentEnabled: teamBillingReady(),
            emailEnabled: Boolean(process.env.RESEND_API_KEY && process.env.TEAM_FROM_EMAIL),
            role: member.role,
            members: members.data ?? [],
            invitations: invitations.data ?? [],
            assignments: assignments.data ?? [],
            activity: activity.data ?? [],
            activity7: activity7.data ?? [],
            lessons: lessons.data ?? [],
            attempts: attempts.data ?? [],
            certificates: certificates.data ?? [],
          });
        } catch (error) {
          return teamError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          const body = bodySchema.parse(await request.json());
          if (body.action === "create") {
            const { data, error } = await db.rpc("team_create_organization", {
              p_owner: user.id,
              p_name: body.name,
              p_email: body.billingEmail,
            });
            if (error) throw error;
            await audit(db, user.id, "team.create", data);
            return json({ orgId: data });
          }
          if (body.action === "accept") {
            const { data, error } = await db.rpc("team_accept_invitation", {
              p_token_hash: hashInviteToken(body.token),
              p_user: user.id,
              p_email: user.email,
            });
            if (error) throw error;
            await audit(db, user.id, "team.accept", data);
            return json({ orgId: data });
          }
          await requireTeamAdmin(db, body.orgId, user.id);
          const { data: org, error: orgError } = await db
            .from("team_organizations")
            .select("name,billing_email")
            .eq("id", body.orgId)
            .single();
          if (orgError || !org) throw orgError ?? new Error("Company not found.");
          if (body.action === "invite") {
            if (body.moduleId && !getModule(body.moduleId)) throw new Error("Unknown module.");
            if (body.requireCertificate && body.moduleId !== "roofing")
              throw new Error("A reviewed final test is not yet available for this module.");
            const { token, hash } = inviteToken();
            const { data: invitationId, error } = await db.rpc("team_reserve_invitation", {
              p_org: body.orgId,
              p_email: body.email,
              p_name: body.name,
              p_role: body.role,
              p_module: body.moduleId,
              p_certificate: body.requireCertificate,
              p_token_hash: hash,
            });
            if (error) throw error;
            const inviteUrl = `${new URL(request.url).origin}/team/accept?token=${encodeURIComponent(token)}`;
            let warning: string | null = null;
            if (body.delivery === "email") {
              try {
                await sendInvitation(
                  body.email,
                  body.name,
                  org.name,
                  body.moduleId,
                  body.requireCertificate,
                  token,
                  new URL(request.url).origin,
                );
                await db
                  .from("team_invitations")
                  .update({ sent_at: new Date().toISOString(), last_email_error: null })
                  .eq("id", invitationId);
              } catch (cause) {
                warning = cause instanceof Error ? cause.message : "Email could not be sent.";
                await db
                  .from("team_invitations")
                  .update({ last_email_error: warning })
                  .eq("id", invitationId);
              }
            }
            await audit(db, user.id, "team.invite", body.orgId, {
              invitationId,
              email: body.email,
              delivery: body.delivery,
            });
            return json({
              invitationId,
              inviteUrl: body.delivery === "manual" || warning ? inviteUrl : null,
              warning,
            });
          }
          if (body.action === "resend") {
            const { data: invite, error } = await db
              .from("team_invitations")
              .select("email,display_name,module_id,require_certificate,status")
              .eq("id", body.invitationId)
              .eq("organization_id", body.orgId)
              .single();
            if (error || !invite || invite.status !== "pending")
              throw new Error("Pending invitation not found.");
            const { token, hash } = inviteToken();
            const { error: updateError } = await db
              .from("team_invitations")
              .update({
                token_hash: hash,
                expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                last_email_error: null,
              })
              .eq("id", body.invitationId);
            if (updateError) throw updateError;
            const inviteUrl = `${new URL(request.url).origin}/team/accept?token=${encodeURIComponent(token)}`;
            let warning: string | null = null;
            if (body.delivery === "email") {
              try {
                await sendInvitation(
                  invite.email,
                  invite.display_name,
                  org.name,
                  invite.module_id,
                  invite.require_certificate,
                  token,
                  new URL(request.url).origin,
                );
                await db
                  .from("team_invitations")
                  .update({ sent_at: new Date().toISOString() })
                  .eq("id", body.invitationId);
              } catch (cause) {
                warning = cause instanceof Error ? cause.message : "Email could not be sent.";
                await db
                  .from("team_invitations")
                  .update({ last_email_error: warning })
                  .eq("id", body.invitationId);
              }
            }
            await audit(db, user.id, "team.resend", body.orgId, {
              invitationId: body.invitationId,
              delivery: body.delivery,
            });
            return json({
              ok: true,
              inviteUrl: body.delivery === "manual" || warning ? inviteUrl : null,
              warning,
            });
          }
          if (body.action === "revoke") {
            if (body.invitationId) {
              const { error } = await db
                .from("team_invitations")
                .update({ status: "revoked" })
                .eq("id", body.invitationId)
                .eq("organization_id", body.orgId)
                .eq("status", "pending");
              if (error) throw error;
            } else if (body.memberId) {
              const { data: target, error } = await db
                .from("team_members")
                .select("role")
                .eq("id", body.memberId)
                .eq("organization_id", body.orgId)
                .single();
              if (error || !target || target.role === "owner")
                throw new Error("This member cannot be deactivated.");
              const { error: updateError } = await db
                .from("team_members")
                .update({ status: "inactive" })
                .eq("id", body.memberId);
              if (updateError) throw updateError;
            } else throw new Error("Choose a member or invitation.");
            await audit(db, user.id, "team.revoke", body.orgId, {
              invitationId: body.invitationId,
              memberId: body.memberId,
            });
            return json({ ok: true });
          }
          if (body.action === "assign") {
            if (!getModule(body.moduleId)) throw new Error("Unknown module.");
            if (body.requireCertificate && body.moduleId !== "roofing")
              throw new Error("A reviewed final test is not yet available for this module.");
            const { data: target, error } = await db
              .from("team_members")
              .select("user_id,display_name,role,status")
              .eq("id", body.memberId)
              .eq("organization_id", body.orgId)
              .single();
            if (error || !target || target.status !== "active")
              throw new Error("Active employee not found.");
            const { error: upsertError } = await db.from("team_assignments").upsert(
              {
                organization_id: body.orgId,
                user_id: target.user_id,
                module_id: body.moduleId,
                require_certificate: body.requireCertificate,
                due_at: body.dueAt ?? null,
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
                  `${org.name} assigned ${getModule(body.moduleId)?.name}`,
                  `Hello ${target.display_name},\n\n${org.name} assigned ${getModule(body.moduleId)?.name} as a focus in Language Threshold. Your seat includes every published module.${body.requireCertificate ? " Complete the required lessons and pass the reviewed final test at 80% or higher to earn your module completion certificate." : ""}\n\nOpen your team workspace: ${new URL(request.url).origin}/team\n\nLanguage Threshold`,
                );
              } catch (cause) {
                warning = cause instanceof Error ? cause.message : "Email could not be sent.";
              }
            }
            await audit(db, user.id, "team.assign", body.orgId, {
              memberId: body.memberId,
              moduleId: body.moduleId,
            });
            return json({ ok: true, warning });
          }
          if (body.action === "onboarding") {
            const { error } = await db
              .from("team_organizations")
              .update({ onboarding_step: body.step })
              .eq("id", body.orgId);
            if (error) throw error;
            return json({ ok: true });
          }
          if (body.action === "email_summary") {
            const [entitlement, members, assignments] = await Promise.all([
              db
                .from("team_entitlements")
                .select("seat_limit,status,term")
                .eq("organization_id", body.orgId)
                .single(),
              db.from("team_members").select("role,status").eq("organization_id", body.orgId),
              db
                .from("team_assignments")
                .select("module_id,require_certificate")
                .eq("organization_id", body.orgId),
            ]);
            if (entitlement.error || members.error || assignments.error)
              throw entitlement.error ?? members.error ?? assignments.error;
            const assigned =
              members.data?.filter((m) => m.role === "learner" && m.status === "active").length ??
              0;
            const modules = [
              ...new Set(
                assignments.data?.map((a) => getModule(a.module_id)?.name ?? a.module_id) ?? [],
              ),
            ];
            await sendTeamEmail(
              org.billing_email,
              `${org.name} team setup summary`,
              `Your Language Threshold team workspace is ready.\n\nPlan: ${entitlement.data?.term ?? "manual"}; status: ${entitlement.data?.status ?? "pending"}; seats: ${entitlement.data?.seat_limit ?? 0}; active learners: ${assigned}.\nAssigned modules: ${modules.join(", ") || "None yet"}.\n\nFor Roofing Foreman, the optional certificate requires all 30 lessons and at least 80% on a reviewed 25-question test.\n\nOpen your admin dashboard and walkthrough: ${new URL(request.url).origin}/team\n\nLanguage Threshold`,
            );
            await audit(db, user.id, "team.email_summary", body.orgId);
            return json({ ok: true });
          }
          return json({ error: "Unknown action." }, 400);
        } catch (error) {
          return teamError(error);
        }
      },
    },
  },
});
