import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  JAPANESE_TRAVEL_LUNCH_OFFLINE_RELEASED,
  PRIVATE_JAPANESE_TRAVEL_LUNCH_OFFLINE_TRACKS,
  releasedJapaneseTravelLunchOfflinePackIds,
} from "../src/lib/private-japanese-travel-lunch-offline.ts";
import { offlineLessonPackId } from "../src/lib/offline-lesson-tracks.ts";
import { verifyPrivateJapaneseTravelLunchOfflineCandidate } from
  "../scripts/build-private-japanese-travel-lunch-offline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "content/japanese-travel-lunch/private-offline");
const source = readFileSync(path.join(root, "content/japanese-travel-lunch/private-runtime-candidate.json"));
const dictionary = readFileSync(path.join(root, "content/japanese-travel-lunch/private-dictionary-candidates.json"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const stages = [
  ["foundation-travel-lunch-ja-en", "foundation-travel-lunch", 10],
  ["travel-lunch-ja-en", "travel-lunch", 30],
  ["master-travel-lunch-ja-en", "master-travel-lunch", 20],
];
function readCandidate(id) {
  const manifest = JSON.parse(readFileSync(path.join(output, `${id}.manifest.json`)));
  const bytes = readFileSync(path.join(output, manifest.content.file));
  return { manifest, bytes };
}

test("all three private Lunch text packs keep exact pair, stage, cards and Reader", () => {
  assert.equal(JAPANESE_TRAVEL_LUNCH_OFFLINE_RELEASED, false);
  assert.deepEqual(releasedJapaneseTravelLunchOfflinePackIds(), []);
  assert.deepEqual(Object.keys(PRIVATE_JAPANESE_TRAVEL_LUNCH_OFFLINE_TRACKS),
    stages.map(([id]) => id));
  let lessons = 0, cards = 0, readerTurns = 0;
  for (const [id, moduleId, count] of stages) {
    const { manifest, bytes } = readCandidate(id);
    const pack = verifyPrivateJapaneseTravelLunchOfflineCandidate(manifest, bytes, source, dictionary, id);
    assert.equal(manifest.content.sha256, sha(bytes));
    assert.equal(manifest.sourceSha256, sha(source));
    assert.equal(pack.lessons.length, count);
    assert.equal(pack.lessons[0].stableId, `${moduleId}:1:ja-en`);
    assert.equal(pack.lessons.at(-1).stableId, `${moduleId}:${count}:ja-en`);
    assert.equal(pack.cards.length, manifest.cardCount);
    assert.equal(pack.dictionaryEntries.length, manifest.dictionaryEntryCount);
    assert.equal(pack.dictionarySourceSha256, sha(dictionary));
    assert.ok(pack.cards.every(card => pack.dictionaryEntries.some(entry => entry.id === card.dictionaryId)));
    assert.equal(pack.audioFilesIncluded, false);
    assert.equal(manifest.workerAllowlistEnabled, false);
    assert.equal(manifest.installationStatus, "not-installed");
    assert.equal(manifest.content.routeCandidate, null);
    assert.equal(offlineLessonPackId(moduleId, "Japanese", "English"), null);
    assert.equal(offlineLessonPackId(moduleId, "Spanish", "English"), null);
    assert.equal(existsSync(path.join(root, "public/lesson-packs", manifest.content.file)), false);
    lessons += count;
    cards += pack.cards.length;
    readerTurns += pack.lessons.reduce((sum, lesson) => sum + lesson.reader.length, 0);
  }
  assert.deepEqual([lessons, cards, readerTurns], [60, 1099, 760]);
});

test("tampered payload and source content fail even if the new hash is reflected in its manifest", () => {
  const id = "travel-lunch-ja-en";
  const { manifest, bytes } = readCandidate(id);
  assert.throws(() => verifyPrivateJapaneseTravelLunchOfflineCandidate(
    manifest, Buffer.concat([bytes, Buffer.from(" ")]), source, dictionary, id), /mismatch/);
  assert.throws(() => verifyPrivateJapaneseTravelLunchOfflineCandidate(
    manifest, bytes, Buffer.concat([source, Buffer.from(" ")]), dictionary, id), /mismatch/);
  assert.throws(() => verifyPrivateJapaneseTravelLunchOfflineCandidate(
    manifest, bytes, source, Buffer.concat([dictionary, Buffer.from(" ")]), id), /mismatch/);
  for (const mutate of [
    pack => { pack.pairKey = "Spanish:English"; },
    pack => { pack.lessons[0].reader[0].en = "wrong meaning"; },
    pack => { pack.cards[0].ja = "違う"; },
    pack => { pack.lessons[0].modes.hear.sourceRef = "other-card"; },
  ]) {
    const pack = JSON.parse(bytes);
    mutate(pack);
    const changed = Buffer.from(JSON.stringify(pack));
    const digest = sha(changed);
    const updated = { ...manifest,
      content: { ...manifest.content, file: `${id}-${digest}.json`, sha256: digest, bytes: changed.length },
      cacheNamespaceCandidate: `private:Japanese:English:${id}:${digest}`,
    };
    assert.throws(() => verifyPrivateJapaneseTravelLunchOfflineCandidate(updated, changed, source, dictionary, id), /mismatch/);
  }
  assert.throws(() => verifyPrivateJapaneseTravelLunchOfflineCandidate(
    { ...manifest, workerAllowlistEnabled: true }, bytes, source, dictionary, id), /mismatch/);
});

test("private pack IDs are absent from public download and worker registration", () => {
  const registry = readFileSync(path.join(root, "src/lib/offline-lesson-tracks.ts"), "utf8");
  const worker = readFileSync(path.join(root, "public/offline-lessons-worker.js"), "utf8");
  for (const [id] of stages) {
    assert.ok(!registry.includes(id));
    assert.ok(!worker.includes(id));
  }
});
