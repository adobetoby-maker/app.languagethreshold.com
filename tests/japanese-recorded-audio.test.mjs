import test from "node:test";
import assert from "node:assert/strict";
import { recordedJapanesePath } from "../src/lib/recorded-japanese.ts";
import manifest from "../src/data/japanese-101-recordings.json" with { type: "json" };
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const unreviewedFixture = { ...manifest, listeningReviewed: false };

test("Japanese pilot resolves exact displayed lines for selected female and male voices", () => {
  assert.match(recordedJapanesePath("わたしは あきです。", "ja-JP-Chirp3-HD-Aoede", "ja-JP"), /female\.mp3$/);
  assert.match(recordedJapanesePath("わたしは あきです。", "ja-JP-Chirp3-HD-Charon", "ja-JP"), /male\.mp3$/);
});

test("owner-accepted pilot is available; an unreviewed manifest remains gated", () => {
  assert.equal(manifest.listeningReviewed, true);
  assert.equal(manifest.listeningReview.reviewer, "owner");
  assert.equal(manifest.listeningReview.decision, "accepted-all-pilot-clips");
  assert.match(recordedJapanesePath("こんにちは。", "ja-JP-Chirp3-HD-Aoede", "ja-JP"), /female\.mp3$/);
  assert.equal(recordedJapanesePath("こんにちは。", "ja-JP-Chirp3-HD-Aoede", "ja-JP", unreviewedFixture), null);
  for (const mutate of [
    copy => { copy.sourceModule = "foundation-spanish-basics"; },
    copy => { copy.sourceLesson = 2; },
    copy => { copy.listeningReview.decision = "pending"; },
    copy => { copy.entries["こんにちは。"].female.listeningReviewed = false; },
  ]) {
    const changed = structuredClone(manifest);
    mutate(changed);
    assert.equal(recordedJapanesePath("こんにちは。", "ja-JP-Chirp3-HD-Aoede", "ja-JP", changed), null);
  }
});

test("public clips and the lookup manifest match exact Foundation 1 source and hashes", () => {
  const root = resolve(import.meta.dirname, "..");
  const publicManifest = JSON.parse(readFileSync(resolve(root, "public/audio/japanese-101/manifest.json"), "utf8"));
  assert.deepEqual(publicManifest, manifest);
  const foundation = JSON.parse(readFileSync(resolve(root, "public/lesson-content/ja/foundation-japanese-basics.json"), "utf8"));
  const lines = foundation.lessons["1"].passage.target.slice(0, 5);
  assert.deepEqual(Object.keys(manifest.entries).sort(), lines.map(line => line.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ja-JP")).sort());
  for (const pair of Object.values(manifest.entries)) for (const clip of Object.values(pair)) {
    const file = readFileSync(resolve(root, "public/audio/japanese-101", clip.name));
    assert.equal(file.length, clip.bytes);
    assert.equal(createHash("sha256").update(file).digest("hex"), clip.sha256);
  }
});

test("Japanese pilot never borrows audio for another line, voice or locale", () => {
  for (const [text, voice, locale] of [
    ["わたしは あきです", "ja-JP-Chirp3-HD-Aoede", "ja-JP"],
    ["わたしは あおきです。", "ja-JP-Chirp3-HD-Aoede", "ja-JP"],
    ["わたしは あきです。", "ja-JP-Chirp3-HD-Zephyr", "ja-JP"],
    ["わたしは あきです。", "ja-JP-Chirp3-HD-Aoede", "en-US"],
  ]) assert.equal(recordedJapanesePath(text, voice, locale), null);
});
