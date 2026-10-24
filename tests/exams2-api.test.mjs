// Built by TAC — 2026-10-23
// Exams v2 server API (T6) and owner bank approval (T7) against an in-memory fake of the
// supabase-js query builder. Synthetic bank only; no real bank content, database or network.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { bankContent, bankSha256 } from "../src/lib/exams2/bank.ts";
import { publicOptionId } from "../src/lib/exams2/public-item.ts";
import { buildSyntheticBank, clone, signReviews } from "./fixtures/exams2-synthetic-bank.mjs";
import { core30ScopeKey } from "../src/lib/core30-scope.ts";

const server = await loadModule("src/lib/exams2/server.ts");
const {
  examCheckResponse,
  examBankResponse,
  handleExamCheck,
  examCheckAction,
  ExamApiError,
  clearExamBankCache,
  hashClientIp,
} = server;

const USER = { id: "10000000-0000-4000-8000-000000000001" };
const OTHER = { id: "10000000-0000-4000-8000-000000000002" };
const OWNER = { id: "10000000-0000-4000-8000-0000000000aa" };
const ENV = {
  LT_EXAMS_V2: "1",
  LT_EXAMS_PUBLIC: "1",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
};
const ORIGIN = "https://app.invalid";
const PRIVATE_KEYS = [
  "correctOptionId",
  "accepted",
  "distractorRationale",
  "explanation",
  "sourceRefs",
  "author",
  "difficulty",
  "solution",
];

// ── Fake supabase-js ─────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuid = () => `20000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`;
// A learner's saved profile: the Core 30 start date and mastered lessons decide the A/B/C windows.
// Dates are fixed so the windows do not drift with the real clock.
function profileRow(userId, { startDate = "2026-01-01", mastered = [], moduleId = "roofing" } = {}) {
  const key = core30ScopeKey(moduleId, { targetLanguage: "Spanish", instructionLanguage: "English" });
  return {
    id: userId,
    data: {
      core30Log: {
        [key]: {
          ...(startDate ? { startDate } : {}),
          lessons: Object.fromEntries(
            mastered.map((n) => [String(n), { visits: {}, masteredAt: "2026-02-01T10:00:00.000Z" }]),
          ),
        },
      },
    },
  };
}
const ALL_LESSONS = Array.from({ length: 30 }, (_, i) => i + 1);
function fakeDb({ missing = false, failUpdate = () => null } = {}) {
  // USER has finished the plan, so every window is open unless a test replaces the profile.
  const tables = {
    exam_banks: [],
    exam_sessions: [],
    profiles: [profileRow(USER.id, { mastered: ALL_LESSONS })],
  };
  const calls = [];
  const violation = (code, message) => ({ data: null, error: { code, message } });
  function constraints(table, rows) {
    if (table === "exam_sessions") {
      const open = rows.filter((r) => r.status === "in_progress" && r.user_id);
      const keys = open.map((r) =>
        [r.user_id, r.module_id, r.target_language, r.instruction_language, r.kind].join("|"),
      );
      if (new Set(keys).size !== keys.length) return violation("23505", "exam_sessions_one_open");
    }
    if (table === "exam_banks") {
      const approved = rows.filter((r) => r.status === "approved");
      const keys = approved.map((r) =>
        [r.module_id, r.target_language, r.instruction_language].join("|"),
      );
      if (new Set(keys).size !== keys.length) return violation("23505", "exam_banks_one_approved");
      for (const r of approved)
        if (!r.approved_by || !r.approved_at || r.approved_sha256 !== r.content_sha256)
          return violation("23514", "exam_banks check");
    }
    return null;
  }
  const db = {
    tables,
    calls,
    from(table) {
      const q = { op: "select", filters: [], order: [], limit: null, single: null, head: false };
      const builder = {
        select(_columns, options) {
          if (options?.count) q.count = true;
          if (options?.head) q.head = true;
          return builder;
        },
        insert(row) {
          q.op = "insert";
          q.rows = Array.isArray(row) ? row : [row];
          return builder;
        },
        update(patch) {
          q.op = "update";
          q.patch = patch;
          return builder;
        },
        eq: (c, v) => (q.filters.push((r) => r[c] === v), builder),
        neq: (c, v) => (q.filters.push((r) => r[c] !== v), builder),
        is: (c, v) => (q.filters.push((r) => r[c] === v), builder),
        in: (c, vs) => (q.filters.push((r) => vs.includes(r[c])), builder),
        gte: (c, v) => (q.filters.push((r) => r[c] >= v), builder),
        order: (c, o) => (q.order.push([c, o?.ascending !== false]), builder),
        limit: (n) => ((q.limit = n), builder),
        maybeSingle: () => ((q.single = "maybe"), builder),
        single: () => ((q.single = "one"), builder),
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => exec(table, q))
            .then(resolve, reject);
        },
      };
      return builder;
    },
  };
  function exec(table, q) {
    calls.push({ table, op: q.op, patch: q.patch });
    if (missing || !tables[table])
      return violation(
        "PGRST205",
        `Could not find the table 'public.${table}' in the schema cache`,
      );
    const rows = tables[table];
    const match = (r) => q.filters.every((f) => f(r));
    if (q.op === "insert") {
      const added = q.rows.map((r) =>
        table === "exam_sessions"
          ? {
              id: uuid(),
              organization_id: null,
              result: null,
              score: null,
              total: null,
              completed_at: null,
              ...clone(r),
            }
          : clone(r),
      );
      const failed = constraints(table, [...rows, ...added]);
      if (failed) return failed;
      rows.push(...added);
      return finish(added, q);
    }
    if (q.op === "update") {
      const injected = failUpdate(table, q.patch);
      if (injected) return { data: null, error: injected };
      const hit = rows.filter(match);
      const next = rows.map((r) => (hit.includes(r) ? { ...r, ...clone(q.patch) } : r));
      const failed = constraints(table, next);
      if (failed) return failed;
      tables[table] = next;
      return finish(
        next.filter((r, i) => hit.includes(rows[i])),
        q,
      );
    }
    let out = rows.filter(match);
    for (const [c, asc] of [...q.order].reverse())
      out = [...out].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
    if (q.count && q.head) return { data: null, error: null, count: out.length };
    if (q.limit !== null) out = out.slice(0, q.limit);
    return finish(out, q);
  }
  function finish(out, q) {
    const data = clone(out);
    if (q.single === "maybe") {
      if (data.length > 1) return violation("PGRST116", "multiple rows");
      return { data: data[0] ?? null, error: null };
    }
    if (q.single === "one") {
      if (data.length !== 1) return violation("PGRST116", "not one row");
      return { data: data[0], error: null };
    }
    return { data, error: null };
  }
  return db;
}

const BANK = buildSyntheticBank();
function bankRow(bank = BANK, overrides = {}) {
  const sha = bankSha256(bank);
  return {
    module_id: bank.moduleId,
    target_language: bank.targetLanguage,
    instruction_language: bank.instructionLanguage,
    version: bank.version,
    status: "approved",
    content: bankContent(clone(bank)),
    content_sha256: sha,
    review_records: clone(bank.reviews),
    approved_by: OWNER.id,
    approved_at: "2026-10-23T12:00:00.000Z",
    approved_sha256: sha,
    created_at: "2026-10-23T10:00:00.000Z",
    ...overrides,
  };
}
function setup(options = {}) {
  clearExamBankCache();
  const db = fakeDb(options);
  if (!options.missing) db.tables.exam_banks.push(bankRow());
  return db;
}
let clock = Date.parse("2026-10-23T15:00:00.000Z");
function deps(db, { user = USER, env = ENV, ip = "203.0.113.7", budget, now, staff = false } = {}) {
  const budgets = [];
  return {
    budgets,
    db,
    env,
    clientIp: ip,
    authenticate: async () => user,
    isStaff: async (userId) => staff === true || (Array.isArray(staff) && staff.includes(userId)),
    budget: async (namespace, value, limit, windowSeconds) => {
      budgets.push({ namespace, value, limit, windowSeconds });
      return budget ? budget(namespace, value, limit, windowSeconds) : true;
    },
    now: () => new Date(now ?? clock),
  };
}
const call = (input, d) => handleExamCheck(examCheckAction.parse(input), d);
async function rejects(promise, status, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ExamApiError, `expected ExamApiError, got ${error}`);
    assert.equal(error.status, status, `status for ${error.code}: ${error.message}`);
    if (code) assert.equal(error.code, code);
    return true;
  });
}
function assertNoPrivateKeys(value, label = "response") {
  const text = JSON.stringify(value);
  for (const key of PRIVATE_KEYS)
    assert.ok(!text.includes(`"${key}"`), `${label} must not contain ${key}`);
}
const item = (id) => BANK.items.find((entry) => entry.id === id);
function correctAnswer(publicItem, seed) {
  const source = item(publicItem.id);
  if (source.type === "mc")
    return { type: "mc", optionId: publicOptionId(seed, source.id, source.correctOptionId) };
  if (source.type === "typed") return { type: "typed", text: source.accepted[0] };
  return {
    type: "match",
    matches: Object.fromEntries(source.pairs.map((pair) => [pair.left, pair.right])),
  };
}
const sessionRow = (db, id) => db.tables.exam_sessions.find((row) => row.id === id);
/**
 * Answer a session's questions one at a time, the way the page does. `pick(item, index)` gives the
 * answer for each question (null = the clock ran out). Stops after `count` questions if given.
 * Returns the last response.
 */
