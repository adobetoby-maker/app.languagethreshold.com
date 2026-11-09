import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { loadModule } from "./helpers/bundle.mjs";
const { downloadLead, isSetupLead } = await loadModule("src/lib/download-leads.ts");
const { recordDownloadLead } = await loadModule("src/routes/api.download-lead.ts", {
  stubs: [/^@tanstack\/react-router$/],
});
const key = "test-only-".padEnd(64, "x"),
  site = "medicalspanish.app";
const lead = {
  event_id: "a".repeat(64),
  site,
  email: "learner@example.com",
  resource_id: "medical-nursing",
  resource_title: "Nursing Spanish trifold",
  signup_page: "/free-downloads/",
  landing_page: "/nursing/",
  referrer_host: "google.com",
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "nursing",
  utm_content: "card1",
};
function req(
  body = lead,
  { secret = key, stamp = String(Date.now()), claim = site, raw = JSON.stringify(body) } = {},
) {
  return new Request("https://app.languagethreshold.com/api/download-lead", {
    method: "POST",
    headers: {
      "x-lead-site": claim,
      "x-lead-time": stamp,
      "x-lead-signature": createHmac("sha256", secret).update(`${stamp}.${raw}`).digest("hex"),
    },
    body: raw,
  });
}
test("schema rejects URL queries, external paths, unexpected fields and invalid emails", () => {
  assert.equal(downloadLead.safeParse(lead).success, true);
  for (const patch of [
    { signup_page: "/free-downloads/?email=private" },
    { landing_page: "https://evil.test/" },
    { email: "bad" },
    { site: "evil.test" },
    { is_test: true },
  ])
    assert.equal(downloadLead.safeParse({ ...lead, ...patch }).success, false);
  assert.equal(isSetupLead("adobetoby+ltfree20261108@gmail.com"), true);
  assert.equal(isSetupLead("toby@languagethreshold.com"), true);
  assert.equal(isSetupLead("learner@example.com"), false);
});
test("unsigned, tampered, expired and cross-site writes cannot reach storage", async () => {
  const oldKeys = process.env.DOWNLOAD_LEAD_KEYS,
    oldFetch = globalThis.fetch;
  process.env.DOWNLOAD_LEAD_KEYS = JSON.stringify({ [site]: key });
  globalThis.fetch = () => {
    throw Error("must not access storage");
  };
  try {
    for (const request of [
      req(lead, { secret: "wrong" }),
      req(lead, { stamp: String(Date.now() - 600_000) }),
      req({ ...lead, site: "constructionspanish.app" }),
      new Request("https://app.languagethreshold.com/api/download-lead", {
        method: "POST",
        body: "{}",
      }),
    ])
      assert.equal((await recordDownloadLead(request)).status, 403);
    assert.equal((await recordDownloadLead(req(lead, { raw: "x".repeat(5000) }))).status, 413);
  } finally {
    if (oldKeys === undefined) delete process.env.DOWNLOAD_LEAD_KEYS;
    else process.env.DOWNLOAD_LEAD_KEYS = oldKeys;
    globalThis.fetch = oldFetch;
  }
});
test("signed accepted request persists idempotently without exposing storage or CRM credentials", async () => {
  const names = ["DOWNLOAD_LEAD_KEYS", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    env = names.map((n) => process.env[n]);
  const oldFetch = globalThis.fetch;
  process.env.DOWNLOAD_LEAD_KEYS = JSON.stringify({ [site]: key });
  process.env.SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-fixture";
  let saved;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.match(url, /\/rest\/v1\/free_download_leads\?on_conflict=event_id/);
    assert.match(new Headers(init.headers).get("prefer"), /resolution=ignore-duplicates/);
    saved = JSON.parse(init.body);
    return new Response(null, { status: 201 });
  };
  try {
    const response = await recordDownloadLead(req());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(saved.is_test, false);
    assert.equal(saved.landing_page, "/nursing/");
  } finally {
    names.forEach((n, i) =>
      env[i] === undefined ? delete process.env[n] : (process.env[n] = env[i]),
    );
    globalThis.fetch = oldFetch;
  }
});
const { ownerDownloadLeads } = await loadModule("src/routes/api.owner-download-leads.ts", {
  stubs: [/^@tanstack\/react-router$/],
});
test("owner-only report refuses guests and non-owners before reading leads", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"],
    env = names.map((n) => process.env[n]);
  const oldFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-fixture";
  delete process.env.PLATFORM_OWNER_EMAIL;
  let role = "learner",
    reads = 0;
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user")
      return Response.json({
        id: "00000000-0000-4000-8000-000000000001",
        email: "test@example.com",
        email_confirmed_at: "2026-01-01",
      });
    if (path === "/rest/v1/platform_admin_roles")
      return Response.json(role === "learner" ? [] : [{ role }]);
    if (path.endsWith("/owner_download_lead_report")) {
      reads++;
      return Response.json({ requests: 0 });
    }
    throw Error("unexpected read");
  };
  try {
    assert.equal(
      (await ownerDownloadLeads(new Request("https://app.test/api/owner-download-leads"))).status,
      403,
    );
    for (role of ["learner", "support"])
      assert.equal(
        (
          await ownerDownloadLeads(
            new Request("https://app.test/api/owner-download-leads", {
              headers: { authorization: "Bearer fixture" },
            }),
          )
        ).status,
        403,
      );
    assert.equal(reads, 0);
    role = "owner";
    const result = await ownerDownloadLeads(
      new Request("https://app.test/api/owner-download-leads?days=30", {
        headers: { authorization: "Bearer fixture" },
      }),
    );
    assert.equal(result.status, 200);
    assert.equal(reads, 1);
    assert.match(result.headers.get("cache-control"), /no-store/);
  } finally {
    names.forEach((n, i) =>
      env[i] === undefined ? delete process.env[n] : (process.env[n] = env[i]),
    );
    globalThis.fetch = oldFetch;
  }
});
