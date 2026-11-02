import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { core60PathOf } from "../src/lib/core60-path.ts";
import { getLessonDefinition, modulePracticeVersion } from "../src/lib/lesson-definition.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import {
  parseLessonContent,
  validateLessonContent,
  contentLimitsFor,
} from "../src/lib/lesson-content-core.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { SPANISH_BASICS_READERS } from "../src/data/spanish-basics-readers.ts";
import { spanishBasicsLesson } from "../src/data/spanish-basics.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { correctSpanishCloze } from "../src/lib/spanish-basics-check.ts";
const stages = [
  ["foundation-spanish-basics", 10],
  ["spanish-basics", 30],
  ["master-spanish-basics", 20],
];
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
test("Spanish 101 is a full general 10/30/20 path with an exact English scaffold", () => {
  for (const [id, count] of stages) {
    const module = getModule(id);
    assert.ok(module);
    assert.equal(moduleSupportsLearningPair(module, "Spanish", "English"), true);
    assert.equal(moduleSupportsLearningPair(module, "Spanish", "French"), false);
    assert.equal(moduleSupportsLearningPair(module, "English", "Spanish"), false);
    assert.equal(getCurriculum(id).lessons.length, count);
    assert.equal(core60PathOf(id).steps.length, 3);
    assert.doesNotMatch(module.aiPersona, /natural B1-B2/);
  }
});
test("sixty lessons validate through the real parsers with mapped six-mode practice and full Reader ownership", () => {
  const missions = getSpeakingMissions("Spanish");
  const index = read("public/lesson-content/index.json");
  for (const [id, count] of stages) {
    const file = parseLessonContent(read(`public/lesson-content/es/${id}.json`), {
      moduleId: id,
      language: "Spanish",
    });
    assert.ok(file);
    assert.equal(file.reviewed, false);
    assert.equal(index.files.find((x) => x.module === id && x.language === "es").lessons, count);
    if (id !== "spanish-basics")
      assert.deepEqual(validateStageFile(read(`src/data/core60/es/${id}.json`)), []);
    for (let n = 1; n <= count; n++) {
      const content = file.lessons[n];
      assert.deepEqual(
        validateLessonContent(content, {
          language: "Spanish",
          nativeLanguage: "English",
          parts: { passage: true, words: true, verbs: true },
          limits: contentLimitsFor(id),
        }),
        [],
        `${id}/${n}`,
      );
      const d = getLessonDefinition({
        moduleId: id,
        lessonNumber: n,
        targetLanguage: "Spanish",
        instructionLanguage: "English",
        contentVersion: modulePracticeVersion(id, "Spanish", "English"),
      });
      assert.ok(d.teaching);
      assert.equal(d.modes.length, 6);
      assert.deepEqual(
        d.reading.sentences.map((x) => x.target),
        content.passage.target,
      );
      assert.ok(getLessons(id, "Spanish").includes(`seed-es-${id}-lesson-${n}`));
      assert.ok(SPANISH_BASICS_READERS.some((x) => x.id === `seed-es-${id}-lesson-${n}`));
      assert.equal(spanishBasicsLesson(id, n).checks.length, 3);
      assert.ok(
        spanishBasicsLesson(id, n).checks.every(
          (q) => q.prompt.includes("____") && q.answer && q.hint,
        ),
      );
      const m = missions.find((x) => x.id === `scenario_version_${id}_lesson_${n}_es_v1`);
      assert.ok(m, `${id}/${n} mission`);
      assert.equal(m.openingLine, content.passage.target[0]);
      assert.ok(m.level === "A1" || m.level === "A2");
    }
  }
  assert.equal(SPANISH_BASICS_READERS.length, 60);
  assert.equal(spanishBasicsLesson("spanish-basics", 1, "Spanish", "French"), null);
});
test("grammar cloze accepts case and punctuation but distinguishes written accent contrasts", () => {
  assert.equal(correctSpanishCloze(" ESTÁ. ", "está"), true);
  assert.equal(correctSpanishCloze("esta", "está"), false);
  assert.equal(correctSpanishCloze("el", "él"), false);
  assert.equal(correctSpanishCloze("somos", "son"), false);
  assert.equal(correctSpanishCloze(" ", "soy"), false);
});