async function play(d, started, pick, { count = Infinity, prefix = "req-play" } = {}) {
  const seed = sessionRow(d.db, started.sessionId).seed;
  let view = started;
  for (let step = started.step; step < Math.min(started.total, started.step + count); step++) {
    view = await call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step,
        itemId: view.item.id,
        answer: pick(view.item, step, seed),
        requestId: `${prefix}-${String(step).padStart(4, "0")}`,
      },
      d,
    );
  }
  return view;
}
const right = (publicItem, _step, seed) => correctAnswer(publicItem, seed);
const request = (body, { origin = ORIGIN } = {}) =>
  new Request(ORIGIN + "/api/exam-check", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

// ── Kill switches, origin, migration ─────────────────────────────────────────

test("kill switch LT_EXAMS_V2 off returns a friendly 404 before anything else", async () => {
  const db = setup();
  for (const value of [undefined, "0", "false", ""]) {
    const response = await examCheckResponse(
      request({ action: "start", moduleId: "roofing", kind: "A" }),
      deps(db, { env: { ...ENV, LT_EXAMS_V2: value } }),
    );
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, "disabled");
  }
  assert.equal(db.calls.length, 0);
});

test("cross-origin or origin-less requests are refused; bad bodies are 400", async () => {
  const db = setup();
  for (const origin of ["https://evil.invalid", null]) {
    const response = await examCheckResponse(
      request({ action: "start", moduleId: "roofing", kind: "A" }, { origin }),
      deps(db),
    );
    assert.equal(response.status, 403);
  }
  const bad = await examCheckResponse(request({ action: "start", moduleId: "Roofing!" }), deps(db));
  assert.equal(bad.status, 400);
  const extra = await examCheckResponse(
    request({ action: "start", moduleId: "roofing", kind: "A", userId: OTHER.id }),
    deps(db),
  );
  assert.equal(extra.status, 400);
  assert.equal(db.calls.length, 0);
});

test("a missing migration gives a clear 503 'being set up' response", async () => {
  const db = setup({ missing: true });
  const response = await examCheckResponse(
    request({ action: "start", moduleId: "roofing", kind: "A" }),
    deps(db),
  );
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "exams_not_ready");
  assert.equal(body.error, "Exams are being set up. Please try again later.");
});

test("no approved bank is a 404; a tampered or unapproved bank is never served", async () => {
  const db = setup();
  db.tables.exam_banks = [];
  await rejects(
    call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db)),
    404,
    "no_bank",
  );
  const tampered = bankRow();
  tampered.content.items[0].prompt = "Synthetic tampered prompt.";
  db.tables.exam_banks = [tampered];
  await rejects(call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db)), 503, "bank");
  db.tables.exam_banks = [bankRow(BANK, { approved_sha256: "0".repeat(64) })];
  await rejects(call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db)), 503, "bank");
});

// ── Fixed forms A / B / C ────────────────────────────────────────────────────

test("form A: one question at a time, resumes the open session, answers, reviews", async () => {
  const db = setup();
  const d = deps(db);
  await rejects(
    call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db, { user: null })),
    401,
  );
  const started = await call({ action: "start", moduleId: "roofing", kind: "A" }, d);
  assert.equal(started.total, 30);
  assert.equal(started.step, 0);
  assert.equal(started.items, undefined, "later questions are not sent");
  assert.equal(started.item.id, BANK.forms.A[0]);
  assert.deepEqual(started.timer, { limitMs: 45000, graceMs: 5000, elapsedMs: 0 });
  assert.equal(started.resumed, false);
  assert.equal(started.secret, undefined);
  assertNoPrivateKeys(started, "start A");
  for (const id of BANK.forms.A.slice(1))
    assert.ok(!JSON.stringify(started).includes(`"${id}"`), "no read-ahead");
  const row = sessionRow(db, started.sessionId);
  assert.equal(row.user_id, USER.id);
  assert.equal(row.ip_hash, null);
  assert.deepEqual(row.served, [BANK.forms.A[0]]);

  const again = await call({ action: "start", moduleId: "roofing", kind: "A" }, d);
  assert.equal(again.sessionId, started.sessionId);
  assert.equal(again.resumed, true);
  assert.equal(again.item.id, started.item.id);

  // MC options are shuffled per session seed and use opaque ids.
  const seen = [];
  const half = await play(
    d,
    started,
    (entry, step, seed) => (seen.push(entry), right(entry, step, seed)),
    { count: 15 },
  );
  assert.equal(half.step, 15);
  assert.deepEqual(
    seen.map((entry) => entry.id),
    BANK.forms.A.slice(0, 15),
  );
  const mc = seen.find((entry) => entry.type === "mc");
  assert.ok(mc.options.every((option) => /^o[0-9a-f]{12}$/.test(option.id)));

  const resumed = await call({ action: "resume", sessionId: started.sessionId }, d);
  assert.equal(resumed.step, 15);
  assert.equal(resumed.item.id, BANK.forms.A[15]);
  assertNoPrivateKeys(resumed, "resume A");
  await rejects(call({ action: "result", sessionId: started.sessionId }, d), 409, "not_finished");
  const turn = { action: "answer", sessionId: started.sessionId, answer: { type: "dont_know" } };
  // Not the current question, a form C question, and an already-answered question are all refused.
  await rejects(
    call({ ...turn, step: 15, itemId: BANK.forms.A[16], requestId: "req-order-0001" }, d),
    409,
    "item_mismatch",
  );
  await rejects(
    call({ ...turn, step: 15, itemId: BANK.forms.C[0], requestId: "req-order-0002" }, d),
    409,
    "item_mismatch",
  );
  await rejects(
    call({ ...turn, step: 14, itemId: BANK.forms.A[14], requestId: "req-order-0003" }, d),
    409,
    "step_mismatch",
  );
  assert.equal(sessionRow(db, started.sessionId).responses.length, 15);

  const last = await play(d, resumed, right, { prefix: "req-rest" });
  assert.equal(last.status, "completed");
  assert.equal(last.item, null);
  assert.equal(last.timer, null);
  const result = await call({ action: "result", sessionId: started.sessionId }, d);
  assert.equal(result.result.pct, 100);
  assert.equal(result.result.lessons.length, 30);
  assert.equal(result.review.length, 30);
  assert.ok(result.review.every((entry) => entry.explanation && entry.points === 1));
  assert.ok(result.review.every((entry) => Object.keys(entry.solution).length === 1));
  assert.ok(!JSON.stringify(result).includes('"correctOptionId"'));
  const stored = sessionRow(db, started.sessionId);
  assert.equal(stored.status, "completed");
  assert.equal(stored.score, 30);
  assert.equal(stored.total, 30);
  assert.equal(stored.step, 30);
  // Submitting after the last answer is idempotent; A is taken once.
  const repeat = await call({ action: "submit", sessionId: started.sessionId }, d);
  assert.equal(repeat.result.pct, 100);
  await rejects(call({ action: "start", moduleId: "roofing", kind: "A" }, d), 409, "already_taken");
});

