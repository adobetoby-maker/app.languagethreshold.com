import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEGACY_PRACTICE,
  inspectLegacyPractice,
  recoverLegacyPractice,
} from "../src/lib/legacy-practice-recovery.ts";
import { createLearnerDeviceStore, learnerDeviceKey } from "../src/lib/learner-device-store.ts";
function setup(kind, data) {
  const entries = new Map([[LEGACY_PRACTICE[kind].key, JSON.stringify(data)]]);
  const storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  const owned = createLearnerDeviceStore({ kind, actor: "a", storage, isCurrent: () => true });
  return {
    entries,
    storage,
    owned,
    options: { kind, actor: "a", storage, confirmed: true, isCurrent: () => true },
  };
}
const note = {
  id: "n1",
  textId: "book",
  pane: "right",
  sentenceIndex: 0,
  selectedText: "QA",
  noteText: "old",
  createdAt: 1,
};
const card = {
  id: "c1",
  language: "Spanish",
  word: "QA",
  translation: "QA",
  example: "",
  exampleTranslation: "",
  category: "vocab",
  source: "user",
  addedAt: 1,
  srs: { easeFactor: 2.5, interval: 4, repetitions: 2, dueDate: 1000, lastReviewedAt: 10 },
};
const message = { id: "m1", role: "user", content: "QA old", createdAt: 1 };
const turn = { id: "t1", role: "user", text: "QA old", createdAt: 1 };

test("grammar recovery preserves current decisions and missing lessons without duplicate badges", () => {
  const stub = { id: "qa1", title: "QA grammar", concept: "QA concept" };
  const content = {
    explanation: "QA",
    keyRule: "QA rule",
    examples: [{ target: "QA", english: "QA" }],
  };
  const old = {
    store: {
      Spanish: {
        A1: {
          lessons: [stub, { ...stub, id: "qa2" }],
          contents: { qa1: content },
          completed: { qa1: true, qa2: true },
        },
      },
    },
    badges: ["QA badge"],
  };
  const f = setup("grammar", old);
  f.owned.write({
    store: {
      Spanish: {
        A1: {
          lessons: [{ ...stub, title: "Current title" }],
          contents: { qa1: { ...content, keyRule: "Current rule" } },
          completed: { qa1: false },
        },
      },
      French: { A2: { lessons: [stub], contents: {}, completed: {} } },
    },
    badges: ["QA badge", "Current badge"],
  });
  const original = f.storage.getItem(LEGACY_PRACTICE.grammar.key);
  recoverLegacyPractice(f.options);
  recoverLegacyPractice(f.options);
  const saved = f.owned.read();
  assert.equal(saved.store.Spanish.A1.lessons.length, 2);
  assert.equal(saved.store.Spanish.A1.lessons[0].title, "Current title");
  assert.equal(saved.store.Spanish.A1.contents.qa1.keyRule, "Current rule");
  assert.equal(saved.store.Spanish.A1.completed.qa1, false);
  assert.equal(saved.store.Spanish.A1.completed.qa2, true);
  assert.equal(saved.store.French.A2.lessons.length, 1);
  assert.deepEqual(saved.badges, ["QA badge", "Current badge"]);
  assert.equal(f.storage.getItem(LEGACY_PRACTICE.grammar.key), original);
});
test("listening recovery keeps current voice choices and never doubles listen counts", () => {
  const f = setup("speech", {
    rate: 0.8,
    listenedCount: 20,
    voiceByLang: { Spanish: "old", French: "fr" },
    accentByLang: { Spanish: "es-MX" },
  });
  f.owned.write({
    rate: 1,
    listenedCount: 4,
    voiceByLang: { Spanish: "current" },
    accentByLang: { Spanish: "es-CR" },
  });
  recoverLegacyPractice(f.options);
  recoverLegacyPractice(f.options);
  assert.deepEqual(f.owned.read(), {
    rate: 1,
    listenedCount: 20,
    voiceByLang: { Spanish: "current", French: "fr" },
    accentByLang: { Spanish: "es-CR" },
  });
  assert.equal(
    inspectLegacyPractice(f.storage, "b").find((i) => i.kind === "speech").status,
    "other-account",
  );
});
test("recent-word recovery keeps current recency first and caps the history without duplicates", () => {
  const f = setup(
    "heardWords",
    Array.from({ length: 25 }, (_, i) => `old${i}`),
  );
  f.owned.write(["current", "old1"]);
  recoverLegacyPractice(f.options);
  recoverLegacyPractice(f.options);
  assert.equal(f.owned.read().length, 20);
  assert.deepEqual(f.owned.read().slice(0, 4), ["current", "old1", "old0", "old2"]);
  assert.equal(new Set(f.owned.read()).size, 20);
});
test("invalid grammar, listening and word history stay untouched rather than importing broken records", () => {
  for (const [kind, data] of [
    [
      "grammar",
      {
        store: {
          Spanish: { A1: { lessons: [], contents: { qa: { explanation: {} } }, completed: {} } },
        },
        badges: [],
      },
    ],
    ["speech", { listenedCount: -1 }],
    ["heardWords", ["valid", { foreign: true }]],
  ]) {
    const f = setup(kind, data),
      before = new Map(f.entries);
    assert.equal(
      inspectLegacyPractice(f.storage, "a").find((i) => i.kind === kind).status,
      "unreadable",
    );
    assert.throws(() => recoverLegacyPractice(f.options));
    assert.deepEqual(f.entries, before);
  }
});

