import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { recoverLegacyProfile } from "../src/lib/legacy-profile-recovery.ts";
const { reducer } = await loadModule("src/state/app-state.tsx", {
  stubs: [/^sonner$/, /supabase\/client$/],
});
const counters = [
  "xp",
  "wordsLookedUp",
  "notesSaved",
  "tutorMessages",
  "conversationExchanges",
  "lessonsCompleted",
  "customTextsAdded",
  "lettersWritten",
  "challengesCleared",
];
function current() {
  return {
    ...Object.fromEntries(counters.map((k) => [k, 2])),
    selectedLanguage: "Spanish",
    userNotes: [],
    vocabByLanguage: {},
    vocabRevisionsByLanguage: {},
    vocabLang: "Spanish",
    userVocab: [],
    achievements: [],
    cultureRead: [],
    languagesUsed: [],
    cefrLevelsCompleted: [],
    core30Log: {},
    lessonProgress: {},
    streak: 0,
    practiceStreak: {
      current: 0,
      best: 0,
      practiceDates: [],
      today: { date: null, lessonsCompleted: 0 },
      updatedAt: 0,
    },
    purchasedModules: [],
    moduleAssignments: {},
  };
}
function recoverActivity(state, old) {
  const entries = new Map([["lt.app.v2", JSON.stringify(old)]]);
  recoverLegacyProfile({
    storage: { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) },
    actor: "qa",
    kind: "activity",
    current: state,
    snapshot: state,
    confirmed: true,
    isCurrent: () => true,
    apply: (patch) => {
      state = reducer(state, { type: "RECOVER_PROFILE_CATEGORY", payload: patch });
    },
  });
  return state;
}
test("recovered activity totals survive a stale cloud profile on reconnect without adding overlap", () => {
  const original = current(),
    oldCloud = structuredClone(original);
  const recovered = recoverActivity(original, Object.fromEntries(counters.map((k) => [k, 7])));
  const before = structuredClone(recovered);
  const merged = reducer(recovered, { type: "MERGE_REMOTE", payload: oldCloud });
  assert.deepEqual(
    Object.fromEntries(counters.map((k) => [k, merged[k]])),
    Object.fromEntries(counters.map((k) => [k, 7])),
    "all explicitly recovered counters must survive a stale cloud snapshot",
  );
  assert.deepEqual(recovered, before);
  assert.deepEqual(original, current());
  const repeated = reducer(merged, { type: "MERGE_REMOTE", payload: oldCloud });
  for (const key of counters) assert.equal(repeated[key], 7, `${key} must not double on repeat`);
});
test("newer cloud activity remains authoritative when higher than the device total", () => {
  const state = current(),
    remote = { ...current(), customTextsAdded: 11, lettersWritten: 12 };
  const merged = reducer(state, { type: "MERGE_REMOTE", payload: remote });
  assert.equal(merged.customTextsAdded, 11);
  assert.equal(merged.lettersWritten, 12);
  assert.equal(state.customTextsAdded, 2);
});
test("partial cloud profiles cannot erase the device's custom-text or letter totals", () => {
  const state = { ...current(), customTextsAdded: 9, lettersWritten: 8 };
  const merged = reducer(state, { type: "MERGE_REMOTE", payload: { __v: 5, xp: 1 } });
  assert.equal(merged.customTextsAdded, 9);
  assert.equal(merged.lettersWritten, 8);
});
