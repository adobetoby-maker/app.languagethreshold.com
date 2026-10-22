import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { resetLearningDevice } = await loadModule("src/lib/learning-reset.ts");
const { createLearnerDeviceStore, learnerDeviceKey } = await loadModule(
  "src/lib/learner-device-store.ts",
);
const { profileSnapshotKey } = await loadModule("src/lib/profile-device-snapshot.ts");
const { learningResetKey } = await loadModule("src/lib/learning-reset-epoch.ts");
function storage() {
  const values = new Map();
  return {
    values,
    get length() {
      return values.size;
    },
    key(i) {
      return [...values.keys()][i] ?? null;
    },
    getItem(k) {
      return values.get(k) ?? null;
    },
    setItem(k, v) {
      values.set(k, v);
    },
    removeItem(k) {
      values.delete(k);
    },
  };
}
test("reset deletes only the selected account learning stores and retains other identities and legacy saves", () => {
  const s = storage();
  const actor = "A";
  const keys = [
    learnerDeviceKey("flashcards", actor),
    learnerDeviceKey("notes", actor),
    learnerDeviceKey("gameConjugation", actor),
    "lt.library-device.v1.user.A",
    "lt.lessonDraft.v1.A.lesson1.write",
  ];
  for (const k of keys) s.setItem(k, "old-data");
  const retained = [
    learnerDeviceKey("notes", "B"),
    learnerDeviceKey("notes", null),
    "lt.app.v2",
    "sb-auth-token",
    "lt.theme.preference",
  ];
  for (const k of retained) s.setItem(k, "keep");
  const profile = { learningResetId: "reset-1", subscription_status: "active" };
  resetLearningDevice(s, actor, "reset-1", profile);
  for (const k of keys) assert.equal(s.getItem(k), null, k);
  for (const k of retained) assert.equal(s.getItem(k), "keep", k);
  assert.deepEqual(JSON.parse(s.getItem(profileSnapshotKey(actor))).data, profile);
  assert.equal(s.getItem(learningResetKey(actor)), "reset-1");
});
test("learner store handles created before reset cannot rewrite old practice data", () => {
  const s = storage();
  const old = createLearnerDeviceStore({
    kind: "notes",
    actor: "A",
    storage: s,
    isCurrent: () => true,
  });
  assert.equal(old.write(["old note"]), true);
  resetLearningDevice(s, "A", "reset-2", { learningResetId: "reset-2" });
  assert.equal(old.write(["resurrected note"]), false);
  assert.equal(old.read(), null);
  const fresh = createLearnerDeviceStore({
    kind: "notes",
    actor: "A",
    storage: s,
    isCurrent: () => true,
  });
  assert.equal(fresh.read(), null);
  assert.equal(fresh.write(["new note"]), true);
});
test("blocked storage reports failure instead of reporting a completed device wipe", () => {
  const s = storage();
  s.setItem(learnerDeviceKey("notes", "B"), "keep");
  s.setItem = () => {
    throw Error("storage blocked");
  };
  assert.throws(() => resetLearningDevice(s, "A", "reset-3", {}), /storage blocked/);
  assert.equal(s.getItem(learnerDeviceKey("notes", "B")), "keep");
});

const { reducer } = await loadModule("src/state/app-state.tsx", {
  stubs: [/^sonner$/, /supabase\/client$/],
});
test("a new cloud reset replaces stale local progress instead of taking maxima or unioning deleted materials", () => {
  const old = {
    learningResetId: null,
    xp: 900,
    streak: 12,
    achievements: ["old"],
    userNotes: [{ id: "old-note" }],
    core30Log: { roofing: { lessons: { 1: { masteredAt: "old" } } } },
    userVocab: [{ word: "old" }],
  };
  const before = JSON.stringify(old);
  const remote = {
    learningResetId: "new-reset",
    selectedLanguage: "French",
    purchasedModules: ["paid-module"],
    level: "Beginner",
  };
  const next = reducer(old, { type: "MERGE_REMOTE", payload: remote });
  assert.equal(next.xp, 0);
  assert.equal(next.streak, 0);
  assert.deepEqual(next.achievements, []);
  assert.deepEqual(next.userNotes, []);
  assert.deepEqual(next.core30Log, {});
  assert.deepEqual(next.userVocab, []);
  assert.deepEqual(next.purchasedModules, ["paid-module"]);
  assert.equal(next.selectedLanguage, "French");
  assert.equal(next.learningResetId, "new-reset");
  assert.equal(JSON.stringify(old), before);
  assert.deepEqual(reducer(old, { type: "MERGE_REMOTE", payload: remote }), next);
});
