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
const base =
  process.env.LT_QA_STAGE_URL ||
  "https://language-threshold-dhj2i3aj1-adobetoby-5572s-projects.vercel.app";
assert.match(
  base,
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
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
const ownQueue = await request(personal, "/api/exams?action=review_queue");
assert.equal(ownQueue.status, 200);
assert.equal(ownQueue.body.eligible, false);
const adminQueue = await request(admin, `/api/exams?action=review_queue&org=${qa.organizationId}`);
assert.equal(adminQueue.status, 200);
assert.equal(adminQueue.body.eligible, true);
const privatePath = `/api/exams?action=attempt&attempt=${qa.exams.personalAttemptId}`;
const personalResult = await request(personal, privatePath);
assert.equal(personalResult.status, 200);
assert.equal(personalResult.cache, "no-store");
assert.equal(personalResult.body.isLearner, true);
assert.equal(personalResult.body.aiWritingAvailable, false);
assert.equal((await request(admin, privatePath)).status, 403);
assert.equal((await request(learner, privatePath)).status, 403);
assert.equal((await request(null, "/api/exams")).status, 403);
const qaCheckpoints = await service
  .from("assessment_checkpoints")
  .select("id")
  .eq("enrollment_id", qa.exams.personalEnrollmentId);
assert.equal(qaCheckpoints.error, null);
const activeListeningAttempt = await service
  .from("assessment_attempts")
  .select("id")
  .in(
    "checkpoint_id",
    qaCheckpoints.data.map((row) => row.id),
  )
  .eq("status", "in_progress")
  .limit(1)
  .single();
assert.equal(activeListeningAttempt.error, null);
const activeListeningView = await request(
  personal,
  `/api/exams?action=attempt&attempt=${activeListeningAttempt.data.id}`,
);
assert.equal(activeListeningView.status, 200);
const listeningItem = activeListeningView.body.form.items.find((item) => item.audioRequired);
assert.ok(listeningItem, "Existing synthetic QA attempt has a listening item");
const listeningPath = `/api/exams?action=listening&attempt=${activeListeningAttempt.data.id}&item=${encodeURIComponent(listeningItem.id)}`;
// The staged production configuration does not enable synthetic pilot speech fallback.
const missingClip = await request(personal, listeningPath);
assert.equal(missingClip.status, 503);
assert.equal(missingClip.cache, "no-store");
assert.equal("text" in missingClip.body, false);
for (const token of [admin, learner, null])
  assert.equal((await request(token, listeningPath)).status, 403);
const team = await request(admin, `/api/exams?org=${qa.organizationId}`);
assert.equal(team.status, 200);
assert.ok(
  team.body.enrollments.every(
    (row) => row.scope === "team" && row.organization_id === qa.organizationId,
  ),
);
assert.ok(team.body.enrollments.some((row) => row.id === qa.exams.teamEnrollmentId));
assert.ok(team.body.enrollments.every((row) => row.checkpoints.every((cp) => !cp.pilotReady)));
const ownOverview = await request(personal, "/api/exams");
assert.equal(ownOverview.status, 200);
const ownPlan = ownOverview.body.enrollments.find(
  (row) => row.id === qa.exams.personalEnrollmentId,
);
const teamPlan = team.body.enrollments.find((row) => row.id === qa.exams.teamEnrollmentId);
assert.ok(ownPlan && teamPlan, "Both existing QA plans remain readable");
for (const plan of [ownPlan, teamPlan])
  assert.ok(
    plan.checkpoints.every((cp) => cp.ready === false),
    "Draft QA checkpoints never advertise official availability",
  );
assert.equal(JSON.stringify(team.body).includes('"answer"'), false);
assert.equal(JSON.stringify(team.body).includes("correctOptionId"), false);
const teamWorkspace = await request(admin, `/api/team?org=${qa.organizationId}`);
assert.equal(teamWorkspace.status, 200);
const tracked = Object.values(teamWorkspace.body.core30Tracks ?? {}).flat();
assert.ok(tracked.some((track) => track.enrollmentId === qa.exams.teamEnrollmentId));
assert.ok(tracked.every((track) => track.enrollmentId !== qa.exams.personalEnrollmentId));
const trackFields = new Set([
  "enrollmentId",
  "moduleId",
  "targetLanguage",
  "instructionLanguage",
  "startDate",
  "mastered",
  "total",
  "opened",
  "needsPractice",
  "status",
  "statusLabel",
  "lastReview",
]);
assert.ok(tracked.every((track) => Object.keys(track).every((key) => trackFields.has(key))));
assert.equal(JSON.stringify(teamWorkspace.body.core30Tracks).includes("correctOptionId"), false);
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
const roofingSource = readiness.body.tracks.find((row) => row.moduleId === "roofing");
assert.equal(roofingSource.authoredLessonLists, 30);
assert.equal(roofingSource.contextualPassages, 30);
assert.equal(roofingSource.sourceCoverage.lessonsWithTeachingSettings, 30);
assert.equal(roofingSource.sourceCoverage.structurallyComplete, true);
const landscaperSource = readiness.body.tracks.find((row) => row.moduleId === "landscaper");
assert.equal(landscaperSource.authoredLessonLists, 1);
assert.equal(landscaperSource.contextualPassages, 1);
assert.equal(landscaperSource.sourceCoverage.lessonsWithTeachingSettings, 0);
assert.deepEqual(
  landscaperSource.sourceCoverage.missingWordLists,
  Array.from({ length: 29 }, (_, index) => index + 2),
);
assert.equal(landscaperSource.sourceCoverage.structurallyComplete, false);
const shortSource = readiness.body.tracks.find((row) => row.moduleId === "travel-breakfast");
assert.deepEqual(
  shortSource.sourceCoverage.missingLessonNumbers,
  Array.from({ length: 15 }, (_, index) => index + 16),
);
const reverseRoofing = english.body.tracks.find((row) => row.moduleId === "roofing");
assert.equal(reverseRoofing.sourceCoverage.lessonsWithWords, 0);
assert.equal(reverseRoofing.sourceCoverage.lessonsWithPassages, 0);
assert.equal((await request(admin, "/api/exam-content")).status, 403);
assert.equal((await request(personal, "/api/exam-content")).status, 403);
for (const actor of [null, personal, learner, admin]) {
  const denied = await request(actor, "/api/exam-content?lessons=qa-unassigned-release");
  assert.equal(denied.status, 403);
  assert.equal(denied.cache, "no-store");
  assert.equal(Object.hasOwn(denied.body, "snapshot"), false);
  const write = await fetch(base + "/api/exam-content", {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(actor ? { Authorization: `Bearer ${actor}` } : {}),
    },
    body: JSON.stringify({
      action: "bind_lessons",
      releaseId: "qa-unassigned-release",
      fingerprint: "0".repeat(64),
      expectedManifest: {},
      contentVersion: "qa-unreleased",
      requestId: randomUUID(),
      confirmDraftSnapshot: true,
    }),
  });
  assert.equal(write.status, 403);
  assert.equal(write.headers.get("cache-control"), "no-store");
}
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
  commit: process.env.LT_QA_STAGE_COMMIT || null,
  catalogModules: 59,
  spanishTargetTracks: 57,
  englishTargetTracks: 59,
  scope:
    "Exact staged production artifact, existing synthetic QA records, no official forms published",
  checks: {
    reviewerControlsMatchStoredRoles: true,
    authenticatedPersonalRead: true,
    privateHiddenFromOtherAccounts: true,
    anonymousDenied: true,
    teamScopeOnly: true,
    noRawResponsesInOverview: true,
    productionPilotDisabled: true,
    privateListeningBoundaryAndMissingClipHonest: true,
    productionUncalibratedAiDenied: true,
    unreviewedSupportExcluded: true,
    compatibleReadinessTracksHonest: true,
    actualLessonSourceCoverageAndGaps: true,
    personalAndTeamDraftAvailabilityDenied: true,
    scopedTeamCore30Summary: true,
    privateContentDeniedToUnassignedAccounts: true,
    lessonSnapshotsDeniedToAnonymousAndUnassignedAccounts: true,
    lessonSnapshotBindingDeniedToNonOwners: true,
    noStore: true,
  },
};
writeFileSync(
  process.env.LT_QA_REPORT_PATH || "docs/reviews/qa-exams-stage-phone-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.checks));
await Promise.all(clients.map((client) => client.auth.signOut({ scope: "local" })));
