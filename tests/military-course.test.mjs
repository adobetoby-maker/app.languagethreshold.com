import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { core60PathOf } from "../src/lib/core60-path.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import {
  parseLessonContent,
  validateLessonContent,
  contentLimitsFor,
} from "../src/lib/lesson-content-core.ts";
import { getSpeakingMissions, getSpeakingModules } from "../src/data/speaking-missions.ts";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const stages = [
  ["foundation-military", 10],
  ["military", 30],
  ["master-military", 20],
];

test("military is one complete English learning path for Spanish speakers", () => {
  for (const [id, count] of stages) {
    const module = getModule(id);
    assert.ok(module, id);
    assert.equal(moduleSupportsLearningPair(module, "English", "Spanish"), true);
    assert.equal(moduleSupportsLearningPair(module, "Spanish", "English"), false);
    assert.equal(moduleSupportsLearningPair(module, "English", "French"), false);
    assert.equal(getCurriculum(id)?.lessons.length, count);
  }
  assert.ok(core60PathOf("military"));
  assert.equal(
    getSpeakingModules("English", "Spanish").filter((m) => m.id === "military").length,
    1,
  );
  assert.equal(
    getSpeakingModules("English", "French").some((m) => m.id === "military"),
    false,
  );
});

test("all 60 military lessons load authored bilingual content and usable activities", () => {
  const missions = getSpeakingMissions("English");
  const index = read("public/lesson-content/index.json");
  for (const [id, count] of stages) {
    const raw = read(`public/lesson-content/en/${id}.json`);
    const content = parseLessonContent(raw, { moduleId: id, language: "English" });
    assert.ok(content, `${id} must load through the real parser`);
    assert.equal(content.nativeLanguage, "Spanish");
    assert.equal(content.reviewed, false);
    assert.equal(index.files.find((f) => f.module === id && f.language === "en")?.lessons, count);
    for (let n = 1; n <= count; n++) {
      const lesson = content.lessons[n];
      assert.ok(lesson, `${id}/${n}`);
      assert.deepEqual(
        validateLessonContent(lesson, {
          language: "English",
          nativeLanguage: "Spanish",
          parts: { passage: true, words: true, verbs: true },
          limits: contentLimitsFor(id),
        }),
        [],
        `${id}/${n}`,
      );
      assert.ok(
        lesson.words.filter((w) => w.kind === "term").every((w) => w.note?.startsWith("English: ")),
      );
      assert.ok(
        missions.some(
          (m) => m.moduleId === id && m.title.includes(getCurriculum(id).lessons[n - 1].title),
        ),
        `${id}/${n} speaking mission`,
      );
    }
    if (id !== "military") {
      assert.deepEqual(validateStageFile(read(`src/data/core60/en/${id}.json`)), []);
    }
  }
});

test("radio meanings distinguish receipt, compliance, and turn taking", () => {
  const words = getCurriculum("military").lessons.find(
    (l) => l.title === "Radio procedure words",
  ).words;
  const note = (term) => words.find((w) => w.es === term)?.note;
  assert.match(note("roger"), /received/);
  assert.match(note("wilco"), /understood.*comply/);
  assert.match(note("over"), /expect a response/);
  assert.match(note("out"), /no response/);
});
