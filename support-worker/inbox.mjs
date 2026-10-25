import PostalMime, { addressParser } from "postal-mime";

const PREFIX = "lt:ticket:";
const MAX_RAW = 256 * 1024;
const RETENTION_SECONDS = 90 * 86400;
const ID = /^\d{13}-[a-f0-9-]{36}$/;
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });

export function isLanguageThreshold(to) {
  const domain = to.toLowerCase().split("@")[1];
  return domain === "languagethreshold.com" || domain === "intake.languagethreshold.com";
}

async function limitedBytes(stream, max) {
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) return null;
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function expires(ticket) {
  return Math.max(
    Math.floor(Date.now() / 1000) + 60,
    Math.floor(Date.parse(ticket.receivedAt) / 1000) + RETENTION_SECONDS,
  );
}

export async function receiveSupport(message, env) {
  const now = Date.now();
  const id = `${String(9999999999999 - now).padStart(13, "0")}-${crypto.randomUUID()}`;
  const authorHeader = message.headers.get("reply-to") || message.headers.get("from");
  let replyAddress = message.from || "";
  if (authorHeader) {
    const addresses = authorHeader.length <= 2048 ? addressParser(authorHeader) : [];
    const address = addresses.length === 1 ? addresses[0].address : "";
    replyAddress =
      address && address.length <= 320 && /^[^\s@<>]+@[^\s@<>]+$/.test(address) ? address : "";
  }
  const ticket = {
    id,
    from: replyAddress.slice(0, 320),
    envelopeFrom: (message.from || "").slice(0, 320),
    to: (message.to || "").slice(0, 320),
    subject: (message.headers.get("subject") || "(no subject)").slice(0, 300),
    messageId: (message.headers.get("message-id") || "").replace(/[\r\n]/g, "").slice(0, 998),
    receivedAt: new Date(now).toISOString(),
    status: "needs_reply",
    forwarding: "pending",
    preview: "",
    previewUnavailable: false,
  };
  // Individual records avoid the legacy shared-index read/modify/write race.
  // Receipt exists before any forwarding, MIME parsing or optional provider work.
  await env.APP_SUPPORT.put(PREFIX + id, JSON.stringify(ticket), { expiration: expires(ticket) });
  try {
    await message.forward(
      "adobetoby@gmail.com",
      new Headers({
        "X-Language-Threshold-Support": "true",
        "X-Support-Ticket": id,
      }),
    );
    ticket.forwarding = "request_completed";
  } catch {
    ticket.forwarding = "failed";
    await env.APP_SUPPORT.put(PREFIX + id, JSON.stringify(ticket), { expiration: expires(ticket) });
    // Fixed diagnostic only: never log message bodies, senders or credentials.
    throw new Error("Support forwarding failed; receipt retained in owner inbox");
  }
  try {
    const bytes = await limitedBytes(message.raw, MAX_RAW);
    if (bytes) {
      const parsed = await PostalMime.parse(bytes);
      ticket.subject = (parsed.subject || ticket.subject).slice(0, 300);
      ticket.preview = (parsed.text || "").slice(0, 8000);
      ticket.previewUnavailable = !parsed.text;
    } else ticket.previewUnavailable = true;
  } catch {
    ticket.previewUnavailable = true;
  }
  await env.APP_SUPPORT.put(PREFIX + id, JSON.stringify(ticket), { expiration: expires(ticket) });
  // Language Threshold support never calls AI or automatically emails customers.
}

async function authorized(request, env) {
  if (!env.SUPPORT_INBOX_TOKEN || env.SUPPORT_INBOX_TOKEN.length < 40) return false;
  const supplied = request.headers.get("Authorization") || "";
  if (supplied.length > 300) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(supplied)),
    crypto.subtle.digest("SHA-256", enc.encode(`Bearer ${env.SUPPORT_INBOX_TOKEN}`)),
  ]);
  const left = new Uint8Array(a),
    right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function inboxRequest(request, env) {
  if (!(await authorized(request, env))) return json({ error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  try {
    if (url.pathname === "/tickets" && request.method === "GET") {
      const cursor = url.searchParams.get("cursor") || undefined;
      if (cursor && cursor.length > 1500) return json({ error: "Invalid cursor" }, 400);
      const page = await env.APP_SUPPORT.list({ prefix: PREFIX, limit: 25, cursor });
      const tickets = await Promise.all(
        page.keys.map(async ({ name }) => {
          const ticket = await env.APP_SUPPORT.get(name, "json");
          if (!ticket) return null;
          const { preview, ...summary } = ticket;
          return summary;
        }),
      );
      return json({
        tickets: tickets.filter(Boolean),
        nextCursor: page.list_complete ? null : page.cursor,
      });
    }
    const match = /^\/tickets\/([^/]+)$/.exec(url.pathname);
    if (!match || !ID.test(match[1])) return json({ error: "Not found" }, 404);
    const ticket = await env.APP_SUPPORT.get(PREFIX + match[1], "json");
    if (!ticket) return json({ error: "Not found" }, 404);
    if (request.method === "GET") return json({ ticket });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const bytes = request.body && (await limitedBytes(request.body, 1024));
    if (!bytes) return json({ error: "Request too large" }, 413);
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    if (
      !body ||
      !["needs_reply", "resolved"].includes(body.status) ||
      Object.keys(body).length !== 1
    )
      return json({ error: "Invalid status" }, 400);
    ticket.status = body.status;
    await env.APP_SUPPORT.put(PREFIX + ticket.id, JSON.stringify(ticket), {
      expiration: expires(ticket),
    });
    return json({ ticket });
  } catch {
    return json({ error: "Support inbox unavailable" }, 503);
  }
}