test("recovery requires explicit confirmation and the current signed-in identity", () => {
  const f = setup("notes", [note]),
    before = new Map(f.entries);
  for (const extra of [{ confirmed: false }, { isCurrent: () => false }, { actor: "" }])
    assert.throws(() => recoverLegacyPractice({ ...f.options, ...extra }), /Sign in/);
  assert.deepEqual(f.entries, before);
});
test("notes preserve current edits and original bytes, merge idempotently and reserve ownership", () => {
  const f = setup("notes", [note, { ...note, id: "n2" }]);
  f.owned.write([{ ...note, noteText: "current" }]);
  const original = f.storage.getItem(LEGACY_PRACTICE.notes.key);
  recoverLegacyPractice(f.options);
  recoverLegacyPractice(f.options);
  assert.equal(f.owned.read().length, 2);
  assert.equal(f.owned.read()[0].noteText, "current");
  assert.equal(f.storage.getItem(LEGACY_PRACTICE.notes.key), original);
  assert.deepEqual(inspectLegacyPractice(f.storage, "b")[0], {
    kind: "notes",
    status: "other-account",
    count: 0,
  });
  assert.throws(() => recoverLegacyPractice({ ...f.options, actor: "b" }), /another account/);
});
test("cards retain the current review schedule while missing cards are restored", () => {
  const f = setup("flashcards", {
    cards: { c1: card, c2: { ...card, id: "c2" } },
    seededLanguages: ["Spanish"],
    seededDecks: [],
  });
  f.owned.write({
    cards: { c1: { ...card, srs: { ...card.srs, repetitions: 8, dueDate: 9000 } } },
    seededLanguages: ["French"],
    seededDecks: [],
  });
  recoverLegacyPractice(f.options);
  assert.equal(Object.keys(f.owned.read().cards).length, 2);
  assert.equal(f.owned.read().cards.c1.srs.repetitions, 8);
  assert.equal(f.owned.read().cards.c1.srs.dueDate, 9000);
  assert.deepEqual(f.owned.read().seededLanguages, ["Spanish", "French"]);
});
test("old and modern Tutor shapes recover without duplicate messages or replacing current content", () => {
  for (const old of [
    { Spanish: [message] },
    { threads: { Spanish: [message] }, sourceContexts: {} },
  ]) {
    const f = setup("tutor", old);
    f.owned.write({
      threads: {
        Spanish: [
          { ...message, content: "current" },
          { ...message, id: "m2", createdAt: 2 },
        ],
      },
      sourceContexts: {},
    });
    recoverLegacyPractice(f.options);
    recoverLegacyPractice(f.options);
    assert.equal(f.owned.read().threads.Spanish.length, 2);
    assert.equal(f.owned.read().threads.Spanish[0].content, "current");
  }
});
test("old speaking arrays migrate and repeat recovery does not inflate practice counters", () => {
  for (const old of [
    { Spanish: [turn] },
    { Spanish: { turns: [turn], exchanges: 3, totalSeconds: 20 } },
  ]) {
    const f = setup("speak", old);
    f.owned.write({
      Spanish: { turns: [{ ...turn, text: "current" }], exchanges: 5, totalSeconds: 30 },
    });
    recoverLegacyPractice(f.options);
    recoverLegacyPractice(f.options);
    assert.deepEqual(f.owned.read().Spanish, {
      turns: [{ ...turn, text: "current" }],
      exchanges: 5,
      totalSeconds: 30,
    });
  }
});
test("malformed legacy data and unreadable owned data are never overwritten", () => {
  const malformed = setup("notes", [{ id: "incomplete" }]);
  const before = new Map(malformed.entries);
  assert.equal(inspectLegacyPractice(malformed.storage, "a")[0].status, "unreadable");
  assert.throws(() => recoverLegacyPractice(malformed.options));
  assert.deepEqual(malformed.entries, before);
  const f = setup("notes", [note]);
  f.storage.setItem(learnerDeviceKey("notes", "a"), "corrupt current");
  const currentBefore = new Map(f.entries);
  assert.throws(() => recoverLegacyPractice(f.options), /Current saves/);
  assert.deepEqual(f.entries, currentBefore);
});
test("quota failure preserves originals and reserves only the same learner's retry", () => {
  const f = setup("notes", [note]);
  const storage = {
    ...f.storage,
    setItem(k, v) {
      if (k === learnerDeviceKey("notes", "a")) throw Error("quota");
      f.storage.setItem(k, v);
    },
  };
  assert.throws(() => recoverLegacyPractice({ ...f.options, storage }), /could not be saved/);
  assert.equal(f.storage.getItem(LEGACY_PRACTICE.notes.key), JSON.stringify([note]));
  assert.throws(() => recoverLegacyPractice({ ...f.options, actor: "b" }), /another account/);
  recoverLegacyPractice(f.options);
  assert.deepEqual(f.owned.read(), [note]);
});
test("blocked reservation and unknown receipt versions cannot authorize import", () => {
  const f = setup("notes", [note]),
    before = new Map(f.entries);
  assert.throws(
    () =>
      recoverLegacyPractice({
        ...f.options,
        storage: {
          ...f.storage,
          setItem() {
            throw Error("blocked");
          },
        },
      }),
    /blocked/,
  );
  assert.deepEqual(f.entries, before);
  f.storage.setItem("lt.legacy-practice-claim.v1.notes", JSON.stringify({ schema: 2, actor: "a" }));
  assert.throws(() => recoverLegacyPractice(f.options), /ownership/);
});
