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
const base = "http://127.0.0.1:4311";
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
assert.equal((await request(admin, "/api/exam-content")).status, 403);
assert.equal((await request(personal, "/api/exam-content?form=missing-reference")).status, 403);
assert.equal((await request(null, "/api/exam-content")).status, 403);
const personalQueue = await request(personal, "/api/exams?action=review_queue");
assert.equal(personalQueue.status, 200);
assert.deepEqual(personalQueue.body.items, []);
assert.equal(personalQueue.cache, "no-store");
const teamQueue = await request(admin, `/api/exams?action=review_queue&org=${qa.organizationId}`);
assert.equal(teamQueue.status, 200);
assert.ok(teamQueue.body.items.every((row) => row.learner_id !== qa.adminId));
assert.equal(
  (await request(learner, `/api/exams?action=review_queue&org=${qa.organizationId}`)).status,
  403,
);
assert.equal((await request(null, "/api/exams?action=review_queue")).status, 403);
assert.equal(JSON.stringify(teamQueue.body).includes('"answer"'), false);
const personalPath = `/api/exam-plans?enrollment=${qa.exams.personalEnrollmentId}`,
  teamPath = `/api/exam-plans?enrollment=${qa.exams.teamEnrollmentId}`;
const individual = await request(personal, personalPath);
assert.equal(individual.status, 200);
assert.equal(individual.cache, "no-store");
assert.equal(individual.body.isLearner, true);
assert.equal(individual.body.canManage, true);
assert.equal(individual.body.availability, "awaiting_calibration");
assert.deepEqual(individual.body.candidates, []);
assert.equal(JSON.stringify(individual.body).includes("correctOptionId"), false);
assert.equal((await request(admin, personalPath)).status, 403);
assert.equal((await request(learner, personalPath)).status, 403);
assert.equal((await request(null, personalPath)).status, 403);
const teamAdmin = await request(admin, teamPath);
assert.equal(teamAdmin.status, 200);
assert.equal(teamAdmin.body.canManage, true);
assert.equal(teamAdmin.body.isLearner, false);
const teamLearner = await request(learner, teamPath);
assert.equal(teamLearner.status, 200);
assert.equal(teamLearner.body.canManage, false);
assert.equal(
  (await request(personal, personalPath + `&attempt=${qa.exams.teamAttemptId}`)).status,
  403,
);
const daily = await request(
  personal,
  "/api/exam-plans?action=daily&module=roofing&target=Spanish&native=English",
);
assert.equal(daily.status, 200);
assert.ok(daily.body.plans.length >= 1);
assert.ok(daily.body.plans.every((plan) => plan.scope === "personal"));
assert.deepEqual(daily.body.returnContexts, []);
const before = await service
  .from("assessment_recommendations")
  .select("id", { count: "exact", head: true })
  .in("enrollment_id", [qa.exams.personalEnrollmentId, qa.exams.teamEnrollmentId]);
assert.equal(before.error, null);
const suggestion = {
  action: "suggest",
  enrollmentId: qa.exams.personalEnrollmentId,
  attemptId: qa.exams.personalAttemptId,
  capabilityId: "missing-unreviewed-fixture",
  reason: "QA ONLY — reject unpublished support",
  requestId: randomUUID(),
};
assert.equal((await request(personal, suggestion)).status, 400);
assert.equal((await request(personal, suggestion, "https://wrong-origin.invalid")).status, 403);
const revise = {
  action: "revise",
  enrollmentId: qa.exams.teamEnrollmentId,
  attemptId: qa.exams.teamAttemptId,
  startLesson: 1,
  focusWays: ["recall"],
  catchupObjectives: [],
  reviewEveryDays: 4,
  reason: "QA ONLY — draft scores cannot change a plan",
  requestId: randomUUID(),
};
assert.equal((await request(learner, revise)).status, 403);
assert.equal((await request(admin, revise)).status, 400);
const after = await service
  .from("assessment_recommendations")
  .select("id", { count: "exact", head: true })
  .in("enrollment_id", [qa.exams.personalEnrollmentId, qa.exams.teamEnrollmentId]);
assert.equal(after.error, null);
assert.equal(after.count, before.count);
const browser = clients[0];
const direct = await browser.from("assessment_support_capabilities").select("id");
assert.ok(direct.error, "Browser role cannot read support mappings directly");
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  scope: "Synthetic QA only; forms remain draft; no support assignments or plan revisions created",
  checks: {
    ownerContentHiddenFromNonOwners: true,
    reviewerQueuePrivateAndScoped: true,
    independentPlanVisible: true,
    personalHiddenFromAdminAndOtherLearner: true,
    anonymousDenied: true,
    noStore: true,
    noQuestionKeys: true,
    adminTeamManage: true,
    learnerCannotApproveTeamPlan: true,
    dailyOwnScope: true,
    unreviewedContentExcluded: true,
    crossPlanSourceDenied: true,
    wrongOriginDenied: true,
    draftScoresCannotRevisePlan: true,
    directDatabaseDenied: true,
    rejectedSuggestionsCreateNoRecords: true,
  },
};
writeFileSync("docs/reviews/qa-exam-plans-2026-10-16.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.checks));
await Promise.all(clients.map((client) => client.auth.signOut({ scope: "local" })));
