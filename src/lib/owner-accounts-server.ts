// Server-only: platform-owner account controls (disable/enable, confirmation, email, name, CSV).
// The caller has already run requirePlatformOwner. Passwords are never read, shown or set here.
import type { User } from "@supabase/supabase-js";
import {
  CONFIRMATION_DESTINATION,
  type OwnerAccountAction,
  type OwnerUserResult,
} from "./owner-users";
import { filterDirectory, ownerUsersCsv } from "./owner-directory";
import { loadDirectoryUsers } from "./owner-directory-server";
import {
  audit,
  readPlatformRole,
  requireCurrentTeamRequest,
  TeamOperationError,
  type TeamDb,
} from "./team-server";

/** ~100 years. Supabase stores it as banned_until; "none" lifts it. */
export const DISABLE_BAN_DURATION = "876000h";

/** Refuses self-changes and any platform owner; returns the confirmed target account. */
export async function requireManageableAccount(
  db: TeamDb,
  actorId: string,
  userId: string,
): Promise<User> {
  if (userId === actorId)
    throw new TeamOperationError(
      "You cannot change your own account from the owner dashboard.",
      403,
    );
  const role = await readPlatformRole(db, userId);
  if (role?.role === "owner")
    throw new TeamOperationError(
      "Platform owner accounts are protected and cannot be changed here.",
      403,
    );
  const account = await db.auth.admin.getUserById(userId);
  requireCurrentTeamRequest(db);
  const user = account.data?.user;
  if (account.error || !user || user.id !== userId)
    throw new TeamOperationError(
      "The selected account could not be confirmed. Refresh before retrying.",
      503,
    );
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && user.email?.toLowerCase() === ownerEmail)
    throw new TeamOperationError(
      "Platform owner accounts are protected and cannot be changed here.",
      403,
    );
  return user;
}

const unconfirmed = () =>
  new TeamOperationError(
    "The account change could not be confirmed. Refresh before retrying.",
    503,
  );

