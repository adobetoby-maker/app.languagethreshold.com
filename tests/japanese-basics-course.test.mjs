import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { core60PathOf } from "../src/lib/core60-path.ts";
import { getLessonDefinition, modulePracticeVersion } from "../src/lib/lesson-definition.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import { parseLessonContent, validateLessonContent, contentLimitsFor } from "../src/lib/lesson-content-core.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { JAPANESE_BASICS_READERS } from "../src/data/japanese-basics-readers.ts";
import { japaneseBasicsLesson } from "../src/data/japanese-basics.ts";
import { authoredModuleDeck } from "../src/lib/authored-module-deck.ts";

const stages = [
  ["foundation-japanese-basics", 10],
  ["japanese-basics", 30],
  ["master-japanese-basics", 20],
];
const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

test("Japanese 101 has an exact-pair 10/30/20 path without borrowing Spanish content", () => {
  for (const [id, count] of stages) {
    const module = getModule(id);
    assert.ok(module);
    assert.equal(moduleSupportsLearningPair(module, "Japanese", "English"), true);
    assert.equal(moduleSupportsLearningPair(module, "Japanese", "Spanish"), false);
    assert.equal(moduleSupportsLearningPair(module, "Spanish", "English"), false);
    assert.equal(getCurriculum(id).lessons.length, count);
    assert.equal(core60PathOf(id).steps.length, 3);
    assert.ok(authoredModuleDeck(id, "Japanese", "English"));
    assert.equal(authoredModuleDeck(id, "Spanish", "English"), null);
  }
  assert.equal(japaneseBasicsLesson("japanese-basics", 1, "Japanese", "Spanish"), null);
});

test("sixty Japanese readings, decks, six-mode definitions, and speaking missions map to their own lessons", () => {
  const missions = getSpeakingMissions("Japanese");
  const index = read("public/lesson-content/index.json");
  for (const [id, count] of stages) {
    const file = parseLessonContent(read(`public/lesson-content/ja/${id}.json`), { moduleId: id, language: "Japanese" });
    assert.ok(file);
    assert.equal(file.reviewed, false);
    assert.equal(index.files.find((entry) => entry.module === id && entry.language === "ja").lessons, count);
    if (id !== "japanese-basics")
      assert.deepEqual(validateStageFile(read(`src/data/core60/ja/${id}.json`)), []);
    for (let n = 1; n <= count; n++) {
      const content = file.lessons[n];
      assert.deepEqual(validateLessonContent(content, {
        language: "Japanese", nativeLanguage: "English",
        parts: { passage: true, words: true, verbs: true },
        limits: contentLimitsFor(id),
      }), [], `${id}/${n}`);
      const definition = getLessonDefinition({
        moduleId: id, lessonNumber: n, targetLanguage: "Japanese", instructionLanguage: "English",
        contentVersion: modulePracticeVersion(id, "Japanese", "English"),
      });
      assert.ok(definition.teaching, `${id}/${n} teaching`);
      assert.equal(definition.modes.length, 6);
      assert.deepEqual(definition.reading.sentences.map((sentence) => sentence.target), content.passage.target);
      assert.ok(getLessons(id, "Japanese").includes(`seed-ja-${id}-lesson-${n}`));
      assert.ok(JAPANESE_BASICS_READERS.some((entry) => entry.id === `seed-ja-${id}-lesson-${n}`));
      const checks = japaneseBasicsLesson(id, n).checks;
      assert.equal(checks.length, 3);
      assert.ok(checks.every((check) => check.prompt.includes("____") && check.answer && check.hint));
      const mission = missions.find((entry) => entry.id === `scenario_version_${id}_lesson_${n}_ja_v1`);
      assert.ok(mission, `${id}/${n} mission`);
      assert.equal(mission.openingLine, content.passage.target[0]);
      assert.ok(mission.vocabulary.some((word) => /[ぁ-んァ-ン一-龯]/u.test(word)));
    }
  }
  assert.equal(JAPANESE_BASICS_READERS.length, 60);
});

test("Master vocabulary and checks do not split names or Japanese words into false terms", () => {
  const master = read("src/data/core60/ja/master-japanese-basics.json").lessons;
  const practice = read("src/data/japanese-basics-practice.json")["master-japanese-basics"];
  const terms = (n) => master[n - 1].words.filter((word) => word.kind === "term");
  assert.ok(!practice[1].checks.some((check) => check.answer === "かさ"));
  assert.ok(!terms(1).some((word) => word.es === "かさ"));
  assert.equal(terms(9).find((word) => word.es === "どちら")?.en, "which of two");
  assert.ok(!terms(9).some((word) => word.es === "います"));
  assert.ok(!terms(10).some((word) => word.es === "います"));
  assert.ok(!terms(3).some((word) => word.es === "に" && word.en === "two"));
  assert.ok(!terms(19).some((word) => word.es === "で"));
  assert.ok(!terms(13).some((word) => word.es === "いけません" && word.en === "must not"));
  assert.ok(!practice[13].checks.some((check) => check.answer === "いけません"));
});

test("Foundation cloze checks use standalone terms rather than name suffixes or age endings", () => {
  const foundation = read("src/data/japanese-basics-practice.json")["foundation-japanese-basics"];
  assert.ok(!foundation[8].checks.some((check) => check.prompt.includes("けん____") && check.answer === "さん"));
  assert.ok(!foundation[8].checks.some((check) => check.prompt.includes("なん____") && check.answer === "さい"));
  assert.ok(foundation[8].checks.some((check) => check.answer === "いち"));
});
