import assert from "node:assert/strict";
import test from "node:test";
import { createLtAnalytics } from "../src/lib/lt-analytics.ts";
const feedback = {
  feedbackType: "field_prep_session",
  rating: 4,
  comment: "Synthetic QA feedback",
  scenarioId: "fixture",
  language: "Spanish",
};
const start = {
  language: "Spanish",
  metadata: { scenario_id: "fixture", privateText: "must not send" },
};
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

test("owned analytics instance uses separate transient IDs, known payloads, no legacy storage, and honest failures", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  let storageReads = 0;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get() {
      storageReads++;
      throw new Error("forbidden legacy storage");
    },
  });
  try {
    let owner = "a";
    const rows = [];
    const insert = async (table, payload, signal) => {
      rows.push({ table, payload, signal });
      return { error: null };
    };
    const a = createLtAnalytics({ isCurrent: () => owner === "a", insert });
    assert.equal(await a.appEvent("field_prep_start", start), true);
    assert.equal(await a.submitFeedback({ ...feedback, extra: "not a column" }), true);
    assert.equal(rows[0].payload.session_id, rows[1].payload.session_id);
    assert.deepEqual(rows[0].payload.metadata, { scenario_id: "fixture" });
    assert.ok(!("extra" in rows[1].payload));
    owner = "b";
    assert.equal(await a.submitFeedback(feedback), false);
    assert.equal(rows.length, 2);
    const b = createLtAnalytics({ isCurrent: () => owner === "b", insert });
    await b.submitFeedback(feedback);
    assert.notEqual(rows[1].payload.session_id, rows[2].payload.session_id);
    a.dispose();
    owner = "a";
    assert.equal(
      await a.submitFeedback(feedback),
      false,
      "disposed owner cannot resume old instance",
    );
    const restored = createLtAnalytics({ isCurrent: () => true, insert });
    await restored.submitFeedback(feedback);
    assert.notEqual(rows[3].payload.session_id, rows[0].payload.session_id);
    const failed = createLtAnalytics({
      isCurrent: () => true,
      insert: async () => ({ error: { message: "fixture failure" } }),
    });
    assert.equal(await failed.submitFeedback(feedback), false);
    const thrown = createLtAnalytics({
      isCurrent: () => true,
      insert: async () => {
        throw new Error("fixture exception");
      },
    });
    assert.equal(await thrown.submitFeedback(feedback), false);
    assert.equal(storageReads, 0);
    b.dispose();
    restored.dispose();
    failed.dispose();
    thrown.dispose();
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else delete globalThis.sessionStorage;
  }
});

test("analytics disposal aborts pending transport; late replies never become successful feedback", async () => {
  let current = true;
  const jobs = [];
  const a = createLtAnalytics({
    isCurrent: () => current,
    insert: (table, payload, signal) => {
      const job = deferred();
      jobs.push({ ...job, signal });
      return job.promise;
    },
  });
  const pending = a.submitFeedback(feedback);
  a.dispose();
  assert.equal(jobs[0].signal.aborted, true);
  jobs[0].resolve({ error: null });
  assert.equal(await pending, false);
  const b = createLtAnalytics({
    isCurrent: () => current,
    insert: () => {
      const j = deferred();
      jobs.push(j);
      return j.promise;
    },
  });
  const late = b.submitFeedback(feedback);
  current = false;
  jobs[1].resolve({ error: null });
  assert.equal(await late, false);
  b.dispose();
});

test("analytics validates lengths/counts/types and bounds pending requests", async () => {
  const jobs = [];
  const a = createLtAnalytics({
    isCurrent: () => true,
    insert: () => {
      const j = deferred();
      jobs.push(j);
      return j.promise;
    },
  });
  for (const bad of [
    { ...feedback, rating: 0 },
    { ...feedback, rating: 6 },
    { ...feedback, comment: "x".repeat(2001) },
    { ...feedback, language: "" },
  ])
    assert.equal(await a.submitFeedback(bad), false);
  assert.equal(await a.appEvent("unrecognized", start), false);
  assert.equal(
    await a.fieldPrepSession({
      scenarioId: "fixture",
      language: "Spanish",
      exchangesCount: Infinity,
      feedbackRequestedCount: 0,
      usedVoice: true,
      durationSeconds: 3,
      completed: true,
    }),
    false,
  );
  assert.equal(jobs.length, 0);
  const pending = Array.from({ length: 20 }, () => a.submitFeedback(feedback));
  assert.equal(await a.submitFeedback(feedback), false);
  assert.equal(jobs.length, 20);
  jobs.forEach((j) => j.resolve({ error: null }));
  assert.ok((await Promise.all(pending)).every(Boolean));
  a.dispose();
});
