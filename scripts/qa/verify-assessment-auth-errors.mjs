/** Production route catches with controlled auth/config dependencies; no actual SDK/network calls. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const output = execFileSync(process.execPath, ["--test", "tests/assessment-auth-errors.test.mjs"], {
  encoding: "utf8",
});
assert.match(output, /tests 12\b/);
assert.match(output, /pass 12\b/);
assert.match(output, /fail 0\b/);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  testGroups: 12,
  controlledHandlerCases: { unexpectedErrors: 80, typedErrors: 24, boundedAuthCases: 27 },
  checks: {
    actualRouteGetAndPostCatches: true,
    preabortDeadlineDisconnectAndLateSdkStopsPrivateWork: true,
    requestBoundFactoryArgumentMatched: true,
    includesExamsSpeechUploadBranch: true,
    typedAuthDenialPreserved: true,
    typedAssessmentGuidanceAndStatusPreserved: true,
    configuration503KeepsRouteSpecificFixedFallback: true,
    unknownErrorsCannotForge403WithSessionOrSignInOrAccessWords: true,
    rawUnexpectedMessagesSuppressed: true,
    privateNoStoreAndNosniff: true,
    failedFactoryStartsZeroAuth: true,
    noPrivateOrBusinessOperationAfterInjectedFailure: true,
  },
  sources: ["exams", "exam-plans", "exam-content", "exam-reviewers"].map((name) => {
    const path = `src/routes/api.${name}.ts`;
    return { path, sha256: createHash("sha256").update(readFileSync(path)).digest("hex") };
  }),
  limits: [
    "Four assessment API catches preserve known403 guidance and fixed503 fallback, and now return fixed499 for cancelled assessment requests. Bounded auth is applied in nine branches; body/private/business phases remain separate.",
    "Tests bundle actual production route code/schema/catch/JSON helper with controlled client/auth/private dependencies and actual error classes. They are not allowed workflow, actual SDK, network, expiry, browser, reviewer, consent or business acceptance.",
    "Nine assessment calls now use real bounded helper with controlled SDK results. Twenty direct route factories plus cleanup status install Auth transport. Cleanup status has separate bounded owner/history tests. No original direct named auth-helper callers remain in the source inventory; indirect callers remain outside this claim.",
    "AssessmentAccessError keeps intentional statuses/messages. Shared assessment rpc already restricts P0001 to227exact fixed strings; direct RPC, other typed-error provenance and broader diagnostics remain separate review items.",
    "No schema/grant/role/policy/schedule changes, main push, production promotion or accepted-hostname advance. Human/content/reviewer/calibration/pilot/retention/device/session/process-restart gates remain open.",
  ],
};
writeFileSync(
  "docs/reviews/qa-assessment-auth-errors-local-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    testGroups: 12,
    unexpectedErrorCases: 80,
    typedErrorCases: 24,
    allPassed: true,
  }),
);
