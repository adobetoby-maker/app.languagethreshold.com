// Owner account controls, cross-company team management, directory filters/CSV and activity
// summaries. Server logic runs against an in-memory fake of the Supabase client.
import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";

const accounts = await loadModule("src/lib/owner-accounts-server.ts");
const users = await loadModule("src/lib/owner-users.ts");
const directory = await loadModule("src/lib/owner-directory.ts");
const directoryServer = await loadModule("src/lib/owner-directory-server.ts");
const teams = await loadModule("src/lib/owner-teams-server.ts");
const teamSchema = await loadModule("src/lib/owner-teams.ts");
const activity = await loadModule("src/lib/owner-activity.ts");

const ACTOR = "10000000-0000-4000-8000-000000000001";
const TARGET = "10000000-0000-4000-8000-000000000002";
const OTHER_OWNER = "10000000-0000-4000-8000-000000000003";
const ORG = "20000000-0000-4000-8000-000000000001";
const M_OWNER = "30000000-0000-4000-8000-000000000001";
const M_ADMIN = "30000000-0000-4000-8000-000000000002";
const M_LEARNER = "30000000-0000-4000-8000-000000000003";
const REQ = "40000000-0000-4000-8000-000000000001";

/** Chainable fake of the parts of supabase-js the owner servers use. */
function fakeDb({ tables = {}, rpc = {}, accounts: accts = {}, roles = {} } = {}) {
  const calls = [];
  const from = (table) => {
    const q = {
      table,
      op: "select",
      filters: [],
      payload: undefined,
      single: false,
      opts: undefined,
    };
    const chain = {
      select(_cols, opts) {
        if (q.op === "select") q.opts = opts;
        return chain;
      },
      insert(v) {
        q.op = "insert";
        q.payload = v;
        return chain;
      },
      update(v) {
        q.op = "update";
        q.payload = v;
        return chain;
      },
      upsert(v) {
        q.op = "upsert";
        q.payload = v;
        return chain;
      },
      single() {
        q.single = true;
        return chain;
      },
      maybeSingle() {
        q.single = true;
        return chain;
      },
      then(resolve, reject) {
        calls.push(q);
        let out;
        if (table === "platform_admin_roles") {
          const userId = q.filters.find((f) => f[1] === "user_id")?.[2];
          out = { data: roles[userId] ? { role: roles[userId] } : null, error: null };
        } else out = tables[table]?.(q) ?? { data: q.single ? null : [], error: null };
        return Promise.resolve(out).then(resolve, reject);
      },
    };
    for (const name of ["eq", "gte", "gt", "lt", "like", "not", "in", "order", "limit", "range"])
      chain[name] = (...args) => {
        q.filters.push([name, ...args]);
        return chain;
      };
    chain.retry = () => chain;
    chain.abortSignal = () => chain;
    return chain;
  };
  const db = {
    calls,
    from,
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      return rpc[name] ? rpc[name](args) : { data: null, error: null };
    },
    auth: {
      admin: {
        getUserById: async (id) => ({
          data: { user: accts[id] ?? null },
          error: accts[id] ? null : { message: "PRIVATE missing" },
        }),
        updateUserById: async (id, attrs) => {
          calls.push({ updateUser: id, attrs });
          const next = { ...accts[id], ...(attrs.email ? { email: attrs.email } : {}) };
          if (attrs.email_confirm) next.email_confirmed_at = "2026-10-23T00:00:00Z";
          return { data: { user: next }, error: null };
        },
      },
      resend: async (value) => {
        calls.push({ resend: value });
        return { error: null };
      },
    },
  };
  return db;
}
const audits = (db) =>
  db.calls
    .filter((c) => c.table === "platform_audit_events" && c.op === "insert")
    .map((c) => c.payload);
const authWrites = (db) => db.calls.filter((c) => c.updateUser || c.resend);
const target = (extra = {}) => ({
  id: TARGET,
  email: "learner@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  user_metadata: { display_name: "Old Name", locale: "es" },
  ...extra,
});

