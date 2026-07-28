import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadModule } from "./helpers/bundle.mjs";

const { reducer } = await loadModule("src/state/app-state.tsx", {
  stubs: [/^sonner$/, /supabase\/client$/],
});

const w = (word, correctCount = 0) => ({
  word,
  translation: `${word} definition`,
  category: "topic",
  correctCount,
});

// Only the fields MERGE_REMOTE reads. The reducer spreads the rest through.
const localState = (overrides = {}) => ({
  selectedLanguage: "Italian",
  xp: 120,
  streak: 3,
  achievements: ["first-word"],
  userNotes: [],
  cultureRead: [],
  languagesUsed: ["Italian"],
  cefrLevelsCompleted: ["A1"],
  wordsLookedUp: 4,
  notesSaved: 1,
  tutorMessages: 2,
  conversationExchanges: 0,
  lessonsCompleted: 1,
  challengesCleared: 0,
  lessonProgress: {},
  vocabByLanguage: { Italian: [w("prenotazione", 3), w("biglietto", 1)] },
  vocabLang: "Italian",
  userVocab: [w("prenotazione", 3), w("biglietto", 1)],
  ...overrides,
});

const mergeRemote = (state, payload) =>
  reducer(state, { type: "MERGE_REMOTE", payload });

const words = (items) => (items ?? []).map((i) => i.word).sort();

describe("MERGE_REMOTE reconciles vocabulary instead of overwriting it", () => {
  // Regression for the silent-data-loss defect: the handler documented
  // "Collections (achievements, notes, vocab) → union" but only spread the
  // remote profile, so remote `vocabByLanguage` replaced the local map
  // wholesale. Against the pre-fix reducer this case failed with
  // `[ 'treno' ]` — both local words destroyed by a single sync.
  test("R1: local-only words survive a remote profile that lacks them", () => {
    const next = mergeRemote(localState(), {
      __v: 2,
      xp: 200,
      vocabByLanguage: { Italian: [w("treno", 0)] },
      vocabLang: "Italian",
      userVocab: [w("treno", 0)],
    });

    assert.deepEqual(
      words(next.vocabByLanguage.Italian),
      ["biglietto", "prenotazione", "treno"],
      "local words must survive the merge, and the remote word must be added",
    );
  });

  test("R1: userVocab stays a derived view of the merged map", () => {
    const next = mergeRemote(localState(), {
      __v: 2,
      vocabByLanguage: { Italian: [w("treno", 0)] },
      userVocab: [w("treno", 0)],
      vocabLang: "Italian",
    });

    assert.deepEqual(
      words(next.userVocab),
      words(next.vocabByLanguage.Italian),
      "derived view must equal the durable map for the selected language",
    );
    assert.equal(next.vocabLang, "Italian");
  });

  test("R1: a remote-only language is added without touching local languages", () => {
    const next = mergeRemote(localState(), {
      __v: 2,
      vocabByLanguage: { Spanish: [w("hidalgo", 2)] },
    });

    assert.deepEqual(words(next.vocabByLanguage.Italian), ["biglietto", "prenotazione"]);
    assert.deepEqual(words(next.vocabByLanguage.Spanish), ["hidalgo"]);
  });

  test("R1: collisions keep the higher progress (remote reconciliation clamp)", () => {
    const next = mergeRemote(localState(), {
      __v: 2,
      vocabByLanguage: { Italian: [w("prenotazione", 5)] },
    });

    const item = next.vocabByLanguage.Italian.find((i) => i.word === "prenotazione");
    assert.equal(item.correctCount, 5, "Math.max — never lose a learner's progress");

    const lower = mergeRemote(localState(), {
      __v: 2,
      vocabByLanguage: { Italian: [w("prenotazione", 0)] },
    });
    assert.equal(
      lower.vocabByLanguage.Italian.find((i) => i.word === "prenotazione").correctCount,
      3,
      "a lower remote count must not erase local progress",
    );
  });

  test("R1: derived view follows the remote's selected language (remote wins)", () => {
    const next = mergeRemote(localState(), {
      __v: 2,
      selectedLanguage: "Spanish",
      vocabByLanguage: { Spanish: [w("hidalgo", 2)] },
    });

    assert.equal(next.selectedLanguage, "Spanish");
    assert.deepEqual(words(next.userVocab), ["hidalgo"]);
    assert.deepEqual(
      words(next.vocabByLanguage.Italian),
      ["biglietto", "prenotazione"],
      "switching language must not drop the other language's words",
    );
  });

  test("R1: a pre-migration remote profile's legacy userVocab is recovered", () => {
    const next = mergeRemote(localState(), {
      __v: 2,
      // Old schema: no vocabByLanguage, words stranded on the legacy list.
      userVocab: [w("sciopero", 4)],
      vocabLang: "Italian",
    });

    assert.deepEqual(words(next.vocabByLanguage.Italian), [
      "biglietto",
      "prenotazione",
      "sciopero",
    ]);
  });

  test("R1: an empty remote profile cannot wipe local vocabulary", () => {
    const next = mergeRemote(localState(), { __v: 2, xp: 999 });

    assert.deepEqual(words(next.vocabByLanguage.Italian), ["biglietto", "prenotazione"]);
    assert.equal(next.xp, 999, "numeric progress still takes the max");
  });
});
