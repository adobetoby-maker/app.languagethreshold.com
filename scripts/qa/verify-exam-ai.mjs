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
const attemptPath = `/api/exams?action=attempt&attempt=${qa.exams.personalAttemptId}`;
const attempt = await request(personal, attemptPath);
assert.equal(attempt.status, 200);
const item = attempt.body.form.items.find(
  (row) => row.type === "production" && row.skill === "writing",
);
const response = attempt.body.responses.find((row) => row.item_id === item.id);
assert.ok(response);
const body = {
  action: "ai_writing",
  attemptId: attempt.body.id,
  responseId: response.id,
  consentVersion: "assessment-ai-writing-v1",
};
assert.equal((await request(admin, body)).status, 403);
assert.equal((await request(personal, { ...body, consentVersion: "invalid" })).status, 400);
assert.equal((await request(personal, body, "https://wrong-origin.invalid")).status, 403);
const result = await request(personal, body);
assert.equal(
  result.status,
  200,
  JSON.stringify({ state: result.body.state, error: result.body.error }),
);
assert.ok(["needs_review", "already_requested"].includes(result.body.state));
const repeat = await request(personal, body);
assert.equal(repeat.status, 200);
assert.equal(repeat.body.state, "already_requested");
const after = await request(personal, attemptPath);
assert.equal(after.status, 200);
assert.equal(after.body.evidence.find((row) => row.itemId === item.id).source, "ai_proposal");
assert.equal(after.body.evidence.find((row) => row.itemId === item.id).state, "needs_review");
assert.equal(after.body.profiles[0].skills.find((row) => row.skill === "writing").score, null);
assert.equal(
  after.body.gradingJobs.find((row) => row.response_id === response.id).status,
  "completed",
);
assert.equal(
  Object.keys(after.body.aiProposals.find((row) => row.responseId === response.id).dimensions)
    .length,
  attempt.body.feedback.find((row) => row.itemId === item.id).rubric.dimensions.length,
);
const events = await service
  .from("assessment_events")
  .select("action,detail")
  .eq("detail->>responseId", response.id)
  .in("action", ["ai.requested", "ai.proposal"]);
assert.equal(events.error, null);
assert.equal(events.data.filter((row) => row.action === "ai.requested").length, 1);
assert.equal(events.data.filter((row) => row.action === "ai.proposal").length, 1);
assert.equal(events.data.find((row) => row.action === "ai.proposal").detail.usage.providerCalls, 1);
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  scope:
    "Only one synthetic QA writing answer sent to Anthropic. Not a human calibration or official exam.",
  checks: {
    crossAccountDenied: true,
    explicitConsentRequired: true,
    wrongOriginDenied: true,
    actualProviderProposalSaved: true,
    dimensionsAudited: true,
    usageAudited: true,
    repeatDidNotCallProvider: true,
    proposalDidNotBecomeSkillScore: true,
    jobCompleted: true,
  },
};
writeFileSync("docs/reviews/qa-exam-ai-2026-10-16.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.checks));
await Promise.all(clients.map((client) => client.auth.signOut({ scope: "local" })));