test("account guards: self, platform-owner role and PLATFORM_OWNER_EMAIL targets are refused before any write", async () => {
  const saved = process.env.PLATFORM_OWNER_EMAIL;
  try {
    for (const action of [
      { action: "disable", userId: ACTOR, confirmEmail: "x@example.invalid", reason: "abuse" },
      { action: "change_name", userId: ACTOR, name: "Me" },
    ]) {
      const db = fakeDb({ accounts: { [ACTOR]: { id: ACTOR, email: "owner@example.invalid" } } });
      await assert.rejects(
        accounts.manageOwnerAccount(db, ACTOR, action),
        (e) => e.status === 403 && /your own account/.test(e.message),
      );
      assert.equal(authWrites(db).length, 0);
    }
    const roleDb = fakeDb({
      accounts: { [OTHER_OWNER]: { id: OTHER_OWNER, email: "co@example.invalid" } },
      roles: { [OTHER_OWNER]: "owner" },
    });
    await assert.rejects(
      accounts.manageOwnerAccount(roleDb, ACTOR, { action: "enable", userId: OTHER_OWNER }),
      (e) => e.status === 403 && /protected/.test(e.message),
    );
    assert.equal(authWrites(roleDb).length, 0);
    process.env.PLATFORM_OWNER_EMAIL = "Boss@Example.invalid";
    const envDb = fakeDb({ accounts: { [TARGET]: target({ email: "boss@example.invalid" }) } });
    await assert.rejects(
      accounts.manageOwnerAccount(envDb, ACTOR, { action: "force_confirm", userId: TARGET }),
      (e) => e.status === 403,
    );
    assert.equal(authWrites(envDb).length, 0);
    const missing = fakeDb();
    await assert.rejects(
      accounts.manageOwnerAccount(missing, ACTOR, { action: "enable", userId: TARGET }),
      (e) => e.status === 503 && !/PRIVATE/.test(e.message),
    );
  } finally {
    if (saved === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
    else process.env.PLATFORM_OWNER_EMAIL = saved;
  }
});

test("disable needs the typed email, bans, revokes sessions when available and audits with detail", async () => {
  const wrong = fakeDb({ accounts: { [TARGET]: target() } });
  await assert.rejects(
    accounts.manageOwnerAccount(wrong, ACTOR, {
      action: "disable",
      userId: TARGET,
      confirmEmail: "someone@example.invalid",
      reason: "Chargeback abuse",
    }),
    /Type the account email exactly/,
  );
  assert.equal(authWrites(wrong).length, 0);
  const db = fakeDb({
    accounts: { [TARGET]: target() },
    rpc: { platform_revoke_user_sessions: () => ({ data: 2, error: null }) },
  });
  const r = await accounts.manageOwnerAccount(db, ACTOR, {
    action: "disable",
    userId: TARGET,
    confirmEmail: " LEARNER@example.invalid ".trim(),
    reason: "Chargeback abuse",
  });
  assert.deepEqual(authWrites(db)[0].attrs, { ban_duration: "876000h" });
  assert.match(r.notice, /signed out everywhere/);
  assert.deepEqual(audits(db)[0], {
    actor_user_id: ACTOR,
    action: "user.disabled",
    organization_id: null,
    detail: {
      userId: TARGET,
      email: "learner@example.invalid",
      reason: "Chargeback abuse",
      sessionsRevoked: true,
    },
  });
  const noMigration = fakeDb({
    accounts: { [TARGET]: target() },
    rpc: { platform_revoke_user_sessions: () => ({ data: null, error: { code: "PGRST202" } }) },
  });
  const degraded = await accounts.manageOwnerAccount(noMigration, ACTOR, {
    action: "disable",
    userId: TARGET,
    confirmEmail: "learner@example.invalid",
    reason: "Chargeback abuse",
  });
  assert.match(degraded.notice, /access token expires/);
  assert.equal(audits(noMigration)[0].detail.sessionsRevoked, false);
  const enable = fakeDb({ accounts: { [TARGET]: target() } });
  await accounts.manageOwnerAccount(enable, ACTOR, { action: "enable", userId: TARGET });
  assert.deepEqual(authWrites(enable)[0].attrs, { ban_duration: "none" });
  assert.equal(audits(enable)[0].action, "user.enabled");
});

test("confirmation: resend only for unconfirmed accounts, one per minute, fixed redirect; force-confirm is idempotent", async () => {
  const confirmed = fakeDb({ accounts: { [TARGET]: target() } });
  await assert.rejects(
    accounts.manageOwnerAccount(confirmed, ACTOR, {
      action: "resend_confirmation",
      userId: TARGET,
      requestId: REQ,
    }),
    /already confirmed/,
  );
  const cooling = fakeDb({
    accounts: { [TARGET]: target({ email_confirmed_at: null }) },
    tables: {
      platform_owner_operations: (q) =>
        q.op === "select"
          ? { data: [{ id: "x" }], error: null }
          : { data: { id: REQ }, error: null },
    },
  });
  await assert.rejects(
    accounts.manageOwnerAccount(cooling, ACTOR, {
      action: "resend_confirmation",
      userId: TARGET,
      requestId: REQ,
    }),
    /last minute/,
  );
  assert.equal(authWrites(cooling).length, 0);
  const db = fakeDb({
    accounts: { [TARGET]: target({ email_confirmed_at: null }) },
    tables: {
      platform_owner_operations: (q) =>
        q.op === "select" && !q.single
          ? { data: [], error: null }
          : { data: { id: REQ }, error: null },
    },
  });
  const r = await accounts.manageOwnerAccount(db, ACTOR, {
    action: "resend_confirmation",
    userId: TARGET,
    requestId: REQ,
  });
  assert.deepEqual(authWrites(db)[0].resend, {
    type: "signup",
    email: "learner@example.invalid",
    options: { emailRedirectTo: "https://app.languagethreshold.com/" },
  });
  assert.match(r.notice, /Confirmation email requested/);
  assert.equal(audits(db)[0].action, "user.confirmation_resent");
  const already = fakeDb({ accounts: { [TARGET]: target() } });
  assert.match(
    (await accounts.manageOwnerAccount(already, ACTOR, { action: "force_confirm", userId: TARGET }))
      .notice,
    /already confirmed/,
  );
  assert.equal(authWrites(already).length, 0);
  const force = fakeDb({ accounts: { [TARGET]: target({ email_confirmed_at: null }) } });
  await accounts.manageOwnerAccount(force, ACTOR, { action: "force_confirm", userId: TARGET });
  assert.deepEqual(authWrites(force)[0].attrs, { email_confirm: true });
});

test("change email requires matching new addresses and a free address; name change merges metadata; no password ever", async () => {
  const body = {
    action: "change_email",
    userId: TARGET,
    email: "new@example.invalid",
    confirmEmail: "new@example.invalid",
    markConfirmed: true,
  };
  const mismatch = fakeDb({ accounts: { [TARGET]: target() } });
  await assert.rejects(
    accounts.manageOwnerAccount(mismatch, ACTOR, { ...body, confirmEmail: "nwe@example.invalid" }),
    /do not match/,
  );
  const taken = fakeDb({
    accounts: { [TARGET]: target() },
    rpc: { platform_find_user: () => ({ data: OTHER_OWNER, error: null }) },
  });
  await assert.rejects(accounts.manageOwnerAccount(taken, ACTOR, body), /already uses/);
  assert.equal(authWrites(taken).length, 0);
  const db = fakeDb({
    accounts: { [TARGET]: target() },
    rpc: { platform_find_user: () => ({ data: null, error: null }) },
  });
  const r = await accounts.manageOwnerAccount(db, ACTOR, body);
  assert.deepEqual(authWrites(db)[0].attrs, { email: "new@example.invalid", email_confirm: true });
  assert.match(r.notice, /It is confirmed/);
  assert.deepEqual(audits(db)[0].detail, {
    userId: TARGET,
    from: "learner@example.invalid",
    to: "new@example.invalid",
    confirmed: true,
  });
  const rename = fakeDb({ accounts: { [TARGET]: target() } });
  await accounts.manageOwnerAccount(rename, ACTOR, {
    action: "change_name",
    userId: TARGET,
    name: "New Name",
  });
  assert.deepEqual(authWrites(rename)[0].attrs, {
    user_metadata: { display_name: "New Name", locale: "es" },
  });
  for (const d of [mismatch, taken, db, rename])
    assert.doesNotMatch(JSON.stringify(d.calls), /password/i);
});

test("account schema rejects malformed bodies and has no password field", () => {
  const bad = [
    { action: "disable", userId: "not-a-uuid", confirmEmail: "a@b.co", reason: "abc" },
    { action: "disable", userId: TARGET, confirmEmail: "a@b.co", reason: "" },
    {
      action: "change_email",
      userId: TARGET,
      email: "nope",
      confirmEmail: "nope",
      markConfirmed: true,
    },
    { action: "change_name", userId: TARGET, name: "" },
    { action: "resend_confirmation", userId: TARGET },
    { action: "set_password", userId: TARGET, password: "hunter2" },
    { action: "export_csv", filter: "everyone" },
  ];
  for (const body of bad)
    assert.throws(() => users.ownerUsersPost.parse(body), JSON.stringify(body));
  assert.equal(users.ownerUsersPost.parse({ action: "export_csv" }).filter, "all");
  assert.equal(users.OWNER_ACCOUNT_ACTIONS.has("password_invite"), false);
  assert.equal(users.OWNER_ACCOUNT_ACTIONS.has("disable"), true);
});

const people = [
  {
    id: "a",
    email: "a@x.test",
    displayName: "Ann",
    createdAt: "2026-10-20T10:00:00Z",
    lastSignInAt: "2026-10-22T10:00:00Z",
    confirmed: true,
    bannedUntil: null,
    subscriptionStatus: "active",
    activeSeconds30d: 60,
    activeDays30d: 1,
    freeActive: false,
  },
  {
    id: "b",
    email: "b@x.test",
    displayName: '=HYPERLINK("x")',
    createdAt: "2026-10-22T10:00:00Z",
    lastSignInAt: null,
    confirmed: false,
    bannedUntil: null,
    subscriptionStatus: "none",
    activeSeconds30d: 0,
    activeDays30d: 0,
    freeActive: true,
  },
  {
    id: "c",
    email: "c@x.test",
    displayName: 'Cee, "quoted"',
    createdAt: "2026-09-01T10:00:00Z",
    lastSignInAt: "2026-10-23T09:00:00Z",
    confirmed: true,
    bannedUntil: "2126-01-01T00:00:00Z",
    subscriptionStatus: "canceled",
    activeSeconds30d: 900,
    activeDays30d: 3,
    freeActive: false,
  },
];
test("directory filters, sorts, pages and formula-safe CSV", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  const ids = (filter, sort = "created") =>
    directory.filterDirectory(people, { filter, sort }, now).map((u) => u.id);
  assert.deepEqual(ids("all"), ["b", "a", "c"]);
  assert.deepEqual(ids("paid"), ["a"]);
  assert.deepEqual(ids("active30"), ["a", "c"]);
  assert.deepEqual(ids("free"), ["b"]);
  assert.deepEqual(ids("disabled"), ["c"]);
  assert.deepEqual(ids("unconfirmed"), ["b"]);
  assert.deepEqual(ids("all", "last_sign_in"), ["c", "a", "b"]);
  assert.deepEqual(ids("all", "activity"), ["c", "a", "b"]);
  const many = Array.from({ length: 120 }, (_, i) => ({
    ...people[0],
    id: `u${i}`,
    createdAt: new Date(now - i * 60000).toISOString(),
  }));
  const page = directory.directoryPage(many, directory.directoryQuery.parse({ page: "2" }), now);
  assert.deepEqual([page.total, page.users.length, page.users[0].id], [120, 20, "u100"]);
  const csv = directory.ownerUsersCsv(people, now);
  assert.ok(csv.startsWith('﻿"Email","Name","Created","Last sign-in","Status"'));
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"Cee, ""quoted"""/);
  assert.match(csv, /"Disabled"/);
  assert.match(csv, /"Email unconfirmed"/);
  assert.deepEqual(directory.signupsByDay(people, 3, new Date(now)), [
    { date: "2026-10-21", count: 0 },
    { date: "2026-10-22", count: 1 },
    { date: "2026-10-23", count: 0 },
  ]);
  assert.throws(() => directory.directoryQuery.parse({ sort: "email" }));
});

