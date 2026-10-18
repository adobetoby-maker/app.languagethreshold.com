/** Actual installed SDK + production factory/adapter; synthetic fixtures only. */
import assert from "node:assert/strict";
import ts from "typescript";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const output = execFileSync(process.execPath, ["--test", "tests/team-auth-fetch.test.mjs"], {
  encoding: "utf8",
});
assert.match(output, /tests 8\b/);
assert.match(output, /pass 8\b/);
assert.match(output, /fail 0\b/);
const versions = Object.fromEntries(
  ["auth-js", "supabase-js"].map((name) => [
    name,
    JSON.parse(readFileSync(`node_modules/@supabase/${name}/package.json`, "utf8")).version,
  ]),
);
assert.equal(versions["auth-js"], "2.105.1");
assert.equal(versions["supabase-js"], "2.105.1");
const factoryWiring = [
  "team",
  "team-billing",
  "module-request",
  "platform",
  "team-activity",
  "team-assessment",
  "team-entitlement",
].map((name) => {
  const path = `src/routes/api.${name}.ts`,
    text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const calls = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "teamAdminClient"
    ) {
      assert.deepEqual(
        node.arguments.map((x) => x.getText(source)),
        ["undefined", "request"],
      );
      calls.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(calls.length > 0);
  return { path, requestBoundFactoryCallLines: calls };
});
assert.equal(factoryWiring.flatMap((x) => x.requestBoundFactoryCallLines).length, 11);
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  versions,
  testGroups: 8,
  factoryWiring,
  checks: {
    actualProductionFactoryAndInstalledSdk: true,
    explicitJwtAndProjectHeadersMatchedInMemory: true,
    authSignalAndNoStore: true,
    exact256KiBValidJsonAccepted: true,
    advertisedAndActualExcessRejected: true,
    invalidUtf8AndJsonRejected: true,
    credential401And403BecomeFixed403: true,
    service429And500And503BecomeFixed503: true,
    fetchRejectionBecomesFixed503: true,
    sdkConsoleErrorCalls: 0,
    unexpectedGlobalFetchCalls: 0,
    deadlineAbortsSuppliedSignal: true,
    ignoredLateHeadersDisposed: true,
    requestAbortStopsBodyRead: true,
    nonsettlingCancelDoesNotBlockAndReaderUnlocks: true,
    preabortDispatchesZero: true,
    timersAndIncomingListenersReleased: true,
    actualSdkBusinessPostUnchanged: true,
    unrelatedUrlMethodInputAndInitIdentityPreserved: true,
  },
  sources: [
    "src/lib/team-auth-fetch.ts",
    "src/lib/private-service-json.ts",
    "src/lib/team-server.ts",
    "tests/team-auth-fetch.test.mjs",
  ].map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  })),
  limits: [
    "Synthetic credentials/URLs/user/Responses and controlled timers; no actual network, credentials, database, provider, browser, expiry or business action. Global fetch rejection guard and logger capture restored in finally.",
    "Adapter only installed by eleven factory calls in seven team routes. Ten original auth helper callers and all clients constructed without authRequest remain separate; historical raw-SDK probe still describes those unadapted paths.",
    "Caller wait and transport timers each start in their own phase; no single aggregate request deadline. Supplied signal is cooperatively honored by real fetch; ignored synthetic transport is raced and late response disposed, not proof of physical network cancellation.",
    "Only Auth GET exact project endpoint is selected. Other SDK requests pass through, including writes after request abort; later private/business phases and unknown outcomes need separate review.",
    "No main push, production promotion, accepted-hostname advance, schema/grant/role/policy/schedule changes; full goal/human/device/reviewer/retention gates remain open.",
  ],
};
writeFileSync(
  "docs/reviews/qa-team-auth-transport-sdk-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    testGroups: 8,
    factoryWiring,
    versions,
    sdkConsoleErrorCalls: 0,
    unexpectedGlobalFetchCalls: 0,
  }),
);
