import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { authoredLessonReading, exactLessonLibraryId, libraryTranslationLanguage } =
  await loadModule("src/lib/lesson-reading.ts");
const { getLessonDefinition } = await loadModule("src/lib/lesson-definition.ts");
const { LANDSCAPER_CREW_MEETING_WORDS } = await loadModule("src/data/landscaper-lesson-content.ts");

test("lesson reading selection refuses an unrelated module seed and preserves exact ESL reversal", () => {
  const ids = ["seed-es-landscaper-irrigation"];
  assert.equal(exactLessonLibraryId(undefined, "es", ids), null);
  assert.equal(exactLessonLibraryId("seed-{lang}-landscaper-meeting", "es", ids), null);
  assert.equal(exactLessonLibraryId("seed-{lang}-landscaper-irrigation", "es", ids), ids[0]);
  assert.equal(exactLessonLibraryId("seed-{lang}-landscaper-irrigation", "fr", ids), null);
  assert.equal(
    exactLessonLibraryId("seed-{lang}-landscaper-irrigation", "en", [
      "esl-seed-es-landscaper-irrigation",
    ]),
    "esl-seed-es-landscaper-irrigation",
  );
  assert.equal(libraryTranslationLanguage("esl-seed-es-landscaper-irrigation"), "Spanish");
  assert.equal(libraryTranslationLanguage(ids[0]), "English");
  assert.equal(exactLessonLibraryId("seed-{lang}-landscaper-irrigation", "es", ids, 29), null);
});

test("all thirty Roofing passages bind exact lesson and instruction language", () => {
  for (let n = 1; n <= 30; n++) {
    const p = authoredLessonReading("roofing", n, "Spanish", "English");
    assert.equal(p.id, `roofing-lesson-${n}`);
    assert.ok(p.sentences.every((s) => s.target && s.en));
    assert.equal(authoredLessonReading("roofing", n, "Spanish", "French"), null);
    assert.equal(authoredLessonReading("roofing", n, "French", "English"), null);
  }
  assert.equal(authoredLessonReading("roofing", 31, "Spanish", "English"), null);
});

test("Landscaping crew meeting has aligned draft words and reading, with its original aligned material", () => {
  const d = getLessonDefinition({
    moduleId: "landscaper",
    lessonNumber: 1,
    targetLanguage: "Spanish",
    instructionLanguage: "English",
    contentVersion: "qa-draft",
  });
  assert.equal(d.title, "Morning Crew Meeting");
  assert.equal(d.source.readingTemplate, undefined);
  assert.equal(d.readiness, "draft");
  assert.deepEqual(d.words, LANDSCAPER_CREW_MEETING_WORDS);
  assert.deepEqual(d.listeningItems, d.words);
  assert.equal(d.words.filter((w) => w.kind === "term").length, 10);
  assert.equal(d.words.filter((w) => w.kind === "phrase").length, 5);
  const reading = d.reading.sentences.map((s) => s.target).join(" ");
  assert.match(reading, /cuadrilla/i);
  assert.match(reading, /tareas/i);
  assert.match(reading, /horario/i);
  assert.match(reading, /¿Puede repetirlo\?/);
  assert.doesNotMatch(reading, /riego|irrigación/i);
  assert.ok(d.reading.sentences.every((s) => s.native && s.target));
  assert.equal(
    authoredLessonReading("landscaper", 2, "Spanish", "English").title,
    "El plan de corte",
  );
  assert.equal(authoredLessonReading("landscaper", 1, "Spanish", "French"), null);
});
