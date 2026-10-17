/** Dedicated synthetic QA only. No auth settings, passwords, roles or assessment records change. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

assert.equal(process.argv[2], "--revoke-qa-independent-only");
const directory = "/Users/drive/.codex/tmp/language-threshold-qa/";
const destination = directory + "session-expiry-trial.json";
assert.equal(
  existsSync(destination),
  false,
  "Resume the existing trial; do not restart its clock.",
);
const qa = JSON.parse(readFileSync(directory + "roofing-20261015.json", "utf8"));
const original = JSON.parse(readFileSync(directory + "active-offline-trial.json", "utf8"));
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, original.run);
assert.match(qa.personalEmail, /^qa-independent-[a-z0-9]+@example\.invalid$/);
const target = process.env.LT_QA_STAGE_URL;
assert.match(
  target,
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const client = createClient(
  `https://${qa.project}.supabase.co`,
  keys.find((key) => key.name === "anon").api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const report = {
  run: qa.run,
  project: qa.project,
  target,
  commit: process.env.LT_QA_STAGE_COMMIT,
  attemptId: original.attemptId,
  status: "preparing",
  beganAt: new Date().toISOString(),
  refreshRevocation: "Only other sessions of the synthetic independent QA learner",
  credentialsOrTokensSaved: false,
  assessmentMutation: false,
};
writeFileSync(destination, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
try {
  const login = await client.auth.signInWithPassword({
    email: qa.personalEmail,
    password: qa.personalPassword,
  });
  assert.equal(login.error, null, "Synthetic QA authentication");
  assert.ok(login.data.session && login.data.user);
  if (qa.personalId) assert.equal(login.data.user.id, qa.personalId);
  const response = await fetch(`${target}/api/exams?action=attempt&attempt=${original.attemptId}`, {
    headers: { Authorization: `Bearer ${login.data.session.access_token}` },
    cache: "no-store",
  });
  assert.equal(response.status, 200);
  const attempt = await response.json();
  assert.equal(attempt.isLearner, true);
  assert.equal(attempt.enrollment.scope, "personal");
  assert.equal(attempt.enrollment.id, qa.exams.personalEnrollmentId);
  assert.equal(attempt.status, "in_progress");
  assert.equal(attempt.submittedAt, null);
  const responses = attempt.responses
    .map(({ item_id, answer }) => ({ item_id, answer }))
    .sort((a, b) => a.item_id.localeCompare(b.item_id));
  const fingerprint = createHash("sha256").update(JSON.stringify(responses)).digest("hex");
  assert.equal(
    fingerprint,
    original.responseFingerprintBefore,
    "Original QA responses must still be on the server",
  );
  const ttl = login.data.session.expires_in;
  assert.ok(Number.isInteger(ttl) && ttl > 0 && ttl <= 86400);
  const revoked = await client.auth.signOut({ scope: "others" });
  assert.equal(revoked.error, null, "Synthetic QA refresh-session revocation");
  Object.assign(report, {
    status: "awaiting-expiry",
    refreshRevokedAt: new Date().toISOString(),
    tokenTtlObservedSeconds: ttl,
    resumeAfter: new Date(Date.now() + (ttl + 300) * 1000).toISOString(),
    revisionBefore: attempt.revision,
    responseCountBefore: responses.length,
    responseFingerprintBefore: fingerprint,
  });
  console.log(
    JSON.stringify({
      status: report.status,
      syntheticIndependentQaOnly: true,
      tokenTtlObservedSeconds: ttl,
      resumeAfter: report.resumeAfter,
      revisionBefore: report.revisionBefore,
      responses: responses.length,
      credentialsOrTokensSaved: false,
      assessmentMutation: false,
    }),
  );
} catch (error) {
  report.status = "preparation-failed";
  // The private marker prevents an uncertain outcome from silently restarting the trial.
  throw error;
} finally {
  writeFileSync(destination, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  await client.auth.signOut({ scope: "local" });
}
