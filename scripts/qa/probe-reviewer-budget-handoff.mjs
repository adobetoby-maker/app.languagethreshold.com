/** Historical route + installed SDK, synthetic quota/owner/mutation responses only. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const baseline = process.env.LT_REVIEWER_BUDGET_BASELINE;
assert.ok(baseline, "Explicit historical baseline required");
const paths = ["src/routes/api.exam-reviewers.ts", "src/lib/assessments/server.ts"];
const sources = new Map(
  paths.map((p) => [
    resolve(p),
    execFileSync("git", ["show", baseline + ":" + p], { encoding: "utf8" }),
  ]),
);
mkdirSync(resolve("node_modules/.cache"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/reviewer-budget-probe-"));
const vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"],
  saved = { fetch: globalThis.fetch, env: vars.map((k) => process.env[k]) };
const pending = [];
const actor = "22222222-2222-4222-8222-222222222222",
  target = "33333333-3333-4333-8333-333333333333";
const valid = {
  userId: target,
  moduleId: "roofing",
  target: "Spanish",
  native: "English",
  kind: "response",
  active: true,
  expectedRevision: 0,
  reason: "Synthetic handoff fixture only",
  requestId: "44444444-4444-4444-8444-444444444444",
  confirmScope: true,
};
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
          b.onLoad(
            { filter: /\/src\/(routes\/api\.exam-reviewers|lib\/assessments\/server)\.ts$/ },
            (args) => ({
              contents: sources.get(args.path),
              loader: "ts",
              resolveDir: dirname(args.path),
            }),
          );
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
      events = [];
    let began,
      release,
      quotaSignal,
      complete = false;
    const started = new Promise((r) => (began = r));
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://fixture.invalid");
      events.push({
        path: url.pathname,
        method: init?.method ?? "GET",
        afterAbort: owner.signal.aborted,
      });
      if (url.pathname === "/auth/v1/user")
        return Response.json({ id: actor, email: "synthetic@example.invalid" });
      if (url.pathname === "/rest/v1/platform_admin_roles")
        return Response.json([{ role: "owner" }]);
      if (url.pathname === "/rest/v1/rpc/consume_speaking_request") {
        quotaSignal = init.signal;
        if (mode === "large") return new Response("true" + " ".repeat(300 * 1024));
        began();
        return new Promise((r) => (release = r));
      }
      assert.equal(url.pathname, "/rest/v1/rpc/assessment_manage_reviewer");
      return Response.json({ syntheticAcknowledgement: true });
    };
    const operation = Route.server.handlers
      .POST({
        request: new Request("https://app.invalid/api/exam-reviewers", {
          method: "POST",
          headers: {
            Origin: "https://app.invalid",
            Authorization: "Bearer synthetic",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(valid),
          signal: owner.signal,
        }),
      })
      .finally(() => (complete = true));
    pending.push({ owner, release: () => release?.(Response.json(true)), operation });
    let requestAbortReachedQuotaSignal = null,
      didNotSettle = null;
    if (mode === "late") {
      await started;
      owner.abort();
      await new Promise((r) => setImmediate(r));
      didNotSettle = !complete;
      requestAbortReachedQuotaSignal = quotaSignal.aborted;
      assert.equal(didNotSettle, true);
      assert.equal(requestAbortReachedQuotaSignal, false);
      release(Response.json(true));
    }
    const response = await operation;
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { syntheticAcknowledgement: true });
    const writes = events.filter((e) => e.path.endsWith("assessment_manage_reviewer"));
    assert.equal(writes.length, 1);
    if (mode === "late") assert.equal(writes[0].afterAbort, true);
    return {
      status: response.status,
      transportHadIndependentSignal: !!quotaSignal,
      requestAbortReachedQuotaSignal,
      cancellationDidNotSettle: didNotSettle,
      acceptedTrailingQuotaBytes: mode === "large" ? 300 * 1024 : 0,
      events,
    };
  }
  const late = await run("late"),
    large = await run("large");
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim(),
    sourceHashes: Object.fromEntries(
      paths.map((p) => [
        p,
        createHash("sha256")
          .update(sources.get(resolve(p)))
          .digest("hex"),
      ]),
    ),
    late,
    large,
    limits: [
      "Actual historical route/assessmentBudget and installed SDK with synthetic Auth/owner/quota/mutation HTTP only. One mock reviewer update after request cancellation is observed, not an actual grant/revoke/approval/qualification, real owner/business write or quota mutation.",
      "The raw quota fetch already supplies an independent native8second AbortSignal and no-store, and has no SDK automatic retry. Probe shows incoming request cancellation does not reach it, ignored quota headers do not settle, and late true permits the subsequent mock update.300KiB trailing whitespace is accepted by the unbounded JSON path. Not evidence that the normal quota service sends excess data or leaks private content.",
      "Next repair should give only adopted callers an owned quota wait/body bound and stop before dispatching the permission update on departure. A quota POST may already have consumed a counter even when cancelled; do not replay or claim rollback. Once a permission update itself is dispatched its existing outcome/revision/requestID semantics must remain separate.",
    ],
  };
  writeFileSync(
    process.env.LT_QA_REPORT_PATH ?? join(dir, "probe.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      lateStatus: late.status,
      quotaSignalReached: late.requestAbortReachedQuotaSignal,
      updateAfterAbort: late.events.at(-1).afterAbort,
      acceptedTrailingQuotaBytes: large.acceptedTrailingQuotaBytes,
    }),
  );
} finally {
  for (const p of pending) {
    p.owner.abort();
    p.release();
  }
  await Promise.allSettled(pending.map((p) => p.operation));
  globalThis.fetch = saved.fetch;
  for (const [i, k] of vars.entries()) {
    if (saved.env[i] === undefined) delete process.env[k];
    else process.env[k] = saved.env[i];
  }
  rmSync(dir, { recursive: true, force: true });
}
