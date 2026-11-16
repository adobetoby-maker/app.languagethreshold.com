import { curriculumModuleIdOfScenario, ensureStageForModule } from "../src/data/core60-stages.ts";
import { financeReaderId } from "../src/data/finance.ts";
import { FINANCE_READERS } from "../src/data/finance-readers.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getLessonDefinition, modulePracticeVersion } from "../src/lib/lesson-definition.ts";
import { authoredModuleDeck } from "../src/lib/authored-module-deck.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { libraryTranslationLanguage } from "../src/lib/lesson-reading.ts";
import { getSpeakingMissions, getSpeakingModules } from "../src/data/speaking-missions.ts";
import {
  parseLessonContent,
  validateLessonContent,
  contentLimitsFor,
} from "../src/lib/lesson-content-core.ts";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
for (const base of ["accounting", "personal-money", "travel-money"])
  for (const [target, native, code, pair] of [
    ["Spanish", "English", "es", "es-en"],
    ["English", "Spanish", "en", "en-es"],
  ]) {
    const track = code === "es" ? base : base + "-english";
    test(`${track}: exact-pair authored content maps all 60 lessons into practice, readers, decks and speaking`, async () => {
      await ensureStageForModule(track, { targetLanguage: target, nativeLanguage: native });
      assert.equal(
        curriculumModuleIdOfScenario(`scenario_version_${track}_lesson_1_${code}_v1`),
        track,
      );
      const rows = read(`content/finance/${base}/${pair}.json`);
      const missions = getSpeakingMissions(target);
      const speaking = getSpeakingModules(target, native);
      assert(speaking.some((m) => m.id === track));
      assert(!getSpeakingModules(target, "French").some((m) => m.id === track));
      for (const [stage, count] of [
        ["foundation", 10],
        ["core", 30],
        ["master", 20],
      ]) {
        const id = stage === "core" ? track : stage + "-" + track;
        const module = getModule(id);
        assert(moduleSupportsLearningPair(module, target, native));
        assert(!moduleSupportsLearningPair(module, target, "French"));
        assert(!moduleSupportsLearningPair(module, native, target));
        const curriculum = getCurriculum(id, target, native);
        assert.equal(curriculum.lessons.length, count);
        const raw = read(`public/lesson-content/${code}/${id}.json`);
        const file = parseLessonContent(raw, { moduleId: id, language: target });
        assert(file);
        assert.equal(file.reviewed, false);
        const deck = authoredModuleDeck(id, target, native);
        assert.equal(deck.lessonCount, count);
        assert.equal(authoredModuleDeck(id, target, "French"), null);
        const readers = getLessons(id, target);
        assert.equal(readers.length, count);
        assert.deepEqual(getLessons(id, native), []);
        for (let n = 1; n <= count; n++) {
          const source = rows.find((r) => r.stage === stage && r.lesson.n === n);
          const lesson = file.lessons[n];
          assert.deepEqual(
            validateLessonContent(lesson, {
              language: target,
              nativeLanguage: native,
              parts: { passage: true, words: true, verbs: true },
              limits: contentLimitsFor(id),
            }),
            [],
            `${id}/${n}`,
          );
          assert.deepEqual(lesson.passage, source.content.passage);
          assert.deepEqual(lesson.words, source.lesson.words);
          const d = getLessonDefinition({
            moduleId: id,
            lessonNumber: n,
            targetLanguage: target,
            instructionLanguage: native,
            contentVersion: modulePracticeVersion(id, target, native),
          });
          assert.deepEqual(
            d.gaps,
            [
              "Activity settings are wired for this draft; teaching review, offline asset verification and release approval are pending.",
            ],
            `${id}/${n}: no missing content beyond declared draft review`,
          );
          assert.equal(d.modes.length, 6);
          assert.equal(d.reading.sentences.length, lesson.passage.target.length);
          assert(d.listeningItems.length);
          if (stage === "core")
            assert.equal(curriculum.lessons[n - 1].readingTemplate, readers[n - 1]);
          assert.equal(financeReaderId(id, n, target, native), readers[n - 1]);
          assert.equal(financeReaderId(id, n, target, "French"), null);
          const reader = FINANCE_READERS.find((r) => r.id === readers[n - 1]);
          assert(reader, `${id}/${n}: full Reader seed`);
          assert.deepEqual(
            reader.sentences.map((s) => s.target),
            lesson.passage.target,
          );
          assert.deepEqual(
            reader.sentences.map((s) => s.en),
            lesson.passage.native,
          );
          assert.equal(libraryTranslationLanguage(readers[n - 1]), native);
          const wrong = getLessonDefinition({
            moduleId: id,
            lessonNumber: n,
            targetLanguage: target,
            instructionLanguage: "French",
            contentVersion: "test",
          });
          assert.equal(wrong.reading, null);
          assert.equal(wrong.words.length, 0);
          assert.equal(wrong.teaching, null);
          const mission = missions.find(
            (m) => m.moduleId === id && m.sourceObjectiveId === d.objectiveId,
          );
          assert(mission, `${id}/${n}: exact speaking mission`);
          assert.equal(mission.openingLine, source.lesson.openingLine);
          assert.equal(mission.partnerRole, source.lesson.partnerRole);
          assert(mission.vocabulary.every((v) => lesson.words.some((w) => w.es === v)));
          assert.equal(mission.surpriseComplication, stage === "master" ? true : undefined);
        }
      }
    });
  }
