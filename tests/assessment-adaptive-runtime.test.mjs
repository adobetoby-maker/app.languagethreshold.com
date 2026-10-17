import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
const stubs = [/^@tanstack\/react-start\/server-only$/];
const { adaptivePreviewRuntimeEnabled, adaptiveFormAvailable, adaptiveReadyForms } =
  await loadModule("src/lib/assessments/runtime-server.ts", { stubs });
const { listEnrollments, readinessCatalog } = await loadModule("src/lib/assessments/server.ts", {
  stubs,
});
async function capability(run, value = "true", stage = "preview") {
  const keys = ["LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED", "VERCEL_ENV"],
    old = keys.map((key) => process.env[key]);
  process.env.LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED = value;
  process.env.VERCEL_ENV = stage;
  try {
    return await run();
  } finally {
    keys.forEach((key, i) => {
      if (old[i] === undefined) delete process.env[key];
      else process.env[key] = old[i];
    });
  }
}
function formRow(id = "local-form", checkpoint = "entrance") {
  const { form } = routingFixture();
  form.id = id;
  form.checkpoint = checkpoint;
  form.status = "verified";
  for (const item of form.items.filter((item) => item.audioRequired))
    item.audioAsset = { sha256: "a".repeat(64), bytes: 32, mime: "audio/wav" };
  return {
    id,
    release_id: "controlled-release",
    checkpoint,
    purpose: "module",
    status: "verified",
    calibrated: true,
    version: form.version,
    rubric_version: form.rubricVersion,
    definition: form,
  };
}
const context = {
  program_scope: "full_module",
  target_language: "Spanish",
  instruction_language: "English",
};
const releases = [
  { id: "controlled-release", target_language: "Spanish", instruction_language: "English" },
];

test("runtime capability is exact, Preview-only and default-off readiness performs no extra bank reads", async () => {
  for (const [value, stage] of [
    ["false", "preview"],
    ["TRUE", "preview"],
    ["", "preview"],
    ["true", "production"],
    ["true", "development"],
  ])
    await capability(
      async () => {
        assert.equal(adaptivePreviewRuntimeEnabled(), false);
        assert.equal(adaptiveFormAvailable(formRow(), context, "entrance"), false);
        const ready = await adaptiveReadyForms(
          {
            from() {
              assert.fail("Disabled capability must not read definitions");
            },
          },
          releases,
        );
        assert.equal(ready.size, 0);
      },
      value,
      stage,
    );
});

test("adaptive availability requires exact reviewed whole-form identity/pair/scope, valid policy and clips", async () =>
  capability(async () => {
    assert.equal(adaptiveFormAvailable(formRow(), context, "entrance"), true);
    for (const mode of [
      "status",
      "calibration",
      "id",
      "version",
      "rubric",
      "pair",
      "checkpoint",
      "null",
      "policy",
      "unused-rubric",
      "clip",
      "scope",
      "empty-version",
      "empty-rubric",
    ]) {
      const row = formRow(),
        enrollment = { ...context };
      if (mode === "status") row.definition.status = "draft";
      if (mode === "calibration") row.calibrated = false;
      if (mode === "id") row.id = "changed";
      if (mode === "version") row.version = "changed";
      if (mode === "rubric") row.rubric_version = "changed";
      if (mode === "pair") enrollment.target_language = "French";
      if (mode === "checkpoint") row.definition.checkpoint = "day45";
      if (mode === "null") row.definition.routing = null;
      if (mode === "policy") row.definition.routing.minimumEvidence = 999;
      if (mode === "unused-rubric") {
        row.definition.items.at(-1).type = "production";
        delete row.definition.items.at(-1).rubric;
      }
      if (mode === "clip")
        delete row.definition.items.find((item) => item.audioRequired).audioAsset;
      if (mode === "scope") enrollment.program_scope = "support_units";
      if (mode === "empty-version") row.version = row.definition.version = "";
      if (mode === "empty-rubric") row.rubric_version = row.definition.rubricVersion = " ";
      assert.equal(adaptiveFormAvailable(row, enrollment, "entrance"), false, mode);
    }
  }));