test("full directory read pages through the existing RPC and reports truncation", async () => {
  const pages = [];
  const db = fakeDb({
    rpc: {
      platform_user_directory: ({ p_page, p_search }) => {
        pages.push([p_page, p_search]);
        return {
          data: {
            total: 120,
            users: Array.from({ length: p_page < 2 ? 50 : 20 }, (_, i) => ({
              id: `${p_page}-${i}`,
            })),
          },
          error: null,
        };
      },
    },
  });
  const r = await directoryServer.loadDirectoryUsers(db, "acme");
  assert.deepEqual(pages.map((p) => p[0]).sort(), [0, 1, 2]);
  assert.ok(pages.every((p) => p[1] === "acme"));
  assert.deepEqual([r.users.length, r.total, r.truncated], [120, 120, false]);
  const huge = fakeDb({
    rpc: {
      platform_user_directory: ({ p_page }) => ({
        data: { total: 9000, users: [{ id: `p${p_page}` }] },
        error: null,
      }),
    },
  });
  const big = await directoryServer.loadDirectoryUsers(huge, "");
  assert.equal(huge.calls.length, 100);
  assert.equal(big.truncated, true);
});

/** Team fixture: one company with an owner, an admin and a learner. */
function teamDb({
  owners = 1,
  seats = 5,
  learners = 1,
  pending = 0,
  complimentary = false,
  members,
  roles = {},
  emails = {},
  missingAccounts = [],
} = {}) {
  const rows = members ?? {
    [M_OWNER]: {
      id: M_OWNER,
      user_id: ACTOR,
      display_name: "Olivia Owner",
      role: "owner",
      status: "active",
    },
    [M_ADMIN]: {
      id: M_ADMIN,
      user_id: TARGET,
      display_name: "Adam Admin",
      role: "admin",
      status: "active",
    },
    [M_LEARNER]: {
      id: M_LEARNER,
      user_id: OTHER_OWNER,
      display_name: "Lea Learner",
      role: "learner",
      status: "active",
    },
  };
  return fakeDb({
    roles,
    accounts: Object.fromEntries(
      Object.entries({
        [ACTOR]: { id: ACTOR, email: emails[ACTOR] ?? "olivia@acme.test" },
        [TARGET]: { id: TARGET, email: emails[TARGET] ?? "adam@acme.test" },
        [OTHER_OWNER]: { id: OTHER_OWNER, email: emails[OTHER_OWNER] ?? "lea@example.invalid" },
      }).filter(([id]) => !missingAccounts.includes(id)),
    ),
    tables: {
      team_organizations: (q) =>
        q.op === "select"
          ? {
              data: {
                id: ORG,
                name: "Acme Roofing",
                billing_email: "b@acme.test",
                owner_user_id: ACTOR,
                created_at: "2026-01-01",
              },
              error: null,
            }
          : { data: null, error: null },
      platform_user_grants: () => ({
        data: complimentary ? { user_id: TARGET } : null,
        error: null,
      }),
      team_entitlements: () => ({
        data: {
          seat_limit: seats,
          status: "active",
          period_end: null,
          stripe_subscription_id: null,
        },
        error: null,
      }),
      team_invitations: (q) =>
        q.opts?.head
          ? { count: pending, data: null, error: null }
          : {
              data: q.single
                ? {
                    email: "i@acme.test",
                    display_name: "Invitee",
                    module_id: "roofing",
                    require_certificate: false,
                    status: "pending",
                  }
                : [],
              error: null,
            },
      team_members: (q) => {
        if (q.op !== "select") return { data: null, error: null };
        if (q.opts?.head) {
          const role = q.filters.find((f) => f[1] === "role")?.[2];
          return { count: role === "owner" ? owners : learners, data: null, error: null };
        }
        const id = q.filters.find((f) => f[1] === "id")?.[2];
        return { data: q.single ? (rows[id] ?? null) : Object.values(rows), error: null };
      },
      team_assignments: () => ({ data: null, error: null }),
    },
  });
}
const teamWrites = (db) =>
  db.calls
    .filter((c) => c.op === "update" || c.op === "upsert" || c.op === "insert")
    .filter((c) => c.table !== "platform_audit_events");

