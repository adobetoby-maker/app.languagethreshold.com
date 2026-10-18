import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { getLessonDefinition, modulePracticeVersion } = await loadModule(
  "src/lib/lesson-definition.ts",
);
const { findSpeakingMission } = await loadModule("src/data/speaking-missions.ts");
const { lessonReviewSnapshot, lessonReviewFingerprint } = await loadModule(
  "src/lib/lesson-review.ts",
);
const definition = (n, targetLanguage = "Spanish", instructionLanguage = "English") =>
  getLessonDefinition({
    moduleId: "landscaper",
    lessonNumber: n,
    targetLanguage,
    instructionLanguage,
    contentVersion: modulePracticeVersion("landscaper", targetLanguage, instructionLanguage),
  });

test("all30 Landscaper lessons have distinct aligned passages, 10 terms and5 phrases used in their own scenarios", () => {
  const titles = new Set(),
    passages = new Set();
  for (let n = 1; n <= 30; n++) {
    const d = definition(n);
    assert.equal(d.readiness, "draft");
    assert.equal(d.words.filter((w) => w.kind === "term").length, 10, `lesson${n} terms`);
    assert.equal(d.words.filter((w) => w.kind === "phrase").length, 5, `lesson${n} phrases`);
    assert.equal(d.source.readingTemplate, undefined);
    assert.equal(d.expectedMinutes, 20);
    assert.ok(d.reading.sentences.every((s) => s.target.trim() && s.native.trim()));
    const text = d.reading.sentences
      .map((s) => s.target)
      .join(" ")
      .toLocaleLowerCase("es");
    for (const word of d.words)
      assert.ok(
        text.includes(word.es.toLocaleLowerCase("es").replace(/[.!?]+$/, "")),
        `lesson${n}: ${word.es} missing from own reading`,
      );
    assert.deepEqual(d.modes, ["see", "recall", "hear", "type", "say", "write"]);
    assert.ok(d.gaps.some((g) => /review.*pending/.test(g)));
    titles.add(d.reading.title);
    passages.add(text);
  }
  assert.equal(titles.size, 30);
  assert.equal(passages.size, 30);
});

test("lesson progression drives contextual listening, response length, handwriting and each own speaking mission", () => {
  for (const [n, stage, size, count, bank] of [
    [1, "supported", 4, 1, "visible"],
    [15, "connected", 6, 2, "collapsed"],
    [30, "independent", 8, 3, "on-request"],
  ]) {
    const d = definition(n),
      t = d.teaching;
    assert.equal(t.stage, stage);
    assert.equal(t.matchingBatchSize, size);
    assert.equal(t.response.suggestedSentences, count);
    assert.equal(t.writing.copyFirst, true);
    assert.equal(t.writing.prompt, d.objective);
    assert.equal(t.speaking.wordBank, bank);
    const mission = findSpeakingMission(`scenario_version_landscaper_lesson_${n}_es_v1`);
    assert.equal(mission.sourceObjectiveId, d.objectiveId);
    assert.deepEqual(mission.lessonTeaching, { stage, speaking: t.speaking });
    if (n === 1) assert.deepEqual(d.listeningItems, d.words);
    else {
      assert.equal(
        d.listeningItems[0].es,
        d.reading.sentences
          .slice(0, n === 30 ? 2 : 1)
          .map((s) => s.target)
          .join(" "),
      );
    }
  }
  assert.match(
    definition(2)
      .reading.sentences.map((s) => s.target)
      .join(" "),
    /cortacésped/i,
  );
  assert.doesNotMatch(
    definition(2)
      .reading.sentences.map((s) => s.target)
      .join(" "),
    /programador/i,
  );
});

test("draft tracks never cross language pairs or teach the old universal field prescriptions", () => {
  for (const [target, native] of [
    ["French", "English"],
    ["Spanish", "French"],
    ["English", "Spanish"],
  ]) {
    const d = definition(15, target, native);
    assert.deepEqual(d.words, []);
    assert.equal(d.reading, null);
    assert.equal(d.teaching, null);
  }
  const steps = Array.from({ length: 30 }, (_, i) =>
    definition(i + 1)
      .source.steps.map((s) => s.instruction)
      .join(" "),
  ).join(" ");
  assert.doesNotMatch(steps, /24 horas|3 pulgadas|2 semanas|aire comprimido|4 pies/i);
  assert.equal(definition(31), null);
});

test("the existing frozen Roofing review fingerprint is preserved by the shared teaching factory", async () => {
  assert.equal(
    await lessonReviewFingerprint(lessonReviewSnapshot("roofing", "Spanish", "English")),
    "255c3d50ed8348f74014804c48c57475ea836588f78afec642022ba038caa30b",
  );
});