test("form B keeps a 1-hour retake cooldown", async () => {
  const db = setup();
  const started = await call({ action: "start", moduleId: "roofing", kind: "B" }, deps(db));
  // Ending the test early scores the questions not reached as 0.
  const done = await call({ action: "submit", sessionId: started.sessionId }, deps(db));
  assert.equal(done.result.pct, 0);
  assert.equal(done.result.onTrack, false);
  await rejects(
    call({ action: "start", moduleId: "roofing", kind: "B" }, deps(db)),
    429,
    "cooldown",
  );
  const later = await call(
    { action: "start", moduleId: "roofing", kind: "B" },
    deps(db, { now: clock + 61 * 60 * 1000 }),
  );
  assert.notEqual(later.sessionId, started.sessionId);
});

test("form C result is a coarse percent, pass/fail and missed phases only; retakes allowed", async () => {
  const db = setup();
  const d = deps(db);
  const started = await call({ action: "start", moduleId: "roofing", kind: "C" }, d);
  assert.equal(started.total, 60);
  // Right on every item except lesson 30 (two items): 58/60 = 96.7%, passed.
  const finished = await play(d, started, (entry, step, seed) =>
    entry.lesson === 30 ? { type: "dont_know" } : correctAnswer(entry, seed),
  );
  assert.equal(finished.status, "completed");
  const submitted = await call({ action: "submit", sessionId: started.sessionId }, d);
  const fetched = await call({ action: "result", sessionId: started.sessionId }, d);
  for (const view of [submitted, fetched]) {
    assert.deepEqual(Object.keys(view).sort(), [
      "completedAt",
      "kind",
      "result",
      "sessionId",
      "status",
    ]);
    assert.deepEqual(Object.keys(view.result).sort(), ["kind", "missedPhases", "passed", "pct"]);
    assert.equal(view.result.passed, true);
    // 96.7% exact is shown as 95: nearest 5.
    assert.equal(view.result.pct, 95);
    assert.equal(view.result.pct % 5, 0);
    assert.deepEqual(view.result.missedPhases, [
      {
        id: "phase-6",
        title: "Synthetic phase 6",
        href: "/?module=roofing&tab=core30&target=Spanish&native=English&lesson=26&way=recall",
      },
    ]);
    const text = JSON.stringify(view);
    assert.ok(!text.includes("roofing.L"), "no item ids in a form C result");
    for (const key of ["lesson", "lessons", "missedLessons", "items", "score", "total"])
      assert.ok(!text.includes(`"${key}"`), `no ${key} in a form C result`);
    assertNoPrivateKeys(view, "C result");
  }
  // The stored result keeps per-item points server-side only.
  assert.equal(sessionRow(db, started.sessionId).result.items.length, 60);
  const retake = await call({ action: "start", moduleId: "roofing", kind: "C" }, d);
  assert.notEqual(retake.sessionId, started.sessionId);
  const fail = await call({ action: "submit", sessionId: retake.sessionId }, d);
  assert.equal(fail.result.passed, false);
  assert.equal(fail.result.pct, 0);
  assert.equal(fail.result.missedPhases.length, 6);
});

// ── The 45-second question clock ─────────────────────────────────────────────

const T = Date.parse("2026-10-23T15:00:00.000Z");
const answerAt = (db, started, step, answer, ms, extra = {}) =>
  call(
    {
      action: "answer",
      sessionId: started.sessionId,
      step,
      itemId: BANK.forms.A[step],
      answer,
      requestId: `req-clock-${String(step).padStart(4, "0")}${extra.suffix ?? ""}`,
    },
    deps(db, { now: T + ms }),
  );

test("question clock: 45 s counts, 45-50 s is grace, later is dropped and recorded unanswered", async () => {
  const db = setup();
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "A" },
    deps(db, { now: T }),
  );
  const seed = sessionRow(db, started.sessionId).seed;
  const correct = (id) => correctAnswer({ id }, seed);

  // Question 1 answered at exactly 45 s: on time.
  const r0 = await answerAt(db, started, 0, correct(BANK.forms.A[0]), 45_000);
  assert.equal(r0.outcome, "recorded");
  assert.deepEqual(r0.timer, { limitMs: 45000, graceMs: 5000, elapsedMs: 0 });
  // Question 2 is served the moment question 1 was recorded: its clock starts at 45 s, not at 0.
  // 50 s later (95 s after the start) is still inside the grace period.
  const r1 = await answerAt(db, started, 1, correct(BANK.forms.A[1]), 95_000);
  assert.equal(r1.outcome, "recorded");
  // Question 3 served at 95 s; answered 50.001 s later is too late.
  const r2 = await answerAt(db, started, 2, correct(BANK.forms.A[2]), 145_001);
  assert.equal(r2.outcome, "late");
  assert.equal(r2.step, 3);
  assert.deepEqual(r2.timer, { limitMs: 45000, graceMs: 5000, elapsedMs: 0 });
  const responses = sessionRow(db, started.sessionId).responses;
  assert.deepEqual(
    responses.map((r) => [r.itemId, r.answer === null, r.expired === true]),
    [
      [BANK.forms.A[0], false, false],
      [BANK.forms.A[1], false, false],
      [BANK.forms.A[2], true, true],
    ],
  );
  assert.equal(responses[0].servedAt, new Date(T).toISOString());
  assert.equal(responses[0].at, new Date(T + 45_000).toISOString());
  assert.equal(responses[1].servedAt, responses[0].at, "the next clock starts when the last ended");
  assert.equal(responses[2].servedAt, responses[1].at);

  // Finish the rest on time, each answered 1 s after it was served.
  let at = 145_001;
  for (let step = 3; step < 30; step++) {
    at += 1_000;
    await answerAt(db, started, step, correct(BANK.forms.A[step]), at);
  }
  const stored = sessionRow(db, started.sessionId);
  assert.equal(stored.status, "completed");
  assert.equal(stored.score, 29, "the late answer scored 0");
  assert.equal(stored.result.items[2].points, 0);
  assert.equal(stored.result.items[3].points, 1);
});

test("question clock: a timed-out question is recorded unanswered and the next clock starts fresh", async () => {
  const db = setup();
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "A" },
    deps(db, { now: T }),
  );
  const expired = await answerAt(db, started, 0, null, 46_000);
  assert.equal(expired.outcome, "expired");
  assert.equal(expired.step, 1);
  assert.equal(expired.item.id, BANK.forms.A[1]);
  assert.deepEqual(expired.timer, { limitMs: 45000, graceMs: 5000, elapsedMs: 0 });
  const [first] = sessionRow(db, started.sessionId).responses;
  assert.equal(first.answer, null);
  assert.equal(first.expired, true);
  // An expired question can no longer be edited, even with a new request id.
  await assert.rejects(
    answerAt(db, started, 0, { type: "dont_know" }, 47_000, { suffix: "b" }),
    (error) => error.status === 409 && error.code === "step_mismatch",
  );
  assert.equal(sessionRow(db, started.sessionId).responses.length, 1);
  // Repeating the same request is harmless and does not move anything.
  const repeat = await answerAt(db, started, 0, null, 48_000);
  assert.equal(repeat.repeated, true);
  assert.equal(repeat.step, 1);
});

test("question clock: leaving does not stop it, but only the question being shown is lost", async () => {
  const db = setup();
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "B" },
    deps(db, { now: T }),
  );
  const away = deps(db, { now: T + 10 * 60_000 });
  const back = await call({ action: "resume", sessionId: started.sessionId }, away);
  assert.equal(back.timer.elapsedMs, 10 * 60_000, "the server clock kept running");
  assert.equal(sessionRow(db, started.sessionId).responses.length, 0, "resume changes nothing");
  // A real answer sent now is dropped; the page sends null once it sees the clock is out.
  const late = await call(
    {
      action: "answer",
      sessionId: started.sessionId,
      step: 0,
      itemId: BANK.forms.B[0],
      answer: { type: "dont_know" },
      requestId: "req-away-0001",
    },
    away,
  );
  assert.equal(late.outcome, "late");
  assert.equal(late.step, 1);
  assert.equal(late.timer.elapsedMs, 0, "the next question is fresh");
});

