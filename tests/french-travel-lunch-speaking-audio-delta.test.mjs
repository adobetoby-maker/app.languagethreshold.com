import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = "content/french-travel-lunch/";
const read = (name) => readFileSync(dir + name);
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("French Lunch speaking audio delta covers only exact unrecorded scene lines", () => {
  const scope = JSON.parse(read("audio-scope-candidate.json"));
  const passages = JSON.parse(read("content-audio-delta-candidate.json"));
  const supplement = JSON.parse(read("lesson-content-audio-delta-candidate.json"));
  const delta = JSON.parse(read("speaking-audio-delta-candidate.json"));
  assert.equal(delta.pairKey, "French:English");
  assert.equal(delta.locale, "fr-FR");
  assert.deepEqual(delta.voices, scope.voices);
  assert.equal(delta.sourceAudioScopeSha256, hash(read("audio-scope-candidate.json")));
  assert.equal(delta.passageDeltaSha256, hash(read("content-audio-delta-candidate.json")));
  assert.equal(delta.supplementDeltaSha256, hash(read("lesson-content-audio-delta-candidate.json")));
  assert.equal(delta.recordingsBundled, false);
  assert.equal(delta.textReviewed, false);
  assert.equal(delta.listeningReviewed, false);
  assert.equal(delta.registered, false);

  const baseline = new Set([...passages.texts, ...supplement.texts].map((row) => row.text));
  const lessons = [];
  for (const [filename, digest] of Object.entries(scope.sourceSha256)) {
    const bytes = read(filename);
    assert.equal(hash(bytes), digest);
    const source = JSON.parse(bytes);
    assert.equal(source.pairKey, "French:English");
    assert.equal(source.reviewed, false);
    assert.equal(source.registered, false);
    for (const lesson of source.lessons) {
      lessons.push(lesson);
      for (const card of lesson.cards) baseline.add(card.fr);
      for (const turn of lesson.reader) baseline.add(turn.fr);
    }
  }
  assert.equal(lessons.length, 60);
  const missing = new Set();
  const placements = { opening: 0, closure: 0, wordBank: 0, mode: 0 };
  const missingPlacements = { opening: 0, closure: 0, wordBank: 0, mode: 0 };
  for (const lesson of lessons) {
    const surfaces = {
      opening: [lesson.speaking.opening],
      closure: [lesson.speaking.closure],
      wordBank: lesson.speaking.wordBank,
      mode: Object.values(lesson.modes).map((mode) => lesson.cards[mode.sourceCard - 1].fr),
    };
    for (const [surface, texts] of Object.entries(surfaces)) {
      for (const text of texts) {
        placements[surface]++;
        if (!baseline.has(text)) { missingPlacements[surface]++; missing.add(text); }
      }
    }
  }
  assert.deepEqual(delta.surfacePlacements, placements);
  assert.deepEqual(delta.missingPlacements, missingPlacements);
  assert.deepEqual(new Set(delta.texts.map((row) => row.text)), missing);
  assert.equal(delta.newUniqueTexts, missing.size);
  assert.equal(delta.proposedTwoVoiceClips, missing.size * 2);
  assert.equal(delta.proposedTwoVoiceCharacters,
    [...missing].reduce((sum, text) => sum + [...text].length * 2, 0));
  for (const row of delta.texts) assert.equal(row.textSha256, hash(row.text));
});
