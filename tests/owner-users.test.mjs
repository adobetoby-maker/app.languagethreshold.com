import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const schema = await loadModule("src/lib/owner-users.ts");
const { manageOwnerUser } = await loadModule("src/lib/owner-users-server.ts");
const actor = "10000000-0000-4000-8000-000000000001",
  userId = "10000000-0000-4000-8000-000000000002",
  requestId = "10000000-0000-4000-8000-000000000003";
const user = { id: userId, email: "tester@example.invalid", email_confirmed_at: null };
const link =
  "https://fixture.invalid/auth/v1/verify?token=PRIVATE-fixture-token&type=invite&redirect_to=" +
  encodeURIComponent(schema.PASSWORD_DESTINATION);
function fixture({ existing = false, claim = true, grantError = false, wrong = false } = {}) {
  const calls = [];
  const db = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return {
        data:
          name === "platform_find_user"
            ? existing
              ? userId
              : null
            : name === "platform_claim_password_invite"
              ? claim
              : "org",
        error: name === "platform_grant_user" && grantError ? new Error("PRIVATE") : null,
      };
    },
    from(table) {
      return {
        insert(value) {
          calls.push(["insert", table, value]);
          return this;
        },
        update(value) {
          calls.push(["update", table, value]);
          return this;
        },
        select() {
          return this;
        },
        single() {
          return Promise.resolve({ data: { id: requestId } });
        },
        eq() {
          return this;
        },
        then(resolve) {
          return Promise.resolve({ data: null, error: null }).then(resolve);
        },
      };
    },
    auth: {
      admin: {
        createUser: async (value) => {
          calls.push(["createUser", value]);
          return { data: { user }, error: null };
        },
        getUserById: async (id) => {
          calls.push(["getUser", id]);
          return { data: { user }, error: null };
        },
        generateLink: async (value) => {
          calls.push(["link", value]);
          return {
            data: {
              user: { ...user, id: wrong ? actor : userId },
              properties: { action_link: link },
            },
            error: null,
          };
        },
      },
    },
  };
  return { db, calls };
}
test("tester schema normalizes email and rejects expired grants, missing reasons and hostile destinations", () => {
  const body = {
    action: "add_tester",
    email: " TESTER@Example.invalid ",
    name: "Tester",
    until: new Date(Date.now() + 86400000).toISOString(),
    reason: "Testing",
    requestId,
  };
  assert.equal(schema.ownerUserAction.parse(body).email, "tester@example.invalid");
  for (const override of [
    { until: "2020-01-01T00:00:00Z" },
    { reason: "" },
    { until: new Date(Date.now() + 8 * 366 * 86400000).toISOString() },
  ])
    assert.throws(() => schema.ownerUserAction.parse({ ...body, ...override }));
  assert.equal(schema.verifiedPasswordLink(link, "https://fixture.invalid"), link);
  for (const value of [
    link.replace("fixture.invalid", "evil.invalid"),
    link.replace("/auth/v1/verify", "/arbitrary"),
    link.replace("https%3A%2F%2Fapp.languagethreshold.com", "https%3A%2F%2Fevil.invalid"),
  ])
    assert.throws(() => schema.verifiedPasswordLink(value, "https://fixture.invalid"));
});
test("existing accounts are preserved; tester creation cannot assign a password, confirmation or privilege", async () => {
  const body = {
    action: "add_tester",
    email: user.email,
    name: "Tester",
    until: new Date(Date.now() + 86400000).toISOString(),
    reason: "Testing",
    requestId,
  };
  const first = fixture({ existing: true });
  await assert.rejects(manageOwnerUser(first.db, actor, body), /already has an account/);
  assert.equal(
    first.calls.some((c) => c[0] === "createUser"),
    false,
  );
  const second = fixture();
  const r = await manageOwnerUser(second.db, actor, body);
  assert.equal(r.userId, userId);
  assert.deepEqual(second.calls.find((c) => c[0] === "createUser")[1], {
    email: user.email,
    email_confirm: false,
    user_metadata: { display_name: "Tester" },
  });
  assert.equal(
    second.calls.some((c) => c[0] === "link"),
    false,
  );
  assert.deepEqual(second.calls.find((c) => c[0] === "platform_grant_user")[1], {
    p_actor: actor,
    p_user: userId,
    p_until: body.until,
    p_reason: "Testing",
  });
});
test("partial tester creation explicitly reports access failure without claiming an invite was sent", async () => {
  const f = fixture({ grantError: true });
  const r = await manageOwnerUser(f.db, actor, {
    action: "add_tester",
    email: user.email,
    name: "Tester",
    until: new Date(Date.now() + 86400000).toISOString(),
    reason: "Testing",
    requestId,
  });
  assert.match(r.notice, /free access could not be confirmed/);
  assert.equal(
    f.calls.some((c) => c[0] === "link"),
    false,
  );
});
test("recipient cooldown prevents generating another link; missing delivery configuration has no write", async () => {
  const f = fixture({ claim: false });
  await assert.rejects(
    manageOwnerUser(f.db, actor, {
      action: "password_invite",
      userId,
      delivery: "copy",
      requestId,
    }),
    /Wait one minute/,
  );
  assert.equal(
    f.calls.some((c) => c[0] === "getUser"),
    false,
  );
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const f = fixture();
    await assert.rejects(
      manageOwnerUser(f.db, actor, {
        action: "password_invite",
        userId,
        delivery: "email",
        requestId,
      }),
      /not configured/,
    );
    assert.equal(f.calls.length, 0);
  } finally {
    if (saved !== undefined) process.env.RESEND_API_KEY = saved;
  }
});
test("private link is returned only for the exact selected account and no token enters audit/operations", async () => {
  const old = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = "https://fixture.invalid";
  try {
    const f = fixture();
    const r = await manageOwnerUser(f.db, actor, {
      action: "password_invite",
      userId,
      delivery: "copy",
      requestId,
    });
    assert.equal(r.link, link);
    assert.doesNotMatch(JSON.stringify(f.calls), /PRIVATE-fixture-token/);
    const bad = fixture({ wrong: true });
    await assert.rejects(
      manageOwnerUser(bad.db, actor, {
        action: "password_invite",
        userId,
        delivery: "copy",
        requestId,
      }),
      /could not be confirmed/,
    );
  } finally {
    if (old === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = old;
  }
});
test("owner service transport accepts empty successful mutations, bounds bytes and obeys cancellation", async () => {
  const { ownerServiceFetch } = await loadModule("src/lib/owner-service-fetch.ts");
  const c = new AbortController();
  const f = ownerServiceFetch(c.signal, async () => new Response(null, { status: 204 }));
  assert.equal((await f("https://fixture.invalid")).status, 204);
  const g = ownerServiceFetch(c.signal, async () => Response.json({ ok: true }));
  assert.deepEqual(await (await g("https://fixture.invalid")).json(), { ok: true });
  const large = ownerServiceFetch(c.signal, async () =>
    Response.json({ text: "x".repeat(600 * 1024) }),
  );
  await assert.rejects(large("https://fixture.invalid"));
  c.abort();
  await assert.rejects(g("https://fixture.invalid"));
});

test("grant date inputs preserve the operator local end date across UTC midnight", () => {
  const old = process.env.TZ;
  process.env.TZ = "America/Denver";
  try {
    assert.equal(schema.ownerDateInput("2027-10-19T05:59:59Z"), "2027-10-18");
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});

test("owner transport settles cancellation even when the upstream ignores its abort signal", async () => {
  const { ownerServiceFetch } = await loadModule("src/lib/owner-service-fetch.ts");
  const c = new AbortController();
  let finish;
  const transport = ownerServiceFetch(c.signal, () => new Promise((r) => (finish = r)));
  const result = transport("https://fixture.invalid");
  await new Promise((r) => setImmediate(r));
  c.abort();
  await assert.rejects(result, /stopped/);
  finish(Response.json({ late: true }));
});
