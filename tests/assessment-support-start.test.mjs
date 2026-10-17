import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";

// Real POST handler and readiness/binding logic; auth, billing, budget and final
// attempt serialization are controlled boundaries. No hosted approval/result.
const root = resolve("node_modules/.cache/lle-tests");
mkdirSync(root, { recursive: true });
const directory = mkdtempSync(resolve(root, "support-start-"));
const outfile = resolve(directory, "handler.mjs");
let route;
try {
  await build({
    stdin: {
      contents: `export {Route} from './src/routes/api.exams.ts';export {controls} from 'test-controls';`,
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    external: ["react", "react-dom", "zod"],
    plugins: [
      {
        name: "controlled-handler-boundaries",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(test-controls|@tanstack\/react-router|@tanstack\/react-start\/server-only|@\/lib\/team-server|@\/lib\/assessments\/server|@\/lib\/assessments\/plans-server)$/,
            },
            (args) => ({ path: args.path, namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
            if (args.path === "test-controls")
              return { contents: "export const controls={db:null,actor:'learner'};" };
            if (args.path === "@tanstack/react-start/server-only") return { contents: "" };
            if (args.path === "@tanstack/react-router")
              return { contents: "export const createFileRoute=()=>options=>options;" };
            if (args.path === "@/lib/team-server")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {controls} from 'test-controls';export const teamAdminClient=()=>controls.db;export const authenticatedUser=async()=>({id:controls.actor});`,
                resolveDir: process.cwd(),
              };
            if (args.path === "@/lib/assessments/server")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/assessments/server.ts"))};export const assessmentBudget=async()=>{};export const readAttempt=async(_db,_actor,id)=>({id,controlledSerialization:true});`,
                resolveDir: process.cwd(),
              };
            return {
              contents: `export * from ${JSON.stringify(resolve("src/lib/assessments/plans-server.ts"))};export const assessmentContentAccess=async()=>true;`,
              resolveDir: process.cwd(),
            };
          });
        },
      },
    ],
  });
  route = await import(outfile);
} finally {
  rmSync(directory, { recursive: true, force: true });
}

async function start(f, checkpoint = 0, actor = "learner") {
  route.controls.db = f.db;
  route.controls.actor = actor;
  return route.Route.server.handlers.POST({
    request: new Request("https://support.invalid/api/exams", {
      method: "POST",
      headers: { Origin: "https://support.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        checkpointId: f.checkpoints[checkpoint].id,
        requestId: "33333333-3333-4333-8333-333333333333",
      }),
    }),
  });
}
test("actual Start selects the pinned before/after form using the same checks as overview", async () => {
  for (const stage of [0, 2]) {
    const f = await supportCheckFixture();
    const response = await start(f, stage);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(
      f.rpcs.find((r) => r.name === "assessment_start_attempt").args.p_form,
      stage === 0 ? f.cap.before_form_id : f.cap.after_form_id,
    );
    assert.doesNotMatch(await response.text(), /CONTROLLED_PRIVATE|acceptedAnswers/);
  }
});
test("actual Start refuses missing selected-unit coverage and substituted mappings before creating an attempt", async () => {
  for (const mutate of [
    (f) => f.forms[0].definition.items.pop(),
    (f) => (f.assignment.capability_snapshot.version = "old"),
    (f) => (f.assignment.organization_id = "foreign-team"),
    (f) => (f.cap.status = "retired"),
  ]) {
    const f = await supportCheckFixture();
    mutate(f);
    const response = await start(f);
    assert.equal(response.status, 400);
    assert.equal(
      f.rpcs.some((r) => r.name === "assessment_start_attempt"),
      false,
    );
  }
  const f = await supportCheckFixture();
  assert.equal((await start(f, 1)).status, 400);
});
test("actual Start denies another learner and fails closed on support-store errors", async () => {
  const f = await supportCheckFixture();
  assert.equal((await start(f, 0, "outsider")).status, 403);
  assert.equal(
    f.queries.some((q) => q.table === "assessment_support_assignments"),
    false,
  );
  f.errors.assessment_support_assignments = { message: "controlled unavailable" };
  assert.equal((await start(f)).status, 503);
  assert.equal(
    f.rpcs.some((r) => r.name === "assessment_start_attempt"),
    false,
  );
});
