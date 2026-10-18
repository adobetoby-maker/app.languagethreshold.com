/** Production route catches with controlled auth/config dependencies; no actual SDK/network calls. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const output = execFileSync(process.execPath, ["--test", "tests/assessment-auth-errors.test.mjs"], {
  encoding: "utf8",
});
assert.match(output, /tests 8\b/);
assert.match(output, /pass 8\b/);
assert.match(output, /fail 0\b/);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  testGroups: 8,
  controlledHandlerCases: { unexpectedErrors: 80, typedErrors: 24 },
  checks: {
    actualRouteGetAndPostCatches: true,
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
    "Only four assessment API catch boundaries change: untyped errors no longer acquire auth classification from matching text. Known TeamOperationError 403 and AssessmentAccessError handling are preserved; fixed route-specific 503 fallback remains.",
    "Tests bundle actual production route code/schema/catch/JSON helper with controlled client/auth/private dependencies and actual error classes. They are not allowed workflow, actual SDK, network, expiry, browser, reviewer, consent or business acceptance.",
    "Ten original auth helper callers still use their previous transport/classification/wait behavior, including cleanup status catch-all 403. Their separate migration remains open. Eleven team factories retain the previously verified adapter.",
    "AssessmentAccessError still accepts intentional messages/statuses, including server rpc P0001 mapping. This change does not prove every typed error or database diagnostic is safe; RPC error allowlisting and broader diagnostics remain review items.",
    "No schema/grant/role/policy/schedule changes, main push, production promotion or accepted-hostname advance. Human/content/reviewer/calibration/pilot/retention/device/session/process-restart gates remain open.",
  ],
};
writeFileSync(
  "docs/reviews/qa-assessment-auth-errors-local-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({ testGroups: 8, unexpectedErrorCases: 80, typedErrorCases: 24, allPassed: true }),
);
