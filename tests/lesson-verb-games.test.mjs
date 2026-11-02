import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  gameRoundItems,
  lessonGameBank,
  distinctGameItems,
  gameAnswer,
  maskedAnswer,
} from "../src/lib/lesson-verb-games.ts";
import { spanishBasicsLesson } from "../src/data/spanish-basics.ts";
const courses = [
  "spanish-basics",
  "spanish-102",
  "spanish-frequent-verbs",
  "spanish-conjugation-patterns",
  "spanish-usage-verbs",
  "spanish-common-patterns",
];
for (const base of courses)
  test(`${base}: all stages produce lesson-local game answers`, () => {
    for (const pre of ["foundation-", "", "master-"]) {
      const id = pre + base;
      const content = JSON.parse(
        readFileSync(new URL("../public/lesson-content/es/" + id + ".json", import.meta.url)),
      );
      for (const [n, lesson] of Object.entries(content.lessons)) {
        const pattern = spanishBasicsLesson(id, Number(n), "Spanish", "English")?.pattern;
        const bank = lessonGameBank(lesson.verbs, "Spanish", pattern);
        assert.ok(bank.forms.length > 0, id + n);
        const source = pattern?.verbs ?? lesson.verbs;
        assert.deepEqual(
          bank.meanings.map((v) => v.answer),
          source.map((v) => v.infinitive),
        );
        for (const item of bank.forms) {
          const [verb, key] = item.id.split(":");
          assert.equal(item.answer, source.find((v) => v.infinitive === verb).forms[key]);
        }
        const round = gameRoundItems(bank.forms);
        assert.equal(new Set(round.map((v) => v.id.split(":")[0])).size, round.length);
        if (pattern) {
          assert.equal(round.length, 10, id + n);
          assert.equal(bank.meanings.length, 10);
          assert.equal(bank.label, pattern.title);
        }
        const distinct = distinctGameItems(bank.forms);
        assert.equal(new Set(distinct.map((v) => v.answer.toLowerCase())).size, distinct.length);
      }
    }
  });
test("pattern games override present reference forms and preserve accents", () => {
  const pattern = spanishBasicsLesson(
    "spanish-conjugation-patterns",
    1,
    "Spanish",
    "English",
  ).pattern;
  const bank = lessonGameBank([], "Spanish", pattern);
  assert.equal(bank.forms.find((v) => v.id === "hablar:yo").answer, "hablé");
  assert.equal(gameAnswer("hablé", "HABLÉ "), true);
  assert.equal(gameAnswer("hablé", "hable"), false);
  assert.equal(maskedAnswer("él ha ido", ["é", "l", "h", "a", "i", "d", "o"]), "é l   h a   i d o");
  assert.ok(maskedAnswer("hablé", ["h", "a", "b", "l", "e"]).includes("＿"));
});