test("question clock: answers cannot jump ahead or be saved in a batch", async () => {
  const db = setup();
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "A" },
    deps(db, { now: T }),
  );
  await assert.rejects(
    answerAt(db, started, 5, { type: "dont_know" }, 1_000),
    (error) => error.status === 409 && error.code === "step_mismatch",
  );
  assert.equal(sessionRow(db, started.sessionId).responses.length, 0);
  // There is no batch action, so the clock cannot be skipped by sending many answers at once.
  const sessionId = started.sessionId;
  assert.equal(examCheckAction.safeParse({ action: "save", sessionId, answers: [] }).success, false);
  assert.equal(
    examCheckAction.safeParse({ action: "submit", sessionId, answers: [] }).success,
    false,
  );
  assert.equal(examCheckAction.safeParse({ action: "submit", sessionId }).success, true);
  // An answer only ever moves the session one step.
  const view = await answerAt(db, started, 0, { type: "dont_know" }, 1_000);
  assert.equal(view.step, 1);
  assert.equal(sessionRow(db, started.sessionId).responses.length, 1);
});

test("question clock: the Spanish Check is timed too, and a timed-out question counts as I don't know", async () => {
  const db = setup();
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "diagnostic" },
    deps(db, { now: T }),
  );
  const first = await call(
    {
      action: "answer",
      sessionId: started.sessionId,
      step: 0,
      itemId: started.item.id,
      answer: null,
      requestId: "req-diag-0001",
    },
    deps(db, { now: T + 45_000 }),
  );
  assert.equal(first.outcome, "expired");
  const [one] = sessionRow(db, started.sessionId).responses;
  assert.deepEqual([one.answer, one.expired, one.dontKnow, one.y], [null, true, true, 0]);
  const seed = sessionRow(db, started.sessionId).seed;
  const lateOne = await call(
    {
      action: "answer",
      sessionId: started.sessionId,
      step: 1,
      itemId: first.item.id,
      answer: correctAnswer(first.item, seed),
      requestId: "req-diag-0002",
    },
    deps(db, { now: T + 45_000 + 50_001 }),
  );
  assert.equal(lateOne.outcome, "late");
  assert.equal(sessionRow(db, started.sessionId).responses[1].y, 0);
});

// ── Windows ──────────────────────────────────────────────────────────────────

const refused = async (promise) => {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ExamApiError, String(error));
    return error;
  }
  assert.fail("expected the start to be refused");
};

test("windows: A is always open; B opens on day 45 or after lessons 1-15; C on day 90 or all 30", async () => {
  const db = setup();
  // Plan started 2026-10-01, three lessons done. Today (clock) is 2026-10-23, day 22.
  db.tables.profiles = [profileRow(USER.id, { startDate: "2026-10-01", mastered: [1, 2, 3] })];
  const at = (iso) => deps(db, { now: Date.parse(iso) });
  const a = await call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db));
  assert.equal(a.kind, "A");

  const b = await refused(call({ action: "start", moduleId: "roofing", kind: "B" }, deps(db)));
  assert.equal(b.status, 403);
  assert.equal(b.code, "not_open");
  assert.equal(b.extra.opensOn, "2026-11-15");
  assert.deepEqual(b.extra.lessons, { from: 1, to: 15, done: 3 });
  assert.match(b.message, /Opens Nov 15, 2026, or when lessons 1–15 are done\./);
  const c = await refused(call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db)));
  assert.equal(c.code, "not_open");
  assert.equal(c.extra.opensOn, "2026-12-30");
  assert.equal(
    db.tables.exam_sessions.filter((row) => row.kind !== "A").length,
    0,
    "no session was made",
  );

  // Day 44 is still shut; day 45 opens B but not C.
  await refused(
    call({ action: "start", moduleId: "roofing", kind: "B" }, at("2026-11-14T23:00:00.000Z")),
  );
  const day45 = at("2026-11-15T00:30:00.000Z");
  assert.equal((await call({ action: "start", moduleId: "roofing", kind: "B" }, day45)).kind, "B");
  await refused(call({ action: "start", moduleId: "roofing", kind: "C" }, day45));
  const day90 = at("2026-12-30T08:00:00.000Z");
  assert.equal((await call({ action: "start", moduleId: "roofing", kind: "C" }, day90)).kind, "C");
});

test("windows: lessons 1-15 mastered open B early (no start date needed); all 30 open C early", async () => {
  const db = setup();
  db.tables.profiles = [
    profileRow(USER.id, { startDate: null, mastered: ALL_LESSONS.slice(0, 15) }),
  ];
  assert.equal(
    (await call({ action: "start", moduleId: "roofing", kind: "B" }, deps(db))).kind,
    "B",
  );
  const c = await refused(call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db)));
  assert.equal(c.code, "not_open");
  assert.equal(c.extra.opensOn, undefined, "no start date, no date to show");
  assert.match(c.message, /Opens when lessons 1–30 are done\./);
  db.tables.profiles = [profileRow(USER.id, { startDate: null, mastered: ALL_LESSONS })];
  assert.equal(
    (await call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db))).kind,
    "C",
  );
  // A lesson flagged "needs practice" no longer counts as mastered.
  const flagged = profileRow(USER.id, { startDate: null, mastered: ALL_LESSONS });
  const key = Object.keys(flagged.data.core30Log)[0];
  flagged.data.core30Log[key].lessons["7"].needsPractice = true;
  db.tables.profiles = [flagged];
  db.tables.exam_sessions = [];
  await refused(call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db)));
});

test("windows: no profile row means B and C are shut; an unreadable profile fails closed", async () => {
  const db = setup();
  db.tables.profiles = [];
  const shut = await refused(call({ action: "start", moduleId: "roofing", kind: "B" }, deps(db)));
  assert.equal(shut.code, "not_open");
  delete db.tables.profiles;
  const broken = await refused(
    call({ action: "start", moduleId: "roofing", kind: "B" }, deps(db)),
  );
  assert.equal(broken.status, 503);
  assert.equal(db.tables.exam_sessions.length, 0);
});

test("windows: platform staff can start any form to preview it; learners cannot", async () => {
  const db = setup();
  db.tables.profiles = [];
  const staff = deps(db, { staff: true });
  for (const kind of ["A", "B", "C"]) {
    const started = await call({ action: "start", moduleId: "roofing", kind }, staff);
    assert.equal(started.kind, kind);
    assert.equal(started.item.id, BANK.forms[kind][0]);
    await call({ action: "submit", sessionId: started.sessionId }, staff);
  }
  // Staff can also preview A and B again; the once-only and cool-down rules are for learners.
  assert.equal((await call({ action: "start", moduleId: "roofing", kind: "A" }, staff)).kind, "A");
  assert.equal((await call({ action: "start", moduleId: "roofing", kind: "B" }, staff)).kind, "B");
  // Staff status belongs to the signed-in account, not to the request.
  const other = deps(db, { user: OTHER, staff: [USER.id] });
  const denied = await refused(call({ action: "start", moduleId: "roofing", kind: "B" }, other));
  assert.equal(denied.code, "not_open");
});

test("windows: the Spanish Check has no window", async () => {
  const db = setup();
  db.tables.profiles = [];
  const started = await call({ action: "start", moduleId: "roofing", kind: "diagnostic" }, deps(db));
  assert.equal(started.kind, "diagnostic");
});

// ── Overview ─────────────────────────────────────────────────────────────────

test("overview: kill switch, and signed-out visitors see only which modules have an approved bank", async () => {
  const db = setup();
  const off = await examCheckResponse(
    request({ action: "overview" }),
    deps(db, { env: { ...ENV, LT_EXAMS_V2: undefined } }),
  );
  assert.equal(off.status, 404);
  assert.equal((await off.json()).code, "disabled");

  const guest = await call({ action: "overview" }, deps(db, { user: null }));
  assert.deepEqual(guest, {
    target: "Spanish",
    native: "English",
    signedIn: false,
    staff: false,
    modules: [{ moduleId: "roofing", forms: null }],
  });
  // A draft or retired bank is not offered; another language pair has none.
  db.tables.exam_banks[0].status = "draft";
  assert.deepEqual((await call({ action: "overview" }, deps(db, { user: null }))).modules, []);
  db.tables.exam_banks[0].status = "approved";
  assert.deepEqual(
    (await call({ action: "overview", target: "French" }, deps(db, { user: null }))).modules,
    [],
  );
  db.tables.exam_banks[0].approved_sha256 = "0".repeat(64);
  assert.deepEqual((await call({ action: "overview" }, deps(db, { user: null }))).modules, []);
});

