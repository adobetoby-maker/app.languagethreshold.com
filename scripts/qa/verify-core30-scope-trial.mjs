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
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
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
const profiles = await service
  .from("profiles")
  .select("id,data")
  .in("id", [learner.user.id, admin.user.id]);
assert.equal(profiles.error, null);
const learnerData = profiles.data.find((row) => row.id === learner.user.id).data;
const adminData = profiles.data.find((row) => row.id === admin.user.id).data;
const personal = { targetLanguage: "Spanish", instructionLanguage: "English" };
const assigned = { ...personal, enrollmentId: qa.exams.teamEnrollmentId };
const teamLog = learnerData.core30Log[core30ScopeKey("roofing", assigned)];
assert.ok(teamLog?.lessons["29"]?.wayVisits?.see);
assert.equal(teamLog.lessons["29"].masteredAt, undefined);
assert.equal(Object.keys(teamLog.lessons).length, 1);
assert.equal(learnerData.core30Log[core30ScopeKey("roofing", personal)], undefined);
assert.equal(
  learnerData.core30Log[core30ScopeKey("roofing", { ...personal, targetLanguage: "Italian" })],
  undefined,
);
const old = adminData.core30Log.landscaper;
const copied = adminData.core30Log[core30ScopeKey("landscaper", personal)];
assert.ok(old?.lessons["1"]);
assert.ok(copied?.legacyImportedAt);
assert.deepEqual(copied.lessons, old.lessons);
assert.ok(Object.values(copied.lessons).every((lesson) => !lesson.masteredAt));
const response = await fetch(`${base}/api/team?org=${qa.organizationId}`, {
  headers: { Authorization: `Bearer ${admin.session.access_token}`, Origin: base },
});
assert.equal(response.status, 200);
const team = await response.json();
const current = team.core30Tracks[learner.user.id].find(
  (track) => track.enrollmentId === qa.exams.teamEnrollmentId,
);
assert.equal(current.opened, 1);
assert.equal(current.mastered, 0);
const legacy = team.core30[learner.user.id].roofing;
assert.equal(Object.values(legacy.lessons).filter((lesson) => lesson.masteredAt).length, 1);
assert.equal(
  Object.values(legacy.lessons).filter(
    (lesson) =>
      Object.keys(lesson.visits ?? {}).length || Object.keys(lesson.wayVisits ?? {}).length,
  ).length,
  3,
);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  target: base,
  scope:
    "Read-only database and team API checks after actual normal browser activity on dedicated QA accounts",
  checks: {
    assignedSpanishRoofing29Saved: true,
    openingDidNotGrantMastery: true,
    independentSpanishAndItalianRecordsNotInferred: true,
    earlierLandscaperHistoryPreserved: true,
    explicitPairClaimPersisted: true,
    claimDidNotCreateMastery: true,
    scopedAdminCountMatchesLearnerActivity: true,
    earlierAdminCountsRemainSeparate: true,
  },
  teamPlan: {
    mastered: current.mastered,
    opened: current.opened,
    statusLabel: current.statusLabel,
  },
  earlierRecord: { selfMarkedMastered: 1, opened: 3 },
  claimedHistory: { lessonsOpened: 1, selfMarkedMastered: 0 },
  writes:
    "No profile, lesson, exam, score, certificate, role or review mutations; normal temporary QA auth sessions only.",
  limits: [
    "These are functional QA records, not assessed proficiency.",
    "Browser activity opened a lesson and explicitly linked known existing practice; no mastery or exam response was submitted.",
  ],
};
writeFileSync(
  "docs/reviews/qa-core30-scope-storage-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.checks));
await Promise.all(sessions.map((client) => client.auth.signOut({ scope: "local" })));
