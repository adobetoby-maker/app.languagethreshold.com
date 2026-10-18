/** Browser-role denials only. Null actor/request ensure no write even if a grant regresses. */
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
const key = keys.find((k) => k.name === "anon")?.api_key;
assert.ok(key);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anonymous = createClient(`https://${qa.project}.supabase.co`, key, options),
  learner = createClient(`https://${qa.project}.supabase.co`, key, options);
try {
  const auth = await learner.auth.signInWithPassword({
    email: qa.personalEmail,
    password: qa.personalPassword,
  });
  assert.equal(auth.error, null);
  const results = [];
  for (const [role, client] of [
    ["anon", anonymous],
    ["authenticated", learner],
  ]) {
    const { data, error, status } = await client.rpc("assessment_start_prepared_attempt", {
      p_actor: null,
      p_checkpoint: null,
      p_form: "qa-denial-only",
      p_request: null,
      p_expected_form: {},
      p_expected_release: {},
      p_studied_objectives: [],
    });
    assert.equal(data, null);
    assert.ok(error);
    assert.ok(
      ["42501", "PGRST202"].includes(error.code),
      "Browser role must be denied before function body",
    );
    assert.ok(status === 403 || status === 401 || status === 404);
    results.push({ role, status, code: error.code, deniedBeforeFunctionBody: true });
  }
  const report = {
    testedAt: new Date().toISOString(),
    project: qa.project,
    scope:
      "Actual SDK anonymous/authenticated direct-RPC denials; no learner write or source/form supplied",
    results,
    limits: [
      "Function existence/version/grants are independently checked with read-only database metadata; a PostgREST404 alone is not version proof.",
      "No service-role positive adaptive start or content approval is created.",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-prepared-start-browser-grants-2026-10-17.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(results));
} finally {
  await learner.auth.signOut({ scope: "local" });
}
