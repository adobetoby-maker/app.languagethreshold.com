import assert from "node:assert/strict";
import test from "node:test";
import worker from "../support-worker/index.mjs";
import legacy from "../support-worker/legacy-worker.mjs";
import { isLanguageThreshold, inboxRequest } from "../support-worker/inbox.mjs";

const TOKEN = "synthetic-inbox-token-for-local-tests-only-123456789";
test("other brands retain their exact legacy handler and bindings without executing sends", async () => {
  const previous = legacy.email;
  const env = { marker: "existing binding object" };
  const ctx = { marker: "existing context" };
  const message = { to: "hello@medicalspanish.app" };
  let calls = 0;
  legacy.email = async (received, actualEnv, actualCtx) => {
    calls++;
    assert.equal(received, message);
    assert.equal(actualEnv, env);
    assert.equal(actualCtx, ctx);
    return "legacy-result";
  };
  try {
    assert.equal(await worker.email(message, env, ctx), "legacy-result");
    assert.equal(calls, 1);
  } finally {
    legacy.email = previous;
  }
});
function fixture() {
  const values = new Map();
  const env = {
    SUPPORT_INBOX_TOKEN: TOKEN,
    APP_SUPPORT: {
      async put(k, v) {
        values.set(k, v);
      },
      async get(k, type) {
        const v = values.get(k);
        return type === "json" && v ? JSON.parse(v) : v || null;
      },
      async list() {
        return {
          keys: [...values.keys()]
            .filter((k) => k.startsWith("lt:ticket:"))
            .sort()
            .map((name) => ({ name })),
          list_complete: true,
        };
      },
    },
  };
  const message = (to = "support@languagethreshold.com", fail = false) => ({
    to,
    from: "sender@example.invalid",
    headers: new Headers({ subject: "Support fixture" }),
    raw: new Blob([
      "From: sender@example.invalid\r\nSubject: =?UTF-8?B?Q3JldyBoZWxw?=\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\nSGVscCBteSBjcmV3Lg==",
    ]).stream(),
    async forward(destination) {
      assert.equal(destination, "adobetoby@gmail.com");
      if (fail) throw Error("private provider error");
    },
  });
  const req = (path, body, token = TOKEN) =>
    new Request("https://fixture.invalid" + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  return { env, values, message, req };
}
test("Language Threshold support bypasses AI, stores concurrent receipts and decodes MIME", async () => {
  const f = fixture();
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error("No network sends allowed in this test");
  };
  try {
    await Promise.all([
      worker.email(f.message(), f.env, {}),
      worker.email(f.message("teams@languagethreshold.com"), f.env, {}),
    ]);
    assert.equal(f.values.size, 2);
    for (const value of f.values.values()) {
      const t = JSON.parse(value);
      assert.equal(t.preview, "Help my crew.");
      assert.equal(t.subject, "Crew help");
      assert.equal(t.status, "needs_reply");
      assert.equal(t.forwarding, "request_completed");
    }
    assert.equal(isLanguageThreshold("hello@languagethreshold.com.evil.invalid"), false);
    assert.equal(isLanguageThreshold("support@intake.languagethreshold.com"), true);
    assert.equal(isLanguageThreshold("support@medicalspanish.app"), false);
  } finally {
    globalThis.fetch = original;
  }
});
test("forwarding failure retains a human-visible receipt and fails explicitly", async () => {
  const f = fixture();
  await assert.rejects(worker.email(f.message(undefined, true), f.env, {}), /receipt retained/);
  const t = JSON.parse([...f.values.values()][0]);
  assert.equal(t.status, "needs_reply");
  assert.equal(t.forwarding, "failed");
});
test("provider bounce senders never replace the human Reply-To or From address", async () => {
  for (const [header, expected] of [
    [
      { from: "Language Threshold Teams <teams@languagethreshold.com>" },
      "teams@languagethreshold.com",
    ],
    [
      {
        from: "Author <author@example.invalid>",
        "reply-to": "Support requester <requester@example.invalid>",
      },
      "requester@example.invalid",
    ],
    [
      {
        from: "Author <author@example.invalid>",
        "reply-to": "one@example.invalid, two@example.invalid",
      },
      "",
    ],
  ]) {
    const f = fixture();
    const m = f.message();
    m.from = "bounce@send.example.invalid";
    for (const [key, value] of Object.entries(header)) m.headers.set(key, value);
    await worker.email(m, f.env, {});
    const t = JSON.parse([...f.values.values()][0]);
    assert.equal(t.from, expected);
    assert.equal(t.envelopeFrom, "bounce@send.example.invalid");
  }
});
test("inbox endpoint fails closed, excludes unrelated brand records and preserves private no-store", async () => {
  const f = fixture();
  await worker.email(f.message(), f.env, {});
  f.values.set("email:legacy-medical-record", JSON.stringify({ body: "other brand private" }));
  assert.equal((await inboxRequest(f.req("/tickets", undefined, "wrong"), f.env)).status, 401);
  assert.equal(
    (await inboxRequest(f.req("/tickets"), { ...f.env, SUPPORT_INBOX_TOKEN: "" })).status,
    401,
  );
  const r = await inboxRequest(f.req("/tickets"), f.env);
  const data = await r.json();
  assert.equal(r.headers.get("Cache-Control"), "private, no-store");
  assert.equal(data.tickets.length, 1);
  assert.equal(data.tickets[0].preview, undefined);
  const id = data.tickets[0].id;
  assert.equal(
    (await inboxRequest(f.req("/tickets/../../../email:legacy-medical-record"), f.env)).status,
    404,
  );
  assert.equal(
    (await inboxRequest(f.req(`/tickets/${id}`, { status: "resolved", from: "attacker" }), f.env))
      .status,
    400,
  );
  const changed = await inboxRequest(f.req(`/tickets/${id}`, { status: "resolved" }), f.env);
  assert.equal((await changed.json()).ticket.status, "resolved");
});
test("oversize dashboard previews do not discard the Gmail-forwarded receipt", async () => {
  const f = fixture();
  const m = f.message();
  m.raw = new Blob(["x".repeat(300000)]).stream();
  await worker.email(m, f.env, {});
  const t = JSON.parse([...f.values.values()][0]);
  assert.equal(t.previewUnavailable, true);
  assert.equal(t.forwarding, "request_completed");
});
