import { z } from "zod";
import { createHash } from "node:crypto";
import { ownerServiceFetch } from "./owner-service-fetch";
import { TeamOperationError } from "./team-server";
import { supportTicket, type SupportTicket, type SupportPage } from "./owner-support";

export function supportReady() {
  return Boolean(process.env.SUPPORT_INBOX_URL && process.env.SUPPORT_INBOX_TOKEN);
}
export async function supportRequest(
  path: string,
  signal: AbortSignal,
  body?: unknown,
  fetcher = fetch,
) {
  if (!supportReady()) throw new TeamOperationError("Support inbox setup is not complete.", 503);
  const url = new URL(process.env.SUPPORT_INBOX_URL!);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.hostname !== "app-support-email-agent.adobetoby.workers.dev" ||
    url.port
  )
    throw new TeamOperationError("Support inbox setup needs review.", 503);
  const response = await ownerServiceFetch(signal, fetcher)(new URL(path, url), {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPPORT_INBOX_TOKEN}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new TeamOperationError("Support inbox could not be reached. Please check Gmail.", 503);
  return response.json();
}
export async function supportPage(
  cursor: string | null,
  signal: AbortSignal,
): Promise<SupportPage> {
  const result = await supportRequest(
    "/tickets" + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""),
    signal,
  );
  return z
    .object({
      tickets: z.array(supportTicket).max(25),
      nextCursor: z.string().max(1500).nullable(),
    })
    .parse(result);
}
export async function supportDetail(id: string, signal: AbortSignal): Promise<SupportTicket> {
  return z.object({ ticket: supportTicket }).parse(await supportRequest(`/tickets/${id}`, signal))
    .ticket;
}
export async function sendSupportReply(
  ticket: SupportTicket,
  text: string,
  requestId: string,
  signal: AbortSignal,
  fetcher = fetch,
) {
  const to = z.email().parse(ticket.from);
  if (!process.env.RESEND_API_KEY)
    throw new TeamOperationError("Support reply sending is not configured.", 503);
  const key = createHash("sha256")
    .update(JSON.stringify([ticket.id, requestId]))
    .digest("hex");
  let accepted = false;
  try {
    const response = await ownerServiceFetch(signal, fetcher)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lt-support-${key}`,
      },
      body: JSON.stringify({
        from: "Language Threshold Support <support@languagethreshold.com>",
        reply_to: "support@languagethreshold.com",
        to: [to],
        subject: `Re: ${ticket.subject.replace(/[\r\n]/g, " ")}`,
        text,
        ...(ticket.messageId && /^<[^<>\r\n]{1,990}>$/.test(ticket.messageId)
          ? { headers: { "In-Reply-To": ticket.messageId, References: ticket.messageId } }
          : {}),
      }),
    });
    accepted = response.ok;
    if (accepted) {
      const result = z.object({ id: z.string().min(1).max(200) }).safeParse(await response.json());
      if (!result.success) throw new Error("Missing provider receipt");
    }
  } catch {
    throw new TeamOperationError(
      "Reply delivery is unconfirmed. Check sending logs before trying again.",
      503,
    );
  }
  if (!accepted)
    throw new TeamOperationError(
      "The email provider did not accept this reply. Check sending logs.",
      503,
    );
  // Provider acceptance is not inbox delivery. No automatic retry or status mutation.
  return {
    accepted: true,
    notice: "Reply accepted by the email provider; inbox delivery is not yet confirmed.",
  };
}
