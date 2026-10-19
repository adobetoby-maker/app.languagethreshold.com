/** Installed SDK + actual helper/route observations. Synthetic in-process transports only. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const baseline = process.env.LT_TEAM_PERMISSION_BASELINE;
assert.ok(
  baseline,
  "Historical defect probe: set LT_TEAM_PERMISSION_BASELINE=3c51f9c; use tests/team-member-transport.test.mjs for current behavior.",
);
const organization = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
const row = { role: "admin", status: "active", display_name: "Synthetic fixture" };
mkdirSync(resolve("node_modules/.cache"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/team-permission-probe-"));
const saved = {
  fetch: globalThis.fetch,
  error: console.error,
  env: Object.fromEntries(
    ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].map((k) => [
      k,
      process.env[k],
    ]),
  ),
};
const pending = [];
let unexpected = 0,
  logs = 0;
try {
  await build({
    stdin: {
      contents: `export {Route} from '@/routes/api.team';export {teamAdminClient,memberRole,requireTeamAdmin} from '@/lib/team-server';`,
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
        name: "route-shell",
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
  Object.assign(process.env, {
    SUPABASE_URL: "https://permission-fixture.invalid",
    VITE_SUPABASE_URL: "https://permission-fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-project-key",
  });
  console.error = () => logs++;
  globalThis.fetch = () => {
    unexpected++;
    throw Error("Unexpected global network");
  };
  function setup(fetcher) {
    const owner = new AbortController();
    const request = new Request("https://fixture.invalid/api/team", {
      signal: owner.signal,
      headers: { Authorization: "Bearer synthetic-user-token" },
    });
    return { owner, request, db: api.teamAdminClient(fetcher, request) };
  }
  let first;
  const normal = setup(async (input, init) => {
    first = { url: new URL(String(input)), init };
    return Response.json([row]);
  });
  assert.deepEqual(await api.requireTeamAdmin(normal.db, organization, actor), row);
  assert.equal(first.url.origin, "https://permission-fixture.invalid");
  assert.equal(first.url.pathname, "/rest/v1/team_members");
  assert.equal(first.url.searchParams.get("select"), "role,status,display_name");
  assert.equal(first.url.searchParams.get("organization_id"), "eq." + organization);
  assert.equal(first.url.searchParams.get("user_id"), "eq." + actor);
  assert.equal(first.init.method, "GET");
  assert.equal(first.init.signal, undefined);
  assert.equal(first.init.cache, undefined);
  const oversized = {
    ...row,
    display_name: "x".repeat(300 * 1024),
    unexpectedPrivateField: "SYNTHETIC_PRIVATE",
  };
  const large = setup(async () => Response.json([oversized]));
  const accepted = await api.memberRole(large.db, organization, actor);
  assert.equal(accepted.display_name.length, 300 * 1024);
  assert.equal(accepted.unexpectedPrivateField, "SYNTHETIC_PRIVATE");
  const retryCalls = [];
  const retry = setup(async (input, init) => {
    retryCalls.push({
      retry: new Headers(init.headers).get("x-retry-count"),
      signalPresent: !!init.signal,
    });
    return Response.json(
      { code: "SYNTHETIC_ERROR", message: "PRIVATE synthetic backend diagnostic" },
      { status: 503, headers: { "Retry-After": "0" } },
    );
  });
  await assert.rejects(
    api.memberRole(retry.db, organization, actor),
    (error) => error.message === "PRIVATE synthetic backend diagnostic",
  );
  assert.deepEqual(
    retryCalls.map((x) => x.retry),
    [null, "1", "2", "3"],
  );
  let release, started;
  const dispatched = new Promise((resolve) => {
    started = resolve;
  });
  const late = setup(
    () =>
      new Promise((resolve) => {
        release = resolve;
        started();
      }),
  );
  let completed = false;
  const permission = api.requireTeamAdmin(late.db, organization, actor).finally(() => {
    completed = true;
  });
  pending.push({
    owner: late.owner,
    release: () => release?.(Response.json([row])),
    promise: permission,
  });
  await dispatched;
  late.owner.abort();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  release(Response.json([row]));
  assert.deepEqual(await permission, row);
  const routeOwner = new AbortController(),
    events = [];
  let routeRelease, routeStarted;
  const roleStarted = new Promise((resolve) => {
    routeStarted = resolve;
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)),
      method = init?.method ?? "GET";
    assert.equal(
      url.origin,
      "https://permission-fixture.invalid",
      "No external network destination",
    );
    events.push({
      path: url.pathname,
      method,
      afterAbort: routeOwner.signal.aborted,
      signalPresent: !!init.signal,
    });
    if (url.pathname === "/auth/v1/user")
      return Response.json({
        id: actor,
        email: "fixture@example.invalid",
        email_confirmed_at: "2026-01-01T00:00:00Z",
      });
    if (url.pathname === "/rest/v1/team_members") {
      routeStarted();
      return new Promise((resolve) => {
        routeRelease = resolve;
      });
    }
    if (url.pathname === "/rest/v1/team_organizations" && method === "GET")
      return Response.json({ name: "Synthetic team", billing_email: "fixture@example.invalid" });
    if (url.pathname === "/rest/v1/team_organizations" && method === "PATCH")
      return new Response(null, { status: 204 });
    if (url.pathname === "/rest/v1/platform_audit_events" && method === "POST")
      return new Response(null, { status: 201 });
    unexpected++;
    throw Error("Unexpected synthetic operation");
  };
  const request = new Request("https://fixture.invalid/api/team", {
    method: "POST",
    headers: { Origin: "https://fixture.invalid", Authorization: "Bearer synthetic-user-token" },
    body: JSON.stringify({ action: "onboarding", orgId: organization, step: 2 }),
    signal: routeOwner.signal,
  });
  const operation = api.Route.server.handlers.POST({ request });
  pending.push({
    owner: routeOwner,
    release: () => routeRelease?.(Response.json([row])),
    promise: operation,
  });
  let timer;
  try {
    await Promise.race([
      roleStarted,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("Synthetic membership did not dispatch")), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  routeOwner.abort();
  routeRelease(Response.json([row]));
  const response = await operation;
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const lateWrites = events.filter((x) => x.afterAbort && x.method !== "GET");
  assert.deepEqual(
    lateWrites.map((x) => [x.path, x.method]),
    [["/rest/v1/team_organizations", "PATCH"]],
  );
  assert.equal(unexpected, 0);
  assert.equal(logs, 0);
  const paths = [
    "src/lib/team-server.ts",
    "src/lib/team-auth-fetch.ts",
    "src/routes/api.team.ts",
    "node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts",
    "node_modules/@supabase/postgrest-js/src/types/common/common.ts",
  ];
  const report = {
    probedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    versions: Object.fromEntries(
      ["supabase-js", "postgrest-js"].map((name) => [
        name,
        JSON.parse(readFileSync(`node_modules/@supabase/${name}/package.json`)).version,
      ]),
    ),
    observations: {
      configuredProjectAndActorOrganizationFiltersCorrect: true,
      permissionTransportSignalPresent: false,
      explicitNoStorePresent: false,
      acceptedNameBytes: 300 * 1024,
      unexpectedFixtureFieldReturnedByHelper: true,
      transient503Dispatches: retryCalls.length,
      retryHeaders: retryCalls.map((x) => x.retry),
      backendDiagnosticReachedHelper: true,
      abortDuringPermissionDidNotSettleWait: true,
      latePermissionStillReturnedAdmin: true,
      actualRouteAfterPermissionAbort: {
        status: response.status,
        subsequentSyntheticWrites: lateWrites,
      },
      unexpectedNetworkCalls: unexpected,
      sdkConsoleErrorCalls: logs,
    },
    sources: paths.map((path) => ({
      path,
      sha256: createHash("sha256")
        .update(
          path === "src/lib/team-server.ts"
            ? execFileSync("git", ["show", `${baseline}:${path}`])
            : readFileSync(path),
        )
        .digest("hex"),
    })),
    limits: [
      "Observes current actual production factory/helper and actual route with installed SDK, synthetic project/credentials/transports only. No real network, membership/role read, user/team write, email, financial, consent, exam, certificate or private data access.",
      "Oversized/unknown response fields are deliberately injected unexpected service data, not evidence of actual database leakage or attacker control. Raw helper error is not a public API exposure claim; scoped route catches protect resolved backend failures separately.",
      "Late PATCH is captured in-process mock HTTP requests; no real database changed. This demonstrates a request-departure gap during permission lookup, not a tenant authorization bypass or proof every later phase behaves identically.",
      "This is a probe of a remaining defect, not a required test that should keep passing after repair. No application changes/deployment/role/schema/policy/schedule action; membership deadline/response budget/cancellation and exact selected-query retry control require follow-up.",
    ],
  };
  writeFileSync(
    process.env.LT_QA_REPORT_PATH ?? join(dir, "historical-probe.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ observations: report.observations, versions: report.versions }));
} finally {
  for (const item of pending) {
    item.owner.abort();
    item.release();
  }
  await Promise.allSettled(pending.map((x) => x.promise));
  globalThis.fetch = saved.fetch;
  console.error = saved.error;
  for (const [k, v] of Object.entries(saved.env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(dir, { recursive: true, force: true });
}
