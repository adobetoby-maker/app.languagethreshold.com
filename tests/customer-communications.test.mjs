import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { customerAction, customerEmailText, referralLink } = await loadModule(
  "src/lib/customer-communications.ts",
);
const { authReturnPath, authenticationRedirectUrl } = await loadModule("src/lib/auth-return.ts");
const { manageCustomer } = await loadModule("src/lib/customer-communications-server.ts");
const actor = "10000000-0000-4000-8000-000000000001",
  userId = "10000000-0000-4000-8000-000000000002",
  id = "10000000-0000-4000-8000-000000000003";
test("customer message validation rejects header injection, oversized body, and unconfirmed sends", () => {
  for (const v of [
    { action: "draft", userId, id, subject: "Offer\nBcc: other@example.invalid", body: "Hi" },
    { action: "draft", userId, id, subject: "Offer", body: "x".repeat(8001) },
    { action: "send", id, permissionConfirmed: false },
  ])
    assert.equal(customerAction.safeParse(v).success, false);
  assert.equal(
    customerAction.safeParse({
      action: "send",
      id,
      permissionConfirmed: true,
      recipient: "fixture@example.invalid",
    }).success,
    true,
  );
});
test("public referral/auth destinations retain only valid code, never arbitrary redirects", () => {
  assert.equal(referralLink(id), `https://app.languagethreshold.com/refer?code=${id}`);
  assert.equal(
    authReturnPath(`/refer?code=${id}&redirect=https://evil.invalid`),
    `/refer?code=${id}`,
  );
  assert.equal(
    authenticationRedirectUrl(`https://app.languagethreshold.com/refer?code=${id}`),
    referralLink(id),
  );
  assert.throws(() => referralLink("https://evil.invalid"));
});
test("plain text email has business identity, postal address and opt-out footer", () => {
  assert.equal(
    customerEmailText(
      "Your offer",
      "Postal address",
      "https://app.languagethreshold.com/email-preferences?token=x",
    ),
    "Your offer\n\nLanguage Threshold\nPostal address\nStop promotional emails: https://app.languagethreshold.com/email-preferences?token=x",
  );
});
function fixture({ unsubscribed = false, claim = true, confirmed = true } = {}) {
  const calls = [];
  const db = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              id: userId,
              email: "fixture@example.invalid",
              email_confirmed_at: confirmed ? "2026-10-18" : null,
            },
          },
        }),
      },
    },
    rpc: async () => ({ data: claim }),
    from(table) {
      const q = {
        insert(v) {
          calls.push(["insert", table, v]);
          return q;
        },
        upsert() {
          return q;
        },
        update(v) {
          calls.push(["update", table, v]);
          return q;
        },
        eq() {
          return q;
        },
        select() {
          return q;
        },
        single: async () => ({
          data:
            table === "customer_email_messages"
              ? { id, user_id: userId, subject: "Offer", body: "Hello", status: "draft" }
              : { unsubscribe_token: id, unsubscribed_at: unsubscribed ? "2026-10-18" : null },
        }),
        then(resolve) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  return { db, calls };
}
const signal = new AbortController().signal;
test("draft creation and referral issuance never contact an email provider", async () => {
  const original = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends++;
    throw Error("Unexpected provider request");
  };
  try {
    const { db, calls } = fixture();
    assert.match(
      (
        await manageCustomer(
          db,
          actor,
          { action: "draft", userId, id, subject: "Offer", body: "Hello" },
          signal,
        )
      ).notice,
      /No email sent/,
    );
    await manageCustomer(db, actor, { action: "referral", userId }, signal);
    assert.equal(calls[0][1], "customer_email_messages");
    assert.equal(sends, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("send checks sender configuration, confirmed recipient, suppression, and operation claim before transport", async () => {
  const previous = { ...process.env },
    original = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends++;
    throw Error("Unexpected transport");
  };
  try {
    delete process.env.RESEND_API_KEY;
    await assert.rejects(
      manageCustomer(
        fixture().db,
        actor,
        { action: "send", id, permissionConfirmed: true, recipient: "fixture@example.invalid" },
        signal,
      ),
      /requires/,
    );
    Object.assign(process.env, {
      RESEND_API_KEY: "fixture-only",
      TEAM_FROM_EMAIL: "fixture@example.invalid",
      CUSTOMER_EMAIL_POSTAL_ADDRESS: "Fixture postal",
    });
    for (const [options, pattern] of [
      [{ confirmed: false }, /confirmed/],
      [{ unsubscribed: true }, /opted out/],
      [{ claim: false }, /Already attempted/],
    ])
      await assert.rejects(
        manageCustomer(
          fixture(options).db,
          actor,
          { action: "send", id, permissionConfirmed: true, recipient: "fixture@example.invalid" },
          signal,
        ),
        pattern,
      );
    assert.equal(sends, 0);
  } finally {
    process.env = previous;
    globalThis.fetch = original;
  }
});
test("accepted status is distinct from delivery; timeout is unconfirmed and never retried", async () => {
  const previous = { ...process.env },
    original = globalThis.fetch;
  let sends = 0;
  Object.assign(process.env, {
    RESEND_API_KEY: "fixture-only",
    TEAM_FROM_EMAIL: "fixture@example.invalid",
    CUSTOMER_EMAIL_POSTAL_ADDRESS: "Fixture postal",
  });
  try {
    globalThis.fetch = async (_url, init) => {
      sends++;
      const message = JSON.parse(init.body);
      assert.deepEqual(message.to, ["fixture@example.invalid"]);
      assert.match(message.text, /Stop promotional emails/);
      assert.equal(init.headers["Idempotency-Key"], `customer/${id}`);
      return Response.json({ id: "provider-fixture" });
    };
    const accepted = fixture();
    assert.match(
      (
        await manageCustomer(
          accepted.db,
          actor,
          { action: "send", id, permissionConfirmed: true, recipient: "fixture@example.invalid" },
          signal,
        )
      ).notice,
      /Inbox delivery is not confirmed/,
    );
    assert.equal(accepted.calls.at(-1)[2].status, "accepted");
    globalThis.fetch = async () => {
      sends++;
      throw Error("Timeout");
    };
    const unknown = fixture();
    assert.match(
      (
        await manageCustomer(
          unknown.db,
          actor,
          { action: "send", id, permissionConfirmed: true, recipient: "fixture@example.invalid" },
          signal,
        )
      ).notice,
      /unconfirmed/,
    );
    assert.equal(unknown.calls.at(-1)[2].status, "unconfirmed");
    assert.equal(sends, 2);
  } finally {
    process.env = previous;
    globalThis.fetch = original;
  }
});

test("changed recipient cannot receive a message reviewed for an older email", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, {
    RESEND_API_KEY: "fixture-only",
    TEAM_FROM_EMAIL: "fixture@example.invalid",
    CUSTOMER_EMAIL_POSTAL_ADDRESS: "Fixture postal",
  });
  try {
    await assert.rejects(
      manageCustomer(
        fixture().db,
        actor,
        { action: "send", id, permissionConfirmed: true, recipient: "old@example.invalid" },
        signal,
      ),
      /recipient email changed/,
    );
  } finally {
    process.env = previous;
  }
});
