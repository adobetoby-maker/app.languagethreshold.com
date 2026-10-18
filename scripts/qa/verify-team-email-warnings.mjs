/** Controlled actual-route tests only: no mail, credentials, network or stored business records. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const output = execFileSync(
  process.execPath,
  ["--test", "--test-reporter=tap", "tests/team-email-warnings.test.mjs"],
  { encoding: "utf8" },
);
assert.match(output, /# tests 7\b/);
assert.match(output, /# pass 7\b/);
assert.match(output, /# fail 0\b/);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  testGroups: 7,
  checks: {
    inviteResendAssignmentWarningsFixed: true,
    savedOperationAndManualFallbackRetained: true,
    postSendBookkeepingRejectionDoesNotResend: true,
    successfulEmailAndManualDeliveryRetainNullWarning: true,
    historicalAndMalformedDiagnosticsNormalizedWithoutWrites: true,
    missingAuthAndNonadminDeniedBeforeMutations: true,
    privateNoStoreHeadersPreserved: true,
  },
  sources: ["src/routes/api.team.ts", "tests/team-email-warnings.test.mjs"].map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  })),
  limits: [
    "Actual route with controlled auth, database and email seams; all operations are synthetic in process. No actual SDK/provider/mail delivery, historical database rewrite, user/team assignment, invitation or auth/browser acceptance.",
    "Only email success-warning messages and GET invitation diagnostic projection changed. Other response fields, indirect SDK logging, transport lifetime, durable outcome/idempotency and broader privacy boundaries remain separate. Hosted anonymous/readonly checks cannot prove real email delivery.",
  ],
};
writeFileSync(
  "docs/reviews/qa-team-email-warnings-local-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ testGroups: 7, allPassed: true }));
