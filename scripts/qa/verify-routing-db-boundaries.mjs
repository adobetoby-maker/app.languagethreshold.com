/** Hosted negative access checks only; credentials remain in memory, no route/form writes. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
const publicKey = keys.find((key) => key.name === "anon")?.api_key;
assert.ok(publicKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anonymous = createClient(`https://${qa.project}.supabase.co`, publicKey, opts);
const signedIn = [];
const checks = {};
try {
  const clients = [["anonymous", anonymous]];
  for (const [label, email, password] of [
    ["personal", qa.personalEmail, qa.personalPassword],
    ["teamLearner", qa.email, qa.password],
    ["teamAdmin", qa.adminEmail, qa.adminPassword],
  ]) {
    const client = createClient(`https://${qa.project}.supabase.co`, publicKey, opts);
    signedIn.push(client);
    const auth = await client.auth.signInWithPassword({ email, password });
    assert.equal(auth.error, null, "QA sign-in");
    clients.push([label, client]);
  }
  for (const [label, client] of clients) {
    const table = await client.from("assessment_attempt_routes").select("attempt_id").limit(1);
    assert.equal(table.error?.code, "42501", `${label} route table denied`);
    const rpc = await client.rpc("assessment_select_route", {
      p_actor: null,
      p_attempt: null,
      p_revision: null,
      p_request: null,
      p_definition: null,
      p_core: null,
      p_decision: null,
    });
    assert.equal(rpc.error?.code, "42501", `${label} route transaction denied before execution`);
    checks[label] = { tableDenied: true, rpcDenied: true };
  }
  const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
  assert.ok(serviceKey);
  const service = createClient(`https://${qa.project}.supabase.co`, serviceKey, opts);
  const empty = await service
    .from("assessment_attempt_routes")
    .select("attempt_id", { count: "exact", head: true });
  assert.equal(empty.error, null);
  assert.equal(empty.count, 0, "No hosted fixture route was created");
  const missingActor = await service.rpc("assessment_select_route", {
    p_actor: null,
    p_attempt: null,
    p_revision: null,
    p_request: null,
    p_definition: null,
    p_core: null,
    p_decision: null,
  });
  assert.equal(missingActor.error?.code, "P0001");
  assert.match(missingActor.error.message, /Learner assessment access required/);
  checks.serviceRole = { nullActorRejected: true, routeRows: empty.count };
  const report = {
    testedAt: new Date().toISOString(),
    project: qa.project,
    sourceCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    checks,
    learnerWrites: 0,
    routeWrites: 0,
    officialContentChanges: 0,
  };
  writeFileSync(
    "docs/reviews/qa-routing-db-access-2026-10-17.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      deniedHttpRequests: 8,
      allPermissionDenied: true,
      learnerWrites: 0,
      routeWrites: 0,
    }),
  );
} finally {
  await Promise.allSettled(signedIn.map((client) => client.auth.signOut({ scope: "local" })));
}