test("team: last-owner and account-owner protection, learner seat limit, audited role change", async () => {
  const self = teamDb();
  await assert.rejects(
    teams.manageOwnerTeam(
      self,
      ACTOR,
      { action: "change_role", orgId: ORG, memberId: M_OWNER, role: "admin" },
      "https://app.test",
    ),
    /Transfer company ownership/,
  );
  const coOwner = teamDb({
    owners: 1,
    members: {
      [M_ADMIN]: {
        id: M_ADMIN,
        user_id: TARGET,
        display_name: "Co Owner",
        role: "owner",
        status: "active",
      },
    },
  });
  await assert.rejects(
    teams.manageOwnerTeam(
      coOwner,
      ACTOR,
      { action: "change_role", orgId: ORG, memberId: M_ADMIN, role: "admin" },
      "https://app.test",
    ),
    /at least one owner/,
  );
  await assert.rejects(
    teams.manageOwnerTeam(
      coOwner,
      ACTOR,
      { action: "remove_member", orgId: ORG, memberId: M_ADMIN, confirmName: "co owner" },
      "https://app.test",
    ),
    /at least one owner/,
  );
  const full = teamDb({ seats: 2, learners: 1, pending: 1 });
  await assert.rejects(
    teams.manageOwnerTeam(
      full,
      ACTOR,
      { action: "change_role", orgId: ORG, memberId: M_ADMIN, role: "learner" },
      "https://app.test",
    ),
    /No learner seats/,
  );
  for (const db of [self, coOwner, full]) assert.equal(teamWrites(db).length, 0);
  const ok = teamDb({ seats: 5 });
  const r = await teams.manageOwnerTeam(
    ok,
    ACTOR,
    { action: "change_role", orgId: ORG, memberId: M_ADMIN, role: "learner" },
    "https://app.test",
  );
  assert.match(r.notice, /Adam Admin is now learner/);
  assert.deepEqual(teamWrites(ok)[0].payload, { role: "learner" });
  assert.deepEqual(audits(ok)[0], {
    actor_user_id: ACTOR,
    action: "owner_team.role_changed",
    organization_id: ORG,
    detail: { memberId: M_ADMIN, userId: TARGET, from: "admin", to: "learner" },
  });
});

