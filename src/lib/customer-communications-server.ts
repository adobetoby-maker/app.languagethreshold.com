import { customerEmailText, type customerAction } from "./customer-communications";
import type { z } from "zod";
import { requireCurrentTeamRequest, TeamOperationError, type TeamDb } from "./team-server";
import { ownerEmailReady } from "./owner-users-server";
import { ownerServiceFetch } from "./owner-service-fetch";
export const customerEmailReady = () =>
  ownerEmailReady() && !!process.env.CUSTOMER_EMAIL_POSTAL_ADDRESS?.trim();
export async function manageCustomer(
  db: TeamDb,
  actor: string,
  body: z.infer<typeof customerAction>,
  signal: AbortSignal,
) {
  requireCurrentTeamRequest(db);
  if (body.action === "referral") {
    const r = await db
      .from("customer_referral_links")
      .upsert({ user_id: body.userId }, { onConflict: "user_id", ignoreDuplicates: true });
    if (r.error) throw r.error;
    return { notice: "Referral link ready. Tracking only; no automatic discounts or rewards." };
  }
  if (body.action === "disable_referral") {
    const r = await db
      .from("customer_referral_links")
      .update({ active: false })
      .eq("user_id", body.userId);
    if (r.error) throw r.error;
    return { notice: "Referral link disabled for new registrations." };
  }
  if (body.action === "draft") {
    const r = await db.from("customer_email_messages").insert({
      id: body.id,
      user_id: body.userId,
      actor_id: actor,
      subject: body.subject,
      body: body.body,
    });
    if (r.error)
      throw new TeamOperationError(
        "Draft could not be confirmed. Refresh the message history before retrying.",
      );
    return { notice: "Draft saved. No email sent." };
  }
  if (!customerEmailReady())
    throw new TeamOperationError(
      "Customer email requires a verified sender, sending key and business postal address.",
      503,
    );
  const message = await db
    .from("customer_email_messages")
    .select("id,user_id,subject,body,status")
    .eq("id", body.id)
    .eq("actor_id", actor)
    .single();
  if (message.error || !message.data)
    throw new TeamOperationError("Draft unavailable. Refresh first.");
  const m = message.data;
  const account = await db.auth.admin.getUserById(m.user_id);
  if (
    account.error ||
    !account.data.user?.email_confirmed_at ||
    !account.data.user.email ||
    (account.data.user.banned_until && Date.parse(account.data.user.banned_until) > Date.now())
  )
    throw new TeamOperationError("A confirmed, active recipient account is required.");
  if (account.data.user.email.toLowerCase() !== body.recipient.toLowerCase())
    throw new TeamOperationError(
      "The recipient email changed. Refresh and review the customer before sending.",
    );
  const pref = await db
    .from("customer_email_preferences")
    .upsert({ user_id: m.user_id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (pref.error) throw pref.error;
  const preference = await db
    .from("customer_email_preferences")
    .select("unsubscribe_token,unsubscribed_at")
    .eq("user_id", m.user_id)
    .single();
  if (preference.error || preference.data.unsubscribed_at)
    throw new TeamOperationError("This recipient has opted out of promotional emails.");
  const claimed = await db.rpc("customer_claim_email", { p_id: m.id, p_actor: actor });
  if (claimed.error || !claimed.data)
    throw new TeamOperationError(
      "Already attempted, opted out, or another message was attempted in the last minute. Refresh before retrying.",
    );
  requireCurrentTeamRequest(db);
  // Recheck suppression after claiming, immediately before the irreversible provider request.
  const latest = await db
    .from("customer_email_preferences")
    .select("unsubscribed_at")
    .eq("user_id", m.user_id)
    .single();
  if (latest.error || latest.data.unsubscribed_at)
    throw new TeamOperationError(
      "Recipient preferences could not be confirmed. No email attempted.",
    );
  requireCurrentTeamRequest(db);
  const unsubscribe = `https://app.languagethreshold.com/email-preferences?token=${preference.data.unsubscribe_token}`;
  let status = "unconfirmed";
  try {
    const response = await ownerServiceFetch(signal)("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `customer/${m.id}`,
      },
      body: JSON.stringify({
        from: process.env.TEAM_FROM_EMAIL,
        to: [account.data.user.email],
        subject: m.subject,
        text: customerEmailText(
          m.body,
          process.env.CUSTOMER_EMAIL_POSTAL_ADDRESS!.trim(),
          unsubscribe,
        ),
        headers: { "List-Unsubscribe": `<${unsubscribe}>` },
      }),
    });
    const result = await response.json();
    if (response.ok && typeof result?.id === "string" && result.id.length > 0) status = "accepted";
  } catch {
    /* A timeout is not proof that the provider rejected the email. */
  }
  const saved = await db.from("customer_email_messages").update({ status }).eq("id", m.id);
  return {
    notice:
      status === "accepted"
        ? `Provider accepted the email. Inbox delivery is not confirmed.${saved.error ? " Refresh: the saved status could not be confirmed." : ""}`
        : "Delivery unconfirmed. Do not resend without checking with the recipient.",
  };
}
