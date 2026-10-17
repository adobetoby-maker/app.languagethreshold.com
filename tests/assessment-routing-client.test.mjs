import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import {
  readExamDraft,
  saveExamDraft,
  resumeExamDraft,
  hasUnsyncedExamDrafts,
  examDraftKey,
} from "../src/lib/assessments/drafts.ts";
const { continueExamRouting } = await loadModule("src/lib/assessments/routing-client.ts");
const requestId = "11111111-2222-4333-8444-555555555555";
function fixture() {
  const attempt = {
    id: "synthetic-attempt",
    isLearner: true,
    submittedAt: null,
    revision: 4,
    savedAt: "now",
    form: {
      id: "local-form",
      version: "local-v1",
      rubricVersion: "local-r1",
      items: [{ id: "core-a" }, { id: "core-b" }],
    },
    enrollment: { id: "local-enrollment" },
    routing: { state: "core", coreItemCount: 2 },
  };
  const latest = {
    ...structuredClone(attempt),
    revision: 6,
    savedAt: "later",
    form: {
      ...structuredClone(attempt.form),
      items: [...attempt.form.items, { id: "server-selected-only" }],
    },
    routing: { state: "selected", coreItemCount: 2 },
  };
  const f = {
    attempt,
    latest,
    actor: true,
    online: true,
    calls: [],
    updates: [],
    conflicts: [],
    draft: {
      formId: "local-form",
      revision: 4,
      savedAt: "now",
      sequence: 1,
      index: 1,
      pending: {},
      flight: null,
    },
  };
  f.options = {
    attempt,
    current: () => f.draft,
    update: (draft) => {
      f.draft = draft;
      f.updates.push(structuredClone(draft));
    },
    flush: async () => {
      f.calls.push("flush");
      f.draft.revision = 5;
      return true;
    },
    isCurrent: () => f.actor,
    online: () => f.online,
    requestId: () => requestId,
    select: async (flight) => {
      f.calls.push({ action: "route", ...flight });
    },
    read: async () => {
      f.calls.push("read");
      return f.latest;
    },
    conflict: (latest) => f.conflicts.push(latest),
  };
  return f;
}

test("continuation waits for authoritative saves, persists retry before selection and adopts only a fresh selected snapshot", async () => {
  const f = fixture();
  assert.equal(await continueExamRouting(f.options), f.latest);
  assert.deepEqual(f.calls, ["flush", { action: "route", revision: 5, requestId }, "read"]);
  assert.deepEqual(f.updates[0].routeFlight, { revision: 5, requestId });
  assert.equal(f.draft.routeFlight, undefined);
  assert.equal(f.draft.revision, 6);
  assert.equal(f.draft.index, 2);
});

test("lost selection/read response retains original retry across remount and recovers the same server branch", async () => {
  const f = fixture();
  f.options.select = async (flight) => {
    f.calls.push(flight);
    throw new TypeError("Synthetic disconnect");
  };
  f.options.read = async () => {
    throw new TypeError("Still disconnected");
  };
  await assert.rejects(continueExamRouting(f.options));
  assert.deepEqual(f.draft.routeFlight, { revision: 5, requestId });
  f.draft = resumeExamDraft(f.draft, {
    formId: "local-form",
    revision: 99,
    savedAt: "newer",
    itemCount: 2,
    routingState: "core",
  });
  assert.equal(f.draft.revision, 5);
  f.options.flush = async () => true;
  f.options.requestId = () => assert.fail("Must reuse the original retry identity");
  f.options.read = async () => f.latest;
  assert.equal(await continueExamRouting(f.options), f.latest);
  assert.deepEqual(
    f.calls.filter((c) => typeof c === "object"),
    [
      { revision: 5, requestId },
      { revision: 5, requestId },
    ],
  );
});

test("offline, changed identity, failed flush and pending saves never select or create a routing flight", async () => {
  for (const mode of [
    "offline",
    "identity",
    "flush",
    "pending",
    "save-flight",
    "flat",
    "submitted",
  ]) {
    const f = fixture();
    if (mode === "offline") f.online = false;
    if (mode === "identity") f.actor = false;
    if (mode === "flush") f.options.flush = async () => false;
    if (mode === "pending")
      f.draft.pending = { "core-a": { edit: 1, answer: { inputMethod: "typed", text: "new" } } };
    if (mode === "save-flight") f.draft.flight = { requestId };
    if (mode === "flat") delete f.attempt.routing;
    if (mode === "submitted") f.attempt.submittedAt = "then";
    await assert.rejects(continueExamRouting(f.options), undefined, mode);
    assert.equal(f.updates.length, 0, mode);
    assert.ok(!f.calls.some((c) => typeof c === "object"), mode);
  }
});

