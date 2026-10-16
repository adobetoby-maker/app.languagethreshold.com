/** Actual authenticated plan API checks. Synthetic QA accounts, rejected mutations only. */
import assert from "node:assert/strict";
import { loadModule } from "../../tests/helpers/bundle.mjs";
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
const base = "https://language-threshold-27w6g0vhr-adobetoby-5572s-projects.vercel.app";
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
const privatePath = `/api/exams?action=attempt&attempt=${qa.exams.personalAttemptId}`;
const personalResult = await request(personal, privatePath);
assert.equal(personalResult.status, 200);
assert.equal(personalResult.cache, "no-store");
assert.equal(personalResult.body.isLearner, true);
assert.equal(personalResult.body.aiWritingAvailable, false);
assert.equal((await request(admin, privatePath)).status, 403);
assert.equal((await request(learner, privatePath)).status, 403);
assert.equal((await request(null, "/api/exams")).status, 403);
const team = await request(admin, `/api/exams?org=${qa.organizationId}`);
assert.equal(team.status, 200);
assert.ok(
  team.body.enrollments.every(
    (row) => row.scope === "team" && row.organization_id === qa.organizationId,
  ),
);
assert.ok(team.body.enrollments.some((row) => row.id === qa.exams.teamEnrollmentId));
assert.ok(team.body.enrollments.every((row) => row.checkpoints.every((cp) => !cp.pilotReady)));
assert.equal(JSON.stringify(team.body).includes('"answer"'), false);
assert.equal(JSON.stringify(team.body).includes("correctOptionId"), false);
const plan = await request(personal, `/api/exam-plans?enrollment=${qa.exams.personalEnrollmentId}`);
assert.equal(plan.status, 200);
assert.equal(plan.body.availability, "awaiting_calibration");
assert.deepEqual(plan.body.candidates, []);
const readiness = await request(
  personal,
  "/api/exams?action=readiness&target=Spanish&native=English",
);
assert.equal(readiness.status, 200);
assert.equal(readiness.body.tracks.length, 57);
const { MODULES, moduleSupportsLearningPair } = await loadModule("src/data/modules.ts");
assert.equal(MODULES.length, 59);
assert.deepEqual(
  readiness.body.tracks.map((row) => row.moduleId).sort(),
  MODULES.filter((row) => moduleSupportsLearningPair(row, "Spanish", "English"))
    .map((row) => row.id)
    .sort(),
);
assert.deepEqual(
  MODULES.filter((row) => !moduleSupportsLearningPair(row, "Spanish", "English"))
    .map((row) => row.id)
    .sort(),
  ["fmg", "or-evs"],
);
const english = await request(
  personal,
  "/api/exams?action=readiness&target=English&native=Spanish",
);
assert.equal(english.status, 200);
assert.equal(english.body.tracks.length, 59);
assert.ok(english.body.tracks.some((row) => row.moduleId === "fmg"));
assert.ok(english.body.tracks.some((row) => row.moduleId === "or-evs"));
assert.ok(readiness.body.tracks.every((row) => row.status !== "verified"));
assert.equal((await request(admin, "/api/exam-content")).status, 403);
assert.equal((await request(personal, "/api/exam-content")).status, 403);
const aiItem = personalResult.body.form.items.find(
  (row) => row.type === "production" && row.skill === "writing",
);
const response = personalResult.body.responses.find((row) => row.item_id === aiItem.id);
const deniedAi = await fetch(base + "/api/exams", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${personal}`,
    Origin: base,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "ai_writing",
    attemptId: personalResult.body.id,
    responseId: response.id,
    consentVersion: "assessment-ai-writing-v1",
  }),
});
assert.equal(deniedAi.status, 409);
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  commit: "a33fb0f",
  catalogModules: 59,
  spanishTargetTracks: 57,
  englishTargetTracks: 59,
  scope:
    "Exact staged production artifact, existing synthetic QA records, no official forms published",
  checks: {
    authenticatedPersonalRead: true,
    privateHiddenFromOtherAccounts: true,
    anonymousDenied: true,
    teamScopeOnly: true,
    noRawResponsesInOverview: true,
    productionPilotDisabled: true,
    productionUncalibratedAiDenied: true,
    unreviewedSupportExcluded: true,
    compatibleReadinessTracksHonest: true,
    ownerContentDeniedToNonOwners: true,
    noStore: true,
  },
};
writeFileSync(
  "docs/reviews/qa-exams-stage-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.checks));
await Promise.all(clients.map((client) => client.auth.signOut({ scope: "local" })));