test("overview: a learner sees A, B and C with window, status, best score and retake state", async () => {
  const db = setup();
  db.tables.profiles = [profileRow(USER.id, { startDate: "2026-10-01", mastered: [1, 2, 3] })];
  const d = deps(db);
  const fresh = await call({ action: "overview" }, d);
  assert.equal(fresh.signedIn, true);
  assert.equal(fresh.staff, false);
  const [roofing] = fresh.modules;
  assert.equal(roofing.moduleId, "roofing");
  const { A, B, C } = roofing.forms;
  assert.deepEqual([A.title, B.title, C.title], ["Baseline", "Midpoint", "Final"]);
  assert.deepEqual([A.questions, B.questions, C.questions], [30, 30, 60]);
  assert.equal(A.window.open, true);
  assert.equal(B.window.open, false);
  assert.equal(B.window.opensOn, "2026-11-15");
  assert.equal(B.window.message, "Opens Nov 15, 2026, or when lessons 1–15 are done.");
  assert.deepEqual(B.window.lessons, { from: 1, to: 15, done: 3 });
  assert.equal(C.window.opensOn, "2026-12-30");
  for (const form of [A, B, C]) {
    assert.equal(form.status, "not_taken");
    assert.equal(form.best, null);
    assert.equal(form.inProgress, null);
    assert.equal(form.retake.allowed, true);
    assert.equal(form.preview, false);
  }
  assertNoPrivateKeys(fresh, "overview");

  const a = await call({ action: "start", moduleId: "roofing", kind: "A" }, d);
  const midway = await call({ action: "overview" }, d);
  assert.deepEqual(midway.modules[0].forms.A.inProgress, {
    sessionId: a.sessionId,
    step: 0,
    total: 30,
  });
  assert.equal(midway.modules[0].forms.A.status, "in_progress");
  await play(d, a, right);
  const done = (await call({ action: "overview" }, d)).modules[0].forms.A;
  assert.equal(done.status, "completed");
  assert.equal(done.attempts, 1);
  assert.equal(done.best.pct, 100);
  assert.equal(done.last.pct, 100);
  assert.equal(done.retake.allowed, false);
  assert.match(done.retake.message, /already taken the baseline/);
});

test("overview: form C scores are coarse, the retake budget and B cool-down show, staff see a preview flag", async () => {
  const db = setup();
  const d = deps(db);
  // C: 58 of 60 right = 96.7%, shown as 95.
  const c = await call({ action: "start", moduleId: "roofing", kind: "C" }, d);
  await play(d, c, (entry, step, seed) =>
    entry.lesson === 30 ? { type: "dont_know" } : correctAnswer(entry, seed),
  );
  let forms = (await call({ action: "overview" }, d)).modules[0].forms;
  assert.deepEqual(forms.C.best, { pct: 95, passed: true, at: forms.C.best.at });
  assert.ok(!JSON.stringify(forms.C).includes("96.7"));
  assert.equal(forms.C.retake.allowed, true);
  // Two more starts use the day's budget of three.
  for (const minute of [10, 20]) {
    const when = deps(db, { now: clock + minute * 60_000 });
    const more = await call({ action: "start", moduleId: "roofing", kind: "C" }, when);
    await call({ action: "submit", sessionId: more.sessionId }, when);
  }
  forms = (await call({ action: "overview" }, deps(db, { now: clock + 30 * 60_000 }))).modules[0]
    .forms;
  assert.equal(forms.C.attempts, 3);
  assert.equal(forms.C.retake.allowed, false);
  assert.equal(forms.C.retake.retryAt, new Date(clock + 24 * 3600_000).toISOString());
  assert.equal(forms.C.best.passed, true, "best is still the passing attempt");

  // B: finished a few minutes ago.
  const b = await call({ action: "start", moduleId: "roofing", kind: "B" }, d);
  await call({ action: "submit", sessionId: b.sessionId }, d);
  const cooling = (await call({ action: "overview" }, d)).modules[0].forms.B;
  assert.equal(cooling.retake.allowed, false);
  assert.equal(cooling.retake.retryAt, new Date(clock + 3600_000).toISOString());
  assert.equal(cooling.best.onTrack, false);

  // Staff on a learner with a locked plan: forms still show their window, flagged as preview.
  db.tables.profiles = [];
  const staffForms = (await call({ action: "overview" }, deps(db, { staff: true }))).modules[0]
    .forms;
  assert.equal(staffForms.B.window.open, false);
  assert.equal(staffForms.B.preview, true);
  assert.equal(staffForms.A.preview, false);
});

test("form C: at most 3 starts per user per rolling 24 hours; resuming the open one is free", async () => {
  const db = setup();
  const base = Date.parse("2026-10-24T08:00:00.000Z");
  const at = (minutes) => deps(db, { now: base + minutes * 60 * 1000 });
  const first = await call({ action: "start", moduleId: "roofing", kind: "C" }, at(0));
  // Re-opening the open session does not use the budget.
  for (const minute of [1, 2, 3])
    assert.equal(
      (await call({ action: "start", moduleId: "roofing", kind: "C" }, at(minute))).sessionId,
      first.sessionId,
    );
  await call({ action: "submit", sessionId: first.sessionId }, at(5));
  const second = await call({ action: "start", moduleId: "roofing", kind: "C" }, at(10));
  await call({ action: "submit", sessionId: second.sessionId }, at(12));
  const third = await call({ action: "start", moduleId: "roofing", kind: "C" }, at(20));
  await call({ action: "submit", sessionId: third.sessionId }, at(22));
  const cRows = () => db.tables.exam_sessions.filter((row) => row.kind === "C").length;
  assert.equal(cRows(), 3);
  await assert.rejects(
    call({ action: "start", moduleId: "roofing", kind: "C" }, at(30)),
    (error) => {
      assert.equal(error.status, 429);
      assert.equal(error.code, "c_daily_limit");
      assert.equal(error.extra.retryAt, "2026-10-25T08:00:00.000Z");
      assert.match(error.message, /next attempt opens at 2026-10-25 08:00 UTC/);
      return true;
    },
  );
  assert.equal(cRows(), 3, "a refused start adds no row");
  // Other kinds are not affected, and the window rolls.
  await call({ action: "start", moduleId: "roofing", kind: "diagnostic" }, at(31));
  const fourth = await call({ action: "start", moduleId: "roofing", kind: "C" }, at(24 * 60 + 1));
  assert.notEqual(fourth.sessionId, third.sessionId);
});

test("parallel starts share one open session (one-open-session index)", async () => {
  const db = setup();
  const [a, b] = await Promise.all([
    call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db)),
    call({ action: "start", moduleId: "roofing", kind: "A" }, deps(db)),
  ]);
  assert.equal(a.sessionId, b.sessionId);
  assert.deepEqual([a.resumed, b.resumed].sort(), [false, true]);
  assert.equal(
    db.tables.exam_sessions.filter((row) => row.kind === "A" && row.status === "in_progress")
      .length,
    1,
  );
});

test("ownership: another user cannot read, save or submit a signed-in session", async () => {
  const db = setup();
  const started = await call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db));
  const other = deps(db, { user: OTHER });
  for (const action of ["resume", "result", "submit"])
    await rejects(call({ action, sessionId: started.sessionId }, other), 404, "not_found");
  await rejects(
    call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step: 0,
        itemId: BANK.forms.C[0],
        answer: { type: "dont_know" },
        requestId: "req-other-0001",
      },
      other,
    ),
    404,
    "not_found",
  );
  await rejects(
    call({ action: "resume", sessionId: started.sessionId }, deps(db, { user: null })),
    404,
  );
});

// ── Diagnostic ───────────────────────────────────────────────────────────────

