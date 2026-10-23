import assert from "node:assert/strict";
import test from "node:test";
import { prepareListeningChoices } from "../src/lib/listening-choices.ts";
import { loadModule } from "./helpers/bundle.mjs";

const { reducer } = await loadModule("src/state/listening-drill-state.tsx", {
  stubs: [/use-learner-device-store/],
});
const question = Object.freeze({
  phrase: "El techo necesita una reparación.",
  englishTranslation: "The roof needs a repair.", cefr: "A2", topic: "Roofing",
  options: Object.freeze(["El techo necesita una reparación.", "El techo necesita una revisión.", "El techo necesitaba una reparación.", "El techo necesita una protección."]),
  correctIndex: 0, listenFor: "Listen for the final noun.",
});
const source = structuredClone(question);

test("all-A generated/cached questions use every answer letter and keep scoring aligned", () => {
  for (const language of ["Spanish", "English", "French", "German", "Italian", "Portuguese", "Japanese", "Chinese", "Korean", "Pashto"]) {
    for (const level of [1, 2, 3]) {
      for (const random of [() => 0, () => 0.4, () => 0.999999]) {
        let state = { leaderboard: {}, run: null, loading: false, error: null };
        state = reducer(state, { type: "START_RUN", payload: { language, level } });
        const positions = [];
        for (let i = 0; i < 5; i++) {
          const q = prepareListeningChoices(question, positions, random);
          positions.push(q.correctIndex);
          assert.equal(q.options[q.correctIndex], q.phrase);
          assert.deepEqual([...q.options].sort(), [...question.options].sort());
          assert.equal(q.phrase, question.phrase);
          state = reducer(state, { type: "QUESTION_LOADED", payload: q });
          const wrong = reducer(state, { type: "ANSWER", payload: { selectedIndex: (q.correctIndex + 1) % 4 } });
          assert.equal(wrong.run.questions[i].correct, false);
          state = reducer(state, { type: "ANSWER", payload: { selectedIndex: q.correctIndex } });
          assert.equal(state.run.questions[i].correct, true);
          assert.equal(state.leaderboard[`${language}-${level}`].totalCorrect, i + 1);
          if (i < 4) state = reducer(state, { type: "ADVANCE" });
        }
        assert.equal(new Set(positions.slice(0, 4)).size, 4);
        assert.ok([0, 1, 2, 3].every((p) => positions.filter((x) => x === p).length <= 2));
      }
    }
  }
  assert.deepEqual(question, source, "cached source remains unchanged");
});

test("correct transcript is remapped from every original position, even a mislabeled index", () => {
  const seen = new Set();
  for (let original = 0; original < 4; original++) {
    const options = [...question.options];
    [options[0], options[original]] = [options[original], options[0]];
    for (const value of [0, 0.26, 0.51, 0.99]) {
      const q = prepareListeningChoices({ ...question, options }, [], () => value);
      seen.add(q.correctIndex);
      assert.equal(q.options[q.correctIndex], question.phrase);
    }
  }
  assert.deepEqual([...seen], [0, 1, 2, 3]);
  assert.throws(() => prepareListeningChoices({ ...question, phrase: "missing" }, []));
  assert.throws(() => prepareListeningChoices({ ...question, options: Array(4).fill(question.phrase) }, []));
});
