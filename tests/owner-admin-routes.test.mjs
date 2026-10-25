// Route guards for the new owner endpoints: guests and non-owners get 403 before any private
// read, malformed bodies get 400 before auth, Stripe-managed seats are refused, GA setup degrades.
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const OWNER = "10000000-0000-4000-8000-000000000001";
const ORG = "20000000-0000-4000-8000-000000000001";
const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PLATFORM_OWNER_EMAIL",
  "GA_PROPERTY_ID",
  "GA_SERVICE_ACCOUNT_JSON",
  "SUPPORT_INBOX_URL",
  "SUPPORT_INBOX_TOKEN",
];

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-admin-routes-"));
  const oldFetch = globalThis.fetch;
  const saved = KEYS.map((k) => process.env[k]);
  try {
    await build({
      stdin: {
        contents: `export {Route as support} from '@/routes/api.owner-support';export {Route as analytics} from '@/routes/api.owner-analytics';export {Route as teams} from '@/routes/api.owner-teams';export {Route as activity} from '@/routes/api.owner-activity';export {Route as users} from '@/routes/api.owner-users';export {Route as platform} from '@/routes/api.platform';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "api.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "shell",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "shell",
              namespace: "shell",
            }));
            b.onLoad({ filter: /.*/, namespace: "shell" }, () => ({
              contents: "export const createFileRoute=()=>config=>config;",
            }));
          },
        },
      ],
    });
    const api = await import(join(dir, "api.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
    for (const k of ["PLATFORM_OWNER_EMAIL", "GA_PROPERTY_ID", "GA_SERVICE_ACCOUNT_JSON"])
      delete process.env[k];
    delete process.env.SUPPORT_INBOX_URL;
    delete process.env.SUPPORT_INBOX_TOKEN;
    const c = { role: "learner", calls: [], stripe: false };
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      c.calls.push({ path: url.pathname, method: init?.method ?? "GET", body: init?.body });
      if (url.pathname === "/auth/v1/user")
        return Response.json({
          id: OWNER,
          email: "owner@example.invalid",
          email_confirmed_at: "2026-01-01",
        });
      if (url.pathname === "/rest/v1/platform_admin_roles")
        return Response.json(c.role === "learner" ? [] : [{ role: c.role }]);
      if (url.pathname === "/rest/v1/platform_audit_events")
        return new Response(null, { status: 201 });
      if (url.pathname === "/rest/v1/team_entitlements")
        return Response.json({ stripe_subscription_id: c.stripe ? "sub_fixture" : null });
      throw Error("Unexpected private operation " + url.pathname);
    };
    const request = (path, body, { auth = true, origin = "https://app.invalid" } = {}) =>
      new Request("https://app.invalid" + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(auth ? { authorization: "Bearer fake-token" } : {}),
          ...(body ? { origin, "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    await run(api, c, request);
  } finally {
    globalThis.fetch = oldFetch;
    KEYS.forEach((k, i) =>
      saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
}

const reads = [
  ["support", "/api/owner-support"],
  ["support", "/api/owner-support?id=8200000000000-00000000-0000-4000-8000-000000000001"],
  ["analytics", "/api/owner-analytics?part=app&range=30"],
  ["analytics", "/api/owner-analytics?part=ga&range=7"],
  ["teams", `/api/owner-teams?org=${ORG}`],
  ["activity", "/api/owner-activity?page=0"],
];
const writes = [
  [
    "support",
    "/api/owner-support",
    {
      action: "status",
      id: "8200000000000-00000000-0000-4000-8000-000000000001",
      status: "resolved",
    },
  ],
  [
    "support",
    "/api/owner-support",
    {
      action: "reply",
      id: "8200000000000-00000000-0000-4000-8000-000000000001",
      text: "Hello",
      requestId: ORG,
    },
  ],
  ["teams", "/api/owner-teams", { action: "revoke_invite", orgId: ORG, invitationId: ORG }],
  ["activity", "/api/owner-activity", { action: "export", filters: {} }],
  ["users", "/api/owner-users", { action: "enable", userId: ORG }],
  ["users", "/api/owner-users", { action: "export_csv" }],
];

test("guests, learners and support staff get 403 before any private read or write", () =>
  fixture(async (api, c, req) => {
    for (const [route, path] of reads) {
      c.calls = [];
      let r = await api[route].server.handlers.GET({
        request: req(path, undefined, { auth: false }),
      });
      assert.equal(r.status, 403, path);
      assert.equal(c.calls.length, 0);
      for (const role of ["learner", "support"]) {
        c.role = role;
        c.calls = [];
        r = await api[route].server.handlers.GET({ request: req(path) });
        assert.equal(r.status, 403, `${role} ${path}`);
        assert.deepEqual(
          c.calls.map((x) => x.path),
          ["/auth/v1/user", "/rest/v1/platform_admin_roles"],
        );
        assert.equal(r.headers.get("cache-control"), "private, no-store");
      }
    }
    for (const [route, path, body] of writes) {
      c.role = "support";
      c.calls = [];
      const r = await api[route].server.handlers.POST({ request: req(path, body) });
      assert.equal(r.status, 403, path);
      assert.equal(
        c.calls.some((x) => x.method !== "GET"),
        false,
      );
    }
  }));

test("malformed or cross-origin writes are rejected before authentication", () =>
  fixture(async (api, c, req) => {
    c.role = "owner";
    const bad = [
      ["teams", { action: "change_role", orgId: ORG, memberId: ORG, role: "god" }],
      ["teams", { action: "remove_member", orgId: "acme", memberId: ORG, confirmName: "x" }],
      ["activity", { action: "export", filters: { action: "a%' or 1=1" } }],
      ["users", { action: "disable", userId: ORG, confirmEmail: "a@b.co", reason: "" }],
      [
        "users",
        { action: "change_email", userId: ORG, email: "x", confirmEmail: "x", markConfirmed: true },
      ],
    ];
    for (const [route, body] of bad) {
      c.calls = [];
      const r = await api[route].server.handlers.POST({
        request: req(`/api/owner-${route}`, body),
      });
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.equal(c.calls.length, 0);
    }
    c.calls = [];
    const cross = await api.teams.server.handlers.POST({
      request: req("/api/owner-teams", writes[0][2], { origin: "https://evil.invalid" }),
    });
    assert.equal(cross.status, 403);
    assert.equal(c.calls.length, 0);
    const badOrg = await api.teams.server.handlers.GET({
      request: req("/api/owner-teams?org=nope"),
    });
    assert.equal(badOrg.status, 400);
  }));

test("missing GA configuration returns setup steps, not an error or a secret", () =>
  fixture(async (api, c, req) => {
    c.role = "owner";
    const r = await api.analytics.server.handlers.GET({
      request: req("/api/owner-analytics?part=ga&range=30"),
    });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.missing, ["GA_PROPERTY_ID", "GA_SERVICE_ACCOUNT_JSON"]);
    assert.match(body.setup.join(" "), /Viewer on property 538705307/);
    assert.ok(
      c.calls.some(
        (x) => x.path === "/rest/v1/platform_audit_events" && /analytics\.view/.test(x.body),
      ),
    );
    assert.equal(
      c.calls.some((x) => /googleapis/.test(x.path)),
      false,
    );
  }));

test("seats on a Stripe-managed company are refused; the owner is told to use Stripe", () =>
  fixture(async (api, c, req) => {
    c.role = "owner";
    c.stripe = true;
    const body = {
      action: "manual_grant",
      orgId: ORG,
      seats: 10,
      term: "annual",
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    const r = await api.platform.server.handlers.POST({ request: req("/api/platform", body) });
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /Use Stripe billing/);
    assert.equal(
      c.calls.some((x) => x.path === "/rest/v1/team_entitlements" && x.method === "PATCH"),
      false,
    );
  }));
