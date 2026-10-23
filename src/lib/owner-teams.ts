// Platform-owner management of any company's team: request schema and client-safe shapes.
import { z } from "zod";

const id = z.string().uuid();
const confirmText = z.string().trim().min(1).max(160);
export const ownerTeamAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("change_role"),
    orgId: id,
    memberId: id,
    role: z.enum(["owner", "admin", "learner"]),
  }),
  z.object({ action: z.literal("remove_member"), orgId: id, memberId: id, confirmName: confirmText }),
  z.object({
    action: z.literal("resend_invite"),
    orgId: id,
    invitationId: id,
    delivery: z.enum(["manual", "email"]).default("manual"),
  }),
  z.object({ action: z.literal("revoke_invite"), orgId: id, invitationId: id }),
  z.object({
    action: z.literal("assign"),
    orgId: id,
    memberId: id,
    moduleId: z.string().min(1).max(80),
    requireCertificate: z.boolean(),
    dueAt: z.string().datetime().nullable().optional(),
  }),
  z.object({
    action: z.literal("transfer_ownership"),
    orgId: id,
    memberId: id,
    confirmName: confirmText,
  }),
]);
export type OwnerTeamAction = z.infer<typeof ownerTeamAction>;

export type OwnerTeamMember = {
  id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "admin" | "learner";
  status: "active" | "inactive";
  joined_at: string;
  email: string | null;
};
export type OwnerTeamInvitation = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  module_id: string | null;
  require_certificate: boolean;
  status: string;
  expires_at: string;
  sent_at: string | null;
  last_email_error: string | null;
};
export type OwnerTeamAssignment = {
  id: string;
  user_id: string;
  module_id: string;
  require_certificate: boolean;
  due_at: string | null;
  assigned_at: string;
};
export type OwnerTeamDetail = {
  organization: {
    id: string;
    name: string;
    billing_email: string;
    owner_user_id: string;
    created_at: string;
  };
  entitlement: {
    seat_limit: number;
    term: string | null;
    status: string;
    period_end: string | null;
    stripeManaged: boolean;
  } | null;
  complimentary: boolean;
  members: OwnerTeamMember[];
  invitations: OwnerTeamInvitation[];
  assignments: OwnerTeamAssignment[];
  modules: { id: string; name: string }[];
  emailEnabled: boolean;
};
export type OwnerTeamResult = { notice: string; inviteUrl?: string | null; warning?: string | null };

/** Type-to-confirm comparison: trimmed, case-insensitive, whitespace collapsed. */
export function confirmMatches(typed: string, expected: string) {
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(expected).length > 0 && norm(typed) === norm(expected);
}
