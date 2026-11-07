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

test("late Core exchanges grow and Master scenarios do not recycle earlier dialogue", () => {
  const foundation = read("content/japanese-basics/foundation.json").lessons;
  const core = read("content/japanese-basics/core.json").lessons;
  const master = read("content/japanese-basics/master.json").lessons;
  for (let n = 21; n <= 30; n++) {
    const dialogue = core[n - 1].dialogue;
    assert.ok(dialogue.length >= 7 && dialogue.length <= 9, `Core ${n} dialogue length`);
    assert.ok(dialogue.filter((line) => line.split("|")[0].includes("か。")).length >= 1,
      `Core ${n} has follow-up questions`);
  }
  const seen = new Set([...foundation, ...core].flatMap((lesson) =>
    lesson.dialogue.map((line) => line.split("|")[0])));
  for (let n = 1; n <= master.length; n++) {
    for (const line of master[n - 1].dialogue) {
      const target = line.split("|")[0];
      if ([6, 7, 10, 14, 19, 20].includes(n))
        assert.ok(!seen.has(target), `Master ${n} repeats earlier dialogue: ${target}`);
      seen.add(target);
    }
  }
});

test("Japanese checks exercise the newly taught forms", () => {
  const practice = read("src/data/japanese-basics-practice.json");
  const answers = (stage, n) => practice[stage][n].checks.map((check) => check.answer);
  assert.deepEqual(answers("japanese-basics", 27), [
    "いきませんでした", "りょこうでは ありませんでした", "むずかしくなかったです",
  ]);
  assert.ok(answers("japanese-basics", 5).includes("よくないです"));
  assert.ok(answers("japanese-basics", 26).includes("べんきょうしませんか"));
  assert.ok(answers("master-japanese-basics", 11).includes("はいっていません"));
  assert.ok(answers("master-japanese-basics", 14).includes("まっていました"));
  assert.ok(answers("master-japanese-basics", 20).includes("いってください"));
  for (const [stage, n] of [
    ["japanese-basics", 26], ["japanese-basics", 27],
    ["master-japanese-basics", 11], ["master-japanese-basics", 14],
    ["master-japanese-basics", 20],
  ]) {
    const checks = practice[stage][n].checks;
    assert.equal(new Set(checks.map((check) => check.hint)).size, 3,
      `${stage}/${n} checks come from distinct dialogue lines`);
  }
});