test("team: removal needs the typed name; transfer needs the company name and promotes before demoting", async () => {
  const wrong = teamDb();
  await assert.rejects(
    teams.manageOwnerTeam(
      wrong,
      ACTOR,
      { action: "remove_member", orgId: ORG, memberId: M_LEARNER, confirmName: "Lea" },
      "https://app.test",
    ),
    /Type the member's name/,
  );
  const remove = teamDb();
  await teams.manageOwnerTeam(
    remove,
    ACTOR,
    { action: "remove_member", orgId: ORG, memberId: M_LEARNER, confirmName: "  lea   LEARNER " },
    "https://app.test",
  );
  assert.deepEqual(teamWrites(remove)[0].payload, { status: "inactive" });
  assert.equal(audits(remove)[0].action, "owner_team.member_removed");
  const badTransfer = teamDb();
  await assert.rejects(
    teams.manageOwnerTeam(
      badTransfer,
      ACTOR,
      { action: "transfer_ownership", orgId: ORG, memberId: M_ADMIN, confirmName: "Acme" },
      "https://app.test",
    ),
    /company name/,
  );
  assert.equal(teamWrites(badTransfer).length, 0);
  const transfer = teamDb();
  await teams.manageOwnerTeam(
    transfer,
    ACTOR,
    { action: "transfer_ownership", orgId: ORG, memberId: M_ADMIN, confirmName: "acme roofing" },
    "https://app.test",
  );
  assert.deepEqual(
    teamWrites(transfer).map((w) => [w.table, w.payload]),
    [
      ["team_members", { role: "owner" }],
      ["team_organizations", { owner_user_id: TARGET }],
      ["team_members", { role: "admin" }],
    ],
  );
  assert.equal(audits(transfer)[0].detail.toUserId, TARGET);
});

