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

async function postPrepared(f, body, actor = "learner") {
  route.controls.db = f.db;
  route.controls.actor = actor;
  return route.Route.server.handlers.POST({
    request: new Request("https://support.invalid/api/exams", {
      method: "POST",
      headers: { Origin: "https://support.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({ checkpointId: f.checkpoints[0].id, ...body }),
    }),
  });
}

test("actual pre-start check exposes only effort and a form binding, with no attempt or response writes", async () => {
  const f = await supportCheckFixture();
  f.enrollment.program_scope = "full_module";
  for (const form of f.forms) form.purpose = "module";
  f.forms[0].definition.estimatedMinutes = 17;
  const response = await postPrepared(f, { action: "prepare" });
  assert.equal(response.status, 200, await response.clone().text());
  const details = await response.json();
  assert.deepEqual(Object.keys(details).sort(), ["estimatedMinutes", "preparedForm", "provisional"]);
  assert.equal(details.estimatedMinutes, 17);
  assert.equal(details.provisional, false);
  assert.match(details.preparedForm, /^[a-f0-9]{64}$/);
  assert.equal(f.rpcs.some(r => r.name === "assessment_start_attempt"), false);
  assert.equal(f.queries.some(q => q.table === "profiles"), false);
  // Same ID and version, changed private content: the preparation is stale.
  f.forms[0].definition.items[0].prompt += " changed";
  const changed = await postPrepared(f, {
    action: "start", preparedForm: details.preparedForm,
    requestId: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(changed.status, 409);
  assert.equal(f.rpcs.some(r => r.name === "assessment_start_attempt"), false);
});

test("preparation shares ownership/coverage checks and never scales full-form timing for selected units", async () => {
  const f = await supportCheckFixture();
  f.forms[0].definition.estimatedMinutes = 17;
  assert.equal((await postPrepared(f, { action: "prepare" }, "outsider")).status, 403);
  const valid = await postPrepared(f, { action: "prepare" });
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).estimatedMinutes, null);
  f.forms[0].definition.items.pop();
  assert.equal((await postPrepared(f, { action: "prepare" })).status, 400);
  assert.equal(f.rpcs.some(r => r.name === "assessment_start_attempt"), false);
});

test("adaptive metadata cannot be prepared or started through the flat-form runtime, even in malformed form", async () => {
  for (const routing of [null, { schema: 1, version: "fixture" }, { schema: 99 }]) {
    const f = await supportCheckFixture();
    f.enrollment.program_scope = "full_module";
    for (const form of f.forms) form.purpose = "module";
    f.forms[0].definition.routing = routing;
    for (const action of ["prepare", "start"]) {
      const response = await postPrepared(f, {
        action, ...(action === "start" ? { requestId: "33333333-3333-4333-8333-333333333333" } : {}),
      });
      assert.equal(response.status, 503);
      assert.doesNotMatch(await response.text(), /CONTROLLED_PRIVATE/);
    }
    assert.equal(f.rpcs.some(r => r.name === "assessment_start_attempt"), false);
  }
});

test("a future adaptive form cannot displace an available legacy form", async () => {
  const f = await supportCheckFixture();
  f.enrollment.program_scope = "full_module";
  for (const form of f.forms) form.purpose = "module";
  const legacy = structuredClone(f.forms[0]);
  legacy.id = "controlled-legacy-flat";
  f.forms[0].definition.routing = { schema: 1 };
  f.forms.push(legacy);
  const response = await start(f);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(f.rpcs.find(r => r.name === "assessment_start_attempt").args.p_form, legacy.id);
});
