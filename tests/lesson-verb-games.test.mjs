import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lessonVerbQuestions } from "../src/lib/lesson-verb-games.ts";
test("both verb games use only authored verbs and forms across all 60 Spanish lessons", () => {
  for (const stage of ["foundation-spanish-basics", "spanish-basics", "master-spanish-basics"]) {
    const file = JSON.parse(readFileSync(`public/lesson-content/es/${stage}.json`, "utf8"));
    for (const lesson of Object.values(file.lessons))
      for (const mode of ["infinitives", "conjugations"]) {
        const questions = lessonVerbQuestions(lesson.verbs, "Spanish", mode);
        assert.ok(questions.length > 0);
        const allowed = new Set(
          lesson.verbs.flatMap((v) =>
            mode === "infinitives" ? [v.infinitive] : Object.values(v.forms),
          ),
        );
        for (const q of questions) {
          assert.ok(q.choices.includes(q.answer));
          assert.equal(new Set(q.choices).size, q.choices.length);
          assert.ok(q.choices.length >= 2);
          for (const choice of q.choices) assert.ok(allowed.has(choice));
        }
      }
  }
});
test("ambiguous forms do not produce a second valid infinitive choice", () => {
  const verbs = [
    {
      infinitive: "ser",
      native: "to be",
      forms: { yo: "fui", tú: "eres" },
      example: { target: "", native: "" },
    },
    {
      infinitive: "ir",
      native: "to go",
      forms: { yo: "fui", tú: "vas" },
      example: { target: "", native: "" },
    },
    {
      infinitive: "hablar",
      native: "to speak",
      forms: { yo: "hablo", tú: "hablas" },
      example: { target: "", native: "" },
    },
  ];
  for (const q of lessonVerbQuestions(verbs, "Spanish", "infinitives").filter((q) =>
    q.prompt.includes("fui"),
  ))
    assert.ok(!(q.choices.includes("ser") && q.choices.includes("ir")));
  assert.deepEqual(lessonVerbQuestions(verbs, "Unsupported", "conjugations"), []);
});