test("team: complimentary workspaces are refused; assignment keeps the roofing-only certificate rule", async () => {
  const comp = teamDb({ complimentary: true });
  await assert.rejects(
    teams.manageOwnerTeam(
      comp,
      ACTOR,
      { action: "revoke_invite", orgId: ORG, invitationId: REQ },
      "https://app.test",
    ),
    /complimentary-access workspace/,
  );
  const cert = teamDb();
  await assert.rejects(
    teams.manageOwnerTeam(
      cert,
      ACTOR,
      {
        action: "assign",
        orgId: ORG,
        memberId: M_LEARNER,
        moduleId: "restaurant",
        requireCertificate: true,
      },
      "https://app.test",
    ),
    /reviewed final test is not yet available|Unknown module/,
  );
  assert.equal(teamWrites(cert).length, 0);
  const unknown = teamDb();
  await assert.rejects(
    teams.manageOwnerTeam(
      unknown,
      ACTOR,
      {
        action: "assign",
        orgId: ORG,
        memberId: M_LEARNER,
        moduleId: "no-such-module",
        requireCertificate: false,
      },
      "https://app.test",
    ),
    /Unknown module/,
  );
  const ok = teamDb();
  const saved = [process.env.RESEND_API_KEY, process.env.TEAM_FROM_EMAIL];
  delete process.env.RESEND_API_KEY;
  try {
    const r = await teams.manageOwnerTeam(
      ok,
      ACTOR,
      {
        action: "assign",
        orgId: ORG,
        memberId: M_LEARNER,
        moduleId: "roofing",
        requireCertificate: true,
      },
      "https://app.test",
    );
    assert.equal(r.notice, "Module assigned.");
    assert.match(r.warning, /Email delivery could not be confirmed/);
    assert.equal(teamWrites(ok)[0].table, "team_assignments");
    assert.deepEqual(audits(ok)[0].detail, {
      memberId: M_LEARNER,
      userId: OTHER_OWNER,
      moduleId: "roofing",
      requireCertificate: true,
    });
  } finally {
    if (saved[0] !== undefined) process.env.RESEND_API_KEY = saved[0];
  }
  const revoke = teamDb();
  await teams.manageOwnerTeam(
    revoke,
    ACTOR,
    { action: "revoke_invite", orgId: ORG, invitationId: REQ },
    "https://app.test",
  );
  const write = teamWrites(revoke)[0];
  assert.deepEqual(write.payload, { status: "revoked" });
  assert.ok(write.filters.some((f) => f[1] === "organization_id" && f[2] === ORG));
});

