/** Historical actual-handler/SDK probe. Synthetic transports only, explicit baseline required. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const baseline = process.env.LT_REVIEWER_ADMIN_READ_BASELINE;
assert.ok(baseline, "Explicit historical baseline required");
const path = "src/routes/api.exam-reviewers.ts",
  source = execFileSync("git", ["show", baseline + ":" + path], { encoding: "utf8" });
mkdirSync(resolve("node_modules/.cache"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/reviewer-admin-read-probe-"));
const vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"],
  saved = { fetch: globalThis.fetch, env: vars.map((k) => process.env[k]) };
const pending = [];
const user = { id: "22222222-2222-4222-8222-222222222222", email: "synthetic@example.invalid" };
const tables = [
  "assessment_reviewers",
  "assessment_content_reviewers",
  "assessment_reviewer_admin_events",
];
try {
  await build({
    stdin: {
      contents: `export {Route} from '@/routes/api.exam-reviewers';`,
      resolveDir: process.cwd(),
    },
    outfile: join(dir, "api.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
    plugins: [
      {
        name: "historical-shell",
        setup(b) {
          b.onLoad({ filter: /\/src\/routes\/api\.exam-reviewers\.ts$/ }, (args) => ({
            contents: source,
            loader: "ts",
            resolveDir: resolve(args.path, ".."),
          }));
          b.onResolve({ filter: /^@tanstack\/react-start\/server-only$/ }, () => ({
            path: "empty",
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
  const { Route } = await import(join(dir, "api.mjs"));
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
  delete process.env.PLATFORM_OWNER_EMAIL;
  async function run(mode) {
    const owner = new AbortController(),
      events = [],
      releases = [];
    let began;
    const started = new Promise((r) => (began = r));
    let completed = false;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://fixture.invalid");
      const table = url.pathname.split("/").at(-1);
      if (url.pathname === "/auth/v1/user") return Response.json(user);
      if (table === "platform_admin_roles") return Response.json([{ role: "owner" }]);
      if (table === "consume_speaking_request") return Response.json(true);
      assert.ok(tables.includes(table));
      events.push({
        table,
        signal: !!init.signal,
        noStore: init.cache === "no-store",
        retry: new Headers(init.headers).get("x-retry-count"),
        afterAbort: owner.signal.aborted,
      });
      if (mode === "failure")
        return Response.json(
          { message: "PRIVATE synthetic failure" },
          { status: 503, headers: { "Retry-After": "0" } },
        );
      if (mode === "late")
        return new Promise((r) => {
          releases.push(r);
          if (releases.length === 3) began();
        });
      return Response.json(
        table === "assessment_reviewers"
          ? [{ user_id: user.id, syntheticUnexpectedData: "x".repeat(300 * 1024) }]
          : [],
      );
    };
    const operation = Route.server.handlers
      .GET({
        request: new Request("https://app.invalid/api/exam-reviewers?module=roofing", {
          headers: { Authorization: "Bearer synthetic" },
          signal: owner.signal,
        }),
      })
      .finally(() => (completed = true));
    pending.push({ owner, releases, operation });
    let didNotSettle = false;
    if (mode === "late") {
      await started;
      owner.abort();
      await new Promise((r) => setImmediate(r));
      didNotSettle = !completed;
      assert.equal(didNotSettle, true);
      for (const release of releases) release(Response.json([]));
    }
    const response = await operation,
      body = await response.json();
    assert.equal(response.status, mode === "failure" ? 503 : 200);
    if (mode === "normal") assert.equal(body.grants[0].syntheticUnexpectedData.length, 300 * 1024);
    if (mode === "failure")
      assert.ok(tables.every((t) => events.filter((e) => e.table === t).length === 4));
    return {
      status: response.status,
      events,
      cancellationDidNotSettle: didNotSettle,
      acceptedUnexpectedBytes: mode === "normal" ? 300 * 1024 : 0,
    };
  }
  const normal = await run("normal"),
    failure = await run("failure"),
    late = await run("late");
  assert.ok(normal.events.every((e) => !e.signal && !e.noStore));
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim(),
    routeHash: createHash("sha256").update(source).digest("hex"),
    normal,
    failure,
    late,
    limits: [
      "Actual historical route and installed SDK with synthetic Auth/owner/budget/list HTTP data only. No actual owner/private registry, role/reviewer permission/approval/qualification, quota mutation or other real business operation. The300KiB unexpected fixture field is serialized, not evidence of an actual data leak or tenant bypass.",
      "Three normal list reads have row caps but no selected signal/no-store or body bound; transient503 yields four attempts per list, and all late empty lists return200 after request departure. Earlier Auth/owner bounds already work; probe isolates the list phase. No claim of whole-endpoint deadline, RPC repair, or physical cancellation.",
    ],
  };
  writeFileSync(
    process.env.LT_QA_REPORT_PATH ?? join(dir, "probe.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      normal: normal.status,
      signals: normal.events.map((e) => e.signal),
      failureAttempts: failure.events.length,
      late: late.status,
      cancellationDidNotSettle: late.cancellationDidNotSettle,
    }),
  );
} finally {
  for (const p of pending) {
    p.owner.abort();
    for (const release of p.releases) release(Response.json([]));
  }
  await Promise.allSettled(pending.map((p) => p.operation));
  globalThis.fetch = saved.fetch;
  for (const [i, k] of vars.entries()) {
    if (saved.env[i] === undefined) delete process.env[k];
    else process.env[k] = saved.env[i];
  }
  rmSync(dir, { recursive: true, force: true });
}