test("diagnostic: one item at a time, no feedback, mismatches rejected, idempotent, study map", async () => {
  const db = setup();
  const d = deps(db);
  const started = await call({ action: "start", moduleId: "roofing", kind: "diagnostic" }, d);
  assert.equal(started.step, 0);
  assert.equal(started.total, 50);
  assert.ok(started.item && !started.items);
  assert.ok(BANK.diagnosticPool.includes(started.item.id));
  const row = sessionRow(db, started.sessionId);
  assert.deepEqual(row.served, [started.item.id]);

  const base = {
    action: "answer",
    sessionId: started.sessionId,
    answer: { type: "dont_know" },
    requestId: "req-mismatch-1",
  };
  await rejects(call({ ...base, step: 1, itemId: started.item.id }, d), 409, "step_mismatch");
  const otherItem = BANK.diagnosticPool.find((id) => id !== started.item.id);
  await rejects(call({ ...base, step: 0, itemId: otherItem }, d), 409, "item_mismatch");
  assert.equal(sessionRow(db, started.sessionId).step, 0);

  const first = await call(
    { ...base, step: 0, itemId: started.item.id, requestId: "req-first-0000" },
    d,
  );
  assert.equal(first.step, 1);
  assertNoPrivateKeys(first, "answer response");
  assert.ok(!("correct" in first) && !("points" in first));
  const repeat = await call(
    { ...base, step: 0, itemId: started.item.id, requestId: "req-first-0000" },
    d,
  );
  assert.equal(repeat.repeated, true);
  assert.equal(repeat.step, 1);
  assert.equal(repeat.item.id, first.item.id);
  assert.equal(sessionRow(db, started.sessionId).responses.length, 1);

  await rejects(call({ action: "result", sessionId: started.sessionId }, d), 409, "not_finished");
  await rejects(call({ action: "submit", sessionId: started.sessionId }, d), 400, "wrong_kind");

  // Answer the rest (step 1 onward); the session completes at step 50.
  let view = first;
  const seed = row.seed;
  for (let step = 1; step < 50; step++) {
    view = await call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step,
        itemId: view.item.id,
        answer: step < 25 ? correctAnswer(view.item, seed) : { type: "dont_know" },
        requestId: `req-run-${String(step).padStart(4, "0")}`,
      },
      d,
    );
    assertNoPrivateKeys(view, `step ${step}`);
  }
  assert.equal(view.status, "completed");
  assert.equal(view.item, null);
  const stored = sessionRow(db, started.sessionId);
  assert.equal(stored.status, "completed");
  assert.equal(stored.served.length, 50);
  assert.equal(new Set(stored.served).size, 50);
  assert.equal(stored.total, 50);
  await rejects(
    call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step: 49,
        itemId: stored.served[49],
        answer: { type: "dont_know" },
        requestId: "req-after-end",
      },
      d,
    ),
    409,
    "finished",
  );

  const result = await call({ action: "result", sessionId: started.sessionId }, d);
  assert.equal(result.result.phases.length, 6);
  assert.equal(result.result.lessons.length, 30);
  assert.ok(
    result.result.lessons.every((lesson) => lesson.likely && lesson.href.includes("lesson=")),
  );
  assert.ok(typeof result.result.overallPct === "number");
  assert.equal(result.review.length, 50);
  assert.ok(result.review.every((entry) => entry.explanation.length >= 20));
});

test("diagnostic honours cue groups: never two items of one group in a session", async () => {
  const bank = clone(BANK);
  const byLesson = (lesson) =>
    bank.diagnosticPool.filter(
      (id) => bank.items.find((entry) => entry.id === id).lesson === lesson,
    );
  bank.cueGroups = [];
  for (let lesson = 1; lesson <= 30; lesson++) {
    const ids = byLesson(lesson);
    bank.cueGroups.push([ids[0], ids[1]], [ids[2], ids[5]]);
  }
  const signed = signReviews(bank);
  clearExamBankCache();
  const db = fakeDb();
  db.tables.exam_banks.push(bankRow(signed));
  const d = deps(db);
  const started = await call({ action: "start", moduleId: "roofing", kind: "diagnostic" }, d);
  let view = started;
  for (let step = 0; step < 50; step++)
    view = await call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step,
        itemId: view.item.id,
        answer: { type: "dont_know" },
        requestId: `req-cue-${String(step).padStart(4, "0")}`,
      },
      d,
    );
  const served = new Set(sessionRow(db, started.sessionId).served);
  for (const group of signed.cueGroups)
    assert.ok(group.filter((id) => served.has(id)).length <= 1, "one item per cue group");
});

// ── Public mode ──────────────────────────────────────────────────────────────

test("public diagnostic: flag, kind, secret, salted IP hash, ownership and claim", async () => {
  const db = setup();
  const anon = deps(db, { user: null });
  await rejects(
    call(
      { action: "start", moduleId: "roofing", kind: "diagnostic", public: true },
      deps(db, { user: null, env: { ...ENV, LT_EXAMS_PUBLIC: undefined } }),
    ),
    404,
    "public_disabled",
  );
  await rejects(
    call({ action: "start", moduleId: "roofing", kind: "A", public: true }, anon),
    400,
    "public_kind",
  );
  await rejects(
    call(
      { action: "start", moduleId: "roofing", kind: "diagnostic", public: true },
      deps(db, { user: null, ip: null }),
    ),
    503,
  );
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "diagnostic", public: true },
    anon,
  );
  assert.match(started.secret, /^[A-Za-z0-9_-]{43}$/);
  const row = sessionRow(db, started.sessionId);
  assert.equal(row.user_id, null);
  assert.equal(row.public_secret_hash, createHash("sha256").update(started.secret).digest("hex"));
  assert.match(row.ip_hash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(row).includes("203.0.113.7"), "raw IP is never stored");
  assert.equal(row.ip_hash, hashClientIp("203.0.113.7", ENV));
  assert.notEqual(row.ip_hash, hashClientIp("203.0.113.7", { LT_EXAMS_IP_SALT: "other-salt" }));
  // The secret is returned once only: a resume never repeats it.
  const resumed = await call(
    { action: "resume", sessionId: started.sessionId, secret: started.secret },
    anon,
  );
  assert.equal(resumed.secret, undefined);
  assert.equal(resumed.item.id, started.item.id);

  const answer = {
    action: "answer",
    sessionId: started.sessionId,
    step: 0,
    itemId: started.item.id,
    answer: { type: "dont_know" },
    requestId: "req-public-0001",
  };
  await rejects(call(answer, anon), 404, "not_found");
  await rejects(call({ ...answer, secret: "A".repeat(43) }, anon), 404, "not_found");
  await rejects(call(answer, deps(db, { user: OTHER })), 404, "not_found");
  const next = await call({ ...answer, secret: started.secret }, anon);
  assert.equal(next.step, 1);

  // Finish, then claim into an account.
  let view = next;
  for (let step = 1; step < 50; step++)
    view = await call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step,
        itemId: view.item.id,
        answer: { type: "dont_know" },
        requestId: `req-pub-${String(step).padStart(4, "0")}`,
        secret: started.secret,
      },
      anon,
    );
  assert.equal(view.status, "completed");
  const publicResult = await call(
    { action: "result", sessionId: started.sessionId, secret: started.secret },
    anon,
  );
  assert.equal(publicResult.result.lessons.length, 30);

  await rejects(
    call({ action: "claim", sessionId: started.sessionId, secret: started.secret }, anon),
    401,
  );
  await rejects(
    call({ action: "claim", sessionId: started.sessionId, secret: "B".repeat(43) }, deps(db)),
    404,
  );
  const claimed = await call(
    { action: "claim", sessionId: started.sessionId, secret: started.secret },
    deps(db),
  );
  assert.deepEqual(claimed, { claimed: true, sessionId: started.sessionId });
  assert.equal(sessionRow(db, started.sessionId).user_id, USER.id);
  // Claiming clears the secret: it no longer opens the session or claims it again.
  assert.equal(sessionRow(db, started.sessionId).public_secret_hash, null);
  await rejects(
    call({ action: "result", sessionId: started.sessionId, secret: started.secret }, anon),
    404,
    "not_found",
  );
  const again = await call(
    { action: "claim", sessionId: started.sessionId, secret: started.secret },
    deps(db),
  );
  assert.equal(again.claimed, true);
  await rejects(
    call(
      { action: "claim", sessionId: started.sessionId, secret: started.secret },
      deps(db, { user: OTHER }),
    ),
    404,
    "not_found",
  );
  // After the claim, the account owner reads the study map without the secret.
  const mine = await call({ action: "result", sessionId: started.sessionId }, deps(db));
  assert.equal(mine.kind, "diagnostic");
});

