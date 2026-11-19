import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { interestLesson } from "../src/data/interests-spanish.ts";
import { getLessonDefinition } from "../src/lib/lesson-definition.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { INTEREST_READER_SEEDS } from "../src/data/interests-spanish-readers.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import {
  parseLessonContent,
  validateLessonContent,
  contentLimitsFor,
} from "../src/lib/lesson-content-core.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const stages = ["dance-team", "cosmetology"].flatMap((base) => [
  [`foundation-${base}`, 10],
  [base, 30],
  [`master-${base}`, 20],
]);
test("both interest courses have complete exact-pair paths, with no borrowed languages", () => {
  for (const [id, count] of stages) {
    const module = getModule(id);
    assert.ok(module, id);
    assert.equal(getCurriculum(id)?.lessons.length, count, id);
    assert.equal(moduleSupportsLearningPair(module, "Spanish", "English"), true);
    for (const [target, native] of [
      ["English", "Spanish"],
      ["Japanese", "English"],
      ["Spanish", "French"],
    ]) {
      assert.equal(
        moduleSupportsLearningPair(module, target, native),
        false,
        `${id}: ${target}/${native}`,
      );
      assert.equal(interestLesson(id, 1, target, native), null);
    }
  }
});
test("all 120 lessons pass the actual stage and authored-content validators", () => {
  const errors = [];
  for (const [id, count] of stages) {
    const raw = read(`public/lesson-content/es/${id}.json`);
    const content = parseLessonContent(raw, { moduleId: id, language: "Spanish" });
    assert.ok(content, id);
    assert.equal(content.reviewed, false);
    if (id.startsWith("foundation-") || id.startsWith("master-"))
      errors.push(
        ...validateStageFile(read(`src/data/core60/es/${id}.json`)).map((e) => `${id}: ${e}`),
      );
    assert.equal(Object.keys(content.lessons).length, count);
    for (let n = 1; n <= count; n++)
      errors.push(
        ...validateLessonContent(content.lessons[n], {
          language: "Spanish",
          nativeLanguage: "English",
          parts: { passage: true, words: true, verbs: true },
          limits: contentLimitsFor(id),
        }).map((e) => `${id}/${n}: ${e}`),
      );
  }
  assert.deepEqual(errors, []);
});
test("every lesson has six-mode practice, the same Reader scene, and a relevant partner opening", () => {
  const missions = getSpeakingMissions("Spanish");
  const readings = new Map(INTEREST_READER_SEEDS.map((s) => [s.id, s]));
  const openings = new Set();
  for (const [id, count] of stages) {
    assert.equal(getLessons(id, "Spanish").length, count);
    assert.deepEqual(getLessons(id, "Japanese"), []);
    for (let n = 1; n <= count; n++) {
      const authored = interestLesson(id, n);
      const definition = getLessonDefinition({
        moduleId: id,
        lessonNumber: n,
        targetLanguage: "Spanish",
        instructionLanguage: "English",
        contentVersion: "test",
      });
      assert.ok(definition, `${id}/${n}`);
      assert.equal(definition.modes.length, 6);
      assert.ok(definition.teaching);
      assert.ok(definition.words.length >= 12);
      assert.equal(definition.readiness, "draft");
      assert.deepEqual(
        definition.reading.sentences.map((s) => s.target),
        authored.reading.target,
      );
      assert.deepEqual(
        readings.get(`seed-es-${id}-lesson-${n}`).sentences.map((s) => s.target),
        authored.reading.target,
      );
      const mission = missions.find(
        (m) => m.moduleId === id && m.sourceObjectiveId === definition.objectiveId,
      );
      assert.ok(mission, `${id}/${n}`);
      assert.equal(mission.openingLine, authored.openingLine);
      assert.equal(mission.partnerRole, authored.partnerRole);
      assert.ok(mission.vocabulary.length >= 8);
      openings.add(mission.openingLine);
      assert.equal(interestLesson(id, 0), null);
      assert.equal(interestLesson(id, count + 1), null);
    }
  }
  assert.equal(openings.size, 120);
});

test("each interest stage produces a complete public lesson pack and authored flashcard deck", async () => {
  const { publicLessonOfflinePack } = await import("../src/lib/lesson-offline-pack.ts");
  const { authoredModuleDeck } = await import("../src/lib/authored-module-deck.ts");
  for (const [id, count] of stages) {
    const pack = publicLessonOfflinePack(`${id}-es-en`);
    assert.equal(pack.lessons.length, count);
    assert.equal(pack.audioFilesIncluded, false);
    assert.equal(pack.lessons.at(-1).lessonNumber, count);
    assert.ok(pack.lessons.every((l) => l.words.length >= 12 && l.reading.sentences.length >= 5));
    const deck = authoredModuleDeck(id, "Spanish", "English");
    assert.ok(deck?.pairs.length >= 12);
    assert.equal(deck.lessonCount, count);
    assert.equal(authoredModuleDeck(id, "Japanese", "English"), null);
  }
});

test("suggested speaking partners fit dance and salon conversations at every stage", async () => {
  const { suggestedPartnerIds, SPEAKING_PARTNERS } =
    await import("../src/data/speaking-partners.ts");
  const available = new Set(SPEAKING_PARTNERS.map((p) => p[0]));
  for (const [id] of stages) {
    const roles = suggestedPartnerIds(id, id.includes("dance-team") ? "Sports" : "Service");
    assert.equal(roles[0], id.includes("dance-team") ? "coach" : "customer");
    assert.ok(roles.every((id) => available.has(id)));
    assert.ok(roles.includes("teacher"));
    assert.ok(!roles.includes("captain") && !roles.includes("belayer"));
  }
});
