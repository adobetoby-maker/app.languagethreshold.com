/** Installed SDK probes with synthetic credentials and stub transport only. Never reads env. */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const sources = [
  "node_modules/@supabase/auth-js/src/GoTrueClient.ts",
  "node_modules/@supabase/auth-js/src/lib/fetch.ts",
  "node_modules/@supabase/supabase-js/src/SupabaseClient.ts",
  "node_modules/@supabase/supabase-js/src/lib/fetch.ts",
];
const versions = Object.fromEntries(
  ["auth-js", "supabase-js"].map((name) => [
    name,
    JSON.parse(readFileSync(`node_modules/@supabase/${name}/package.json`, "utf8")).version,
  ]),
);
assert.equal(versions["auth-js"], "2.105.1");
assert.equal(versions["supabase-js"], "2.105.1");
const dir = mkdtempSync(resolve("node_modules/.cache/sdk-auth-contract-"));
const savedFetch = globalThis.fetch,
  savedConsoleError = console.error;
let unexpectedGlobalFetchCalls = 0;
const sdkLogs = [];
try {
  await build({
    entryPoints: [resolve("src/lib/team-server.ts")],
    outfile: join(dir, "helper.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
  });
  const { authenticatedTeamUser } = await import(join(dir, "helper.mjs"));
  globalThis.fetch = async () => {
    unexpectedGlobalFetchCalls++;
    throw Error("Unexpected global transport in synthetic audit");
  };
  console.error = (...args) => {
    sdkLogs.push(
      args.some((x) => x instanceof Error && x.message.includes("SYNTHETIC_PRIVATE_TRANSPORT")),
    );
  };
  const syntheticToken = "synthetic-user-token",
    syntheticKey = "synthetic-project-key";
  const observed = [];
  function client(fetcher) {
    return createClient("https://synthetic.invalid", syntheticKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: {
        fetch: async (input, init) => {
          assert.equal(String(input), "https://synthetic.invalid/auth/v1/user");
          assert.equal(init.method, "GET");
          const headers = new Headers(init.headers);
          assert.equal(headers.get("Authorization"), `Bearer ${syntheticToken}`);
          assert.equal(headers.get("apikey"), syntheticKey);
          observed.push({
            method: init.method,
            path: "/auth/v1/user",
            customFetchUsed: true,
            explicitJwtHeaderMatched: true,
            projectHeaderMatched: true,
            signalProvided: !!init.signal,
            cachePolicy: init.cache ?? null,
          });
          return fetcher();
        },
      },
    });
  }
  const record = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.invalid",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: { padding: "x".repeat(300 * 1024) },
    identities: [],
  };
  const payload = JSON.stringify(record),
    bytes = new TextEncoder().encode(payload).byteLength;
  assert.ok(bytes > 256 * 1024);
  const positive = client(async () => Response.json(record));
  const large = await positive.auth.getUser(syntheticToken);
  assert.equal(large.error, null);
  assert.equal(large.data.user.user_metadata.padding.length, 300 * 1024);
  const negative = client(async () => {
    throw Error("SYNTHETIC_PRIVATE_TRANSPORT");
  });
  let classified;
  try {
    await authenticatedTeamUser(
      new Request("https://fixture.invalid/api/team-entitlement", {
        headers: { Authorization: `Bearer ${syntheticToken}` },
      }),
      negative,
    );
  } catch (error) {
    classified = error;
  }
  assert.equal(classified.status, 403);
  assert.equal(classified.message, "Your session has expired. Sign in again.");
  assert.equal(observed.length, 2);
  assert.equal(sdkLogs.length, 1);
  assert.equal(sdkLogs[0], true);
  assert.equal(unexpectedGlobalFetchCalls, 0);
  assert.ok(observed.every((x) => !x.signalProvided && x.cachePolicy === null));
  const report = {
    auditedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: "12d25f0e7e8f3ac22945ef8b8f961b8109da1e4f",
    versions,
    installedSource: sources.map((path) => ({
      path,
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    })),
    observedRequests: observed,
    probes: {
      largeUserJson: {
        responseBytes: bytes,
        metadataCharactersAccepted: 300 * 1024,
        acceptedByInstalledSdk: true,
      },
      transportFailure: {
        customFetchCalls: 1,
        sdkExplicitErrorLogCalls: sdkLogs.length,
        syntheticPrivateMarkerReachedSdkLogger: true,
        currentTeamHelperStatus: classified.status,
        currentTeamHelperMessage: classified.message,
        misclassifiedAsExpiredSession: true,
      },
      unexpectedGlobalFetchCalls,
    },
    findings: [
      "Installed explicit-JWT getUser branch calls _getUser without waiting for initializePromise/_acquireLock; it does not accept an AbortSignal argument. Its _request GET passes headers but no cancellation/cache option to custom fetch in these probes.",
      "The same global.fetch option reaches the Auth client and PostgREST wrapper. A future adapter must narrowly select expected Auth origin/path/method and avoid changing write behavior.",
      "Installed SDK accepts the synthetic over-256-KiB user JSON. Direct success path awaits response.json without a size check in inspected code. This is an observed path, not a claim about all framework/provider limits.",
      "SDK fetch rejection explicitly calls console.error before wrapping AuthRetryableFetchError. The application original auth helper treats resolved SDK errors as expired-session 403, so the current bounded team wrapper preserves a misleading expired-session response on this synthetic transport failure.",
      "Current wait bound remains valid for caller continuation but does not supply transport cancellation/response limits or suppress this internal SDK logging. These are open implementation findings.",
    ],
    nextEngineering: [
      "Keep explicit JWT verification through the installed SDK; use its custom-fetch seam for an Auth-only owned transport with shared deadline/abort, no-store, response-byte/read bounds and fixed error objects.",
      "Classify retryable transport/auth-service failures separately from credential/session denial; avoid raw SDK logging by translating controlled adapter failures before the SDK fetch catch. Preserve legitimate auth headers in memory and isolate the adapter from business writes.",
      "Add installed-SDK transport tests for late headers/body, abort/deadline/nonsettling cancellation, bounded JSON, no raw SDK logger details and correct 403 versus 499/503 before claiming these findings fixed.",
    ],
    limits: [
      "All URLs/keys/tokens/users/metadata/error markers were synthetic; custom transport returned local Responses or threw local errors. Global transport was replaced with a rejecting guard and observed zero calls. No env file, real credential, Supabase/network/database/provider/browser/login/session/consent/payment/invitation/certificate operation.",
      "Probe captures console.error only during this isolated script and restores it in finally. No captured message contents or credentials are stored. Source hashes identify installed local files, not global latest SDK behavior.",
      "No runtime source/dependency/schema/grant/role/policy/schedule change or deployment. Prior 1414 tests and fifteen hosted groups remain the last application verification; no new actual expiry/cancellation/browser acceptance.",
      "Full goal and human/content/calibration/reviewer/pilot/retention/deletion/scheduler/platform/session/device/process-restart gates remain open. No main push, production promotion or accepted-hostname advance.",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-team-auth-sdk-contract-2026-10-18.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      versions,
      stubRequests: observed.length,
      largeJsonAccepted: true,
      sdkLoggerReceivesSyntheticError: true,
      transportMisclassifiedAsExpired: true,
      unexpectedGlobalFetchCalls: 0,
    }),
  );
} finally {
  globalThis.fetch = savedFetch;
  console.error = savedConsoleError;
  rmSync(dir, { recursive: true, force: true });
}
