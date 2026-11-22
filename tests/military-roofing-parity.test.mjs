import assert from "node:assert/strict";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getLessonDefinition, modulePracticeVersion } from "../src/lib/lesson-definition.ts";
import { summarizeLessonSourceCoverage } from "../src/lib/lesson-source-coverage.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { MILITARY_READER_SEEDS } from "../src/data/military-readers.ts";
import { publicLessonOfflinePack } from "../src/lib/lesson-offline-pack.ts";
import { offlineLessonPackId } from "../src/lib/offline-lesson-tracks.ts";
import { militaryLessonPractice } from "../src/data/military-practice.ts";

const stages = [
  ["foundation-military", 10],
  ["military", 30],
  ["master-military", 20],
];
const definition = (id, n) =>
  getLessonDefinition({
    moduleId: id,
    lessonNumber: n,
    targetLanguage: "English",
    instructionLanguage: "Spanish",
    contentVersion: modulePracticeVersion(id, "English", "Spanish"),
  });

test("all sixty military lessons have Roofing's six practice modes, readings, and progressive teaching", () => {
  const ids = new Set();
  for (const [id, count] of stages) {
    const definitions = Array.from({ length: count }, (_, i) => definition(id, i + 1));
    const coverage = summarizeLessonSourceCoverage(definitions, count);
    assert.equal(coverage.structurallyComplete, true, JSON.stringify(coverage));
    for (const d of definitions) {
      assert.equal(d.modes.length, 6);
      assert.ok(d.reading.sentences.every((s) => s.target && s.native));
      assert.equal(d.readiness, "draft");
      assert.match(d.contentVersion, /military-en-es/);
      assert.ok(d.listeningItems.length);
      assert.equal(d.words[0].es, getCurriculum(id).lessons[d.lessonNumber - 1].words[0].es);
      assert.ok(!ids.has(d.id));
      ids.add(d.id);
    }
  }
  assert.equal(ids.size, 60);
  assert.equal(definition("foundation-military", 10).teaching.stage, "supported");
  assert.equal(definition("military", 15).teaching.stage, "connected");
  assert.equal(definition("military", 30).teaching.stage, "independent");
  assert.equal(definition("master-military", 1).teaching.speaking.wordBank, "on-request");
  const wrong = getLessonDefinition({
    moduleId: "military",
    lessonNumber: 1,
    targetLanguage: "English",
    instructionLanguage: "French",
    contentVersion: "test",
  });
  assert.deepEqual(wrong.words, []);
  assert.equal(wrong.reading, null);
  assert.equal(wrong.teaching, null);
});

test("military speaking cards use English headwords and sixty distinct contextual openings", () => {
  const missions = getSpeakingMissions("English");
  const openings = new Set();
  for (const [id, count] of stages)
    for (let n = 1; n <= count; n++) {
      const m = missions.find((m) => m.id === `scenario_version_${id}_lesson_${n}_en_v1`);
      assert.ok(m);
      assert.equal(m.sourceObjectiveId, `${id}.lesson.${n}`);
      const words = getCurriculum(id).lessons[n - 1].words;
      assert.equal(m.vocabulary[0], words[0].es);
      assert.equal(m.openingLine, militaryLessonPractice(id, n).openingLine);
      assert.ok(m.lessonTeaching);
      assert.ok(m.sourcePrompts.some((p) => p.includes("English: ")));
      assert.equal(
        m.level,
        id.startsWith("foundation") ? "A1" : id.startsWith("master") ? "B1" : "A2",
      );
      assert.equal(!!m.surpriseComplication, id.startsWith("master"));
      openings.add(m.openingLine);
    }
  assert.equal(openings.size, 60);
});

test("each military stage has matching full Reader passages and a separate exact-pair download", () => {
  assert.equal(MILITARY_READER_SEEDS.length, 60);
  for (const [id, count] of stages) {
    const readings = getLessons(id, "English");
    assert.equal(readings.length, count);
    const packId = offlineLessonPackId(id, "English", "Spanish");
    assert.ok(packId);
    assert.equal(offlineLessonPackId(id, "English", "French"), null);
    const pack = publicLessonOfflinePack(packId);
    assert.equal(pack.lessons.length, count);
    assert.equal(pack.targetLanguage, "English");
    assert.equal(pack.instructionLanguage, "Spanish");
    assert.equal(pack.audioFilesIncluded, false);
    assert.equal(pack.officialAssessmentsIncluded, false);
    for (let n = 1; n <= count; n++) {
      const seed = MILITARY_READER_SEEDS.find((s) => s.id === readings[n - 1]);
      assert.ok(seed);
      assert.deepEqual(
        seed.sentences.map((s) => ({ target: s.target, native: s.en })),
        definition(id, n).reading.sentences,
      );
    }
  }
  assert.throws(
    () => publicLessonOfflinePack("military-en-es", [definition("military", 1)]),
    /ordered/,
  );
});

test("military dictionary matches open the English course with Spanish support", async () => {
  const { readFileSync } = await import("node:fs");
  const { buildCurriculumVocabulary } = await import("../src/lib/curriculum-vocabulary.ts");
  const data = JSON.parse(
    readFileSync(new URL("../src/data/curriculum-word-index.json", import.meta.url), "utf8"),
  );
  const match = buildCurriculumVocabulary(data)(
    "responsibility",
    "English",
    "Spanish",
    "military",
  ).find((m) => m.moduleId === "military");
  assert.ok(match);
  assert.equal(match.meaning, "responsabilidad");
  const url = new URL(match.href, "https://app.languagethreshold.com");
  assert.equal(url.searchParams.get("target"), "English");
  assert.equal(url.searchParams.get("native"), "Spanish");
});

test("the Cards tab can build every military stage from authored lesson vocabulary", async () => {
  const { authoredModuleDeck } = await import("../src/lib/authored-module-deck.ts");
  for (const [id, count] of stages) {
    const deck = authoredModuleDeck(id, "English", "Spanish");
    assert.equal(deck.lessonCount, count);
    const pairs = new Set(deck.pairs.map((p) => JSON.stringify([p.english, p.translation])));
    for (const l of getCurriculum(id).lessons)
      for (const w of l.words) assert.ok(pairs.has(JSON.stringify([w.en, w.es])));
    assert.equal(authoredModuleDeck(id, "English", "French"), null);
  }
});