test("late identity changes cannot fetch or adopt another account's continuation", async () => {
  for (const during of ["flush", "selection", "read"]) {
    const f = fixture();
    if (during === "flush")
      f.options.flush = async () => {
        f.actor = false;
        return true;
      };
    if (during === "selection")
      f.options.select = async () => {
        f.actor = false;
      };
    if (during === "read")
      f.options.read = async () => {
        f.actor = false;
        return f.latest;
      };
    await assert.rejects(continueExamRouting(f.options), /session changed/);
    assert.equal(f.updates.length, during === "flush" ? 0 : 1);
    assert.notEqual(f.draft.revision, 6);
  }
});

test("wrong attempt/form/version/enrollment/path/core or pending edits cannot replace the saved device copy", async () => {
  for (const mode of [
    "attempt",
    "form",
    "version",
    "enrollment",
    "core",
    "route",
    "branch",
    "pending",
    "flight-identity",
  ]) {
    const f = fixture();
    if (mode === "attempt") f.latest.id = "foreign";
    if (mode === "form") f.latest.form.id = "foreign";
    if (mode === "version") f.latest.form.version = "different";
    if (mode === "enrollment") f.latest.enrollment.id = "foreign";
    if (mode === "core") f.latest.form.items[0] = { id: "different" };
    if (mode === "route") f.latest.routing.state = "core";
    if (mode === "branch") f.latest.form.items.length = 2;
    if (mode === "pending")
      f.options.read = async () => {
        f.draft.pending = { changed: { edit: 1, answer: {} } };
        return f.latest;
      };
    if (mode === "flight-identity")
      f.options.read = async () => {
        f.draft.routeFlight.requestId = "changed";
        return f.latest;
      };
    await assert.rejects(continueExamRouting(f.options), undefined, mode);
    assert.equal(f.updates.length, 1, mode);
    assert.notEqual(f.draft.revision, 6, mode);
  }
});

test("definitive invalid core unlocks editing; concurrent core save requires explicit conflict resolution", async () => {
  for (const status of [400, 409]) {
    const f = fixture();
    f.options.select = async () => {
      throw Object.assign(new Error("Controlled rejection"), { status });
    };
    f.options.read = async () => ({ ...f.attempt, revision: 9 });
    await assert.rejects(continueExamRouting(f.options), /Controlled rejection/);
    assert.equal(f.draft.routeFlight, undefined);
    assert.equal(f.draft.revision, 5); // Never silently rebase from the conflicting read.
    assert.equal(f.conflicts.length, status === 409 ? 1 : 0);
  }
});

test("route flight participates in owned pending-work checks and selected reload resumes at the branch", () => {
  const f = fixture(),
    values = new Map();
  const storage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  f.draft.routeFlight = { requestId, revision: 4 };
  const key = examDraftKey("local-owner", f.attempt.id);
  assert.equal(saveExamDraft(storage, key, f.draft), true);
  const stored = readExamDraft(storage, key);
  assert.deepEqual(stored.routeFlight, f.draft.routeFlight);
  assert.equal(hasUnsyncedExamDrafts(storage, "local-owner"), true);
  assert.equal(hasUnsyncedExamDrafts(storage, "other-owner"), false);
  const resumed = resumeExamDraft(stored, {
    formId: "local-form",
    revision: 6,
    savedAt: "later",
    itemCount: 3,
    routingState: "selected",
    coreItemCount: 2,
  });
  assert.equal(resumed.routeFlight, undefined);
  assert.equal(resumed.revision, 6);
  assert.equal(resumed.index, 2);
  saveExamDraft(storage, key, resumed);
  assert.equal(hasUnsyncedExamDrafts(storage, "local-owner"), false);
  const pending = { "core-a": { edit: 2, answer: { inputMethod: "typed", text: "Device edit" } } };
  const withEdits = resumeExamDraft(
    { ...stored, pending },
    {
      formId: "local-form",
      revision: 6,
      savedAt: "later",
      itemCount: 3,
      routingState: "selected",
      coreItemCount: 2,
    },
  );
  assert.equal(withEdits.routeFlight, undefined);
  assert.equal(withEdits.revision, 4);
  assert.deepEqual(withEdits.pending, pending);
  for (const bad of [{ revision: -1, requestId }, { revision: 4, requestId: "bad" }, null]) {
    storage.setItem(key, JSON.stringify({ ...f.draft, routeFlight: bad }));
    assert.equal(readExamDraft(storage, key), null);
  }
});
