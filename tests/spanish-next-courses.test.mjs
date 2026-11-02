import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { spanishBasicsLesson, spanishPatternWords } from "../src/data/spanish-basics.ts";
import { getLessonDefinition, modulePracticeVersion } from "../src/lib/lesson-definition.ts";
import {
  parseLessonContent,
  validateLessonContent,
  contentLimitsFor,
} from "../src/lib/lesson-content-core.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { SPANISH_NEXT_READERS } from "../src/data/spanish-basics-readers.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { authoredModuleDeck } from "../src/lib/authored-module-deck.ts";
import { correctSpanishCloze } from "../src/lib/spanish-basics-check.ts";
import {
  normalizedRecordingText,
  recordingGender,
  spanishRecordingPath,
} from "../src/lib/recorded-spanish.ts";
const read = (p) => JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const courses = [
  "spanish-102",
  "spanish-frequent-verbs",
  "spanish-conjugation-patterns",
  "spanish-usage-verbs",
  "spanish-common-patterns",
];
const missions = getSpeakingMissions("Spanish");
for (const base of courses)
  test(`${base}: all 60 lessons validate and own their exact Reader, six modes, deck and speaking mission`, () => {
    for (const [stage, count] of [
      ["foundation", 10],
      ["core", 30],
      ["master", 20],
    ]) {
      const id = stage === "core" ? base : stage + "-" + base;
      const module = getModule(id);
      assert.ok(module);
      assert.equal(moduleSupportsLearningPair(module, "Spanish", "English"), true);
      for (const [target, native] of [
        ["Spanish", "French"],
        ["English", "Spanish"],
        ["French", "English"],
      ]) {
        assert.equal(moduleSupportsLearningPair(module, target, native), false);
        assert.equal(spanishBasicsLesson(id, 1, target, native), null);
      }
      const curriculum = getCurriculum(id);
      assert.equal(curriculum.lessons.length, count);
      if (stage !== "core")
        assert.deepEqual(validateStageFile(read(`src/data/core60/es/${id}.json`)), []);
      const content = parseLessonContent(read(`public/lesson-content/es/${id}.json`), {
        moduleId: id,
        language: "Spanish",
      });
      assert.ok(content);
      assert.equal(content.reviewed, false);
      assert.equal(getLessons(id, "Spanish").length, count);
      assert.equal(getLessons(id, "French").length, 0);
      for (const lesson of curriculum.lessons) {
        const n = lesson.n,
          p = spanishBasicsLesson(id, n),
          c = content.lessons[n];
        assert.ok(p);
        assert.deepEqual(
          validateLessonContent(c, {
            language: "Spanish",
            nativeLanguage: "English",
            parts: { passage: true, words: true, verbs: true },
            limits: contentLimitsFor(id),
          }),
          [],
          `${id}/${n}`,
        );
        const definition = getLessonDefinition({
          moduleId: id,
          lessonNumber: n,
          targetLanguage: "Spanish",
          instructionLanguage: "English",
          contentVersion: modulePracticeVersion(id, "Spanish", "English"),
        });
        assert.ok(definition.teaching);
        assert.equal(definition.modes.length, 6);
        assert.equal(definition.readiness, "draft");
        assert.deepEqual(
          definition.reading.sentences.map((s) => s.target),
          c.passage.target,
        );
        const reader = SPANISH_NEXT_READERS.find((s) => s.id === `seed-es-${id}-lesson-${n}`);
        assert.ok(reader);
        assert.deepEqual(
          reader.sentences.map((s) => s.target),
          c.passage.target,
        );
        const mission = missions.find((m) => m.id === `scenario_version_${id}_lesson_${n}_es_v1`);
        assert.ok(mission);
        assert.equal(mission.openingLine, p.openingLine);
        assert.ok(mission.vocabulary.some((v) => c.words.some((w) => w.es === v)));
        assert.equal(p.checks.length, p.pattern ? 10 : 3);
        assert.equal(new Set(p.checks.map((c) => c.prompt)).size, p.checks.length);
        for (const check of p.checks) {
          assert.ok(correctSpanishCloze(check.answer, check.answer));
          assert.equal(correctSpanishCloze("respuesta incorrecta", check.answer), false);
        }
        if (p.pattern) {
          assert.equal(p.pattern.verbs.length, 10);
          assert.equal(new Set(p.pattern.verbs.map((v) => v.infinitive)).size, 10);
          assert.equal(c.verbs.length, 10);
          const practice = spanishPatternWords(id, n, "Spanish", "English");
          assert.equal(practice.length, 10);
          assert.deepEqual(
            definition.words.filter((w) => w.kind === "term").map((w) => w.es),
            practice.map((w) => w.es),
          );
          for (const [i, check] of p.checks.entries())
            assert.ok(Object.values(p.pattern.verbs[i].forms).includes(check.answer));
          for (const verb of p.pattern.verbs) assert.match(p.grammar.focus, /\S/);
        }
      }
      const deck = authoredModuleDeck(id, "Spanish", "English");
      assert.ok(deck?.pairs.length);
      assert.equal(deck.lessonCount, count);
      assert.equal(authoredModuleDeck(id, "Spanish", "French"), null);
    }
  });
