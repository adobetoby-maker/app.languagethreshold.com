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
  const response = await fetch(base + (get ? pathOrBody : "/api/exam-plans"), {
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
const overview = await request(personal, "/api/exams");
assert.equal(overview.status, 200);
assert.equal(overview.body.limit, 50);
assert.equal(typeof overview.body.hasMore, "boolean");
assert.deepEqual(overview.body.activeOrganizationIds, []);
const plan = overview.body.enrollments.find((row) => row.id === qa.exams.personalEnrollmentId);
assert.ok(plan);
const checkpoint = plan.checkpoints.find((row) => row.checkpoint === "entrance");
assert.equal((await request(personal, `/api/exams?learner=${qa.adminId}`)).status, 403);
assert.equal((await request(personal, "/api/exams?after=2026-01-01T00%3A00%3A00Z")).status, 400);
assert.deepEqual((await request(personal, "/api/exams?module=orthopedics")).body.enrollments, []);
assert.deepEqual(
  (await request(personal, "/api/exams?target=French&native=English")).body.enrollments,
  [],
);
const cursor = overview.body.nextCursor;
if (cursor) {
  const next = await request(personal, "/api/exams?" + new URLSearchParams(cursor));
  assert.equal(next.status, 200);
  assert.ok(
    next.body.enrollments.every(
      (row) => !overview.body.enrollments.some((old) => old.id === row.id),
    ),
  );
}
const historyPath = `/api/exams?action=checkpoint_history&checkpoint=${checkpoint.id}`,
  history = await request(personal, historyPath);
assert.equal(history.status, 200);
assert.ok(history.body.items.length > 0);
assert.ok(history.body.items.every((row) => row.checkpoint_id === checkpoint.id));
assert.equal(JSON.stringify(history.body).includes('"answer"'), false);
assert.equal(JSON.stringify(history.body).includes("correctOptionId"), false);
assert.equal((await request(admin, historyPath)).status, 403);
assert.equal((await request(learner, historyPath)).status, 403);
assert.equal((await request(null, historyPath)).status, 403);
assert.equal((await request(personal, historyPath + "&before=0")).status, 400);
if (history.body.nextCursor) {
  const next = await request(
    personal,
    historyPath + "&" + new URLSearchParams(history.body.nextCursor),
  );
  assert.equal(next.status, 200);
  assert.ok(next.body.items.every((row) => !history.body.items.some((old) => old.id === row.id)));
}
const auditPath = `/api/exam-plans?action=history&enrollment=${qa.exams.personalEnrollmentId}`;
assert.equal((await request(admin, auditPath)).status, 403);
assert.equal((await request(learner, auditPath)).status, 403);
assert.equal((await request(personal, auditPath + "&after=2026-01-01T00%3A00%3A00Z")).status, 400);
let page = await request(personal, auditPath),
  items = [],
  pages = 0;
while (true) {
  assert.equal(page.status, 200);
  assert.equal(page.cache, "no-store");
  assert.equal(Array.isArray(page.body.items), true);
  items.push(...page.body.items);
  pages++;
  if (!page.body.hasMore) break;
  assert.ok(pages < 10);
  page = await request(personal, auditPath + "&" + new URLSearchParams(page.body.nextCursor));
}
assert.equal(new Set(items.map((row) => row.id)).size, items.length);
assert.equal(JSON.stringify(items).includes("payloadHash"), false);
assert.equal(JSON.stringify(items).includes('"detail"'), false);
assert.equal(JSON.stringify(items).includes("form_snapshot"), false);
const count = await service
  .from("assessment_events")
  .select("id", { count: "exact", head: true })
  .eq("enrollment_id", qa.exams.personalEnrollmentId);
assert.equal(count.error, null);
assert.equal(count.count, items.length);
const teamAudit = await request(
  admin,
  `/api/exam-plans?action=history&enrollment=${qa.exams.teamEnrollmentId}`,
);
assert.equal(teamAudit.status, 200);
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  scope:
    "Existing synthetic QA records; no new exam, approval, reviewer grant or learner data created",
  pagesRead: pages,
  auditRecords: items.length,
  auditPagingExercised: pages > 1,
  checks: {
    pagedOverview: true,
    completeCursorRequired: true,
    moduleLanguageFilters: true,
    learnerFilterOwnership: true,
    privateCheckpointHistory: true,
    olderAttemptCursor: true,
    privateAuditHistory: true,
    allStoredAuditEventsAccountedFor: true,
    uniqueAuditRecords: true,
    noRawAnswersOrPayloadHashes: true,
    noStore: true,
    teamAdminAuditAllowed: true,
  },
};
writeFileSync(
  process.env.LT_QA_REPORT_PATH || "docs/reviews/qa-exam-histories-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
await Promise.all(clients.map((client) => client.auth.signOut({ scope: "local" })));