test("adaptive readiness discovers metadata then reads at most ten private definitions per batch and emits only availability", async () =>
  capability(async () => {
    const f = await supportCheckFixture();
    f.rows.assessment_forms = Array.from({ length: 25 }, (_, i) => formRow(`local-form-${i}`));
    const ready = await adaptiveReadyForms(f.db, releases);
    assert.deepEqual([...ready], ["controlled-release:entrance"]);
    assert.deepEqual(
      f.queries
        .filter((q) => q.columns.includes(",definition"))
        .map((q) => q.filters.find(([name]) => name === "id")[1].length),
      [10, 10, 5],
    );
    assert.equal(f.queries[0].columns, "id,release_id,checkpoint");
    assert.ok(!JSON.stringify([...ready]).includes("private-fixture-answer"));
  }));

test("readiness fails closed without partial availability on later storage errors, duplicate rows or discovery limits", async () =>
  capability(async () => {
    for (const mode of ["late-error", "duplicate", "limit"]) {
      const f = await supportCheckFixture();
      f.rows.assessment_forms = Array.from({ length: mode === "limit" ? 601 : 12 }, (_, i) =>
        formRow(`local-form-${i}`),
      );
      if (mode === "duplicate") f.rows.assessment_forms[1].id = f.rows.assessment_forms[0].id;
      if (mode === "late-error") {
        const from = f.db.from;
        let reads = 0;
        f.db.from = (table) => {
          const q = from(table),
            select = q.select;
          q.select = (columns) => {
            if (columns.includes(",definition") && ++reads === 2)
              f.errors.assessment_forms = { message: "Synthetic later batch error" };
            return select(columns);
          };
          return q;
        };
      }
      await assert.rejects(adaptiveReadyForms(f.db, releases), { status: 503 }, mode);
    }
  }));

test("catalog and owned overview use the same gated adaptive readiness while keeping private forms out of responses", async () =>
  capability(async () => {
    const f = await supportCheckFixture();
    f.enrollment.program_scope = "full_module";
    f.rows.assessment_forms = ["entrance", "day45", "day90"].map((cp) =>
      formRow(`local-${cp}`, cp),
    );
    const overview = await listEnrollments(f.db, "learner");
    assert.ok(overview.enrollments[0].checkpoints.every((cp) => cp.ready === true));
    const tracks = await readinessCatalog(f.db, "Spanish", "English"),
      roofing = tracks.find((row) => row.moduleId === "roofing");
    assert.equal(roofing.calibrated, true);
    assert.equal(roofing.status, "verified");
    assert.ok(!JSON.stringify({ overview, tracks }).includes("private-fixture-answer"));
    await capability(async () => {
      const hidden = await listEnrollments(f.db, "learner");
      assert.ok(hidden.enrollments[0].checkpoints.every((cp) => cp.ready === false));
    }, "false");
  }));

async function controlledReadinessClock(run) {
  const originalSet = globalThis.setTimeout,
    originalClear = globalThis.clearTimeout,
    timers = [],
    cleared = [];
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay !== 10_000) return originalSet(callback, delay, ...args);
    const id = Symbol("readiness deadline");
    timers.push({ id, callback });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    if (typeof id === "symbol") cleared.push(id);
    else originalClear(id);
  };
  try {
    await run({ timers, cleared });
  } finally {
    globalThis.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  }
}
async function untilReadiness(predicate) {
  for (let i = 0; i < 20 && !predicate(); i++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.ok(predicate(), "Expected the controlled query to enter");
}

test("one readiness deadline aborts stalled discovery and rejects without exposing transport detail", async () =>
  capability(() =>
    controlledReadinessClock(async ({ timers, cleared }) => {
      const f = await supportCheckFixture(),
        from = f.db.from;
      let release;
      const pending = new Promise((resolve) => {
        release = resolve;
      });
      f.db.from = (table) => {
        const q = from(table),
          then = q.then.bind(q);
        q.then = (resolve, reject) => pending.then(() => then(resolve, reject));
        return q;
      };
      const request = adaptiveReadyForms(f.db, releases);
      await untilReadiness(() => f.queries.length === 1);
      assert.equal(timers.length, 1);
      assert.equal(f.queries[0].signal.aborted, false);
      timers[0].callback();
      await assert.rejects(request, {
        status: 503,
        message: "Adaptive form readiness is unavailable.",
      });
      assert.equal(f.queries[0].signal.aborted, true);
      assert.deepEqual(cleared, [timers[0].id]);
      release();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(f.queries.length, 1, "Late discovery must not launch private definition reads");
    }),
  ));

test("deadline is cumulative across batches and late completion cannot return partial readiness or start another batch", async () =>
  capability(() =>
    controlledReadinessClock(async ({ timers, cleared }) => {
      const f = await supportCheckFixture(),
        from = f.db.from;
      f.rows.assessment_forms = Array.from({ length: 25 }, (_, i) => formRow(`deadline-${i}`));
      let calls = 0,
        release;
      const pending = new Promise((resolve) => {
        release = resolve;
      });
      f.db.from = (table) => {
        const q = from(table);
        if (++calls === 3) {
          const then = q.then.bind(q);
          q.then = (resolve, reject) => pending.then(() => then(resolve, reject));
        }
        return q;
      };
      const request = adaptiveReadyForms(f.db, releases);
      await untilReadiness(() => calls === 3);
      assert.equal(timers.length, 1, "Later batches must not reset the total deadline");
      assert.ok(f.queries.every((q) => q.signal === f.queries[0].signal));
      timers[0].callback();
      await assert.rejects(request, { status: 503 });
      release();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls, 3);
      assert.deepEqual(cleared, [timers[0].id]);
      assert.ok(f.queries.every((q) => q.signal.aborted));
    }),
  ));

