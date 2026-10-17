/** Read-only hosted team-insight readiness and permission checks. No scores or approvals created. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
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
const url = `https://${qa.project}.supabase.co`;
const anon = keys.find((key) => key.name === "anon").api_key;
const clients = [];
async function login(email, password) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const result = await client.auth.signInWithPassword({ email, password });
  assert.equal(result.error, null);
  return { client, token: result.data.session.access_token };
}
let requests = 0;
async function request(token, query = "", expected = 200) {
  const response = await fetch(base + "/api/exams" + query, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Origin: base },
  });
  requests++;
  assert.equal(response.status, expected);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes('"form_snapshot"'), false);
  assert.equal(JSON.stringify(body).includes('"correctOptionId"'), false);
  assert.equal(JSON.stringify(body).includes('"answer"'), false);
  return body;
}
try {
  const [personal, admin, learner] = await Promise.all([
    login(qa.personalEmail, qa.personalPassword),
    login(qa.adminEmail, qa.adminPassword),
    login(qa.email, qa.password),
  ]);
  const scope = new URLSearchParams({
    action: "team_insights",
    org: qa.organizationId,
    module: "roofing",
    target: "Spanish",
    native: "English",
    checkpoint: "entrance",
  });
  for (const checkpoint of ["entrance", "day45", "day90"]) {
    scope.set("checkpoint", checkpoint);
    const result = await request(admin.token, "?" + scope);
    assert.equal(result.status, "content_pending");
    assert.equal(result.learnerCount, null);
    assert.deepEqual(result.items, []);
    assert.equal(result.minimumGroup, 5);
  }
  for (const user of [personal, learner]) await request(user.token, "?" + scope, 403);
  await request(null, "?" + scope, 403);
  const missingOrg = new URLSearchParams(scope);
  missingOrg.delete("org");
  await request(admin.token, "?" + missingOrg, 400);
  for (const [key, value] of [
    ["checkpoint", "invented"],
    ["module", "invented"],
    ["native", "Spanish"],
  ]) {
    const invalid = new URLSearchParams(scope);
    invalid.set(key, value);
    await request(admin.token, "?" + invalid, 400);
  }
  const extra = new URLSearchParams(scope);
  extra.set("learner", qa.personalId);
  const unchanged = await request(admin.token, "?" + extra);
  assert.equal(unchanged.status, "content_pending");
  assert.equal(unchanged.learnerCount, null);
  const guest = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const client of [guest, personal.client]) {
    const denied = await client.rpc("assessment_team_insight_evidence", {
      p_actor: qa.adminId,
      p_org: qa.organizationId,
      p_form: "not-a-published-form",
    });
    assert.ok(denied.error, "Direct clients cannot spoof an insight actor");
  }
  const service = createClient(url, keys.find((key) => key.name === "service_role").api_key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const draft = await service
    .from("assessment_forms")
    .select("id")
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();
  assert.equal(draft.error, null);
  assert.ok(draft.data);
  const refused = await service.rpc("assessment_team_insight_evidence", {
    p_actor: qa.adminId,
    p_org: qa.organizationId,
    p_form: draft.data.id,
  });
  assert.match(refused.error?.message ?? "", /Reviewed calibrated insight form required/);
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: process.env.LT_QA_STAGE_COMMIT,
    preview: base,
    requests,
    checks: {
      threeCheckpointReadinessStates: true,
      missingContentNotLearnerWeakness: true,
      teamLearnerAndOutsiderDenied: true,
      anonymousDenied: true,
      invalidScopeRejected: true,
      arbitraryLearnerSelectorDoesNotCreateSubgroup: true,
      directRpcActorSpoofDenied: true,
      actualServiceRpcRefusesDraftForm: true,
      noStoreAndNoRawEvidence: true,
    },
    limits: [
      "Hosted assessment store has no verified calibrated forms; no genuine team score aggregate is claimed",
      "Positive aggregates, suppression, score corrections, pilot exclusions and resource bounds use controlled local fixtures",
      "No learner, exam, schedule, score, review, approval, role or certificate writes",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-team-insights-2026-10-16.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await Promise.allSettled(clients.map((client) => client.auth.signOut({ scope: "local" })));
}
