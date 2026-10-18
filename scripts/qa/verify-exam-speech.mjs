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
  "https://language-threshold-nh7jse7fn-adobetoby-5572s-projects.vercel.app";
assert.match(
  base,
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
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

const attemptId = qa.exams.personalAttemptId;
const statusPath = `/api/exams?action=speech_status&attempt=${attemptId}`;
const policy = await request(personal, statusPath);
assert.equal(policy.status, 200);
assert.equal(policy.body.enabled, false);
assert.equal(policy.body.version, null);
assert.equal(policy.cache, "no-store");
for (const token of [learner, admin, null])
  assert.equal((await request(token, statusPath)).status, 403);
const before = await service
  .from("assessment_speech_evidence")
  .select("id", { count: "exact", head: true });
assert.equal(before.error, null);
assert.equal(before.count, 0);
const active = await service
  .from("assessment_attempts")
  .select("id,revision,form_snapshot,assessment_checkpoints!inner(enrollment_id)")
  .eq("assessment_checkpoints.enrollment_id", qa.exams.personalEnrollmentId)
  .eq("status", "in_progress")
  .limit(1)
  .single();
assert.equal(active.error, null);
const spoken = active.data.form_snapshot.definition.items.find(
  (i) => i.skill === "speaking" && i.inputMethods.includes("speech"),
);
assert.ok(spoken);
const metadata = {
  attemptId: active.data.id,
  itemId: spoken.id,
  revision: active.data.revision,
  policyVersion: "assessment-speech-pending-v1",
  consent: true,
  mime: "audio/webm",
  durationMs: 1000,
  requestId: randomUUID(),
};
async function upload(token, origin = base) {
  return fetch(base + "/api/exams?action=speech_upload", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Origin: origin,
      "Content-Type": "audio/webm",
      "X-Assessment-Speech": JSON.stringify(metadata),
    },
    body: new Uint8Array(64),
  });
}
assert.equal((await upload(personal)).status, 409);
assert.equal((await upload(admin)).status, 403);
assert.equal((await upload(null)).status, 403);
assert.equal((await upload(personal, "https://unrelated.example")).status, 403);
const missing = randomUUID();
assert.equal(
  (await request(personal, `/api/exams?action=speech_playback&evidence=${missing}`)).status,
  404,
);
for (const action of ["speech_reviewed", "speech_withdraw"]) {
  const body = {
    action,
    evidenceId: missing,
    requestId: randomUUID(),
    ...(action === "speech_reviewed" ? { listened: true } : {}),
  };
  assert.equal((await request(personal, body)).status, 403);
}
const after = await service
  .from("assessment_speech_evidence")
  .select("id", { count: "exact", head: true });
assert.equal(after.count, 0);
const policies = await service
  .from("assessment_media_policies")
  .select("collection_enabled,cleanup_enabled,approved_at");
assert.equal(policies.error, null);
assert.ok(
  policies.data.every((p) => !p.collection_enabled && !p.cleanup_enabled && !p.approved_at),
);
const report = {
  testedAt: new Date().toISOString(),
  base,
  policyDisabled: true,
  privateStatusBoundary: true,
  unauthorizedAndCrossOriginUploadDenied: true,
  disabledUploadRejected: true,
  noEvidenceCreated: true,
  missingPlaybackDenied: true,
  missingAckAndWithdrawalDenied: true,
  noHostedApproval: true,
  checks: 8,
};
if (process.env.LT_QA_REPORT_PATH)
  writeFileSync(process.env.LT_QA_REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
for (const client of clients) await client.auth.signOut({ scope: "local" });
