import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const base = "content/french-travel-lunch/";
const bytes = (path) => readFileSync(path);
const json = (path) => JSON.parse(bytes(path));
const sha = (data) => createHash("sha256").update(data).digest("hex");
const candidate = json(base + "private-runtime-candidate.json");

test("private French Lunch candidate joins all six authored surfaces with exact dictionary links", () => {
  assert.equal(candidate.pairKey, "French:English");
  assert.equal(candidate.locale, "fr-FR");
  assert.equal(candidate.registration, "disabled");
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.audioListeningReviewed, false);
  assert.equal(candidate.lessonCount, 60);
  const dictionaryBytes = bytes(base + "dictionary-candidate.json");
  assert.equal(candidate.dictionarySha256, sha(dictionaryBytes));
  const dictionary = JSON.parse(dictionaryBytes);
  const entries = new Map(dictionary.entries.map((entry) => [entry.id, entry]));
  const files = new Map(candidate.sourceFiles.map((file) => [file.path, file.sha256]));
  const contents = new Map(candidate.contentFiles.map((file) => [file.path, file.sha256]));
  for (const [path, digest] of [...files, ...contents]) assert.equal(sha(bytes(path)), digest);
  const byStage = { foundation: [], core: [], master: [] };
  const ids = new Set();
  let cards = 0, turns = 0, lines = 0, modes = 0;
  for (const lesson of candidate.lessons) {
    const stage = lesson.stableId.split("-")[0];
    assert.ok(byStage[stage]);
    byStage[stage].push(lesson.lessonNumber);
    assert.equal(lesson.stableId, `${stage}-travel-lunch:${lesson.lessonNumber}:fr-en`);
    assert.equal(ids.has(lesson.stableId), false);
    ids.add(lesson.stableId);
    assert.equal(lesson.reviewed, false);
    assert.equal(lesson.readyForLearner, false);
    assert.equal(Object.hasOwn(lesson, "internalReviewNote"), false);
    assert.ok(files.has(lesson.sourceBatch));
    const source = json(lesson.sourceBatch).lessons.find((row) => row.n === lesson.lessonNumber);
    assert.deepEqual(lesson.reader, source.reader);
    assert.deepEqual(lesson.speaking, source.speaking);
    assert.equal(lesson.cards.length, source.cards.length);
    lesson.cards.forEach((card, index) => {
      assert.equal(card.id, `${lesson.stableId}:card:${index + 1}`);
      const entry = entries.get(card.dictionaryId);
      assert.ok(entry);
      assert.deepEqual([card.fr, card.en, card.kind],
        [source.cards[index].fr, source.cards[index].en, source.cards[index].kind]);
      assert.deepEqual([card.fr, card.en, card.kind], [entry.fr, entry.en, entry.kind]);
      assert.ok(entry.usages.some((usage) => usage.lessonId === lesson.stableId && usage.cardIndex === index));
    });
    const contentPath = base + `${stage}-lesson-content-candidate.json`;
    assert.ok(contents.has(contentPath));
    const content = json(contentPath).lessons[String(lesson.lessonNumber)];
    assert.deepEqual(lesson.passage, content.passage);
    assert.deepEqual(lesson.verbs, content.verbs);
    assert.deepEqual(lesson.supplementalWords, content.supplementalWords ?? []);
    assert.equal(lesson.passage.target.length, lesson.passage.native.length);
    assert.deepEqual(Object.keys(lesson.modes).sort(), ["hear", "recall", "say", "see", "type", "write"]);
    for (const [name, activity] of Object.entries(lesson.modes)) {
      const card = lesson.cards[source.modes[name].sourceCard - 1];
      assert.equal(activity.sourceCardId, card.id);
      assert.equal(activity.modelFrench, card.fr);
      assert.equal(activity.modelEnglish, card.en);
      assert.equal(activity.readyForLearner, false);
    }
    cards += lesson.cards.length;
    turns += lesson.reader.length;
    lines += lesson.passage.target.length;
    modes += Object.keys(lesson.modes).length;
  }
  assert.deepEqual(byStage.foundation, Array.from({ length: 10 }, (_, i) => i + 1));
  assert.deepEqual(byStage.core, Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(byStage.master, Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual([cards, turns, lines, modes],
    [candidate.cardCount, candidate.readerTurnCount, candidate.passageLineCount, candidate.activityCount]);
  assert.deepEqual([cards, turns, lines, modes], [948, 556, 587, 360]);
});

test("the private candidate is not a public French lesson-content registration", () => {
  for (const stage of ["foundation-travel-lunch-fr", "travel-lunch", "master-travel-lunch-fr"])
    assert.equal(existsSync(`public/lesson-content/fr/${stage}.json`), false);
});
