import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { offlineLessonPackId } from "../src/lib/offline-lesson-tracks.ts";
import {
  JAPANESE_TRAVEL_BREAKFAST_OFFLINE_RELEASE_ENABLED,
  PRIVATE_JAPANESE_TRAVEL_BREAKFAST_OFFLINE_TRACKS,
  releasedJapaneseTravelBreakfastOfflinePackIds,
} from "../src/lib/private-japanese-travel-breakfast-offline.ts";
import { verifyPrivateJapaneseTravelOfflineCandidate } from "../scripts/build-private-japanese-travel-breakfast-offline.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = join(root, "content/japanese-travel-breakfast");
const output = join(content, "private-offline");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stages = [
  ["foundation-travel-breakfast-ja-en", "foundation-travel-breakfast", "foundation-1-10-draft.json", 10, 120],
  ["travel-breakfast-ja-en", "travel-breakfast", "core-1-30-draft.json", 30, 402],
];
const readCandidate = (id) => {
  const manifest = JSON.parse(readFileSync(join(output, `${id}.manifest.json`), "utf8"));
  const bytes = readFileSync(join(output, manifest.content.file));
  const source = readFileSync(join(content, manifest.sourceFile));
  return { manifest, bytes, source };
};

test("both private text packs retain exact pair, source, card, Reader and progress identity", () => {
  assert.equal(JAPANESE_TRAVEL_BREAKFAST_OFFLINE_RELEASE_ENABLED, false);
  assert.deepEqual(releasedJapaneseTravelBreakfastOfflinePackIds(), []);
  assert.deepEqual(Object.keys(PRIVATE_JAPANESE_TRAVEL_BREAKFAST_OFFLINE_TRACKS), stages.map(([id]) => id));
  for (const [id, stageId, sourceFile, count, cardCount] of stages) {
    const { manifest, bytes, source } = readCandidate(id);
    const pack = verifyPrivateJapaneseTravelOfflineCandidate(manifest, bytes, id, source);
    assert.equal(manifest.sourceFile, sourceFile);
    assert.equal(manifest.sourceSha256, sha(source));
    assert.equal(manifest.content.sha256, sha(bytes));
    assert.equal(manifest.content.bytes, bytes.length);
    assert.equal(manifest.content.routeCandidate, null);
    assert.equal(manifest.cacheNamespaceCandidate, `private:Japanese:English:${id}:${sha(bytes)}`);
    assert.equal(manifest.progressScopeCandidate, `private:Japanese:English:${stageId}:ja-en`);
    assert.equal(manifest.lessonCount, count);
    assert.equal(manifest.cardCount, cardCount);
    assert.equal(pack.lessons.length, count);
    assert.equal(pack.cards.length, cardCount);
    assert.equal(pack.lessons[0].id, `${stageId}:1:ja-en`);
    assert.equal(pack.lessons[count - 1].id, `${stageId}:${count}:ja-en`);
    assert.equal(manifest.workerAllowlistEnabled, false);
    assert.equal(manifest.installationStatus, "not-installed");
    assert.equal(existsSync(join(root, "public/lesson-packs", manifest.content.file)), false);
    assert.equal(offlineLessonPackId(stageId, "Japanese", "English"), null);
  }
});

test("changed bytes, source, pair, cache or progress identity fail closed", () => {
  const id = "travel-breakfast-ja-en";
  const { manifest, bytes, source } = readCandidate(id);
  assert.throws(() => verifyPrivateJapaneseTravelOfflineCandidate(manifest, Buffer.concat([bytes, Buffer.from(" ")]), id, source), /mismatch/);
  assert.throws(() => verifyPrivateJapaneseTravelOfflineCandidate(manifest, bytes, id, Buffer.concat([source, Buffer.from(" ")])), /mismatch/);
  for (const changed of [
    { ...manifest, pairKey: "Spanish:English" },
    { ...manifest, cacheNamespaceCandidate: "lt-lesson-pack-travel-breakfast-es-en-stale" },
    { ...manifest, progressScopeCandidate: "Spanish:English:travel-breakfast" },
    { ...manifest, workerAllowlistEnabled: true },
    { ...manifest, content: { ...manifest.content, routeCandidate: `/lesson-packs/${manifest.content.file}` } },
  ]) assert.throws(() => verifyPrivateJapaneseTravelOfflineCandidate(changed, bytes, id, source), /mismatch/);

  for (const mutate of [
    (pack) => { pack.pairKey = "Spanish:English"; },
    (pack) => { pack.lessons[0].id = "travel-breakfast:1:es-en"; },
    (pack) => { pack.lessons[0].reader.lines[0].en = "changed support line"; },
    (pack) => { pack.cards[0].native = "wrong gloss"; },
  ]) {
    const pack = JSON.parse(bytes);
    mutate(pack);
    const changedBytes = Buffer.from(JSON.stringify(pack));
    const digest = sha(changedBytes);
    const changedManifest = { ...manifest,
      content: { ...manifest.content, file: `${id}-${digest}.json`, bytes: changedBytes.length, sha256: digest },
      cacheNamespaceCandidate: `private:Japanese:English:${id}:${digest}`,
    };
    assert.throws(() => verifyPrivateJapaneseTravelOfflineCandidate(changedManifest, changedBytes, id, source), /mismatch/);
  }
});

test("private packs are absent from public offline allowlist and generated assets", () => {
  const registry = readFileSync(join(root, "src/lib/offline-lesson-tracks.ts"), "utf8");
  assert.doesNotMatch(registry, /foundation-travel-breakfast-ja-en|"travel-breakfast-ja-en"/);
  const workerPath = join(root, "public/offline-lessons-worker.js");
  if (existsSync(workerPath)) {
    const worker = readFileSync(workerPath, "utf8");
    assert.doesNotMatch(worker, /foundation-travel-breakfast-ja-en|"travel-breakfast-ja-en"/);
  }
});