test("60 distinct frequent verbs and 28 explicitly named teaching families have correct distribution", () => {
  const verbs = [],
    patterns = [];
  for (const [stage, count] of [
    ["foundation", 10],
    ["core", 30],
    ["master", 20],
  ])
    for (let n = 1; n <= count; n++) {
      const prefix = stage === "core" ? "" : stage + "-";
      verbs.push(spanishBasicsLesson(prefix + courses[1], n).primaryVerb);
      patterns.push(spanishBasicsLesson(prefix + courses[2], n).pattern.id);
    }
  assert.equal(new Set(verbs).size, 60);
  assert.equal(new Set(patterns).size, 28);
  assert.equal(patterns.length, 60);
  assert.equal(new Set(patterns.slice(0, 28)).size, 28);
  assert.match(spanishBasicsLesson("spanish-frequent-verbs", 19).grammar.focus, /vulgar/);
  assert.equal(SPANISH_NEXT_READERS.length, 300);
});
test("recordings preserve accents, voice gender and safe filenames without opposite-voice substitution", () => {
  const manifest = {
    version: 1,
    entries: { "está aquí": { female: "es-next-1234567890abcdef1234-female" } },
  };
  assert.equal(normalizedRecordingText("  Está   aquí.?!  "), "está aquí");
  assert.ok(spanishRecordingPath(manifest, "Está aquí.", "female"));
  assert.equal(spanishRecordingPath(manifest, "esta aqui", "female"), null);
  assert.equal(spanishRecordingPath(manifest, "está aquí", "male"), null);
  assert.equal(recordingGender("es-US-Chirp3-HD-Charon", "es-US"), "male");
  assert.equal(recordingGender("es-US-Chirp3-HD-Aoede", "es-MX"), "female");
  assert.equal(recordingGender("es-ES-Chirp3-HD-Aoede", "es-ES"), null);
  assert.equal(recordingGender("en-US-Chirp3-HD-Aoede", "en-US"), null);
  assert.equal(
    spanishRecordingPath({ version: 1, entries: { x: { female: "../../bad" } } }, "x", "female"),
    null,
  );
});

test("Usage-First preserves exact descending source ranks and Common Patterns owns sixty distinct structures", () => {
  const frequency = read("content/spanish-next/usage-frequency.json").rows;
  let ordinal = 0;
  const structures = new Set();
  for (const [stage, count] of [
    ["foundation", 10],
    ["core", 30],
    ["master", 20],
  ])
    for (let n = 1; n <= count; n++) {
      const prefix = stage === "core" ? "" : stage + "-";
      const usage = spanishBasicsLesson(prefix + "spanish-usage-verbs", n);
      const row = frequency[ordinal++];
      assert.equal(usage.primaryVerb, row.verb);
      assert.equal(usage.frequencyRank, row.rank);
      assert.equal(usage.frequencyRank, ordinal);
      if (ordinal > 1) assert.ok(frequency[ordinal - 2].count >= row.count);
      structures.add(spanishBasicsLesson(prefix + "spanish-common-patterns", n).structureId);
    }
  assert.equal(ordinal, 60);
  assert.equal(structures.size, 60);
  assert.match(spanishBasicsLesson("foundation-spanish-common-patterns", 1).grammar.focus, /tener/);
});
