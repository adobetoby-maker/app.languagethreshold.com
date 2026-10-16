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
