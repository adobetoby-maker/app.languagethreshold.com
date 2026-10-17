import assert from "node:assert/strict";
import test from "node:test";
import { currentTutorLesson, resolveTutorLesson } from "../src/lib/lesson-tutor-context.ts";
import { lessonWordCard } from "../src/lib/lesson-word-card.ts";

function reference(moduleId, n) {
  return currentTutorLesson(`?lesson=${n}`, {
    currentTab: "core30",
    activeModuleId: moduleId,
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
  });
}
test("offline term cards use exactly the canonical lesson list without invented grammar/examples", () => {
  for (const module of ["roofing", "landscaper"])
    for (const n of [1, 15, 30]) {
      const ref = reference(module, n);
      for (const entry of resolveTutorLesson(ref).words) {
        const card = lessonWordCard(
          ref,
          `¿${entry.es.normalize("NFD").toUpperCase()}?`,
          "Spanish",
          "English",
        );
        assert.equal(card.headword, entry.es);
        assert.equal(card.baseDefinition, entry.en);
        assert.equal(card.conjugationNote, "");
        assert.equal(card.exampleSentence, "");
        assert.equal(card.exampleTranslation, "");
      }
    }
});
test("a compound does not lend its meaning to one token and unmatched words stay unavailable", () => {
  const ref = reference("roofing", 15),
    lesson = resolveTutorLesson(ref);
  const compound = lesson.words.find(
    (x) =>
      x.es.includes(" ") &&
      !x.es.includes("/") &&
      !lesson.words.some((y) => y.es === x.es.split(" ")[0]),
  );
  assert.ok(compound);
  assert.equal(lessonWordCard(ref, compound.es.split(" ")[0], "Spanish", "English"), null);
  assert.equal(lessonWordCard(ref, "missing-qa-word", "Spanish", "English"), null);
});
test("explicitly listed slash-separated term alternatives retain their shared lesson definition", () => {
  const ref = reference("roofing", 15);
  for (const word of ["limahoya", "valle"])
    assert.equal(lessonWordCard(ref, word, "Spanish", "English").baseDefinition, "valley");
  assert.equal(lessonWordCard(ref, "lima", "Spanish", "English"), null);
  assert.equal(
    lessonWordCard(ref, "membrana impermeable", "Spanish", "English").baseDefinition,
    "ice and water shield",
  );
  assert.equal(lessonWordCard(ref, "impermeable", "Spanish", "English"), null);
});
test("lesson word recovery rejects stale sources, unrelated language pairs and unknown lessons", () => {
  const ref = reference("roofing", 15),
    word = resolveTutorLesson(ref).words[0].es;
  for (const wrong of [
    undefined,
    { ...ref, contentVersion: "old" },
    { ...ref, lessonNumber: 99 },
    { ...ref, moduleId: "unknown" },
  ])
    assert.equal(lessonWordCard(wrong, word, "Spanish", "English"), null);
  assert.equal(lessonWordCard(ref, word, "French", "English"), null);
  assert.equal(lessonWordCard(ref, word, "Spanish", "French"), null);
});
