/** Actual authenticated plan API checks. Synthetic QA accounts, rejected mutations only. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const qa = JSON.parse(
  readFileSync("/Users/drive/.codex/tmp/language-threshold-qa/roofing-20261015.json", "utf8"),
);
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, "roofing-20261015");
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const url = `https://${qa.project}.supabase.co`,
  publicKey = keys.find((key) => key.name === "anon")?.api_key;
const service = createClient(url, keys.find((key) => key.name === "service_role")?.api_key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  clients = [];
async function login(email, password) {
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const result = await client.auth.signInWithPassword({ email, password });
  assert.ok(!result.error && result.data.session, "QA authentication");
  return result.data.session.access_token;
}
const [personal, learner, admin] = await Promise.all([
  login(qa.personalEmail, qa.personalPassword),
  login(qa.email, qa.password),
  login(qa.adminEmail, qa.adminPassword),
]);
const base = process.env.LT_QA_STAGE_URL || "http://127.0.0.1:4311";
assert.ok(
  base === "http://127.0.0.1:4311" ||
    /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/.test(base),
);
async function request(token, pathOrBody, origin = base) {
  const get = typeof pathOrBody === "string";
  const response = await fetch(base + (get ? pathOrBody : "/api/exam-reviewers"), {
    method: get ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Origin: origin,
      ...(!get ? { "Content-Type": "application/json" } : {}),
    },
    ...(!get ? { body: JSON.stringify(pathOrBody) } : {}),
  });
  return {
    status: response.status,
    cache: response.headers.get("cache-control"),
    body: await response.json(),
  };
}
// These existing hosted QA accounts have no platform-owner or content-reviewer grants.
const before = await Promise.all(
  [
    "assessment_reviewers",
    "assessment_content_reviewers",
    "assessment_reviewer_admin_events",
    "assessment_content_decisions",
    "assessment_content_exposures",
  ].map(async (table) => {
    const result = await service.from(table).select("*", { count: "exact", head: true });
    assert.equal(result.error, null);
    return [table, result.count];
  }),
);
for (const token of [personal, learner, admin, null]) {
  const registry = await request(token, "/api/exam-reviewers?module=roofing");
  assert.equal(registry.status, 403);
  assert.equal(registry.cache, "no-store");
  for (const kind of ["response", "curriculum", "fluent_language", "domain"])
    assert.equal(
      (
        await request(token, {
          userId: qa.personalId,
          moduleId: "roofing",
          target: "Spanish",
          native: "English",
          kind,
          active: true,
          expectedRevision: 0,
          reason: "Rejected unauthorized QA request",
          requestId: randomUUID(),
          confirmScope: true,
        })
      ).status,
      403,
    );
  assert.equal((await request(token, "/api/exam-content")).status, 403);
  assert.equal((await request(token, "/api/exam-content?form=not-a-visible-form")).status, 403);
}
assert.equal((await request(admin, {}, "https://example.invalid")).status, 403);
const contentResponse = await fetch(base + "/api/exam-content", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin}`, Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify({
    formId: "not-a-visible-form",
    kind: "domain",
    decision: "approved",
    fingerprint: "0".repeat(64),
    note: "Unauthorized QA rejection test",
    requestId: randomUUID(),
    confirmReview: true,
  }),
});
assert.equal(contentResponse.status, 403);
const anonReview = await fetch(base + "/api/exam-content", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(anonReview.status, 403);
const client = createClient(url, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await client.auth.signInWithPassword({ email: qa.adminEmail, password: qa.adminPassword });
for (const table of [
  "assessment_content_reviewers",
  "assessment_reviewer_admin_events",
  "assessment_content_decisions",
  "assessment_content_exposures",
]) {
  assert.ok((await client.from(table).select("*").limit(1)).error);
}
assert.ok(
  (
    await client.rpc("assessment_manage_reviewer", {
      p_actor: qa.adminId,
      p_user: qa.personalId,
      p_module: "roofing",
      p_target: "Spanish",
      p_native: "English",
      p_kind: "curriculum",
      p_active: true,
      p_expected: 0,
      p_reason: "Rejected QA direct RPC",
      p_request: randomUUID(),
    })
  ).error,
);
for (const [table, count] of before) {
  const result = await service.from(table).select("*", { count: "exact", head: true });
  assert.equal(result.error, null);
  assert.equal(result.count, count);
}
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  scope:
    "Existing synthetic QA accounts, denied requests only. No hosted grants, owner roles, decisions, exposures, certificates or invitations created.",
  checks: {
    registeredOwnerRequired: true,
    nonOwnerPostDenied: true,
    contentScopesRequired: true,
    anonymousDenied: true,
    wrongOriginDenied: true,
    unauthorizedContentDecisionDenied: true,
    directDatabaseAndRpcDenied: true,
    denialsCreateNoRecords: true,
    noStore: true,
  },
  limits: [
    "Positive owner/reviewer UI requires a genuine authorized account; local SQL verifies fictional positive workflows in a rollback transaction.",
  ],
};
writeFileSync(
  process.env.LT_QA_REPORT_PATH || "docs/reviews/qa-reviewer-access-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
await Promise.all([...clients, client].map((c) => c.auth.signOut({ scope: "local" })));
