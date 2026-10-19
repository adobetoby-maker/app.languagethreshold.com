/** Controlled actual-route tests only: no mail, credentials, network or stored business records. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const output = execFileSync(
  process.execPath,
  [
    "--test",
    "--test-reporter=tap",
    "tests/team-email-warnings.test.mjs",
    "tests/team-email-transport.test.mjs",
    "tests/team-email-logs.test.mjs",
  ],
  { encoding: "utf8" },
);
assert.match(output, /# tests 16\b/);
assert.match(output, /# pass 16\b/);
assert.match(output, /# fail 0\b/);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  testGroups: { warnings: 7, transport: 6, logs: 3 },
  checks: {
    inviteResendAssignmentWarningsFixed: true,
    savedOperationAndManualFallbackRetained: true,
    postSendBookkeepingRejectionDoesNotResend: true,
    successfulEmailAndManualDeliveryRetainNullWarning: true,
    historicalAndMalformedDiagnosticsNormalizedWithoutWrites: true,
    missingAuthAndNonadminDeniedBeforeMutations: true,
    privateNoStoreHeadersPreserved: true,
    fixedProviderPostNoRedirectOrRetry: true,
    headerDeadlineMs: 15000,
    ignoredAbortLateHeadersAndRejectionsObserved: true,
    unusedResponseBodyDisposedWithoutWaitingForCancel: true,
    timerAndAbortListenerReleased: true,
    providerErrorsNeverReadOrRetainedAsCauses: true,
    ownerAndWebhookEmailLogsFixed: true,
    webhookUnexpectedErrorLogFixedAndSignatureGuardRetained: true,
  },
  sources: [
    "src/routes/api.team.ts",
    "src/lib/team-server.ts",
    "src/routes/api.platform.ts",
    "src/routes/api.stripe-webhook.ts",
    "tests/team-email-warnings.test.mjs",
    "tests/team-email-transport.test.mjs",
    "tests/team-email-logs.test.mjs",
  ].map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  })),
  limits: [
    "Actual helper transport uses synthetic env and controlled fetch; actual routes use controlled auth/database/email/Stripe seams. No actual SDK/provider/mail delivery, real webhook/payment/signature acceptance, historical database rewrite, user/team assignment, invitation or browser acceptance.",
    "Provider header deadline is independent of earlier auth/input/database phases; no aggregate request deadline, physical network cancellation or durable email outcome/idempotency proof. HTTP2xx retains prior accepted-request behavior, not delivery proof. No automatic resend. Hosted denial/readonly checks cannot prove real delivery or financial processing.",
  ],
};
writeFileSync(
  "docs/reviews/qa-team-email-warnings-local-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({ testGroups: { warnings: 7, transport: 6, logs: 3 }, allPassed: true }),
);
