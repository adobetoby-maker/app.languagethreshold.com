import type { OwnerUserAction, OwnerUserResult } from "./owner-users";
import { PASSWORD_DESTINATION, verifiedPasswordLink } from "./owner-users";
import {
  audit,
  requireCurrentTeamRequest,
  sendTeamEmail,
  TeamOperationError,
  type TeamDb,
} from "./team-server";

export function ownerEmailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.TEAM_FROM_EMAIL);
}
export async function manageOwnerUser(
  db: TeamDb,
  actorId: string,
  body: OwnerUserAction,
): Promise<OwnerUserResult> {
  requireCurrentTeamRequest(db);
  if (body.action === "free_access") {
    const { error } = await db.rpc("platform_grant_user", {
      p_actor: actorId,
      p_user: body.userId,
      p_until: body.until,
      p_reason: body.reason,
    });
    if (error) throw error;
    return {
      userId: body.userId,
      notice:
        "Free access saved. No payment or renewal was created. Existing paid subscriptions are unchanged.",
    };
  }
  if (body.action === "password_invite" && body.delivery === "email" && !ownerEmailReady())
    throw new TeamOperationError(
      "Direct email is not configured. Use Create private link to send the link yourself.",
      503,
    );
  const claimed =
    body.action === "password_invite"
      ? await db.rpc("platform_claim_password_invite", {
          p_actor: actorId,
          p_user: body.userId,
          p_request: body.requestId,
        })
      : await db
          .from("platform_owner_operations")
          .insert({ id: body.requestId, actor_id: actorId, action: body.action })
          .select("id")
          .single();
  if (claimed.error || !claimed.data)
    throw new TeamOperationError(
      "An invitation may already have run recently. Wait one minute, refresh and check with the recipient before sending again.",
    );
  requireCurrentTeamRequest(db);
  let userId: string;
  if (body.action === "add_tester") {
    const found = await db.rpc("platform_find_user", { p_email: body.email });
    if (found.error) throw found.error;
    // Existing users are never overwritten or silently changed by Add tester.
    if (found.data)
      throw new TeamOperationError(
        "That email already has an account. Search for it to grant access or send a password link.",
      );
    const created = await db.auth.admin.createUser({
      email: body.email,
      email_confirm: false,
      user_metadata: { display_name: body.name },
    });
    if (created.error || !created.data.user)
      throw new TeamOperationError(
        "The account could not be confirmed. Refresh and search for the email before retrying.",
        503,
      );
    userId = created.data.user.id;
    await db
      .from("platform_owner_operations")
      .update({ target_user_id: userId, status: "account_created" })
      .eq("id", body.requestId);
    requireCurrentTeamRequest(db);
    const grant = await db.rpc("platform_grant_user", {
      p_actor: actorId,
      p_user: userId,
      p_until: body.until,
      p_reason: body.reason,
    });
    if (grant.error)
      return {
        userId,
        notice:
          "Account created, but free access could not be confirmed. Search for this account and use Grant free access before inviting it.",
      };
    await audit(db, actorId, "user.tester_added", undefined, { userId });
    return {
      userId,
      notice:
        "Tester account created with free access. Select it below to send a password invitation or create a private link.",
    };
  }
  userId = body.userId;
  const account = await db.auth.admin.getUserById(userId);
  requireCurrentTeamRequest(db);
  if (account.error || !account.data.user?.email || account.data.user.id !== userId)
    throw new TeamOperationError(
      "The selected account could not be confirmed. Refresh before retrying.",
      503,
    );
  const user = account.data.user;
  const generated = await db.auth.admin.generateLink({
    type: user.email_confirmed_at ? "recovery" : "invite",
    email: user.email!,
    options: { redirectTo: PASSWORD_DESTINATION },
  });
  requireCurrentTeamRequest(db);
  if (
    generated.error ||
    generated.data.user?.id !== userId ||
    !generated.data.properties?.action_link
  )
    throw new TeamOperationError(
      "Password link creation could not be confirmed. Refresh before retrying.",
      503,
    );
  const link = verifiedPasswordLink(
    generated.data.properties.action_link,
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  );
  await db
    .from("platform_owner_operations")
    .update({ status: "link_created" })
    .eq("id", body.requestId);
  if (body.delivery === "email") {
    try {
      await sendTeamEmail(
        user.email!,
        "Create your Language Threshold password",
        `You have been invited to Language Threshold. Create or reset your password using this private, time-limited link:\n\n${link}\n\nDo not forward this link. If you did not request it, you can ignore this email.\n\nLanguage Threshold`,
      );
    } catch {
      await db
        .from("platform_owner_operations")
        .update({ status: "delivery_unconfirmed" })
        .eq("id", body.requestId);
      return {
        userId,
        notice:
          "Email delivery could not be confirmed. It may have been accepted. Check with the recipient before sending again.",
      };
    }
    await db.from("platform_owner_operations").update({ status: "sent" }).eq("id", body.requestId);
    await audit(db, actorId, "user.password_email_sent", undefined, { userId });
    return {
      userId,
      notice: `Password invitation sent to ${user.email}. Provider acceptance does not confirm inbox delivery.`,
    };
  }
  await audit(db, actorId, "user.password_link_created", undefined, { userId });
  return {
    userId,
    link,
    notice:
      "Private password link created. Send it only to this account's email address. It expires and is never saved in this dashboard.",
  };
}