test("claim: an expired public session is refused; parallel claims leave one owner", async () => {
  const db = setup();
  const anon = deps(db, { user: null });
  const start = () =>
    call({ action: "start", moduleId: "roofing", kind: "diagnostic", public: true }, anon);
  const old = await start();
  await rejects(
    call(
      { action: "claim", sessionId: old.sessionId, secret: old.secret },
      deps(db, { now: clock + 25 * 3600 * 1000 }),
    ),
    410,
    "expired",
  );
  assert.equal(sessionRow(db, old.sessionId).user_id, null);

  const raced = await start();
  const claim = (user) =>
    call(
      { action: "claim", sessionId: raced.sessionId, secret: raced.secret },
      deps(db, { user }),
    ).then(
      (value) => ({ ok: value }),
      (error) => ({ error }),
    );
  const outcomes = await Promise.all([claim(USER), claim(OTHER)]);
  const winners = outcomes.filter((outcome) => outcome.ok);
  const losers = outcomes.filter((outcome) => outcome.error);
  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  assert.equal(losers[0].error.status, 409);
  assert.equal(losers[0].error.code, "claimed");
  const owner = sessionRow(db, raced.sessionId).user_id;
  assert.ok(owner === USER.id || owner === OTHER.id);
  assert.equal(sessionRow(db, raced.sessionId).public_secret_hash, null);
});

test("rate-limit IP keys: IPv4 by address, IPv6 by /64, IPv4-mapped as IPv4", async () => {
  const { rateLimitIpKey } = server;
  assert.equal(rateLimitIpKey("203.0.113.7"), "203.0.113.7");
  assert.equal(rateLimitIpKey("2001:db8:abcd:12::1"), "2001:db8:abcd:12::/64");
  assert.equal(rateLimitIpKey("2001:0DB8:ABCD:0012:ffff:1:2:3"), "2001:db8:abcd:12::/64");
  assert.equal(rateLimitIpKey("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(rateLimitIpKey("::ffff:198.51.100.4"), "198.51.100.4");
  assert.equal(rateLimitIpKey("fe80::1%en0"), "fe80:0:0:0::/64");
  assert.equal(rateLimitIpKey("local-development"), "local-development");
  // Two addresses in one /64 share the public start budget and the day count.
  const db = setup();
  const one = deps(db, { user: null, ip: "2001:db8:abcd:12::1" });
  const two = deps(db, { user: null, ip: "2001:db8:abcd:12:9:8:7:6" });
  const a = await call(
    { action: "start", moduleId: "roofing", kind: "diagnostic", public: true },
    one,
  );
  const b = await call(
    { action: "start", moduleId: "roofing", kind: "diagnostic", public: true },
    two,
  );
  assert.equal(sessionRow(db, a.sessionId).ip_hash, sessionRow(db, b.sessionId).ip_hash);
  assert.equal(one.budgets[0].value, "2001:db8:abcd:12::/64");
  assert.equal(two.budgets[0].value, "2001:db8:abcd:12::/64");
});

test("public sessions expire for resume after 24 hours", async () => {
  const db = setup();
  const anon = deps(db, { user: null });
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "diagnostic", public: true },
    anon,
  );
  await rejects(
    call(
      { action: "resume", sessionId: started.sessionId, secret: started.secret },
      deps(db, { user: null, now: clock + 25 * 3600 * 1000 }),
    ),
    410,
    "expired",
  );
});

// ── Abuse limits ─────────────────────────────────────────────────────────────

test("public start limits: 5/IP/hour and 500/hour budgets, 20/IP/day from stored IP hashes", async () => {
  const db = setup();
  const start = (d) =>
    call({ action: "start", moduleId: "roofing", kind: "diagnostic", public: true }, d);
  const ok = deps(db, { user: null });
  await start(ok);
  assert.deepEqual(
    ok.budgets.map(({ namespace, value, limit, windowSeconds }) => [
      namespace,
      value,
      limit,
      windowSeconds,
    ]),
    [
      ["exams2:public-start:ip", "203.0.113.7", 5, 3600],
      ["exams2:public-start:global", "all", 500, 3600],
    ],
  );
  await rejects(
    start(deps(db, { user: null, budget: (ns) => ns !== "exams2:public-start:ip" })),
    429,
    "rate",
  );
  await rejects(
    start(deps(db, { user: null, budget: (ns) => ns !== "exams2:public-start:global" })),
    429,
    "rate",
  );
  const ipHash = hashClientIp("198.51.100.9", ENV);
  for (let i = 0; i < 20; i++)
    db.tables.exam_sessions.push({
      ...sessionRow(db, db.tables.exam_sessions[0].id),
      id: uuid(),
      ip_hash: ipHash,
      started_at: new Date(clock - i * 3600 * 1000).toISOString(),
    });
  await rejects(start(deps(db, { user: null, ip: "198.51.100.9" })), 429, "rate");
  // Sessions older than 24 hours do not count.
  await start(deps(db, { user: null, ip: "198.51.100.9", now: clock + 20 * 3600 * 1000 }));
});

test("answers and saves are limited to 120 per session per minute", async () => {
  const db = setup();
  const started = await call(
    { action: "start", moduleId: "roofing", kind: "diagnostic" },
    deps(db),
  );
  const limited = deps(db, { budget: (ns) => ns !== "exams2:session-writes" });
  await rejects(
    call(
      {
        action: "answer",
        sessionId: started.sessionId,
        step: 0,
        itemId: started.item.id,
        answer: { type: "dont_know" },
        requestId: "req-limited-01",
      },
      limited,
    ),
    429,
    "rate",
  );
  assert.deepEqual(
    limited.budgets.map((b) => [b.namespace, b.value, b.limit, b.windowSeconds]),
    [["exams2:session-writes", started.sessionId, 120, 60]],
  );
  const fixed = await call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db));
  await rejects(
    call(
      {
        action: "answer",
        sessionId: fixed.sessionId,
        step: 0,
        itemId: fixed.item.id,
        answer: { type: "dont_know" },
        requestId: "req-limited-02",
      },
      limited,
    ),
    429,
  );
});

test("an open session on a replaced bank version is abandoned and a new one starts", async () => {
  const db = setup();
  const started = await call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db));
  const v2 = signReviews({ ...clone(BANK), version: "v2", reviews: [] });
  db.tables.exam_banks[0].status = "retired";
  db.tables.exam_banks.push(bankRow(v2));
  const fresh = await call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db));
  assert.notEqual(fresh.sessionId, started.sessionId);
  assert.equal(fresh.bankVersion, "v2");
  assert.equal(sessionRow(db, started.sessionId).status, "abandoned");
});

// ── Owner approval (/api/exam-bank) ─────────────────────────────────────────