test("readiness releases its deadline on complete success and sanitizes rejected transports", async () =>
  capability(() =>
    controlledReadinessClock(async ({ timers, cleared }) => {
      const f = await supportCheckFixture();
      f.rows.assessment_forms = [formRow()];
      assert.deepEqual(
        [...(await adaptiveReadyForms(f.db, releases))],
        ["controlled-release:entrance"],
      );
      assert.equal(timers.length, 1);
      assert.deepEqual(cleared, [timers[0].id]);
      const broken = {
        from() {
          throw Error("private fixture transport detail");
        },
      };
      await assert.rejects(adaptiveReadyForms(broken, releases), {
        status: 503,
        message: "Adaptive form readiness is unavailable.",
      });
      assert.equal(timers.length, 2);
      assert.deepEqual(
        cleared,
        timers.map((timer) => timer.id),
      );
    }),
  ));

test("installed Supabase transport receives the cumulative abort signal and performs no retry after expiry", async () =>
  capability(() =>
    controlledReadinessClock(async ({ timers }) => {
      const { createClient } = await import("@supabase/supabase-js");
      let calls = 0,
        signal,
        aborted = false;
      const db = createClient("https://local-fixture.invalid", "local-fixture-key", {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          fetch: async (_url, options) => {
            calls++;
            signal = options.signal;
            return new Promise((_resolve, reject) => {
              signal.addEventListener(
                "abort",
                () => {
                  aborted = true;
                  reject(new DOMException("Synthetic local cancellation", "AbortError"));
                },
                { once: true },
              );
            });
          },
        },
      });
      const request = adaptiveReadyForms(db, releases);
      await untilReadiness(() => calls === 1);
      assert.equal(timers.length, 1);
      assert.equal(signal.aborted, false);
      timers[0].callback();
      await assert.rejects(request, { status: 503 });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(aborted, true);
      assert.equal(calls, 1);
    }),
  ));

test("maximum allowed discovery remains sixty bounded definition batches under one total deadline", async () =>
  capability(() =>
    controlledReadinessClock(async ({ timers, cleared }) => {
      const f = await supportCheckFixture();
      f.rows.assessment_forms = Array.from({ length: 600 }, (_, i) => formRow(`maximum-${i}`));
      assert.deepEqual(
        [...(await adaptiveReadyForms(f.db, releases))],
        ["controlled-release:entrance"],
      );
      const definitions = f.queries.filter((q) => q.columns.includes(",definition"));
      assert.equal(definitions.length, 60);
      assert.ok(
        definitions.every(
          (q) => q.maximum === 11 && q.filters.find(([name]) => name === "id")[1].length === 10,
        ),
      );
      assert.equal(timers.length, 1);
      assert.deepEqual(cleared, [timers[0].id]);
    }),
  ));
