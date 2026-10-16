import assert from "node:assert/strict";
import test from "node:test";
import {
  examDraftKey,
  readExamDraft,
  saveExamDraft,
  clearExamDraftsForUser,
  hasUnsyncedExamDrafts,
  registerPendingExam,
  nextDraftFlight,
  acknowledgeFlight,
  resumeExamDraft,
  adoptExternalDraft,
} from "../src/lib/assessments/drafts.ts";
const store = () => {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
};
const draft = () => ({
  formId: "synthetic",
  revision: 2,
  index: 4,
  sequence: 1,
  pending: { a: { answer: { inputMethod: "typed", text: "Device-only answer" }, edit: 1 } },
  flight: null,
  savedAt: "2026-10-16T07:00:00Z",
});
const source = (revision = 3) => ({
  formId: "synthetic",
  revision,
  savedAt: "2026-10-16T08:00:00Z",
  itemCount: 20,
});

test("clean saved question position adopts a freshly read server revision before the next edit", () => {
  const saved = {
    ...draft(),
    pending: {},
    acknowledged: { a: { inputMethod: "typed", text: "Old acknowledged answer" } },
  };
  const restored = resumeExamDraft(saved, source());
  assert.equal(restored.index, 4);
  assert.equal(restored.revision, 3);
  assert.equal(restored.savedAt, source().savedAt);
  assert.equal(restored.acknowledged, undefined);
  restored.pending.a = { answer: { inputMethod: "typed", text: "New edit" }, edit: 2 };
  assert.equal(nextDraftFlight(restored, "new-request").revision, 3);
  assert.equal(saved.revision, 2);
});

test("a fresh read never rebases outstanding edits or an uncertain save flight silently", () => {
  const saved = draft();
  saved.flight = nextDraftFlight(saved, "uncertain-request");
  const restored = resumeExamDraft(saved, source(4));
  assert.equal(restored.revision, 2);
  assert.deepEqual(restored.pending, saved.pending);
  assert.deepEqual(restored.flight, saved.flight);
  assert.equal(nextDraftFlight(restored, "different-request").requestId, "uncertain-request");
});

test("an acknowledged answer survives reload before the separate device form snapshot catches up", () => {
  const storage = store(),
    key = examDraftKey("atomic-owner", "atomic-attempt");
  const saved = draft();
  saved.flight = nextDraftFlight(saved, "ack-request");
  const ack = acknowledgeFlight(saved, 3);
  saveExamDraft(storage, key, ack);
  const device = resumeExamDraft(readExamDraft(storage, key), source(2), true);
  assert.equal(device.revision, 3);
  assert.deepEqual(device.pending, {});
  const answers = {
    a: { inputMethod: "typed", text: "Stale form-snapshot answer" },
    ...device.acknowledged,
  };
  assert.equal(answers.a.text, "Device-only answer");
  assert.equal(readExamDraft(storage, examDraftKey("other-owner", "atomic-attempt")), null);
  const fresh = resumeExamDraft(device, source(4));
  assert.equal(fresh.revision, 4);
  assert.equal(fresh.acknowledged, undefined);
  assert.equal(adoptExternalDraft(device, 4, "fresh").acknowledged, undefined);
  clearExamDraftsForUser(storage, "atomic-owner");
  assert.equal(readExamDraft(storage, key), null);
});

test("acknowledgement keeps a newer edit and rejects malformed acknowledged device records", () => {
  const saved = draft();
  saved.flight = nextDraftFlight(saved, "older-edit");
  saved.pending = { a: { answer: { inputMethod: "typed", text: "Newer edit" }, edit: 2 } };
  const ack = acknowledgeFlight(saved, 3);
  assert.equal(ack.acknowledged.a.text, "Device-only answer");
  assert.equal(ack.pending.a.answer.text, "Newer edit");
  const storage = store(),
    key = examDraftKey("bad-ack", "attempt");
  for (const acknowledged of [[], { a: { inputMethod: "unknown" } }, { a: null }]) {
    storage.setItem(key, JSON.stringify({ ...draft(), acknowledged }));
    assert.equal(readExamDraft(storage, key), null);
  }
});
test("official unsynced drafts survive refresh and remain private to user/attempt", () => {
  const storage = store(),
    key = examDraftKey("a", "attempt1");
  assert.equal(saveExamDraft(storage, key, draft()), true);
  assert.deepEqual(readExamDraft(storage, key), draft());
  assert.equal(readExamDraft(storage, examDraftKey("b", "attempt1")), null);
  assert.equal(readExamDraft(storage, examDraftKey("a", "attempt2")), null);
  assert.equal(hasUnsyncedExamDrafts(storage, "a"), true);
  storage.setItem(examDraftKey("b", "attempt1"), JSON.stringify(draft()));
  clearExamDraftsForUser(storage, "a");
  assert.equal(storage.getItem(key), null);
  assert.ok(storage.getItem(examDraftKey("b", "attempt1")));
});
test("edits during an in-flight save cannot be erased by its old acknowledgement", () => {
  const state = draft();
  state.flight = nextDraftFlight(state, "request1");
  state.pending.a = { answer: { inputMethod: "typed", text: "Newer edit" }, edit: 2 };
  const acknowledged = acknowledgeFlight(state, 3);
  assert.equal(acknowledged.pending.a.answer.text, "Newer edit");
  assert.equal(acknowledged.revision, 3);
  assert.equal(acknowledged.flight, null);
  const next = nextDraftFlight(acknowledged, "request2");
  assert.equal(next.revision, 3);
  assert.equal(next.updates[0].answer.text, "Newer edit");
});
test("unknown network outcome retries the exact persisted request before creating another", () => {
  const state = draft();
  state.flight = nextDraftFlight(state, "same-idempotency-key");
  assert.equal(nextDraftFlight(state, "a-different-id"), state.flight);
  const ack = acknowledgeFlight(state, 3);
  assert.deepEqual(ack.pending, {});
});
test("blocked storage still warns about in-memory unsynced work", () => {
  registerPendingExam("user", "attempt", true);
  assert.equal(hasUnsyncedExamDrafts(null, "user"), true);
  assert.equal(saveExamDraft(null, "key", draft()), false);
  clearExamDraftsForUser(null, "user");
  assert.equal(hasUnsyncedExamDrafts(null, "user"), false);
});
test("blocked device storage retains newest answers across panel remounts and clears them on account exit", () => {
  const blocked = {
    get length() {
      throw new Error("blocked");
    },
    key() {
      throw new Error("blocked");
    },
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const key = examDraftKey("blocked-remount", "attempt"),
    value = draft();
  value.pending = {
    item: { answer: { inputMethod: "typed", text: "retained in this tab" }, edit: 1 },
  };
  assert.equal(saveExamDraft(blocked, key, value), false);
  assert.equal(readExamDraft(blocked, key).pending.item.answer.text, "retained in this tab");
  assert.equal(hasUnsyncedExamDrafts(blocked, "blocked-remount"), true);
  clearExamDraftsForUser(blocked, "blocked-remount");
  assert.equal(readExamDraft(blocked, key), null);
});
