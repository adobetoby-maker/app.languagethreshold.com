/** Observes current owner-permission reads with synthetic transports; never a live owner operation. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const baseline = process.env.LT_OWNER_PERMISSION_BASELINE;
assert.ok(
  baseline,
  "Historical defect probe: set LT_OWNER_PERMISSION_BASELINE=561f64e; current behavior is covered by tests/team-owner-transport.test.mjs.",
);
const actor = "22222222-2222-4222-8222-222222222222",
  item = "33333333-3333-4333-8333-333333333333";
const user = {
  id: actor,
  email: "fixture@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};
const vars = [
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PLATFORM_OWNER_EMAIL",
];
const original = {
  fetch: globalThis.fetch,
  error: console.error,
  env: vars.map((k) => process.env[k]),
};
const pending = [];
let logs = 0,
  unexpected = 0;
mkdirSync(resolve("node_modules/.cache"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/owner-permission-probe-"));
try {
  await build({
    stdin: {
      contents: `export {Route} from '@/routes/api.platform'; export {teamAdminClient,requirePlatformOwner} from '@/lib/team-server';`,
      resolveDir: process.cwd(),
    },
    outfile: join(dir, "probe.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
    plugins: [
      {
        name: "historical-helper",
        setup(b) {
          b.onLoad({ filter: /\/src\/lib\/team-server\.ts$/ }, () => ({
            contents: execFileSync("git", ["show", `${baseline}:src/lib/team-server.ts`], {
              encoding: "utf8",
            }),
            loader: "ts",
            resolveDir: resolve("src/lib"),
          }));
        },
      },
      {
        name: "shell",
        setup(b) {
          b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
            path: "shell",
            namespace: "shell",
          }));
          b.onLoad({ filter: /.*/, namespace: "shell" }, () => ({
            contents: "export const createFileRoute=()=>config=>config;",
          }));
        },
      },
    ],
  });
  const api = await import(join(dir, "probe.mjs"));
  process.env.SUPABASE_URL = "https://owner-fixture.invalid";
  process.env.VITE_SUPABASE_URL = "https://owner-fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-project-key";
  delete process.env.PLATFORM_OWNER_EMAIL;
  console.error = () => logs++;
  globalThis.fetch = () => {
    unexpected++;
    throw Error("Unexpected global network");
  };
  function client(fetcher) {
    const owner = new AbortController();
    const request = new Request("https://fixture.invalid/api/platform", { signal: owner.signal });
    return { owner, db: api.teamAdminClient(fetcher, request) };
  }
  let normalCall;
  const normal = client(async (input, init) => {
    normalCall = { url: new URL(String(input)), init };
    return Response.json([{ role: "owner" }]);
  });
  await api.requirePlatformOwner(normal.db, user);
  assert.equal(normalCall.url.origin, "https://owner-fixture.invalid");
  assert.equal(normalCall.url.pathname, "/rest/v1/platform_admin_roles");
  assert.equal(normalCall.url.searchParams.get("select"), "role");
  assert.equal(normalCall.url.searchParams.get("user_id"), "eq." + actor);
  assert.equal(normalCall.init.signal, undefined);
  assert.equal(normalCall.init.cache, undefined);
  const large = client(async () =>
    Response.json([{ role: "owner", syntheticUnexpectedData: "x".repeat(300 * 1024) }]),
  );
  await api.requirePlatformOwner(large.db, user);
  const retries = [];
  const failed = client(async (input, init) => {
    retries.push(new Headers(init.headers).get("x-retry-count"));
    return Response.json(
      { message: "PRIVATE synthetic backend diagnostic", code: "SYNTHETIC_ERROR" },
      { status: 503, headers: { "Retry-After": "0" } },
    );
  });
  await assert.rejects(
    api.requirePlatformOwner(failed.db, user),
    (e) => e.message === "PRIVATE synthetic backend diagnostic",
  );
  assert.deepEqual(retries, [null, "1", "2", "3"]);
  let release,
    start,
    completed = false;
  const dispatched = new Promise((r) => (start = r));
  const late = client(
    () =>
      new Promise((r) => {
        release = r;
        start();
      }),
  );
  const waiting = api.requirePlatformOwner(late.db, user).finally(() => (completed = true));
  pending.push({
    owner: late.owner,
    release: () => release?.(Response.json([{ role: "owner" }])),
    promise: waiting,
  });
  await dispatched;
  late.owner.abort();
  await new Promise((r) => setImmediate(r));
  assert.equal(completed, false);
  release(Response.json([{ role: "owner" }]));
  await waiting;
  let optCall;
  const optional = client(async (input, init) => {
    optCall = init;
    return Response.json([{ role: "owner" }]);
  });
  const phase = new AbortController();
  await api.requirePlatformOwner(optional.db, user, phase.signal);
  assert.equal(optCall.signal, phase.signal);
  const owner = new AbortController(),
    events = [];
  let routeRelease, routeStart;
  const began = new Promise((r) => (routeStart = r));
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)),
      method = init?.method ?? "GET";
    assert.equal(url.origin, "https://owner-fixture.invalid", "Synthetic destination only");
    events.push({
      path: url.pathname,
      method,
      afterAbort: owner.signal.aborted,
      signalPresent: !!init.signal,
    });
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/platform_admin_roles") {
      routeStart();
      return new Promise((r) => (routeRelease = r));
    }
    if (url.pathname === "/rest/v1/custom_module_requests" && method === "PATCH")
      return Response.json([
        { id: item, organization_id: null, requester_id: actor, title: "Synthetic audit fixture" },
      ]);
    if (url.pathname === "/rest/v1/platform_audit_events" && method === "POST")
      return new Response(null, { status: 201 });
    unexpected++;
    throw Error("Unexpected synthetic operation");
  };
  const request = new Request("https://fixture.invalid/api/platform", {
    method: "POST",
    headers: { Origin: "https://fixture.invalid", Authorization: "Bearer synthetic-user-token" },
    signal: owner.signal,
    body: JSON.stringify({
      action: "module_request_update",
      requestId: item,
      status: "submitted",
      ownerNote: "Synthetic audit fixture",
    }),
  });
  const operation = api.Route.server.handlers.POST({ request });
  pending.push({
    owner,
    release: () => routeRelease?.(Response.json([{ role: "owner" }])),
    promise: operation,
  });
  let timer;
  try {
    await Promise.race([
      began,
      new Promise(
        (_, reject) =>
          (timer = setTimeout(() => reject(Error("Synthetic owner read did not dispatch")), 5000)),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
  owner.abort();
  routeRelease(Response.json([{ role: "owner" }]));
  const response = await operation;
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const writes = events.filter((e) => e.afterAbort && e.method !== "GET");
  assert.deepEqual(
    writes.map((e) => [e.path, e.method]),
    [
      ["/rest/v1/custom_module_requests", "PATCH"],
      ["/rest/v1/platform_audit_events", "POST"],
    ],
  );
  assert.equal(unexpected, 0);
  assert.equal(logs, 0);
  const paths = [
    "src/lib/team-server.ts",
    "src/lib/team-auth-fetch.ts",
    "src/lib/team-member-fetch.ts",
    "src/routes/api.platform.ts",
    "src/lib/assessments/content-server.ts",
    "src/lib/assessments/cleanup-schedule-server.ts",
    "node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts",
  ];
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    installedSdk: JSON.parse(readFileSync("node_modules/@supabase/postgrest-js/package.json"))
      .version,
    observations: {
      configuredProjectActorAndProjectionCorrect: true,
      ordinaryOwnerReadSignalPresent: false,
      explicitNoStore: false,
      oversizedUnexpectedFixtureBytesAccepted: 300 * 1024,
      transient503Dispatches: retries.length,
      retryHeaders: retries,
      rawDiagnosticReachedHelper: true,
      abortDuringPermissionDidNotSettleWait: true,
      lateOwnerPermissionStillReturned: true,
      explicitReadSignalForwarded: true,
      actualRouteStatusAfterAbort: response.status,
      subsequentSyntheticWrites: writes,
      unexpectedNetworkCalls: unexpected,
      sdkConsoleErrorCalls: logs,
    },
    sourceHashes: Object.fromEntries(
      paths.map((p) => [
        p,
        createHash("sha256")
          .update(
            p.startsWith("src/")
              ? execFileSync("git", ["show", `${baseline}:${p}`])
              : readFileSync(p),
          )
          .digest("hex"),
      ]),
    ),
    limits: [
      "Actual production helper/factory/platform route and installed SDK, with entirely synthetic project/credentials/Auth/role/HTTP responses. No real network, owner access, membership or reviewer grants, content decisions, financial entries, certificate changes, schema/policy/schedule, provider/email/billing/assessment mutation.",
      "The captured PATCH and audit POST are in-process mock HTTP operations only. Role owner is a fictional fixture; no actual role created or changed. Status submitted avoids all notification/admin-account lookup branches; unexpected operations fail.",
      "Cleanup status has its own eight-second aggregate owner/history phase, selected response bounds and explicit signal/retry control already verified separately. This probe does not demonstrate a cleanup-status continuation defect. The optional signal forwarding control is not proof that all ordinary owner reads are bounded.",
      "Oversized and unexpected fields are injected fixture responses, not evidence of an actual data leak, attacker control or tenant authorization bypass. Raw helper errors are not proof of public route diagnostic leakage; scoped route catches remain separate.",
      "This observes an open defect; do not turn it into a permanent test requiring the defect after repair. No runtime change/deployment. Repair must include repeated owner role checks in content privileges/registered owner paths, preserve confirmed-email owner fallback and cleanup behavior, and keep unrelated write outcomes separate.",
    ],
  };
  writeFileSync(
    process.env.LT_QA_REPORT_PATH ?? join(dir, "historical-owner-probe.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({ observations: report.observations, installedSdk: report.installedSdk }),
  );
} finally {
  for (const p of pending) {
    p.owner.abort();
    p.release();
  }
  await Promise.allSettled(pending.map((p) => p.promise));
  globalThis.fetch = original.fetch;
  console.error = original.error;
  for (const [i, k] of vars.entries()) {
    if (original.env[i] === undefined) delete process.env[k];
    else process.env[k] = original.env[i];
  }
  rmSync(dir, { recursive: true, force: true });
}
