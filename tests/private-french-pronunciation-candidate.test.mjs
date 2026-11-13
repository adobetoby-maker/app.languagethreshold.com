import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { inspectPrivateFrenchPronunciation, releasedFrenchPronunciation } from "../src/data/private-french-pronunciation-candidate.ts";

const directory = new URL("../content/french-pronunciation/", import.meta.url);
const names = (await readdir(directory)).filter(name => /^(foundation|core|master)-.*-draft\.json$/.test(name));
const batches = await Promise.all(names.map(async name => JSON.parse(await readFile(new URL(name, directory), "utf8"))));
const pair = { target: "French", native: "English" };

test("French pronunciation private candidate exposes all 60 exact-pair lessons and six authored prompts", () => {
  assert.equal(names.length, 21);
  const candidate = inspectPrivateFrenchPronunciation(batches);
  assert.equal(candidate.releaseEnabled, false);
  assert.equal(releasedFrenchPronunciation(), null);
  assert.deepEqual(candidate.candidateStageIds.map(id => candidate.stage(id, pair).length), [10, 30, 20]);
  for (const [stage, count] of [["foundation", 10], ["core", 30], ["master", 20]]) {
    for (let n = 1; n <= count; n++) {
      const lesson = candidate.lesson(stage, n, pair);
      assert.equal(lesson.id, `${stage}-french-sound-like-a-native:${n}:fr-en`);
      for (const mode of ["see", "recall", "hear", "type", "say", "write"])
        assert.ok(candidate.practice(stage, n, mode, pair)?.prompt);
    }
  }
  assert.equal(candidate.lesson("core", 1, { target: "Spanish", native: "English" }), null);
  assert.equal(candidate.practice("core", 1, "hear", { target: "French", native: "Spanish" }), null);
  assert.deepEqual(candidate.stage(candidate.candidateStageIds[0], { target: "Spanish", native: "English" }), []);
  assert.equal(candidate.lesson("master", 16, pair).regionalAudioEvidence.hearPlayable, false);
});

test("French pronunciation private candidate rejects missing modes, cross-pair references, and release flags", () => {
  const missing = structuredClone(batches);
  delete missing[0].lessons[0].practice.hear;
  assert.throws(() => inspectPrivateFrenchPronunciation(missing), /invalid French pronunciation lesson/);
  const wrongRef = structuredClone(batches);
  wrongRef[0].lessons[0].practice.see.wordRefs = ["unrelated French text"];
  assert.throws(() => inspectPrivateFrenchPronunciation(wrongRef), /source reference/);
  const released = structuredClone(batches);
  released[0].runtimeRegistered = true;
  assert.throws(() => inspectPrivateFrenchPronunciation(released), /released French pronunciation batch/);
});