test("team schema rejects malformed actions", () => {
  for (const body of [
    { action: "change_role", orgId: ORG, memberId: M_ADMIN, role: "superuser" },
    { action: "remove_member", orgId: ORG, memberId: M_ADMIN, confirmName: "" },
    { action: "transfer_ownership", orgId: "acme", memberId: M_ADMIN, confirmName: "Acme" },
    { action: "delete_company", orgId: ORG },
  ])
    assert.throws(() => teamSchema.ownerTeamAction.parse(body), JSON.stringify(body));
  assert.equal(teamSchema.confirmMatches("  ACME   roofing", "Acme Roofing"), true);
  assert.equal(teamSchema.confirmMatches("", ""), false);
});

test("activity: detail summary is bounded, prefix pattern is literal, CSV is formula-safe", () => {
  assert.equal(
    activity.summarizeAuditDetail({ userId: "u1", email: "a@b.test", empty: "", n: 3 }),
    "userId: u1 · email: a@b.test · n: 3",
  );
  assert.equal(activity.summarizeAuditDetail(null), "");
  const long = activity.summarizeAuditDetail({ a: "x".repeat(200), b: { nested: true } });
  assert.ok(long.length <= 240);
  assert.match(long, /…/);
  assert.equal(activity.actionPrefixPattern("owner_team."), "owner\\_team.%");
  const csv = activity.activityCsv([
    {
      created_at: "2026-10-23T00:00:00Z",
      actor_email: "o@x.test",
      action: "user.disabled",
      organization_name: null,
      organization_id: null,
      summary: "=cmd()",
    },
  ]);
  assert.match(csv, /"'=cmd\(\)"/);
  assert.equal(activity.activityQuery.parse({}).hideViews, true);
  assert.equal(activity.activityQuery.parse({ hideViews: "false" }).hideViews, false);
  assert.throws(() => activity.activityQuery.parse({ action: "x%' or 1=1" }));
});

