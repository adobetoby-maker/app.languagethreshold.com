import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const course = "content/french-travel-lunch/";
const offline = course + "private-offline/";
const sourceBytes = readFileSync(course + "private-runtime-candidate.json");
const source = JSON.parse(sourceBytes);
const dictionaryBytes = readFileSync(course + "dictionary-candidate.json");
const dictionary = JSON.parse(dictionaryBytes);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stages = [
  ["foundation-travel-lunch-fr-en", "foundation-travel-lunch-fr", 10, 159],
  ["travel-lunch-fr-en", "travel-lunch", 30, 451],
  ["master-travel-lunch-fr-en", "master-travel-lunch-fr", 20, 338],
];

test("three private French Lunch packs preserve exact source, stage and pair", () => {
  assert.equal(source.pairKey, "French:English");
  assert.equal(source.registration, "disabled");
  assert.equal(source.reviewed, false);
  for (const [packId, moduleId, count, cardCount] of stages) {
    const manifest = JSON.parse(readFileSync(offline + `${packId}.manifest.json`));
    const raw = readFileSync(offline + manifest.content.file);
    const pack = JSON.parse(raw);
    const expectedLessons = source.lessons.filter((lesson) => lesson.moduleId === moduleId);
    assert.equal(manifest.packId, packId);
    assert.equal(manifest.moduleId, moduleId);
    assert.equal(manifest.pairKey, "French:English");
    assert.equal(manifest.target, "French");
    assert.equal(manifest.native, "English");
    assert.equal(manifest.releaseEnabled, false);
    assert.equal(manifest.workerAllowlistEnabled, false);
    assert.equal(manifest.appAssetInventory, null);
    assert.equal(manifest.installationStatus, "not-installed");
    assert.equal(manifest.content.routeCandidate, null);
    assert.equal(manifest.sourceSha256, sha(sourceBytes));
    assert.equal(manifest.content.sha256, sha(raw));
    assert.equal(manifest.content.bytes, raw.length);
    assert.equal(pack.packId, packId);
    assert.equal(pack.pairKey, "French:English");
    assert.equal(pack.locale, "fr-FR");
    assert.equal(pack.releaseEnabled, false);
    assert.equal(pack.reviewed, false);
    assert.equal(pack.registered, false);
    assert.equal(pack.audioFilesIncluded, false);
    assert.equal(pack.deviceVoiceIncluded, false);
    assert.equal(pack.aiConversationOffline, false);
    assert.equal(pack.sourceSha256, sha(sourceBytes));
    assert.deepEqual(pack.lessons, expectedLessons);
    const ids = new Set(expectedLessons.flatMap((lesson) => lesson.cards.map((card) => card.dictionaryId)));
    assert.equal(manifest.dictionarySourceSha256, sha(dictionaryBytes));
    assert.equal(pack.dictionarySourceSha256, sha(dictionaryBytes));
    assert.equal(manifest.dictionaryEntryCount, ids.size);
    assert.deepEqual(pack.dictionaryEntries,
      dictionary.entries.filter((entry) => ids.has(entry.id)));
    assert.equal(manifest.lessonCount, count);
    assert.equal(manifest.cardCount, cardCount);
    assert.equal(pack.lessons.reduce((sum, lesson) => sum + lesson.cards.length, 0), cardCount);
    assert.match(manifest.progressScopeCandidate, /^private:French:English:/);
    assert.match(manifest.cacheNamespaceCandidate, /^private:French:English:/);
  }
});

test("private French Lunch packs have no public worker or static registration", () => {
  const registries = ["public/offline-lessons-worker.js", "public/sw.js"]
    .map((path) => execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" })).join("\n");
  const assets = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "public/lesson-packs"],
    { encoding: "utf8" });
  for (const [packId] of stages) {
    assert.equal(assets.includes(packId), false);
    assert.equal(registries.includes(packId), false);
  }
});