function bankDeps(db, { owner = true } = {}) {
  const audits = [];
  return {
    audits,
    db,
    requireOwner: async () => {
      if (!owner) throw new ExamApiError(403, "Platform owner access required.", "auth");
      return OWNER;
    },
    audit: async (actorId, action, detail) => {
      audits.push({ actorId, action, detail });
    },
    now: () => new Date(clock),
  };
}
const bankRequest = (body, { method = body ? "POST" : "GET", query = "", origin = ORIGIN } = {}) =>
  new Request(`${ORIGIN}/api/exam-bank${query}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(origin ? { origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const V2 = signReviews({ ...clone(BANK), version: "v2", reviews: [] });
const V2_SHA = bankSha256(V2);
const approveBody = (overrides = {}) => ({
  action: "approve",
  moduleId: "roofing",
  target: "Spanish",
  native: "English",
  version: "v2",
  sha256: V2_SHA,
  confirmModuleId: "roofing",
  ...overrides,
});
function approvalDb(v2Row) {
  const db = fakeDb();
  db.tables.exam_banks.push(bankRow(), v2Row ?? bankRow(V2, draftOverrides()));
  return db;
}
const draftOverrides = () => ({
  status: "draft",
  approved_by: null,
  approved_at: null,
  approved_sha256: null,
});
async function post(db, body, options) {
  const d = bankDeps(db, options);
  const response = await examBankResponse(bankRequest(body), d);
  return { response, body: await response.json(), audits: d.audits };
}

test("bank API: non-owners get 403 before any parsing or private read", async () => {
  const db = approvalDb();
  for (const req of [
    bankRequest(null),
    bankRequest(null, { query: "?moduleId=roofing&target=Spanish&native=English&version=v2" }),
    bankRequest({ action: "approve", junk: true }),
  ]) {
    const response = await examBankResponse(req, bankDeps(db, { owner: false }));
    assert.equal(response.status, 403);
  }
  assert.equal(db.calls.length, 0);
  const cross = await examBankResponse(
    bankRequest(approveBody(), { origin: "https://evil.invalid" }),
    bankDeps(db),
  );
  assert.equal(cross.status, 403);
  assert.equal(db.calls.length, 0);
});

test("bank API: list and preview summarise reviews and never use the bank's private key names", async () => {
  const db = approvalDb();
  const d = bankDeps(db);
  const list = await (await examBankResponse(bankRequest(null), d)).json();
  assert.equal(list.banks.length, 2);
  const draft = list.banks.find((bank) => bank.version === "v2");
  assert.equal(draft.status, "draft");
  assert.equal(draft.sha256, V2_SHA);
  assert.equal(draft.shaVerified, true);
  assert.equal(draft.approvable, true);
  assert.deepEqual(draft.blockers, []);
  assert.deepEqual(draft.counts.forms, { A: 30, B: 30, C: 60 });
  assert.equal(draft.reviews.length, 2);
  assert.ok(draft.reviews.every((review) => review.current && review.accept === BANK.items.length));
  assert.ok(!("content" in draft));
  const preview = await (
    await examBankResponse(
      bankRequest(null, { query: "?moduleId=roofing&target=Spanish&native=English&version=v2" }),
      d,
    )
  ).json();
  assert.equal(preview.preview.items.length, BANK.items.length);
  const mc = preview.preview.items.find((entry) => entry.type === "mc");
  assert.equal(mc.choices.filter((choice) => choice.right).length, 1);
  assert.ok(mc.choices.filter((choice) => !choice.right).every((choice) => choice.why));
  const typed = preview.preview.items.find((entry) => entry.type === "typed");
  assert.ok(typed.answers.length >= 1);
  assert.equal(preview.preview.forms.A.length, 30);
  const text = JSON.stringify(preview);
  for (const key of ["correctOptionId", "distractorRationale", "accepted"])
    assert.ok(!text.includes(`"${key}"`), `preview must not use ${key}`);
  assert.deepEqual(
    d.audits.map((entry) => entry.action),
    ["exam_bank.list", "exam_bank.preview"],
  );
  assert.ok(d.audits.every((entry) => entry.actorId === OWNER.id));
});

test("approval requires the typed module id", async () => {
  const db = approvalDb();
  const { response, body, audits } = await post(db, approveBody({ confirmModuleId: "roofin" }));
  assert.equal(response.status, 400);
  assert.equal(body.code, "confirm");
  assert.equal(audits[0].action, "exam_bank.approve_refused");
  assert.equal(db.tables.exam_banks.find((row) => row.version === "v2").status, "draft");
});

test("approval refuses an unreviewed bank and one with a revise verdict pending", async () => {
  const unreviewed = approvalDb(bankRow(V2, { ...draftOverrides(), review_records: [] }));
  const first = await post(unreviewed, approveBody());
  assert.equal(first.response.status, 409);
  assert.equal(first.body.code, "blocked");
  assert.ok(first.body.blockers.includes("reviews.too_few"));

  const records = clone(V2.reviews);
  records[1].verdicts[V2.items[0].id] = "revise";
  const revise = approvalDb(bankRow(V2, { ...draftOverrides(), review_records: records }));
  const second = await post(revise, approveBody());
  assert.equal(second.response.status, 409);
  assert.ok(second.body.blockers.includes("review.revise_pending"));

  const one = approvalDb(bankRow(V2, { ...draftOverrides(), review_records: [V2.reviews[0]] }));
  assert.ok((await post(one, approveBody())).body.blockers.includes("reviews.too_few"));

  const stale = clone(V2.reviews);
  stale[0].bankSha256 = "1".repeat(64);
  const staleDb = approvalDb(bankRow(V2, { ...draftOverrides(), review_records: stale }));
  assert.ok((await post(staleDb, approveBody())).body.blockers.includes("review.stale_sha"));
  for (const db of [unreviewed, revise, one, staleDb])
    assert.equal(db.tables.exam_banks.filter((row) => row.status === "approved").length, 1);
});

test("approval refuses a sha the owner did not review, and content that no longer matches its sha", async () => {
  const db = approvalDb();
  const changed = await post(db, approveBody({ sha256: "2".repeat(64) }));
  assert.equal(changed.response.status, 409);
  assert.equal(changed.body.code, "sha_changed");

  const tampered = bankRow(V2, draftOverrides());
  tampered.content.items[0].prompt = "Synthetic tampered prompt.";
  const tamperedDb = approvalDb(tampered);
  const refused = await post(tamperedDb, approveBody());
  assert.equal(refused.response.status, 409);
  assert.ok(refused.body.blockers.includes("bank.sha_mismatch"));
  assert.equal(tamperedDb.tables.exam_banks.find((row) => row.version === "v2").status, "draft");
});

test("approval: retires the old version, approves this sha as the authenticated owner, audits", async () => {
  const db = approvalDb();
  const { response, body, audits } = await post(db, approveBody());
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.deepEqual(body.retired, ["v1"]);
  const rows = db.tables.exam_banks;
  assert.equal(rows.filter((row) => row.status === "approved").length, 1);
  const v1 = rows.find((row) => row.version === "v1");
  const v2 = rows.find((row) => row.version === "v2");
  assert.equal(v1.status, "retired");
  assert.equal(v2.status, "approved");
  assert.equal(v2.approved_by, OWNER.id);
  assert.equal(v2.approved_sha256, V2_SHA);
  assert.equal(v2.approved_at, new Date(clock).toISOString());
  // Retire happens before approve, so two approved rows never exist.
  const updates = db.calls.filter((entry) => entry.op === "update");
  assert.deepEqual(
    updates.map((entry) => entry.patch.status),
    ["retired", "approved"],
  );
  assert.equal(audits.at(-1).action, "exam_bank.approve");
  assert.deepEqual(audits.at(-1).detail, {
    moduleId: "roofing",
    target: "Spanish",
    native: "English",
    version: "v2",
    sha256: V2_SHA,
    retired: ["v1"],
  });
  const again = await post(db, approveBody());
  assert.equal(again.response.status, 409);
  assert.equal(again.body.code, "status");
  // The newly approved bank is what learners now start.
  clearExamBankCache();
  const started = await call({ action: "start", moduleId: "roofing", kind: "C" }, deps(db));
  assert.equal(started.bankVersion, "v2");
});

test("approval of a missing version is 404 and a missing migration is 503", async () => {
  const db = approvalDb();
  const missing = await post(db, approveBody({ version: "v9" }));
  assert.equal(missing.response.status, 404);
  const none = fakeDb({ missing: true });
  const list = await examBankResponse(bankRequest(null), bankDeps(none));
  assert.equal(list.status, 503);
  assert.equal((await list.json()).code, "exams_not_ready");
});

test("approval: a failed approve restores the retired version; a failed restore is a 500", async () => {
  const conflict = fakeDb({
    failUpdate: (table, patch) =>
      table === "exam_banks" && patch.approved_by ? { code: "23505", message: "dup" } : null,
  });
  conflict.tables.exam_banks.push(bankRow(), bankRow(V2, draftOverrides()));
  const refused = await post(conflict, approveBody());
  assert.equal(refused.response.status, 409);
  assert.equal(refused.body.code, "conflict");
  assert.equal(conflict.tables.exam_banks.find((row) => row.version === "v1").status, "approved");

  const broken = fakeDb({
    failUpdate: (table, patch) =>
      table === "exam_banks" && patch.status === "approved"
        ? { code: "XX000", message: "storage failure" }
        : null,
  });
  broken.tables.exam_banks.push(bankRow(), bankRow(V2, draftOverrides()));
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  try {
    const failed = await post(broken, approveBody());
    assert.equal(failed.response.status, 500);
    assert.equal(failed.body.code, "restore_failed");
    assert.ok(failed.audits.some((entry) => entry.action === "exam_bank.restore_failed"));
  } finally {
    console.error = original;
  }
  assert.deepEqual(logged, [
    "Exam bank approval failed and the previous version could not be restored.",
  ]);
});
