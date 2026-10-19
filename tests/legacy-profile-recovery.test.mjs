import assert from "node:assert/strict";
import test from "node:test";
import {
  inspectLegacyProfile,
  mergeLegacyProfileCategory,
  recoverLegacyProfile,
} from "../src/lib/legacy-profile-recovery.ts";
import { profileSnapshotKey, readProfileSnapshot } from "../src/lib/profile-device-snapshot.ts";
import { core30ScopeKey } from "../src/lib/core30-scope.ts";
import { loadModule } from "./helpers/bundle.mjs";
const { reducer } = await loadModule("src/state/app-state.tsx", {
  stubs: [/^sonner$/, /supabase\/client$/],
});
const note = (id = "n", text = "Old note") => ({ id, text, createdAt: 1 });
const word = (word = "casa", correctCount = 9) => ({
  word,
  translation: "old",
  category: "topic",
  correctCount,
});
const at = "2026-10-18T12:00:00.000Z";
const log = { lessons: { 1: { visits: { 0: at }, masteredAt: at } } };
const current = () => ({
  selectedLanguage: "French",
  nativeLanguage: "English",
  userNotes: [],
  vocabByLanguage: {},
  vocabRevisionsByLanguage: {},
  core30Log: {},
  lessonProgress: {},
  xp: 4,
  wordsLookedUp: 0,
  notesSaved: 0,
  tutorMessages: 0,
  conversationExchanges: 0,
  lessonsCompleted: 0,
  customTextsAdded: 0,
  lettersWritten: 0,
  challengesCleared: 0,
  streak: 2,
  purchasedModules: [],
  moduleAssignments: {},
  cefrLevelsCompleted: [],
  achievements: [],
  pendingLevelUp: "old",
});
function fixture(data = { userNotes: [note()] }, key = "lt.app.v2") {
  const entries = new Map([[key, JSON.stringify(data)]]),
    writes = [];
  const storage = {
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      entries.set(k, v);
    },
  };
  const state = current();
  let applied;
  const options = {
    storage,
    actor: "a",
    kind: "notes",
    current: state,
    snapshot: state,
    confirmed: true,
    isCurrent: () => true,
    apply: (patch) => {
      applied = patch;
    },
  };
  return {
    entries,
    writes,
    storage,
    options,
    get applied() {
      return applied;
    },
  };
}
const inspect = (f, kind = "notes", actor = "a") =>
  inspectLegacyProfile(f.storage, actor).find((x) => x.kind === kind);

