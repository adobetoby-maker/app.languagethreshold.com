import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { supportAction } = await loadModule("src/lib/owner-support.ts");
const { sendSupportReply, supportRequest } = await loadModule("src/lib/owner-support-server.ts");
const ID = "8200000000000-00000000-0000-4000-8000-000000000001";
const ticket = {
  id: ID,
  from: "customer@example.invalid",
  to: "support@languagethreshold.com",
  subject: "Crew help",
};
const signal = () => new AbortController().signal;

test("support reply never trusts a client-supplied recipient or unbounded message", () => {
  assert.throws(() =>
    supportAction.parse({
      action: "reply",
      id: ID,
      text: "Hello",
      requestId: crypto.randomUUID(),
      to: "someone@example.invalid",
    }),
  );
  assert.throws(() =>
    supportAction.parse({
      action: "reply",
      id: ID,
      text: "x".repeat(8001),
      requestId: crypto.randomUUID(),
    }),
  );
});
test("provider rejection and network failure cannot become reply accepted", async () => {
  const previous = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "synthetic-local-only";
  try {
    let calls = 0;
    await assert.rejects(
      sendSupportReply(ticket, "Hi", crypto.randomUUID(), signal(), async () => {
        calls++;
        return Response.json({ message: "private provider diagnostics" }, { status: 401 });
      }),
      /did not accept/,
    );
    assert.equal(calls, 1);
    await assert.rejects(
      sendSupportReply(ticket, "Hi", crypto.randomUUID(), signal(), async () => {
        throw Error("private token");
      }),
      /unconfirmed/,
    );
    await assert.rejects(
      sendSupportReply(
        { ...ticket, from: "bad\r\nBcc: victim@example.invalid" },
        "Hi",
        crypto.randomUUID(),
        signal(),
        async () => {
          throw Error("must not run");
        },
      ),
    );
    const seen = [];
    const requestId = crypto.randomUUID();
    for (const text of ["Hi", "Changed text"]) {
      const r = await sendSupportReply(ticket, text, requestId, signal(), async (url, init) => {
        seen.push(init);
        return Response.json({ id: "synthetic-message" });
      });
      assert.equal(r.accepted, true);
      assert.match(r.notice, /not yet confirmed/);
    }
    assert.equal(seen[0].headers["Idempotency-Key"], seen[1].headers["Idempotency-Key"]);
    const body = JSON.parse(seen[0].body);
    assert.equal(body.reply_to, "support@languagethreshold.com");
    assert.deepEqual(body.to, [ticket.from]);
  } finally {
    previous === undefined
      ? delete process.env.RESEND_API_KEY
      : (process.env.RESEND_API_KEY = previous);
  }
});
test("inbox secrets stay on the configured Worker origin with redirects refused", async () => {
  const saved = [process.env.SUPPORT_INBOX_URL, process.env.SUPPORT_INBOX_TOKEN];
  process.env.SUPPORT_INBOX_TOKEN = "synthetic-local-only";
  try {
    for (const url of [
      "http://app-support-email-agent.example.workers.dev",
      "https://evil.invalid",
      "https://app-support-email-agent.example.workers.dev?secret=oops",
    ]) {
      process.env.SUPPORT_INBOX_URL = url;
      await assert.rejects(
        supportRequest("/tickets", signal(), undefined, () => {
          throw Error("unexpected fetch");
        }),
        /setup needs review/,
      );
    }
    process.env.SUPPORT_INBOX_URL = "https://app-support-email-agent.adobetoby.workers.dev";
    const r = await supportRequest("/tickets", signal(), undefined, async (url, init) => {
      assert.equal(new URL(url).hostname, "app-support-email-agent.adobetoby.workers.dev");
      assert.equal(init.redirect, "error");
      assert.equal(init.cache, "no-store");
      return Response.json({ tickets: [], nextCursor: null });
    });
    assert.equal(r.nextCursor, null);
  } finally {
    for (const [i, name] of ["SUPPORT_INBOX_URL", "SUPPORT_INBOX_TOKEN"].entries())
      saved[i] === undefined ? delete process.env[name] : (process.env[name] = saved[i]);
  }
});