export async function manageOwnerAccount(
  db: TeamDb,
  actorId: string,
  body: OwnerAccountAction,
): Promise<OwnerUserResult> {
  requireCurrentTeamRequest(db);
  if (body.action === "export_csv") {
    const { users, truncated } = await loadDirectoryUsers(db, body.search);
    const rows = filterDirectory(users, body);
    await audit(db, actorId, "user.directory_export", undefined, {
      filter: body.filter,
      sort: body.sort,
      searchUsed: !!body.search,
      rows: rows.length,
      truncated,
    });
    return {
      notice: `Exported ${rows.length} accounts.${truncated ? " Only the newest 5,000 accounts were searched." : ""}`,
      csv: ownerUsersCsv(rows),
      filename: `language-threshold-users-${body.filter}-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }
  const user = await requireManageableAccount(db, actorId, body.userId);
  const userId = user.id;
  const email = user.email ?? "";
  if (body.action === "disable") {
    if (!email || body.confirmEmail.toLowerCase() !== email.toLowerCase())
      throw new TeamOperationError("Type the account email exactly to confirm disabling it.");
    const banned = await db.auth.admin.updateUserById(userId, {
      ban_duration: DISABLE_BAN_DURATION,
    });
    requireCurrentTeamRequest(db);
    if (banned.error) throw unconfirmed();
    // Optional migration 20261023120000_owner_session_revoke.sql ends existing sessions now.
    const revoked = await db.rpc("platform_revoke_user_sessions", { p_user: userId });
    const sessionsRevoked = !revoked.error;
    await audit(db, actorId, "user.disabled", undefined, {
      userId,
      email,
      reason: body.reason,
      sessionsRevoked,
    });
    return {
      userId,
      notice: sessionsRevoked
        ? `${email} is disabled and signed out everywhere. Sign-in and token refresh are blocked.`
        : `${email} is disabled. Sign-in and token refresh are blocked; an already-open session ends when its access token expires (up to one hour). Apply the session-revoke migration to sign out immediately.`,
    };
  }
  if (body.action === "enable") {
    const lifted = await db.auth.admin.updateUserById(userId, { ban_duration: "none" });
    requireCurrentTeamRequest(db);
    if (lifted.error) throw unconfirmed();
    await audit(db, actorId, "user.enabled", undefined, { userId, email });
    return { userId, notice: `${email} can sign in again.` };
  }
  if (body.action === "force_confirm") {
    if (user.email_confirmed_at) return { userId, notice: "This email is already confirmed." };
    const confirmed = await db.auth.admin.updateUserById(userId, { email_confirm: true });
    requireCurrentTeamRequest(db);
    if (confirmed.error) throw unconfirmed();
    await audit(db, actorId, "user.email_confirmed", undefined, { userId, email });
    return { userId, notice: `${email} is marked as confirmed.` };
  }
  if (body.action === "resend_confirmation") {
    if (user.email_confirmed_at)
      throw new TeamOperationError(
        "This email is already confirmed. No confirmation email was sent.",
      );
    if (!email) throw new TeamOperationError("This account has no email address.");
    const recent = await db
      .from("platform_owner_operations")
      .select("id")
      .eq("target_user_id", userId)
      .eq("action", "resend_confirmation")
      .gte("created_at", new Date(Date.now() - 60000).toISOString())
      .limit(1);
    if (recent.error) throw unconfirmed();
    const claimed = recent.data?.length
      ? null
      : await db
          .from("platform_owner_operations")
          .insert({
            id: body.requestId,
            actor_id: actorId,
            target_user_id: userId,
            action: "resend_confirmation",
          })
          .select("id")
          .single();
    if (!claimed || claimed.error || !claimed.data)
      throw new TeamOperationError(
        "A confirmation email was requested in the last minute. Wait before sending another.",
      );
    requireCurrentTeamRequest(db);
    const sent = await db.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: CONFIRMATION_DESTINATION },
    });
    const delivered = !sent.error;
    await db
      .from("platform_owner_operations")
      .update({ status: delivered ? "sent" : "delivery_unconfirmed" })
      .eq("id", body.requestId);
    await audit(db, actorId, "user.confirmation_resent", undefined, { userId, email, delivered });
    return {
      userId,
      notice: delivered
        ? `Confirmation email requested for ${email}. Provider acceptance does not confirm inbox delivery.`
        : "The confirmation email could not be confirmed (it may be rate-limited). Wait a few minutes before trying again, or use Mark email confirmed.",
    };
  }
  if (body.action === "change_email") {
    if (body.email !== body.confirmEmail)
      throw new TeamOperationError("The two email addresses do not match.");
    if (body.email === email.toLowerCase())
      throw new TeamOperationError("That is already this account's email.");
    const found = await db.rpc("platform_find_user", { p_email: body.email });
    requireCurrentTeamRequest(db);
    if (found.error) throw unconfirmed();
    if (found.data) throw new TeamOperationError("Another account already uses that email.");
    const changed = await db.auth.admin.updateUserById(userId, {
      email: body.email,
      ...(body.markConfirmed ? { email_confirm: true } : {}),
    });
    requireCurrentTeamRequest(db);
    if (changed.error || !changed.data?.user) throw unconfirmed();
    const confirmed = !!changed.data.user.email_confirmed_at;
    await audit(db, actorId, "user.email_changed", undefined, {
      userId,
      from: email,
      to: body.email,
      confirmed,
    });
    return {
      userId,
      notice: `Email changed from ${email} to ${body.email}. ${confirmed ? "It is confirmed." : "It is not confirmed yet; use Resend confirmation."}`,
    };
  }
  const previous = String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "");
  const renamed = await db.auth.admin.updateUserById(userId, {
    user_metadata: { ...(user.user_metadata ?? {}), display_name: body.name },
  });
  requireCurrentTeamRequest(db);
  if (renamed.error) throw unconfirmed();
  await audit(db, actorId, "user.name_changed", undefined, {
    userId,
    from: previous,
    to: body.name,
  });
  return { userId, notice: `Display name changed to ${body.name}.` };
}