test("three legacy keys recover independently; newest present source wins without fallback", () => {
  for (const key of ["lt.app", "lt.app.v1", "lt.app.v2"]) {
    const f = fixture({ __v: 1, userNotes: [note()] }, key);
    recoverLegacyProfile(f.options);
    assert.equal(f.applied.userNotes.length, 1);
    assert.equal(f.storage.getItem(key), JSON.stringify({ __v: 1, userNotes: [note()] }));
  }
  const f = fixture();
  f.entries.set("lt.app.v1", JSON.stringify({ userNotes: [note("older")] }));
  f.entries.set("lt.app.v2", "broken");
  assert.equal(inspect(f).status, "unreadable");
  assert.throws(() => recoverLegacyProfile(f.options));
  assert.equal(f.writes.length, 0);
});
test("bad versions, root shapes, duplicate IDs and oversized source refuse without writes", () => {
  for (const value of [
    { __v: 6, userNotes: [note()] },
    { __v: 0 },
    { userNotes: [note(), note()] },
    { userNotes: [{ ...note(), createdAt: -1 }] },
    [],
    null,
  ]) {
    const f = fixture(value);
    assert.equal(inspect(f).status, "unreadable");
    assert.throws(() => recoverLegacyProfile(f.options));
    assert.equal(f.writes.length, 0);
  }
  const f = fixture();
  f.entries.set("lt.app.v2", "x".repeat(8 * 1024 * 1024 + 1));
  assert.equal(inspect(f).status, "unreadable");
  assert.throws(() => recoverLegacyProfile(f.options));
});
test("category validation is independent; malformed vocabulary cannot block valid personal notes", () => {
  const f = fixture({ userNotes: [note()], vocabByLanguage: { Unknown: [word()] } });
  assert.equal(inspect(f).status, "available");
  assert.equal(inspect(f, "vocabulary").status, "unreadable");
  recoverLegacyProfile(f.options);
  assert.deepEqual(f.applied, { userNotes: [note()] });
});
test("confirmation, identity and signed destination are required before ownership reservation", () => {
  for (const change of [
    { confirmed: false },
    { actor: "" },
    { isCurrent: () => false },
    { kind: "arbitrary" },
  ]) {
    const f = fixture();
    assert.throws(() => recoverLegacyProfile({ ...f.options, ...change }));
    assert.equal(f.writes.length, 0);
  }
  assert.ok(inspectLegacyProfile(null, "a").every((x) => x.status === "unreadable"));
});
test("one account owns the whole old profile; another learner sees no counts or private source read", () => {
  const f = fixture({ userNotes: [note()], xp: 40 });
  recoverLegacyProfile(f.options);
  const guarded = {
    ...f.storage,
    getItem: (k) => {
      if (k === "lt.app.v2") assert.fail("foreign source read");
      return f.storage.getItem(k);
    },
  };
  assert.ok(
    inspectLegacyProfile(guarded, "b").every((x) => x.status === "other-account" && x.count === 0),
  );
  assert.throws(
    () => recoverLegacyProfile({ ...f.options, storage: guarded, actor: "b", kind: "activity" }),
    /another account/,
  );
  recoverLegacyProfile({ ...f.options, kind: "activity" });
  assert.equal(f.applied.xp, 40);
});
test("current note IDs win, missing notes are explicit additions, completed receipts prevent resurrection", () => {
  const f = fixture({ userNotes: [note(), note("missing")] });
  f.options.current.userNotes = [note("n", "Current")];
  const before = structuredClone(f.options.current);
  recoverLegacyProfile(f.options);
  assert.deepEqual(f.applied.userNotes, [note("n", "Current"), note("missing")]);
  assert.deepEqual(f.options.current, before);
  f.options.current.userNotes = [];
  assert.throws(() => recoverLegacyProfile(f.options), /already recovered/);
  assert.equal(inspect(f).status, "recovered");
});
test("unlabeled words require an explicit language, while existing language labels override a choice", () => {
  const f = fixture({ userVocab: [word()], selectedLanguage: "Spanish", vocabLang: null });
  assert.equal(inspect(f, "vocabulary").needsLanguage, true);
  assert.throws(
    () => recoverLegacyProfile({ ...f.options, kind: "vocabulary" }),
    /Choose the language/,
  );
  assert.equal(f.writes.length, 0);
  recoverLegacyProfile({ ...f.options, kind: "vocabulary", chosenLanguage: "Italian" });
  assert.deepEqual(Object.keys(f.applied.vocabByLanguage), ["Italian"]);
  const patch = mergeLegacyProfileCategory(
    current(),
    { userVocab: [word()], vocabLang: "Spanish" },
    "vocabulary",
    "Italian",
  );
  assert.deepEqual(Object.keys(patch.vocabByLanguage), ["Spanish"]);
});
test("current translations/mastery win normalized duplicates; explicit empty revisions retain resets", () => {
  const c = current();
  c.vocabByLanguage = { Spanish: [{ ...word("Casa", 1), translation: "current" }], French: [] };
  c.vocabRevisionsByLanguage = { Spanish: 7, French: 0 };
  const old = {
    vocabByLanguage: {
      Spanish: [word(" casa "), word("puerta"), word("PUERTA")],
      French: [word("maison")],
      Italian: [word("porta")],
    },
    userVocab: [word("casa", 99)],
    vocabLang: "Spanish",
  };
  const before = structuredClone(c),
    p = mergeLegacyProfileCategory(c, old, "vocabulary");
  assert.deepEqual(c, before);
  assert.deepEqual(
    p.vocabByLanguage.Spanish.map((w) => [w.word, w.correctCount, w.translation]),
    [
      ["Casa", 1, "current"],
      ["puerta", 9, "old"],
    ],
  );
  assert.deepEqual(p.vocabByLanguage.French, []);
  assert.equal(p.vocabRevisionsByLanguage.Spanish, 8);
  assert.equal(p.vocabRevisionsByLanguage.Italian, 1);
  const again = mergeLegacyProfileCategory({ ...c, ...p }, old, "vocabulary");
  assert.deepEqual(again, p);
});
test("malformed current category or overflowing revision cannot be overwritten", () => {
  for (const [kind, change, data] of [
    ["notes", { userNotes: "bad" }, { userNotes: [note()] }],
    [
      "vocabulary",
      { vocabByLanguage: { Spanish: "bad" } },
      { vocabByLanguage: { Spanish: [word()] } },
    ],
    ["activity", { xp: NaN }, { xp: 10 }],
    [
      "vocabulary",
      { vocabRevisionsByLanguage: { Spanish: 1e9 }, vocabByLanguage: { Spanish: [word("other")] } },
      { vocabByLanguage: { Spanish: [word()] } },
    ],
  ]) {
    const f = fixture(data);
    Object.assign(f.options.current, change);
    assert.throws(() => recoverLegacyProfile({ ...f.options, kind }));
    assert.equal(f.writes.length, 0);
  }
});
test("activity takes max per counter and excludes streak, declarations, entitlements and assignments", () => {
  const f = fixture({
    xp: 10,
    notesSaved: 5,
    lessonsCompleted: 3,
    streak: 90,
    practiceStreak: { current: 90 },
    cefrLevelsCompleted: ["C2"],
    purchasedModules: ["roofing"],
    moduleAssignments: { roofing: "fake" },
    level: "Advanced",
    currentTab: "exams",
    achievements: ["fake"],
  });
  f.options.current.notesSaved = 8;
  recoverLegacyProfile({ ...f.options, kind: "activity" });
  assert.deepEqual(f.applied, { xp: 10, notesSaved: 8, lessonsCompleted: 3 });
  const next = reducer(f.options.current, { type: "RECOVER_PROFILE_CATEGORY", payload: f.applied });
  assert.equal(next.xp, 10);
  assert.equal(next.streak, 2);
  assert.deepEqual(next.purchasedModules, []);
  assert.deepEqual(next.moduleAssignments, {});
  assert.deepEqual(next.cefrLevelsCompleted, []);
  assert.equal(next.pendingLevelUp, null);
});
test("only bare known module archives recover; current resets and exact enrollment records win", () => {
  const context = {
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      enrollmentId: "current-plan",
    },
    key = core30ScopeKey("roofing", context);
  const c = current();
  c.core30Log = { [key]: { lessons: {} }, roofing: { lessons: {} } };
  c.lessonProgress = { roofing: 0 };
  const old = {
    core30Log: { roofing: log, framer: log, [key]: log, unknown: log },
    lessonProgress: { roofing: 7, framer: 8, [key]: 20, unknown: 9 },
  };
  const p = mergeLegacyProfileCategory(c, old, "modules");
  assert.deepEqual(p.core30Log.roofing, { lessons: {} });
  assert.equal(p.lessonProgress.roofing, 0);
  assert.deepEqual(p.core30Log[key], { lessons: {} });
  assert.deepEqual(p.core30Log.framer, log);
  assert.equal(p.lessonProgress[key], undefined);
  assert.equal(p.core30Log.unknown, undefined);
  const scopedOnly = fixture({ core30Log: { [key]: log } });
  assert.equal(inspect(scopedOnly, "modules").status, "absent");
  assert.throws(
    () => recoverLegacyProfile({ ...scopedOnly.options, kind: "modules" }),
    /No compatible/,
  );
  assert.throws(() =>
    mergeLegacyProfileCategory(
      c,
      { core30Log: { roofing: { lessons: { 999: { visits: { 0: at } } } } } },
      "modules",
    ),
  );
});
test("recovered bare module archive is not attributed until the existing explicit pair claim", () => {
  const c = current(),
    context = { targetLanguage: "Spanish", instructionLanguage: "English" },
    key = core30ScopeKey("roofing", context);
  const p = mergeLegacyProfileCategory(
    c,
    { core30Log: { roofing: log }, lessonProgress: { roofing: 8 } },
    "modules",
  );
  let s = reducer(c, { type: "RECOVER_PROFILE_CATEGORY", payload: p });
  assert.equal(s.core30Log[key], undefined);
  s = reducer(s, { type: "CORE30_CLAIM_LEGACY", payload: { moduleId: "roofing", context } });
  assert.ok(s.core30Log[key]);
  assert.equal(s.lessonProgress[key], 8);
});
test("corrupt owned envelopes and corrupt receipts refuse; original bytes remain unchanged", () => {
  for (const key of [profileSnapshotKey("a"), "lt.legacy-profile-claim.v1"]) {
    const f = fixture();
    const old = f.storage.getItem("lt.app.v2");
    f.entries.set(key, "broken");
    assert.throws(() => recoverLegacyProfile(f.options));
    assert.equal(f.storage.getItem(key), "broken");
    assert.equal(f.storage.getItem("lt.app.v2"), old);
    assert.equal(f.writes.length, 0);
  }
});
test("quota failure reserves only this actor; same actor can retry without duplicate notes", () => {
  const f = fixture();
  const write = f.storage.setItem;
  f.storage.setItem = (k, v) => {
    if (k === profileSnapshotKey("a")) throw Error("quota");
    write(k, v);
  };
  assert.throws(() => recoverLegacyProfile(f.options), /could not be saved/);
  assert.equal(f.applied, undefined);
  assert.equal(inspect(f, "notes", "b").status, "other-account");
  assert.equal(inspect(f).status, "available");
  f.storage.setItem = write;
  recoverLegacyProfile(f.options);
  assert.equal(readProfileSnapshot(f.storage, "a").userNotes.length, 1);
});
test("late identity switches stop before applying and never save into another actor", () => {
  for (const stop of [2, 3, 4]) {
    const f = fixture();
    let n = 0;
    assert.throws(
      () => recoverLegacyProfile({ ...f.options, isCurrent: () => ++n < stop }),
      /account changed/,
    );
    assert.equal(f.applied, undefined);
    assert.equal(f.storage.getItem(profileSnapshotKey("b")), null);
    assert.equal(f.storage.getItem("lt.app.v2"), JSON.stringify({ userNotes: [note()] }));
  }
});
test("lost final receipt write retains owned data and supports an idempotent same-account retry", () => {
  const f = fixture();
  let receipts = 0;
  const write = f.storage.setItem;
  f.storage.setItem = (k, v) => {
    if (k === "lt.legacy-profile-claim.v1" && ++receipts === 2) throw Error("quota");
    write(k, v);
  };
  assert.throws(() => recoverLegacyProfile(f.options), /quota/);
  assert.equal(f.applied, undefined);
  const owned = readProfileSnapshot(f.storage, "a");
  assert.equal(owned.userNotes.length, 1);
  f.storage.setItem = write;
  recoverLegacyProfile({ ...f.options, current: { ...current(), ...owned }, snapshot: owned });
  assert.equal(f.applied.userNotes.length, 1);
});
test("source-key replacement after a partial claim is refused without falling back", () => {
  const f = fixture({ userNotes: [note()], xp: 10 }, "lt.app.v1");
  recoverLegacyProfile(f.options);
  f.entries.set("lt.app.v2", JSON.stringify({ xp: 99 }));
  assert.throws(() => recoverLegacyProfile({ ...f.options, kind: "activity" }), /source changed/);
});
test("actual recovery reducer has zero storage I/O, preserves input and repeats deterministically", () => {
  const prev = Object.getOwnPropertyDescriptor(globalThis, "window");
  let io = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem() {
          io++;
          throw Error("IO");
        },
        setItem() {
          io++;
          throw Error("IO");
        },
      },
    },
  });
  try {
    const c = current(),
      before = structuredClone(c),
      payload = mergeLegacyProfileCategory(
        c,
        { vocabByLanguage: { French: [word("maison")] } },
        "vocabulary",
      );
    const a = reducer(c, { type: "RECOVER_PROFILE_CATEGORY", payload }),
      b = reducer(c, { type: "RECOVER_PROFILE_CATEGORY", payload });
    assert.deepEqual(a, b);
    assert.deepEqual(c, before);
    assert.equal(io, 0);
    assert.equal(a.userVocab[0].word, "maison");
    assert.equal(a.vocabLang, "French");
    assert.equal(a.xp, 4);
  } finally {
    if (prev) Object.defineProperty(globalThis, "window", prev);
    else delete globalThis.window;
  }
});
