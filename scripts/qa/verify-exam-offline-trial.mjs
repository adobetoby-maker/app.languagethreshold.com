/** Read-only verification of a normal-browser QA trial. Never creates/submits an attempt. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const phase = process.argv[2];
assert.ok(["offline", "synced", "restored"].includes(phase));
const directory = "/Users/drive/.codex/tmp/language-threshold-qa/";
const qa = JSON.parse(readFileSync(directory + "roofing-20261015.json", "utf8"));
const trial = JSON.parse(readFileSync(directory + "active-offline-trial.json", "utf8"));
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(trial.run, qa.run);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const db = createClient(
  `https://${qa.project}.supabase.co`,
  keys.find((key) => key.name === "service_role").api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const cp = await db
  .from("assessment_checkpoints")
  .select("id")
  .eq("enrollment_id", qa.exams.personalEnrollmentId);
assert.equal(cp.error, null);
const attempt = await db
  .from("assessment_attempts")
  .select("id,status,revision,submitted_at,checkpoint_id")
  .eq("id", trial.attemptId)
  .single();
assert.equal(attempt.error, null);
assert.ok(cp.data.some((row) => row.id === attempt.data.checkpoint_id));
assert.equal(attempt.data.status, "in_progress");
assert.equal(attempt.data.submitted_at, null);
const responses = await db
  .from("assessment_responses")
  .select("item_id,answer")
  .eq("attempt_id", trial.attemptId)
  .order("item_id");
assert.equal(responses.error, null);
assert.equal(responses.data.length, trial.responseCountBefore);
const fingerprint = createHash("sha256").update(JSON.stringify(responses.data)).digest("hex");
const expectedRevision =
  trial.revisionBefore + (phase === "offline" ? 0 : phase === "synced" ? 1 : 2);
assert.equal(attempt.data.revision, expectedRevision);
assert.equal(fingerprint === trial.responseFingerprintBefore, phase !== "synced");
const report = {
  testedAt: new Date().toISOString(),
  phase,
  existingQaAttempt: true,
  revision: attempt.data.revision,
  expectedRevision,
  responseCount: responses.data.length,
  matchesOriginalResponses: fingerprint === trial.responseFingerprintBefore,
  status: "in_progress",
  submitted: false,
  rawResponsesPrinted: false,
};
writeFileSync(
  `docs/reviews/qa-exam-offline-${phase}-2026-10-16.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
