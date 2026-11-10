import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { inspectPrivateJapaneseRoofing, releasedJapaneseRoofing } from "../src/data/private-japanese-roofing-candidate.ts";

const directory = new URL("../content/japanese-roofing/", import.meta.url);
const names = await readdir(directory);
const lessonFiles = names.filter(name => /^(foundation|core|master)-.*-draft\.json$/.test(name));
const activityFiles = names.filter(name => name.startsWith("private-mode-activities-") && name.endsWith(".json"));
const load = async name => JSON.parse(await readFile(new URL(name, directory), "utf8"));
const lessonBatches = await Promise.all(lessonFiles.map(load));
const activityBatches = await Promise.all(activityFiles.map(load));
const exactPair = { target: "Japanese", native: "English" };

test("Japanese Roofing private source batches remain pinned to exact lesson text", async () => {
  assert.equal(lessonFiles.length, 21);
  assert.equal(activityFiles.length, 21);
  for (const batch of activityBatches) {
    const source = await readFile(new URL(`../../${batch.source}`, directory));
    assert.equal(createHash("sha256").update(source).digest("hex"), batch.sourceSha256);
  }
});

test("Japanese Roofing candidate has 10/30/20 exact-pair lessons and all six sourced activities", () => {
  const candidate = inspectPrivateJapaneseRoofing(lessonBatches, activityBatches);
  assert.equal(candidate.releaseEnabled, false);
  assert.equal(releasedJapaneseRoofing(), null);
  assert.deepEqual(candidate.candidateStageIds.map(id => candidate.stage(id, exactPair).length), [10, 30, 20]);
  assert.equal(new Set(candidate.candidateOfflinePackIds).size, 3);
  for (const [sourceStage, limit] of [["foundation-roofing", 10], ["roofing", 30], ["master-roofing", 20]]) {
    for (let n = 1; n <= limit; n++) {
      const lesson = candidate.lesson(sourceStage, n, exactPair);
      assert.equal(lesson.stableId, `${sourceStage}:${n}:ja-en`);
      for (const mode of ["see", "recall", "hear", "type", "say", "write"])
        assert.equal(candidate.activity(sourceStage, n, mode, exactPair).lessonId, lesson.stableId);
    }
  }
  assert.equal(candidate.lesson("roofing", 1, { target: "Spanish", native: "English" }), null);
  assert.equal(candidate.activity("roofing", 1, "hear", { target: "Japanese", native: "Spanish" }), null);
  assert.deepEqual(candidate.stage(candidate.candidateStageIds[1], { target: "Spanish", native: "English" }), []);
});

test("Japanese Roofing candidate rejects released flags and cross-lesson text", () => {
  const changed = structuredClone(activityBatches);
  changed[0].activities[0].modelJapanese = "unrelated Japanese text";
  assert.throws(() => inspectPrivateJapaneseRoofing(lessonBatches, changed), /source pair mismatch/);
  const released = structuredClone(activityBatches);
  released[0].audioListeningReviewed = true;
  assert.throws(() => inspectPrivateJapaneseRoofing(lessonBatches, released), /released Japanese Roofing activity batch/);
  const missing = structuredClone(activityBatches);
  missing[0].activities.pop();
  assert.throws(() => inspectPrivateJapaneseRoofing(lessonBatches, missing), /360 private six-mode activities/);
});
