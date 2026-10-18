/** Actual status handler/SDK probes use synthetic transport; cron source stays byte-identical. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const path = "src/lib/assessments/cleanup-schedule-server.ts",
  source = readFileSync(path, "utf8"),
  prior = execFileSync("git", ["show", "9e0757f:" + path], { encoding: "utf8" }),
  marker = "    if (!cleanupCronAuthorized(request, env.CRON_SECRET))";
assert.ok(source.includes(marker) && prior.includes(marker));
const cron = source.slice(source.indexOf(marker));
assert.equal(cron, prior.slice(prior.indexOf(marker)));
const output = execFileSync(
  process.execPath,
  [
    "--test",
    "tests/cleanup-status-ownership.test.mjs",
    "tests/assessment-cleanup-schedule.test.mjs",
    "tests/cleanup-status-fetch.test.mjs",
  ],
  { encoding: "utf8" },
);
assert.match(output, /tests 19\b/);
assert.match(output, /pass 19\b/);
assert.match(output, /fail 0\b/);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  testGroups: { newStatus: 6, existingCronSchedule: 9, responseBounds: 4 },
  checks: {
    ownerDenial403AndUnavailable503Separated: true,
    ownerReadMaxBytes: 4096,
    historyReadMaxBytes: 32768,
    strictSqlProjectionAndCardinality: true,
    selectedQueryRetriesDisabled: true,
    invalidDataMakesSingleOwnerOrTwoHistoryRequests: true,
    cancellation499Fixed: true,
    preabortConstructsZeroSdk: true,
    authDepartureStartsZeroOwnerHistory: true,
    ownerDepartureStartsZeroHistory: true,
    historyDepartureSuppressesLatePrivateResult: true,
    manualOwnedWaitTimersAndIncomingListenersReleased: true,
    actualInstalledSdkAuthHeadersMatchedInMemory: true,
    actualSdkOwnerHistoryReceiveAbortSignal: true,
    ignoredLateResponsesCannotResumeOwnerHistory: true,
    syntheticSuccessKeepsExecutionDisabledAndHealthNotObserved: true,
    statusMakesZeroWriteClaimStorageCalls: true,
    cronExecutionSourceByteIdentical: true,
  },
  cronSource: {
    comparedCommit: "9e0757f",
    sha256: createHash("sha256").update(cron).digest("hex"),
  },
  sources: [path, "tests/cleanup-status-ownership.test.mjs"].map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  })),
  limits: [
    "Status auth uses shared15second wait/selected Auth adapter; owner plus history phase owns8seconds and cooperative abort. Existing boundedCleanupFetch still creates native8second per-fetch timeouts. Manual phase timers/listeners clear; native timeout internals are not cancellation-resource proof. No single aggregate status deadline or physical network cancellation proof.",
    "Controlled actual-handler tests and actual SDK/production-factory tests use synthetic credentials/URLs/Responses and restore globals/env/loggers. No actual owner login, database/history read, storage deletion, cron invocation, role/retention approval or scheduler activation.",
    "Valid status response projection is unchanged; selected default status transport now validates owner/history response bytes/schema and disables retries on those builders. Other SDK/RPC/private paths and broader diagnostics/cache/device inventory remain separate. Source-tail equality is local source proof, not platform schedule/execution acceptance.",
    "Original helper remains exported for compatibility; no original direct named calls remain in current AST inventory. This does not prove all indirect auth/caller paths are owned.",
    "No schema/grant/role/policy/schedule changes, main push, production promotion or accepted-hostname advance. Full goal and human/content/reviewer/retention/device/session gates remain open.",
  ],
};
writeFileSync(
  "docs/reviews/qa-cleanup-status-local-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    newStatusGroups: 6,
    existingCronScheduleGroups: 9,
    cronSourceByteIdentical: true,
  }),
);
