/** Historical permission-read probe. Synthetic transports only; no live grants or evidence. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const baseline = process.env.LT_REVIEWER_PERMISSION_BASELINE;
assert.ok(
  baseline,
  "Historical probe requires LT_REVIEWER_PERMISSION_BASELINE=eec3f0f; do not require this defect after repair.",
);
const actor = "22222222-2222-4222-8222-222222222222";
const user = {
  id: actor,
  email: "fixture@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};
const grant = {
  module_id: "roofing",
  target_language: "Spanish",
  instruction_language: "English",
  kind: "domain",
};
const sourcePaths = [
  "src/lib/team-server.ts",
  "src/lib/assessments/content-server.ts",
  "src/lib/assessments/server.ts",
  "src/routes/api.exam-content.ts",
];
const source = new Map(
  sourcePaths.map((p) => [
    resolve(p),
    execFileSync("git", ["show", `${baseline}:${p}`], { encoding: "utf8" }),
  ]),
);
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
const dir = mkdtempSync(resolve("node_modules/.cache/content-grant-probe-"));
try {
  await build({
    stdin: {
      contents: `export {Route} from '@/routes/api.exam-content';export {teamAdminClient} from '@/lib/team-server';export {contentPrivileges,contentTrackAllowed} from '@/lib/assessments/content-server';`,
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
        name: "historical-shell",
        setup(b) {
          b.onLoad(
            {
              filter:
                /\/src\/(lib\/team-server|lib\/assessments\/(content-server|server)|routes\/api\.exam-content)\.ts$/,
            },
            (args) => {
              const contents = source.get(args.path);
              assert.ok(contents);
              return { contents, loader: "ts", resolveDir: resolve(args.path, "..") };
            },
          );
          b.onResolve({ filter: /^@tanstack\/react-start\/server-only$/ }, () => ({
            path: "server-only",
            namespace: "empty",
          }));
          b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "" }));
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
  process.env.SUPABASE_URL = "https://grant-fixture.invalid";
  process.env.VITE_SUPABASE_URL = "https://grant-fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-project-key";
  delete process.env.PLATFORM_OWNER_EMAIL;
  console.error = () => logs++;
  globalThis.fetch = () => {
    unexpected++;
    throw Error("Unexpected global transport");
  };
  function client(grants) {
    const owner = new AbortController(),
      request = new Request("https://fixture.invalid/api/exam-content", { signal: owner.signal });
    return {
      owner,
      db: api.teamAdminClient(async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.origin, "https://grant-fixture.invalid");
        if (url.pathname === "/rest/v1/platform_admin_roles") return Response.json([]);
        assert.equal(url.pathname, "/rest/v1/assessment_content_reviewers");
        return grants(input, init);
      }, request),
    };
  }
  let selected;
  const normal = client(async (input, init) => {
    selected = { url: new URL(String(input)), init };
    return Response.json([grant]);
  });
  const privileges = await api.contentPrivileges(normal.db, user);
  assert.equal(privileges.owner, false);
  assert.equal(privileges.registeredOwner, false);
  assert.ok(api.contentTrackAllowed(privileges, grant));
  assert.equal(
    selected.url.searchParams.get("select"),
    "module_id,target_language,instruction_language,kind",
  );
  assert.equal(selected.url.searchParams.get("user_id"), "eq." + actor);
  assert.equal(selected.url.searchParams.get("active"), "eq.true");
  assert.equal(selected.init.signal, undefined);
  assert.equal(selected.init.cache, undefined);
  const large = client(async () =>
    Response.json([{ ...grant, syntheticUnexpectedData: "x".repeat(300 * 1024) }]),
  );
  const largePrivileges = await api.contentPrivileges(large.db, user);
  assert.equal(largePrivileges.grants[0].syntheticUnexpectedData.length, 300 * 1024);
  const retries = [];
  const failed = client(async (input, init) => {
    retries.push(new Headers(init.headers).get("x-retry-count"));
    return Response.json(
      { code: "SYNTHETIC_ERROR", message: "PRIVATE synthetic service diagnostic" },
      { status: 503, headers: { "Retry-After": "0" } },
    );
  });
  await assert.rejects(
    api.contentPrivileges(failed.db, user),
    (e) => e.status === 503 && e.message === "Content permissions could not be checked.",
  );
  assert.deepEqual(retries, [null, "1", "2", "3"]);
  let release,
    start,
    completed = false;
  const began = new Promise((r) => (start = r)),
    late = client(
      () =>
        new Promise((r) => {
          release = r;
          start();
        }),
    );
  const waiting = api.contentPrivileges(late.db, user).finally(() => (completed = true));
  void waiting.catch(() => {});
  pending.push({
    owner: late.owner,
    release: () => release?.(Response.json([grant])),
    promise: waiting,
  });
  await began;
  await new Promise((r) => setImmediate(r));
  late.owner.abort();
  await new Promise((r) => setImmediate(r));
  assert.equal(completed, false);
  release(Response.json([grant]));
  const latePrivileges = await waiting;
  assert.ok(api.contentTrackAllowed(latePrivileges, grant));
  const owner = new AbortController(),
    events = [];
  let routeRelease, routeStart;
  const dispatched = new Promise((r) => (routeStart = r));
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)),
      method = init?.method ?? "GET";
    assert.equal(url.origin, "https://grant-fixture.invalid", "Synthetic destination only");
    events.push({
      path: url.pathname,
      method,
      afterAbort: owner.signal.aborted,
      signalPresent: !!init.signal,
    });
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/platform_admin_roles") return Response.json([]);
    if (url.pathname === "/rest/v1/assessment_content_reviewers") {
      routeStart();
      return new Promise((r) => (routeRelease = r));
    }
    if (url.pathname === "/rest/v1/rpc/consume_speaking_request" && method === "POST")
      return Response.json(true);
    if (url.pathname === "/rest/v1/assessment_releases" && method === "GET")
      return Response.json([]);
    unexpected++;
    throw Error("Unexpected synthetic operation");
  };
  const request = new Request("https://fixture.invalid/api/exam-content", {
    headers: { Authorization: "Bearer synthetic-user-token" },
    signal: owner.signal,
  });
  const operation = api.Route.server.handlers.GET({ request });
  pending.push({
    owner,
    release: () => routeRelease?.(Response.json([grant])),
    promise: operation,
  });
  let timer;
  try {
    await Promise.race([
      dispatched,
      new Promise(
        (_, reject) =>
          (timer = setTimeout(
            () => reject(Error("Synthetic content grant did not dispatch")),
            5000,
          )),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
  await new Promise((r) => setImmediate(r));
  owner.abort();
  routeRelease(Response.json([grant]));
  const response = await operation;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.releases, []);
  assert.deepEqual(body.forms, []);
  const after = events.filter((e) => e.afterAbort);
  assert.deepEqual(
    after.map((e) => [e.path, e.method]),
    [
      ["/rest/v1/rpc/consume_speaking_request", "POST"],
      ["/rest/v1/assessment_releases", "GET"],
    ],
  );
  assert.equal(unexpected, 0);
  assert.equal(logs, 0);
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    installedSdk: JSON.parse(readFileSync("node_modules/@supabase/postgrest-js/package.json"))
      .version,
    observations: {
      configuredProjectActorProjectionAndActiveFilterCorrect: true,
      ownerAndRegisteredOwnerFalseForFixture: true,
      contentGrantSignalPresent: false,
      explicitNoStore: false,
      acceptedInjectedExtraBytes: 300 * 1024,
      extraFixtureFieldRetainedInHelper: true,
      transient503Dispatches: retries.length,
      retryHeaders: retries,
      serviceErrorAlreadyHasFixed503Guidance: true,
      abortDuringGrantDidNotSettleWait: true,
      lateGrantStillAuthorizesMatchingTrack: true,
      actualCatalogRouteStatusAfterAbort: response.status,
      subsequentSyntheticCalls: after,
      unexpectedNetworkCalls: unexpected,
      sdkConsoleErrorCalls: logs,
    },
    sourceHashes: Object.fromEntries(
      sourcePaths.map((p) => [
        p,
        createHash("sha256")
          .update(source.get(resolve(p)))
          .digest("hex"),
      ]),
    ),
    limits: [
      "Historical source and actual installed SDK with entirely synthetic Auth/project/role/grant/HTTP data. No live reviewer grant, scope/role change, human approval, private form/evidence read, release, assessment write, budget-counter update, provider/email/financial/schema/policy/schedule operation.",
      "Actual catalog GET continued after grant wait with one mock budget RPC and one mock release read. Empty responses return no question content. In-process mock calls do not establish actual unauthorized data exposure, attacker control, tenant bypass or physical cancellation behavior.",
      "The service-error control already returns fixed503 guidance; this is not a private diagnostic leak finding. Large/unknown fields are injected service responses and retained in the internal helper only, not evidence of public serialization.",
      "Owner role reads are already bounded separately; their completion does not bound the later content-grant wait. This probe does not undo the owner/membership/Auth repairs. Evidence-reviewer exact-track and review-queue registry reads are separate source-audit candidates, not proved by this content-grant probe.",
      "Defect probe requires explicit baseline; it must not become a required test preserving late authorization. No application change/deploy in this audit group. Next repair needs scoped cancellation/deadline, response budget/schema and exact-query retry control, preserving active/user/track semantics and unrelated write outcomes.",
    ],
  };
  const path = process.env.LT_QA_REPORT_PATH ?? join(dir, "historical-grant-probe.json");
  writeFileSync(path, JSON.stringify(report, null, 2) + "\n");
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
