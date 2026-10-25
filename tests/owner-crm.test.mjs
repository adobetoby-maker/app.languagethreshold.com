import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadModule } from "./helpers/bundle.mjs";
const OWNER = "10000000-0000-4000-8000-000000000001",
  CONTACT = "20000000-0000-4000-8000-000000000001",
  ASSET = "30000000-0000-4000-8000-000000000001",
  DRAFT = "40000000-0000-4000-8000-000000000001";
const contact = {
  id: CONTACT,
  name: "Synthetic Reviewer",
  email: "reviewer@example.invalid",
  expertise: "Synthetic expertise",
  notes: "PRIVATE FIXTURE NOTE",
  status: "follow_up",
  follow_up_on: "2026-11-01",
  user_id: null,
};
const asset = {
  id: ASSET,
  title: "Synthetic ad",
  category: "Test",
  url: "https://drive.google.com/file/d/synthetic-file/view",
};
const draft = {
  id: DRAFT,
  contact_id: CONTACT,
  subject: "Please review",
  body: "A synthetic cover note.",
  asset_ids: [ASSET],
  include_referral: false,
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/crm-route-"));
  const oldFetch = globalThis.fetch;
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "PLATFORM_OWNER_EMAIL",
  ];
  const saved = keys.map((k) => process.env[k]);
  try {
    await build({
      entryPoints: ["src/routes/api.owner-crm.ts"],
      outfile: join(dir, "route.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "route-shell",
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
    const { Route } = await import(join(dir, "route.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
    process.env.ANTHROPIC_API_KEY = "fake-ai";
    delete process.env.PLATFORM_OWNER_EMAIL;
    const c = {
      role: "owner",
      calls: [],
      aiBody: "",
      stop: "end_turn",
      aiText: JSON.stringify({ subject: "Synthetic subject", body: "Synthetic body." }),
      dbError: false,
      activeRef: false,
    };
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input));
      const method = init?.method ?? "GET";
      c.calls.push({
        path: u.pathname,
        host: u.hostname,
        method,
        body: init?.body,
        headers: init?.headers,
      });
      if (u.pathname === "/auth/v1/user")
        return Response.json({
          id: OWNER,
          email: "owner@example.invalid",
          email_confirmed_at: "2026-01-01",
        });
      if (u.pathname === "/rest/v1/platform_admin_roles")
        return Response.json(c.role === "learner" ? [] : [{ role: c.role }]);
      if (u.hostname === "api.anthropic.com") {
        c.aiBody = String(init.body);
        return Response.json({
          id: "msg_fixture",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5-5",
          content: [{ type: "text", text: c.aiText }],
          stop_reason: c.stop,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        });
      }
      if (u.pathname.startsWith("/auth/v1/admin/users/"))
        return Response.json({ id: OWNER, email: "other@example.invalid" });
      if (c.dbError)
        return Response.json({ message: "private provider secret diagnostics" }, { status: 500 });
      if (method !== "GET") return new Response(null, { status: 201 });
      if (u.pathname.endsWith("owner_crm_contacts"))
        return Response.json(u.searchParams.has("id") ? { id: CONTACT, user_id: null } : [contact]);
      if (u.pathname.endsWith("owner_crm_assets")) return Response.json([asset]);
      if (u.pathname.endsWith("owner_crm_drafts")) return Response.json([draft]);
      if (u.pathname.endsWith("customer_referral_links"))
        return Response.json(
          u.searchParams.has("user_id")
            ? c.activeRef
              ? { code: "50000000-0000-4000-8000-000000000001" }
              : null
            : [],
        );
      throw Error("Unexpected operation " + u.pathname);
    };
    const req = (body, { auth = true, origin = "https://app.invalid", signal } = {}) =>
      new Request("https://app.invalid/api/owner-crm", {
        method: body ? "POST" : "GET",
        signal,
        headers: {
          ...(auth ? { authorization: "Bearer fake" } : {}),
          ...(body ? { origin, "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const call = (body, opts) =>
      Route.server.handlers[body ? "POST" : "GET"]({ request: req(body, opts) });
    await run(c, call);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) =>
      saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
}
test("owner CRM rejects guests, learners and support before private reads, mutations or AI", () =>
  fixture(async (c, call) => {
    for (const body of [
      undefined,
      { action: "contact", contact },
      { action: "assets", assets: [asset] },
      { action: "draft", draft },
      { action: "generate", brief: "Synthetic brief for testing" },
    ]) {
      c.calls = [];
      assert.equal((await call(body, { auth: false })).status, 403);
      assert.equal(c.calls.length, 0);
      for (const role of ["learner", "support"]) {
        c.role = role;
        c.calls = [];
        assert.equal((await call(body)).status, 403);
        assert.ok(
          c.calls.every((x) => ["/auth/v1/user", "/rest/v1/platform_admin_roles"].includes(x.path)),
        );
      }
    }
  }));
test("malformed, cross-origin and send actions stop before auth", () =>
  fixture(async (c, call) => {
    for (const body of [
      { action: "send", id: DRAFT },
      { action: "assets", assets: [{ ...asset, url: "https://evil.invalid/x" }] },
      {
        action: "assets",
        assets: [{ ...asset, url: "https://drive.google.com/drive/folders/internal" }],
      },
      { action: "assets", assets: [{ ...asset, url: asset.url + "?token=private" }] },
      { action: "draft", draft: { ...draft, asset_ids: [ASSET, ASSET] } },
    ]) {
      c.calls = [];
      assert.equal((await call(body)).status, 400);
      assert.equal(c.calls.length, 0);
    }
    c.calls = [];
    assert.equal(
      (await call({ action: "contact", contact }, { origin: "https://evil.invalid" })).status,
      403,
    );
    assert.equal(c.calls.length, 0);
  }));
test("owner data stays private; unavailable schema has a fixed diagnostic", () =>
  fixture(async (c, call) => {
    const response = await call();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    const data = await response.json();
    assert.equal(data.contacts[0].name, contact.name);
    assert.equal(data.aiReady, true);
    c.dbError = true;
    const failed = await call();
    assert.equal(failed.status, 503);
    assert.match((await failed.json()).error, /migration/);
  }));
test("contact match, existing referral and selected asset checks protect draft preparation", () =>
  fixture(async (c, call) => {
    assert.equal(
      (await call({ action: "contact", contact: { ...contact, user_id: OWNER } })).status,
      400,
    );
    assert.equal(
      (await call({ action: "draft", draft: { ...draft, include_referral: true } })).status,
      400,
    );
    c.activeRef = true;
    assert.equal(
      (
        await call({
          action: "draft",
          draft: { ...draft, include_referral: true, referral_user_id: OWNER },
        })
      ).status,
      200,
    );
    c.calls = [];
    assert.equal((await call({ action: "contact", contact })).status, 200);
    assert.equal((await call({ action: "assets", assets: [asset] })).status, 200);
    assert.equal((await call({ action: "draft", draft })).status, 200);
    assert.equal((await call({ action: "draft", draft })).status, 200);
    const writes = c.calls.filter(
      (x) => x.path.endsWith("owner_crm_drafts") && x.method === "POST",
    );
    assert.equal(writes.length, 2);
    assert.ok(
      writes.every((x) =>
        new Headers(x.headers).get("prefer").includes("resolution=ignore-duplicates"),
      ),
    );
    assert.ok(c.calls.every((x) => x.host === "fixture.invalid")); // No email transport exists in this route.
  }));
test("AI sends only an explicit synthetic brief, validates output and never saves or sends", () =>
  fixture(async (c, call) => {
    const response = await call({
      action: "generate",
      brief: "Ask a synthetic reviewer for ad feedback.",
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).subject, "Synthetic subject");
    assert.ok(c.aiBody.includes("Ask a synthetic reviewer"));
    assert.ok(!c.aiBody.includes(contact.notes));
    assert.ok(!c.aiBody.includes(contact.email));
    assert.ok(!c.aiBody.includes(asset.url));
    assert.ok(!c.calls.some((x) => x.path.includes("owner_crm_")));
    c.aiText = "bad JSON";
    assert.equal((await call({ action: "generate", brief: "Synthetic test brief." })).status, 503);
    c.stop = "max_tokens";
    assert.equal((await call({ action: "generate", brief: "Synthetic test brief." })).status, 503);
  }));
test("cancelled request makes no provider or private data request", () =>
  fixture(async (c, call) => {
    const controller = new AbortController();
    controller.abort();
    const response = await call(
      { action: "generate", brief: "Synthetic test brief." },
      { signal: controller.signal },
    );
    assert.ok([400, 499].includes(response.status));
    assert.equal(c.calls.length, 0);
  }));
test("packet and unsent email contain only reviewed material and reject injected headers", async () => {
  const { packetText, emailDraftFile } = await loadModule("src/lib/owner-crm.ts");
  const code = "50000000-0000-4000-8000-000000000001";
  const packet = packetText("Review these ads.", [asset], code);
  assert.match(packet, /Ads for review/);
  assert.match(packet, /refer\?code=/);
  assert.ok(!packet.includes(contact.notes));
  const file = emailDraftFile(contact.email, "Please review ✓", packet);
  assert.match(file, /X-Unsent: 1/);
  assert.match(file, /Content-Type: text\/plain/);
  assert.ok(!file.includes("Bcc:"));
  assert.throws(() =>
    emailDraftFile("reviewer@example.invalid\r\nBcc: bad@example.invalid", "Subject", packet),
  );
  assert.throws(() => emailDraftFile(contact.email, "Subject\nBcc: bad", packet));
});
