/** Dedicated QA learner preferences only; restore choices and never grant/review/assign content. */
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
const base = process.env.LT_QA_STAGE_URL || "http://127.0.0.1:4311";
assert.ok(
  base === "http://127.0.0.1:4311" ||
    /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/.test(base),
);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const url = `https://${qa.project}.supabase.co`,
  key = keys.find((row) => row.name === "anon")?.api_key,
  clients = [];
const service = createClient(
  url,
  keys.find((row) => row.name === "service_role" && !row.disabled)?.api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function login(email, password) {
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  clients.push(c);
  const r = await c.auth.signInWithPassword({ email, password });
  assert.equal(r.error, null);
  return r.data.session.access_token;
}
const [personal, learner, admin] = await Promise.all([
  login(qa.personalEmail, qa.personalPassword),
  login(qa.email, qa.password),
  login(qa.adminEmail, qa.adminPassword),
]);
async function request(token, body, origin = base) {
  const get = typeof body === "string";
  const r = await fetch(base + (get ? body : "/api/exam-plans"), {
    method: get ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Origin: origin,
      ...(!get ? { "Content-Type": "application/json" } : {}),
    },
    ...(!get ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  return { status: r.status, cache: r.headers.get("cache-control"), body: await r.json() };
}
const planPath = (en) => `/api/exam-plans?enrollment=${en}`;
const originalPersonal = await request(personal, planPath(qa.exams.personalEnrollmentId)),
  originalTeam = await request(learner, planPath(qa.exams.teamEnrollmentId));
assert.equal(originalPersonal.status, 200);
assert.equal(originalTeam.status, 200);
const goalCommand = (en, goals, expected = goals.revision) => ({
  action: "save_goals",
  enrollmentId: en,
  topics: goals.topics,
  offlinePreferred: goals.offlinePreferred,
  expectedRevision: expected,
  requestId: randomUUID(),
});
async function counts() {
  return Promise.all(
    ["assessment_recommendations", "assessment_support_assignments"].map(async (table) => {
      const r = await service
        .from(table)
        .select("id", { head: true, count: "exact" })
        .in("enrollment_id", [qa.exams.personalEnrollmentId, qa.exams.teamEnrollmentId]);
      assert.equal(r.error, null);
      return [table, r.count];
    }),
  );
}
const before = await counts();
let succeeded = false;
try {
  const command = goalCommand(qa.exams.personalEnrollmentId, {
    topics: ["everyday_conversation"],
    offlinePreferred: true,
    revision: originalPersonal.body.goals.revision,
  });
  const saved = await request(personal, command);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.revision, command.expectedRevision + 1);
  assert.deepEqual(
    (await request(personal, command)).body,
    saved.body,
    "Retry must reuse saved revision",
  );
  assert.equal(
    (await request(personal, { ...command, offlinePreferred: false })).status,
    409,
    "Reused payload key rejected",
  );
  assert.equal(
    (await request(personal, { ...command, requestId: randomUUID() })).status,
    409,
    "Stale revision rejected",
  );
  const view = await request(personal, planPath(qa.exams.personalEnrollmentId));
  assert.equal(view.cache, "no-store");
  assert.deepEqual(view.body.goals.topics, ["everyday_conversation"]);
  assert.equal(view.body.goals.offlinePreferred, true);
  assert.equal(view.body.goalAvailability, "content_gap");
  assert.deepEqual(view.body.candidates, [], "No invented verified mappings");
  const invalid = goalCommand(qa.exams.personalEnrollmentId, {
    topics: ["everyday_conversation", "everyday_conversation"],
    offlinePreferred: true,
    revision: saved.body.revision,
  });
  assert.equal((await request(personal, invalid)).status, 400);
  for (const token of [admin, learner, null])
    assert.equal(
      (
        await request(
          token,
          goalCommand(qa.exams.personalEnrollmentId, {
            topics: [],
            offlinePreferred: false,
            revision: saved.body.revision,
          }),
        )
      ).status,
      403,
    );
  assert.equal((await request(personal, command, "https://example.invalid")).status, 403);
  const teamCommand = goalCommand(qa.exams.teamEnrollmentId, {
    topics: ["numbers_measurements"],
    offlinePreferred: false,
    revision: originalTeam.body.goals.revision,
  });
  assert.equal((await request(learner, teamCommand)).status, 200);
  const teamAdmin = await request(admin, planPath(qa.exams.teamEnrollmentId));
  assert.equal(teamAdmin.status, 200);
  assert.deepEqual(teamAdmin.body.goals.topics, ["numbers_measurements"]);
  assert.equal(teamAdmin.body.isLearner, false);
  assert.equal(
    (
      await request(admin, {
        ...teamCommand,
        requestId: randomUUID(),
        expectedRevision: teamCommand.expectedRevision + 1,
      })
    ).status,
    403,
    "Admin cannot invent learner goals",
  );
  const suggest = {
    action: "suggest_goal",
    enrollmentId: qa.exams.teamEnrollmentId,
    capabilityId: "qa-unreviewed-nonexistent",
    goalRevision: teamCommand.expectedRevision + 1,
    reason: "Rejected unreviewed QA suggestion",
    requestId: randomUUID(),
  };
  assert.equal((await request(learner, suggest)).status, 403, "Team learner cannot assign support");
  assert.equal((await request(admin, suggest)).status, 400, "Unreviewed support is not eligible");
  assert.deepEqual(await counts(), before, "Goals do not assign or publish anything");
  succeeded = true;
} finally {
  for (const [token, en, original] of [
    [personal, qa.exams.personalEnrollmentId, originalPersonal],
    [learner, qa.exams.teamEnrollmentId, originalTeam],
  ]) {
    const current = await request(token, planPath(en));
    assert.equal(current.status, 200);
    if (
      JSON.stringify(current.body.goals.topics) !== JSON.stringify(original.body.goals.topics) ||
      current.body.goals.offlinePreferred !== original.body.goals.offlinePreferred
    )
      assert.equal(
        (await request(token, goalCommand(en, original.body.goals, current.body.goals.revision)))
          .status,
        200,
        "Restore original QA preferences",
      );
  }
  await Promise.all(clients.map((c) => c.auth.signOut({ scope: "local" })));
}
assert.ok(succeeded);
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  commit: process.env.LT_QA_STAGE_COMMIT ?? null,
  scope:
    "Dedicated QA choices saved and restored; no business learner data, assignments, reviews or certificates changed",
  checks: {
    personalSaveAndRead: true,
    teamLearnerSaveAdminRead: true,
    adminCannotChangeLearnerChoice: true,
    staleRevisionAndRetryPayloadProtected: true,
    wrongOriginAndOtherAccountDenied: true,
    anonymousDenied: true,
    duplicatesRejected: true,
    noUnreviewedSuggestions: true,
    teamLearnerCannotApprove: true,
    preferencesRestored: true,
    noAssignmentsCreated: true,
    noStore: true,
  },
};
if (process.env.LT_QA_REPORT_PATH)
  writeFileSync(process.env.LT_QA_REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
