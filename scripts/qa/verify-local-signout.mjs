/** Keep one independent QA session in memory while the browser tests its actual Sign out button. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
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
const client = createClient(
  `https://${qa.project}.supabase.co`,
  keys.find((key) => key.name === "anon").api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const input = createInterface({ input: process.stdin, output: process.stdout });
const timeout = setTimeout(() => {
  input.close();
  process.exitCode = 2;
}, 180000);
try {
  const login = await client.auth.signInWithPassword({
    email: qa.personalEmail,
    password: qa.personalPassword,
  });
  assert.equal(login.error, null, "Dedicated QA sign-in");
  assert.equal(login.data.user.id, qa.personalId, "Dedicated identity");
  const before = await client.auth.refreshSession();
  assert.equal(before.error, null, "Independent session initially refreshes");
  console.log(JSON.stringify({ independentQaSessionReady: true }));
  const instruction = await new Promise((resolve, reject) => {
    input.once("line", resolve);
    input.once("close", () => reject(Error("Verification input missing")));
  });
  assert.equal(instruction, "verify", "Only continue after the actual browser sign-out");
  const after = await client.auth.refreshSession();
  assert.equal(
    after.error,
    null,
    "Current-device browser sign-out must not revoke the independent session",
  );
  const books = await client
    .from("library_books")
    .select("id")
    .eq("user_id", qa.personalId)
    .eq("title", "QA Individual Reader — recovery check");
  assert.equal(books.error, null, "Cloud library still readable");
  assert.equal(books.data.length, 1, "Sign-out never deletes the cloud-saved QA text");
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    target: process.env.LT_QA_STAGE_URL,
    scope:
      "Independent existing QA session held only in process memory while the actual preview UI signs out; no credential output or token files",
    checks: { independentSessionRefreshesAfterBrowserSignOut: true, cloudSavedTextRetained: true },
  };
  writeFileSync(
    "docs/reviews/qa-local-signout-scope-2026-10-16.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report.checks));
} finally {
  clearTimeout(timeout);
  input.close();
  await client.auth.signOut({ scope: "local" });
  client.auth.stopAutoRefresh();
}
