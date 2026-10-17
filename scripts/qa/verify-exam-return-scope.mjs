import { assertQaStage } from "./stage-origin.mjs";
/** Read-only verification after the documented normal QA learner/admin browser trial. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { core30ScopeKey } from "../../src/lib/core30-scope.ts";
const qa = JSON.parse(
  readFileSync("/Users/drive/.codex/tmp/language-threshold-qa/roofing-20261015.json", "utf8"),
);
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, "roofing-20261015");
const base = process.env.LT_QA_STAGE_URL;
assertQaStage(base);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const url = `https://${qa.project}.supabase.co`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, keys.find((row) => row.name === "service_role").api_key, opts);
const sessions = [];
async function login(email, password) {
  const client = createClient(url, keys.find((row) => row.name === "anon").api_key, opts);
  sessions.push(client);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null);
  return data;
}
const [learner, admin] = await Promise.all([
  login(qa.email, qa.password),
  login(qa.adminEmail, qa.adminPassword),
]);
try {
  const profiles = await service
    .from("profiles")
    .select("id,data")
    .in("id", [qa.learnerId, qa.personalId]);
  assert.equal(profiles.error, null);
  const pair = { targetLanguage: "Spanish", instructionLanguage: "English" };
  const assigned = { ...pair, enrollmentId: qa.exams.teamEnrollmentId };
  const b = profiles.data.find((row) => row.id === qa.learnerId).data;
  const a = profiles.data.find((row) => row.id === qa.personalId).data;
  const teamLog = b.core30Log[core30ScopeKey("roofing", assigned)];
  assert.ok(teamLog.lessons["29"].wayVisits.see, "Original scoped QA visit retained");
  assert.ok(
    teamLog.lessons["1"].wayVisits.recall,
    "Current team return trial persisted Recall visit",
  );
  assert.equal(Object.keys(teamLog.lessons).length, 2);
  assert.equal(
    Object.values(teamLog.lessons).some((row) => !!row.masteredAt),
    false,
  );
  assert.equal(b.core30Log[core30ScopeKey("roofing", pair)], undefined);
  const personalLog =
    a.core30Log[
      core30ScopeKey("roofing", { ...pair, enrollmentId: qa.exams.personalEnrollmentId })
    ];
  assert.ok(personalLog.lessons["15"].wayVisits.hear);
  assert.equal(personalLog.lessons["15"].masteredAt, undefined);
  const response = await fetch(`${base}/api/team?org=${qa.organizationId}`, {
    headers: { Authorization: `Bearer ${admin.session.access_token}`, Origin: base },
  });
  assert.equal(response.status, 200);
  const team = await response.json(),
    track = team.core30Tracks[qa.learnerId].find(
      (row) => row.enrollmentId === qa.exams.teamEnrollmentId,
    );
  assert.equal(track.opened, 2);
  assert.equal(track.mastered, 0);
  assert.equal(JSON.stringify(team).includes(qa.exams.personalEnrollmentId), false);
  const attempt = await service
    .from("assessment_attempts")
    .select("revision,status,submitted_at")
    .eq("id", "e38a3572-6cc9-4ae0-9c47-2d8284cf7861")
    .single();
  assert.equal(attempt.error, null);
  assert.equal(attempt.data.revision, 12);
  assert.equal(attempt.data.status, "in_progress");
  assert.equal(attempt.data.submitted_at, null);
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: process.env.LT_QA_STAGE_COMMIT,
    preview: base,
    checks: {
      originalTeamVisitRetained: true,
      newRecallVisitPersisted: true,
      teamOpenedCountMatchesTwoActualVisits: true,
      currentMasteredRemainsZero: true,
      personalHearVisitInItsOwnEnrollment: true,
      personalPlanIdExcludedFromTeamResponse: true,
      existingExamDraftUnchanged: true,
    },
    teamActivity: {
      opened: 2,
      currentMastered: 0,
      previousOpened: 1,
      newOpenedLesson: 1,
      originalOpenedLesson: 29,
    },
    personalExam: { revision: 12, status: "in_progress", unsubmitted: true },
    limits: [
      "Normal browser trials intentionally recorded synthetic learner lesson visits; no mastery or official assessment result was submitted",
      "Earlier8-group scope report remains its historical one-visit baseline; this follow-up records the deliberate second visited lesson",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-exam-return-scope-2026-10-16.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await Promise.all(sessions.map((client) => client.auth.signOut({ scope: "local" })));
}
