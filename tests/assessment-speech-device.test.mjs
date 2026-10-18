import test from "node:test";
import assert from "node:assert/strict";
import {
  readSpeechTake,
  saveSpeechTake,
  clearSpeechTake,
  registerSpeechCapture,
  clearSpeechForUser,
  unsavedSpeechCount,
  subscribeSpeechDrafts,
} from "../src/lib/assessments/speech-device.ts";
import {
  hasUnsyncedExamDrafts,
  clearExamDraftsForUser,
  adoptExternalDraft,
} from "../src/lib/assessments/drafts.ts";
const take = () => ({
  blob: new Blob(["synthetic non-speech fixture"]),
  mime: "audio/webm",
  durationMs: 1000,
  policyVersion: "local-fixture",
});
test("memory-only recordings survive a question remount but are scoped to account and attempt", () => {
  const t = take();
  saveSpeechTake("fixture-A", "attempt-1", "item", t);
  try {
    assert.equal(readSpeechTake("fixture-A", "attempt-1", "item"), t);
    assert.equal(readSpeechTake("fixture-B", "attempt-1", "item"), undefined);
    assert.equal(readSpeechTake("fixture-A", "attempt-2", "item"), undefined);
    assert.equal(unsavedSpeechCount("fixture-A", "attempt-1"), 1);
    assert.equal(unsavedSpeechCount("fixture-A", "attempt-2"), 0);
    assert.equal(hasUnsyncedExamDrafts(null, "fixture-A"), true);
  } finally {
    clearSpeechForUser("fixture-A");
  }
});
test("account draft clearing cancels its microphone and drops only its unsynced audio", () => {
  let cancelled = 0;
  saveSpeechTake("fixture-A", "attempt", "item", take());
  saveSpeechTake("fixture-B", "attempt", "item", take());
  registerSpeechCapture("fixture-A", "attempt", "item", () => cancelled++);
  clearExamDraftsForUser(null, "fixture-A");
  assert.equal(cancelled, 1);
  assert.equal(unsavedSpeechCount("fixture-A"), 0);
  assert.equal(unsavedSpeechCount("fixture-B"), 1);
  clearSpeechForUser("fixture-B");
});
test("closing an old capture cannot clear a newer microphone registration", () => {
  const old = registerSpeechCapture("fixture-A", "attempt", "item", () => {});
  const current = registerSpeechCapture("fixture-A", "attempt", "item", () => {});
  old();
  assert.equal(unsavedSpeechCount("fixture-A"), 1);
  current();
  assert.equal(unsavedSpeechCount("fixture-A"), 0);
});
test("discarding a take notifies the UI and removes the submission/sign-out guard", () => {
  let changes = 0;
  const stop = subscribeSpeechDrafts(() => changes++);
  saveSpeechTake("fixture-A", "attempt", "item", take());
  clearSpeechTake("fixture-A", "attempt", "item");
  stop();
  assert.equal(changes, 2);
  assert.equal(hasUnsyncedExamDrafts(null, "fixture-A"), false);
});
const draft = () => ({
  formId: "fixture",
  revision: 3,
  index: 7,
  sequence: 4,
  pending: {},
  flight: null,
  savedAt: "old",
});
test("external recording attachment adopts the authoritative revision without replaying an answer", () => {
  const next = adoptExternalDraft(draft(), 4, "new");
  assert.equal(next.revision, 4);
  assert.equal(next.index, 7);
  assert.equal(next.sequence, 4);
  assert.deepEqual(next.pending, {});
  assert.equal(next.savedAt, "new");
});
test("external attachment cannot overwrite a pending edit, uncertain save flight or newer revision", () => {
  assert.throws(
    () =>
      adoptExternalDraft(
        {
          ...draft(),
          pending: { item: { answer: { inputMethod: "typed", text: "keep me" }, edit: 5 } },
        },
        4,
        "new",
      ),
    /Sync/,
  );
  assert.throws(
    () => adoptExternalDraft({ ...draft(), flight: { requestId: "fixture" } }, 4, "new"),
    /Sync/,
  );
  assert.throws(() => adoptExternalDraft(draft(), 2, "old"), /revision/);
});
