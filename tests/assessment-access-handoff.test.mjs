import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const actor = "11111111-1111-4111-8111-111111111111",
  attempt = "22222222-2222-4222-8222-222222222222",
  checkpoint = "33333333-3333-4333-8333-333333333333",
  enrollment = "44444444-4444-4444-8444-444444444444";
const tick = () => new Promise((r) => setImmediate(r));
const req = (c) => new Request("https://synthetic.invalid/api/exams", { signal: c.signal });
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/access-handoff-"));
  const oldFetch = globalThis.fetch,
    keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    oldEnv = keys.map((k) => process.env[k]);
  try {
    await build({
      stdin: {
        contents: `export {attemptAccess,enrollmentAccess} from '@/lib/assessments/server';export {teamAdminClient} from '@/lib/team-server';export {proposeWritingReview} from '@/lib/assessments/ai-server';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "access-handoff-fixture",
          setup(b) {
            if (process.env.LT_ACCESS_HANDOFF_BASELINE)
              b.onLoad({ filter: /\/assessments\/server\.ts$/ }, (args) => ({
                contents: execFileSync(
                  "git",
                  [
                    "show",
                    `${process.env.LT_ACCESS_HANDOFF_BASELINE}:src/lib/assessments/server.ts`,
                  ],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve(args.path, ".."),
              }));
            b.onResolve({ filter: /^@tanstack\/react-start\/server-only$/ }, () => ({
              path: "stub",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "" }));
          },
        },
      ],
    });
    const a = await import(join(dir, "case.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-only";
    const rows = {
      assessment_attempts: [
        {
          id: attempt,
          checkpoint_id: checkpoint,
          submitted_at: null,
          form_snapshot: { definition: { items: [] } },
        },
      ],
      assessment_checkpoints: [{ id: checkpoint, enrollment_id: enrollment }],
      assessment_enrollments: [
        { id: enrollment, user_id: actor, scope: "personal", organization_id: "synthetic-org" },
      ],
      assessment_review_requests: [],
      team_members: [{ role: "learner", status: "active", display_name: "Synthetic" }],
    };
    const calls = [],
      hooks = {};
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input)),
        table = url.pathname.split("/").at(-1);
      calls.push({ url, init, table });
      assert.ok(rows[table], `Unexpected private lookup ${table}`);
      return hooks[table] ? hooks[table](init) : Response.json(rows[table]);
    };
    await run({ ...a, rows, calls, hooks, db: a.teamAdminClient() });
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) =>
      oldEnv[i] === undefined ? delete process.env[k] : (process.env[k] = oldEnv[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
}
const access = (a, r) => a.attemptAccess(a.db, actor, attempt, false, "routing", r);
const outcome = (p) =>
  p.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
async function until(fn) {
  for (let i = 0; i < 100 && !fn(); i++) await tick();
  assert.ok(fn());
}

test("checkpoint service errors remain service errors instead of missing assessments", () =>
  fixture(async (a) => {
    a.hooks.assessment_checkpoints = () =>
      Response.json({ code: "XX000", message: "PRIVATE diagnostic" }, { status: 400 });
    await assert.rejects(access(a, req(new AbortController())), (e) => {
      assert.equal(e.status, 503);
      assert.doesNotMatch(e.message, /PRIVATE/);
      return true;
    });
    assert.deepEqual(
      a.calls.map((x) => x.table),
      ["assessment_attempts", "assessment_checkpoints"],
    );
  }));

test("authorized own personal attempt uses exact linked lookups and incoming signal", () =>
  fixture(async (a) => {
    const r = req(new AbortController()),
      context = await access(a, r);
    assert.equal(context.enrollment.user_id, actor);
    assert.equal(a.calls.length, 3);
    for (const [i, id] of [attempt, checkpoint, enrollment].entries()) {
      assert.equal(a.calls[i].url.searchParams.get("select"), "*");
      assert.equal(a.calls[i].url.searchParams.get("id"), `eq.${id}`);
      assert.equal([...a.calls[i].url.searchParams].length, 2);
      assert.equal(a.calls[i].init.signal, r.signal);
    }
  }));

test("preabort and ignored late authorization reads stop before next private phase", () =>
  fixture(async (a) => {
    const before = new AbortController();
    before.abort();
    await assert.rejects(access(a, req(before)), { status: 499 });
    assert.equal(a.calls.length, 0);
    for (const [index, table] of [
      "assessment_attempts",
      "assessment_checkpoints",
      "assessment_enrollments",
    ].entries()) {
      a.calls.length = 0;
      const owner = new AbortController();
      let release;
      a.hooks[table] = () => new Promise((r) => (release = r));
      const pending = outcome(access(a, req(owner)));
      await until(() => release);
      owner.abort();
      release(Response.json(a.rows[table]));
      assert.equal((await pending).error?.status, 499);
      assert.equal(a.calls.length, index + 1);
      assert.equal(a.calls.at(-1).init.signal.aborted, true);
      delete a.hooks[table];
    }
  }));

test("native abort rejection is fixed499 and service failures use one SDK attempt", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    a.hooks.assessment_attempts = (signal) =>
      new Promise((_, reject) =>
        signal.signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        ),
      );
    const pending = outcome(access(a, req(owner)));
    await until(() => a.calls.length);
    owner.abort();
    assert.equal((await pending).error?.status, 499);
    delete a.hooks.assessment_attempts;
    for (const table of [
      "assessment_attempts",
      "assessment_checkpoints",
      "assessment_enrollments",
    ]) {
      for (const status of [429, 500, 503]) {
        a.calls.length = 0;
        a.hooks[table] = () => Response.json({ message: "PRIVATE" }, { status });
        await assert.rejects(
          access(a, req(new AbortController())),
          (e) => e.status === 503 && !e.message.includes("PRIVATE"),
        );
        assert.equal(a.calls.filter((x) => x.table === table).length, 1);
      }
      delete a.hooks[table];
    }
  }));

test("confirmed absence is404 while duplicate lookup rows remain unavailable", () =>
  fixture(async (a) => {
    for (const table of [
      "assessment_attempts",
      "assessment_checkpoints",
      "assessment_enrollments",
    ]) {
      a.hooks[table] = () => Response.json([]);
      await assert.rejects(access(a, req(new AbortController())), { status: 404 });
      a.hooks[table] = () => Response.json([a.rows[table][0], a.rows[table][0]]);
      await assert.rejects(access(a, req(new AbortController())), { status: 503 });
      delete a.hooks[table];
    }
  }));

test("personal isolation, active team membership and independent reviewer rules remain", () =>
  fixture(async (a) => {
    await assert.rejects(
      a.attemptAccess(a.db, "outsider", attempt, false, "routing", req(new AbortController())),
      { status: 403 },
    );
    assert.equal(a.calls.length, 3);
    a.rows.assessment_enrollments[0].scope = "team";
    const r = req(new AbortController());
    const db = a.teamAdminClient(undefined, r);
    assert.equal(
      (await a.attemptAccess(db, actor, attempt, false, "routing", r)).enrollment.id,
      enrollment,
    );
    assert.equal(a.calls.at(-1).table, "team_members");
    a.rows.team_members[0].status = "inactive";
    await assert.rejects(a.attemptAccess(db, actor, attempt, false, "routing", r), { status: 403 });
    a.rows.team_members[0].status = "active";
    a.rows.assessment_enrollments[0].scope = "personal";
    await assert.rejects(a.attemptAccess(a.db, actor, attempt, true, "routing", r), {
      status: 403,
    });
  }));

test("independent callers preserve peer access and no-Request legacy lookups", () =>
  fixture(async (a) => {
    const stopped = new AbortController(),
      live = new AbortController(),
      releases = [];
    a.hooks.assessment_attempts = (init) =>
      new Promise((r) => releases.push({ release: r, signal: init.signal }));
    const pa = outcome(access(a, req(stopped))),
      pb = outcome(access(a, req(live)));
    await until(() => releases.length === 2);
    stopped.abort();
    const dead = releases.find((x) => x.signal.aborted),
      current = releases.find((x) => !x.signal.aborted);
    dead.release(Response.json(a.rows.assessment_attempts));
    assert.equal((await pa).error?.status, 499);
    current.release(Response.json(a.rows.assessment_attempts));
    assert.equal((await pb).value.enrollment.id, enrollment);
    delete a.hooks.assessment_attempts;
    a.calls.length = 0;
    assert.equal((await a.attemptAccess(a.db, actor, attempt)).enrollment.id, enrollment);
    assert.equal(a.calls.length, 3);
    assert.equal(a.calls[0].init.signal, undefined);
  }));

test("actual AI caller forwards request and does not reach route or evidence after late access", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    let release;
    a.hooks.assessment_checkpoints = () => new Promise((r) => (release = r));
    const pending = outcome(
      a.proposeWritingReview(
        a.db,
        actor,
        attempt,
        "55555555-5555-4555-8555-555555555555",
        req(owner),
      ),
    );
    await until(() => release);
    owner.abort();
    release(Response.json(a.rows.assessment_checkpoints));
    assert.equal((await pending).error?.status, 499);
    assert.deepEqual(
      a.calls.map((x) => x.table),
      ["assessment_attempts", "assessment_checkpoints"],
    );
  }));
