import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = "content/french-travel-lunch/";
const read = (name) => readFileSync(dir + name);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const delta = JSON.parse(read("content-audio-delta-candidate.json"));
const scope = JSON.parse(read("audio-scope-candidate.json"));

test("French Lunch passage audio inventory pins all 60 private content candidates", () => {
  assert.equal(delta.pairKey, "French:English");
  assert.equal(delta.locale, "fr-FR");
  assert.equal(delta.sourceAudioScopeSha256, hash(read("audio-scope-candidate.json")));
  assert.equal(delta.recordingsBundled, false);
  assert.equal(delta.listeningReviewed, false);
  assert.equal(delta.registered, false);
  assert.deepEqual(delta.voices, scope.voices);
  assert.equal(Object.values(delta.stages).reduce((count, stage) => count + stage.lessons, 0), 60);
});

test("only passage text absent from the recorded source scope enters the delta", () => {
  const recorded = new Set();
  for (const name of Object.keys(scope.sourceSha256)) {
    const source = JSON.parse(read(name));
    for (const lesson of source.lessons) {
      for (const card of lesson.cards) recorded.add(card.fr);
      for (const turn of lesson.reader) recorded.add(turn.fr);
    }
  }
  assert.equal(recorded.size, scope.uniqueTexts);
  const missing = new Map();
  let placements = 0;
  let covered = 0;
  for (const [stage, stageInfo] of Object.entries(delta.stages)) {
    const name = `${stage}-lesson-content-candidate.json`;
    const bytes = read(name);
    assert.equal(delta.candidateSha256[name], hash(bytes));
    const candidate = JSON.parse(bytes);
    assert.equal(candidate.reviewed, false);
    assert.equal(candidate.registered, false);
    assert.equal(Object.keys(candidate.lessons).length, stageInfo.lessons);
    let stagePlacements = 0;
    let stageCovered = 0;
    for (const [number, lesson] of Object.entries(candidate.lessons)) {
      assert.equal(lesson.stableId, `${stage}-travel-lunch:${number}:fr-en`);
      for (const line of lesson.passage.target) {
        placements++;
        stagePlacements++;
        if (recorded.has(line)) { covered++; stageCovered++; }
        else missing.set(line, [...(missing.get(line) ?? []), lesson.stableId]);
      }
    }
    assert.equal(stageInfo.passagePlacements, stagePlacements);
    assert.equal(stageInfo.sourceCoveredPlacements, stageCovered);
    assert.equal(stageInfo.newPlacements, stagePlacements - stageCovered);
  }
  assert.equal(delta.passagePlacements, placements);
  assert.equal(delta.sourceCoveredPlacements, covered);
  assert.equal(delta.newPlacements, placements - covered);
  assert.equal(delta.newUniqueTexts, missing.size);
  assert.equal(delta.proposedTwoVoiceClips, missing.size * 2);
  const characters = [...missing.keys()].reduce((sum, line) => sum + [...line].length, 0);
  assert.equal(delta.newUniqueCharacters, characters);
  assert.equal(delta.proposedTwoVoiceCharacters, characters * 2);
  assert.deepEqual(new Set(delta.texts.map((row) => row.text)), new Set(missing.keys()));
  for (const row of delta.texts) {
    assert.equal(row.textSha256, hash(row.text));
    assert.deepEqual(row.lessonIds, [...new Set(missing.get(row.text))].sort());
  }
});
