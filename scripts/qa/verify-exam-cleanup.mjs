/** Actual authenticated plan API checks. Synthetic QA accounts, rejected mutations only. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
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
const base =
  process.env.LT_QA_STAGE_URL ||
  "https://language-threshold-dhj2i3aj1-adobetoby-5572s-projects.vercel.app";
assert.match(
  base,
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
async function request(token, pathOrBody, origin = base) {
  const get = typeof pathOrBody === "string";
  const response = await fetch(base + (get ? pathOrBody : "/api/exams"), {
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

const before = await service
  .from("assessment_cleanup_runs")
  .select("id", { count: "exact", head: true });
assert.equal(before.error, null);
const unauth = await request(null, "/api/exam-cleanup");
assert.equal(unauth.status, 401);
assert.equal(unauth.cache, "no-store");
for (const token of [null, personal, learner, admin])
  assert.equal((await request(token, "/api/exam-cleanup?view=status")).status, 403);
for (const token of [personal, learner, admin])
  assert.equal((await request(token, "/api/exam-cleanup")).status, 401);
for (const client of clients)
  assert.ok(
    (await client.from("assessment_cleanup_runs").select("id").limit(1)).error,
    "Browser role cannot read operation records",
  );
const after = await service
  .from("assessment_cleanup_runs")
  .select("id", { count: "exact", head: true });
assert.equal(after.count, before.count);
const scheduled = await service
  .from("assessment_cleanup_runs")
  .select("id", { count: "exact", head: true })
  .eq("source", "scheduled_endpoint");
assert.equal(scheduled.count, 0);
const policies = await service
  .from("assessment_media_policies")
  .select("collection_enabled,cleanup_enabled,approved_at");
assert.ok(
  policies.data.every((p) => !p.collection_enabled && !p.cleanup_enabled && !p.approved_at),
);
const report = {
  testedAt: new Date().toISOString(),
  base,
  anonymousCronDenied: true,
  nonOwnerHistoryDenied: true,
  browserTablesDenied: true,
  noUnauthorizedRunCreated: true,
  recordedOperatorRuns: before.count,
  scheduledInvocations: scheduled.count,
  policiesStillDisabled: true,
  checks: 7,
};
if (process.env.LT_QA_REPORT_PATH)
  writeFileSync(process.env.LT_QA_REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
for (const client of clients) await client.auth.signOut({ scope: "local" });