test("team: platform owner, support and PLATFORM_OWNER_EMAIL members cannot be changed", async () => {
  const saved = process.env.PLATFORM_OWNER_EMAIL;
  try {
    const actions = [
      { action: "change_role", orgId: ORG, memberId: M_ADMIN, role: "learner" },
      { action: "remove_member", orgId: ORG, memberId: M_ADMIN, confirmName: "Adam Admin" },
      { action: "transfer_ownership", orgId: ORG, memberId: M_ADMIN, confirmName: "Acme Roofing" },
    ];
    for (const role of ["owner", "support"])
      for (const body of actions) {
        const db = teamDb({ roles: { [TARGET]: role } });
        await assert.rejects(
          teams.manageOwnerTeam(db, ACTOR, body, "https://app.test"),
          (e) => e.status === 403 && /protected/.test(e.message),
          `${role} ${body.action}`,
        );
        assert.equal(teamWrites(db).length, 0);
      }
    process.env.PLATFORM_OWNER_EMAIL = " Adam@ACME.test ";
    for (const body of actions) {
      const db = teamDb();
      await assert.rejects(
        teams.manageOwnerTeam(db, ACTOR, body, "https://app.test"),
        (e) => e.status === 403,
      );
      assert.equal(teamWrites(db).length, 0);
    }
  } finally {
    if (saved === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
    else process.env.PLATFORM_OWNER_EMAIL = saved;
  }
});

test("accounts: support staff are protected; email cannot move onto the owner or a staff address", async () => {
  const support = fakeDb({ accounts: { [TARGET]: target() }, roles: { [TARGET]: "support" } });
  await assert.rejects(
    accounts.manageOwnerAccount(support, ACTOR, {
      action: "disable",
      userId: TARGET,
      confirmEmail: "learner@example.invalid",
      reason: "abuse",
    }),
    (e) => e.status === 403 && /support/.test(e.message),
  );
  assert.equal(authWrites(support).length, 0);
  const saved = process.env.PLATFORM_OWNER_EMAIL;
  process.env.PLATFORM_OWNER_EMAIL = "Boss@Example.invalid";
  try {
    const body = {
      action: "change_email",
      userId: TARGET,
      email: "boss@example.invalid",
      confirmEmail: "boss@example.invalid",
      markConfirmed: true,
    };
    const toOwner = fakeDb({
      accounts: { [TARGET]: target() },
      rpc: { platform_find_user: () => ({ data: null, error: null }) },
    });
    await assert.rejects(
      accounts.manageOwnerAccount(toOwner, ACTOR, body),
      (e) => e.status === 403,
    );
    assert.equal(authWrites(toOwner).length, 0);
    assert.equal(
      toOwner.calls.some((c) => c.rpc === "platform_find_user"),
      false,
    );
  } finally {
    if (saved === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
    else process.env.PLATFORM_OWNER_EMAIL = saved;
  }
  const toStaff = fakeDb({
    accounts: { [TARGET]: target() },
    roles: { [OTHER_OWNER]: "support" },
    rpc: { platform_find_user: () => ({ data: OTHER_OWNER, error: null }) },
  });
  await assert.rejects(
    accounts.manageOwnerAccount(toStaff, ACTOR, {
      action: "change_email",
      userId: TARGET,
      email: "help@lt.test",
      confirmEmail: "help@lt.test",
      markConfirmed: false,
    }),
    (e) => e.status === 403 && /protected/.test(e.message),
  );
  assert.equal(authWrites(toStaff).length, 0);
});

test("resend confirmation: concurrent requests in one minute send exactly one email", async () => {
  const ids = new Set();
  const db = fakeDb({
    accounts: { [TARGET]: target({ email_confirmed_at: null }) },
    tables: {
      platform_owner_operations: (q) => {
        if (q.op === "select" && !q.single) return { data: [], error: null }; // both pass the pre-check
        if (q.op === "insert") {
          if (ids.has(q.payload.id)) return { data: null, error: { code: "23505" } };
          ids.add(q.payload.id);
          return { data: { id: q.payload.id }, error: null };
        }
        return { data: null, error: null };
      },
    },
  });
  const results = await Promise.allSettled(
    [1, 2, 3].map((n) =>
      accounts.manageOwnerAccount(db, ACTOR, {
        action: "resend_confirmation",
        userId: TARGET,
        requestId: `40000000-0000-4000-8000-00000000000${n}`,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(db.calls.filter((c) => c.resend).length, 1);
  assert.ok(
    results
      .filter((r) => r.status === "rejected")
      .every((r) => /last minute/.test(r.reason.message)),
  );
  const t = Date.parse("2026-10-23T12:00:10Z");
  assert.equal(accounts.resendBucketId(TARGET, t), accounts.resendBucketId(TARGET, t + 40000));
  assert.notEqual(accounts.resendBucketId(TARGET, t), accounts.resendBucketId(TARGET, t + 60000));
  assert.notEqual(accounts.resendBucketId(TARGET, t), accounts.resendBucketId(OTHER_OWNER, t));
  assert.match(
    accounts.resendBucketId(TARGET, t),
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("team: transfer refuses when the CURRENT account owner is platform staff or cannot be confirmed", async () => {
  const body = {
    action: "transfer_ownership",
    orgId: ORG,
    memberId: M_ADMIN,
    confirmName: "Acme Roofing",
  };
  for (const role of ["owner", "support"]) {
    const db = teamDb({ roles: { [ACTOR]: role } });
    await assert.rejects(
      teams.manageOwnerTeam(db, ACTOR, body, "https://app.test"),
      (e) => e.status === 403 && /protected/.test(e.message),
      role,
    );
    assert.equal(teamWrites(db).length, 0);
    assert.equal(audits(db).length, 0);
  }
  const saved = process.env.PLATFORM_OWNER_EMAIL;
  process.env.PLATFORM_OWNER_EMAIL = "OLIVIA@acme.test";
  try {
    const db = teamDb();
    await assert.rejects(
      teams.manageOwnerTeam(db, ACTOR, body, "https://app.test"),
      (e) => e.status === 403,
    );
    assert.equal(teamWrites(db).length, 0);
  } finally {
    if (saved === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
    else process.env.PLATFORM_OWNER_EMAIL = saved;
  }
  const lost = teamDb({ missingAccounts: [ACTOR] });
  await assert.rejects(
    teams.manageOwnerTeam(lost, ACTOR, body, "https://app.test"),
    (e) => e.status === 503 && /current owner/.test(e.message),
  );
  assert.equal(teamWrites(lost).length, 0);
});
