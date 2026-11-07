import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { offlineLessonPackId } from "../src/lib/offline-lesson-tracks.ts";
import {
  JAPANESE_FOREMAN_OFFLINE_RELEASE_ENABLED,
  PRIVATE_JAPANESE_FOREMAN_OFFLINE_TRACKS,
  releasedJapaneseForemanOfflinePackIds,
} from "../src/lib/private-japanese-foreman-offline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = join(root, "content/japanese-construction-foreman");
const output = join(content, "private-offline");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stages = [
  ["foundation-construction-foreman-ja-en", "foundation-construction-foreman", 10],
  ["construction-foreman-ja-en", "construction-foreman", 30],
  ["master-construction-foreman-ja-en", "master-construction-foreman", 20],
];

test("private offline candidates preserve exact pairs, IDs, Reader and card ownership", () => {
  assert.equal(JAPANESE_FOREMAN_OFFLINE_RELEASE_ENABLED, false);
  assert.deepEqual(releasedJapaneseForemanOfflinePackIds(), []);
  assert.deepEqual(Object.keys(PRIVATE_JAPANESE_FOREMAN_OFFLINE_TRACKS), stages.map(([id]) => id));
  for (const [id, moduleId, count] of stages) {
    const manifest = JSON.parse(readFileSync(join(output, `${id}.manifest.json`), "utf8"));
    const bytes = readFileSync(join(output, manifest.content.file));
    const pack = JSON.parse(bytes);
    assert.equal(manifest.packId, id);
    assert.equal(manifest.pairKey, "Japanese:English");
    assert.equal(manifest.releaseEnabled, false);
    assert.equal(manifest.workerAllowlistEnabled, false);
    assert.equal(manifest.appAssetInventory, null);
    assert.equal(manifest.installationStatus, "not-built-not-installed");
    assert.equal(manifest.lessonCount, count);
    assert.equal(manifest.content.bytes, bytes.length);
    assert.equal(manifest.content.sha256, sha(bytes));
    assert.equal(manifest.sourceContentSha256, sha(bytes));
    assert.equal(manifest.content.routeCandidate, `/lesson-packs/${manifest.content.file}`);
    assert.match(manifest.content.routeCandidate,
      new RegExp(`^/lesson-packs/${id}-[a-f0-9]{64}\\.json$`));
    assert.equal(manifest.cacheNamespaceCandidate, `lt-lesson-pack-${id}-${sha(bytes)}`);
    assert.equal(existsSync(join(root, "public", "lesson-packs", manifest.content.file)), false);
    assert.equal(pack.releaseEnabled, false);
    assert.equal(pack.reviewed, false);
    assert.equal(pack.audioFilesIncluded, false);
    assert.equal(pack.pairKey, "Japanese:English");
    assert.equal(pack.lessons.length, count);
    assert.equal(pack.lessons[0].id, `${id}:lesson:1`);
    assert.equal(pack.lessons[count - 1].id, `${id}:lesson:${count}`);
    const cards = new Map(pack.cards.map((card) => [card.id, card]));
    for (const [index, lesson] of pack.lessons.entries()) {
      assert.equal(lesson.n, index + 1);
      assert.equal(lesson.reader.id, `reader-${lesson.id}`);
      assert.ok(lesson.reader.sentences.every((line) => line.target && line.native));
      assert.deepEqual(lesson.modes, ["see", "recall", "hear", "type", "say", "write"]);
      assert.equal(lesson.speaking.id, `speak-${lesson.id}`);
      for (const word of lesson.words) {
        const card = cards.get(word.cardId);
        assert.equal(card.courseId, id);
        assert.equal(card.target, word.es);
        assert.equal(card.native, word.en);
      }
    }
    for (const source of manifest.sourceBundles) {
      assert.equal(source.sha256, sha(readFileSync(join(content, source.file))));
    }
    assert.equal(offlineLessonPackId(moduleId, "Japanese", "English"), null);
    assert.equal(offlineLessonPackId(moduleId, "Spanish", "English"),
      moduleId === "construction-foreman" ? "construction-foreman-es-en" : null);
  }
});

test("the published worker allowlist still rejects all three private candidates", async () => {
  const source = readFileSync(join(root, "public/offline-lessons-worker.js"), "utf8");
  const listeners = {};
  const context = { self: { addEventListener: (type, fn) => { listeners[type] = fn; } },
    caches: {}, crypto: {}, console };
  runInNewContext(source, context);
  for (const [packId] of stages) {
    let result;
    let job;
    listeners.message({
      data: { type: "LESSON_PACK_STATUS", packId },
      ports: [{ postMessage: (value) => { result = value; } }],
      waitUntil: (value) => { job = value; },
    });
    await job;
    assert.equal(result.ok, false);
    assert.match(result.error, /no downloadable pack/);
  }
});
