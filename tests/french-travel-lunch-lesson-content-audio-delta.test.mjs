import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = "content/french-travel-lunch/";
const read = (name) => readFileSync(dir + name);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceScope = JSON.parse(read("audio-scope-candidate.json"));
const passageScope = JSON.parse(read("content-audio-delta-candidate.json"));
const supplement = JSON.parse(read("lesson-content-audio-delta-candidate.json"));

test("French Lunch content audio inventory stays private and pinned", () => {
  assert.equal(supplement.pairKey, "French:English");
  assert.equal(supplement.locale, "fr-FR");
  assert.deepEqual(supplement.voices, sourceScope.voices);
  assert.equal(supplement.sourceAudioScopeSha256, hash(read("audio-scope-candidate.json")));
  assert.equal(supplement.passageDeltaSha256, hash(read("content-audio-delta-candidate.json")));
  assert.equal(supplement.recordingsBundled, false);
  assert.equal(supplement.textReviewed, false);
  assert.equal(supplement.listeningReviewed, false);
  assert.equal(supplement.registered, false);
});

test("supplement includes every new word and verb string that speaker controls expose", () => {
  const baseline = new Set(passageScope.texts.map((row) => row.text));
  const sourceLessons = { foundation: {}, core: {}, master: {} };
  for (const name of Object.keys(sourceScope.sourceSha256)) {
    const stage = name.split("-")[0];
    const source = JSON.parse(read(name));
    for (const lesson of source.lessons) {
      sourceLessons[stage][lesson.n] = lesson;
      for (const card of lesson.cards) baseline.add(card.fr);
      for (const turn of lesson.reader) baseline.add(turn.fr);
    }
  }
  const missing = new Set();
  const surfaceCounts = {};
  const add = (surface, value) => {
    const count = surfaceCounts[surface] ??= { placements: 0, missingPlacements: 0 };
    count.placements++;
    if (!baseline.has(value)) { count.missingPlacements++; missing.add(value); }
  };
  for (const stage of ["foundation", "core", "master"]) {
    const name = `${stage}-lesson-content-candidate.json`;
    const bytes = read(name);
    assert.equal(supplement.candidateSha256[name], hash(bytes));
    const candidate = JSON.parse(bytes);
    assert.equal(candidate.reviewed, false);
    assert.equal(candidate.registered, false);
    for (const [number, lesson] of Object.entries(candidate.lessons)) {
      assert.equal(lesson.stableId, `${stage}-travel-lunch:${number}:fr-en`);
      const source = sourceLessons[stage][number];
      for (const value of lesson.passage.target) add("passage", value);
      for (const index of lesson.sourceCardIndices ?? [])
        add("selectedWords", lesson.sourceCardTextOverrides?.[index]?.es ?? source.cards[index - 1].fr);
      for (const word of lesson.supplementalWords ?? []) add("supplementalWords", word.es);
      for (const verb of lesson.verbs) {
        add("verbs", verb.infinitive);
        for (const form of Object.values(verb.forms)) add("verbs", form);
        add("verbs", verb.example.target);
      }
    }
  }
  assert.deepEqual(supplement.surfaces, surfaceCounts);
  assert.deepEqual(new Set(supplement.texts.map((row) => row.text)), missing);
  assert.equal(supplement.newUniqueTexts, missing.size);
  const characters = [...missing].reduce((sum, value) => sum + [...value].length, 0);
  assert.equal(supplement.newUniqueCharacters, characters);
  assert.equal(supplement.proposedTwoVoiceClips, missing.size * 2);
  assert.equal(supplement.proposedTwoVoiceCharacters, characters * 2);
  for (const row of supplement.texts) {
    assert.equal(row.textSha256, hash(row.text));
    assert.ok(row.lessonIds.length > 0);
    assert.ok(row.occurrences.every(({ lessonId }) => row.lessonIds.includes(lessonId)));
  }
});
